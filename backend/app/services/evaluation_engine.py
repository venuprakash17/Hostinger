"""Evaluation Engine - Test case runner and scoring"""
from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from app.models.coding_lab import (
    LabSubmission, TestCase, ExecutionResult, SubmissionStatus
)
from app.services.code_executor import executor, CodeExecutionResponse
from app.schemas.coding_lab import ExecutionResultResponse
import logging

logger = logging.getLogger(__name__)


class EvaluationEngine:
    """Engine for evaluating code submissions against test cases"""
    
    def evaluate_submission(
        self,
        db: Session,
        submission: LabSubmission,
        test_cases: List[TestCase]
    ) -> Tuple[LabSubmission, List[ExecutionResult]]:
        """
        Evaluate submission against all test cases
        
        Returns:
            Updated submission and list of execution results
        """
        submission.status = SubmissionStatus.RUNNING
        db.commit()
        
        execution_results = []
        total_points = 0.0
        max_points = sum(tc.points for tc in test_cases)
        passed_count = 0
        
        for test_case in sorted(test_cases, key=lambda x: x.order_index):
            result = self._evaluate_test_case(submission, test_case)
            execution_results.append(result)
            
            if result.passed:
                passed_count += 1
                total_points += result.points_earned
            
            # Save result to database
            db.add(result)
        
        # Update submission
        submission.test_cases_passed = passed_count
        submission.test_cases_total = len(test_cases)
        submission.max_score = max_points
        
        # Calculate final score
        if passed_count == len(test_cases):
            submission.status = SubmissionStatus.ACCEPTED
            submission.score = total_points
        elif passed_count > 0:
            submission.status = SubmissionStatus.WRONG_ANSWER
            submission.score = total_points
        else:
            # Check if compilation error
            if any(r.status == SubmissionStatus.COMPILATION_ERROR for r in execution_results):
                submission.status = SubmissionStatus.COMPILATION_ERROR
            elif any(r.status == SubmissionStatus.TIME_LIMIT_EXCEEDED for r in execution_results):
                submission.status = SubmissionStatus.TIME_LIMIT_EXCEEDED
            elif any(r.status == SubmissionStatus.MEMORY_LIMIT_EXCEEDED for r in execution_results):
                submission.status = SubmissionStatus.MEMORY_LIMIT_EXCEEDED
            elif any(r.status == SubmissionStatus.RUNTIME_ERROR for r in execution_results):
                submission.status = SubmissionStatus.RUNTIME_ERROR
            else:
                submission.status = SubmissionStatus.WRONG_ANSWER
            submission.score = 0.0
        
        submission.status = SubmissionStatus.COMPILED  # Mark as evaluated
        db.commit()
        
        return submission, execution_results
    
    def _evaluate_test_case(
        self,
        submission: LabSubmission,
        test_case: TestCase
    ) -> ExecutionResult:
        """Evaluate single test case"""
        # Determine limits
        time_limit = test_case.time_limit_seconds or submission.problem.time_limit_seconds
        memory_limit = test_case.memory_limit_mb or submission.problem.memory_limit_mb
        
        # Execute code
        exec_result = executor.execute_code(
            code=submission.code,
            language=submission.language,
            input_data=test_case.input_data,
            time_limit_seconds=time_limit,
            memory_limit_mb=memory_limit
        )
        
        # Create execution result
        result = ExecutionResult(
            submission_id=submission.id,
            test_case_id=test_case.id,
            status=exec_result.status,
            execution_time_ms=exec_result.execution_time_ms,
            memory_used_mb=exec_result.memory_used_mb,
            actual_output=exec_result.output,
            expected_output=test_case.expected_output,
            error_message=exec_result.error_message
        )
        
        # Check if passed
        if exec_result.status == SubmissionStatus.ACCEPTED:
            # Normalize outputs for comparison
            actual_normalized = self._normalize_output(exec_result.output or "")
            expected_normalized = self._normalize_output(test_case.expected_output)
            
            if actual_normalized == expected_normalized:
                result.passed = True
                result.points_earned = test_case.points
            else:
                result.passed = False
                result.points_earned = 0.0
        else:
            result.passed = False
            result.points_earned = 0.0
        
        return result
    
    def _normalize_output(self, output: str) -> str:
        """Normalize output for comparison (trim whitespace, handle newlines)"""
        if not output:
            return ""
        
        # Remove trailing whitespace from each line
        lines = [line.rstrip() for line in output.split('\n')]
        
        # Remove trailing empty lines
        while lines and not lines[-1]:
            lines.pop()
        
        return '\n'.join(lines)
    
    def run_sample_test(
        self,
        code: str,
        language: str,
        input_data: str,
        expected_output: str,
        time_limit_seconds: int = 5,
        memory_limit_mb: int = 256
    ) -> Dict:
        """Run a sample test case (for IDE run button)"""
        exec_result = executor.execute_code(
            code=code,
            language=language,
            input_data=input_data,
            time_limit_seconds=time_limit_seconds,
            memory_limit_mb=memory_limit_mb
        )
        
        # Check if output matches
        if exec_result.status == SubmissionStatus.ACCEPTED:
            actual_normalized = self._normalize_output(exec_result.output or "")
            expected_normalized = self._normalize_output(expected_output)
            passed = actual_normalized == expected_normalized
        else:
            passed = False
        
        return {
            "status": exec_result.status.value,
            "output": exec_result.output,
            "error": exec_result.error_message,
            "passed": passed,
            "execution_time_ms": exec_result.execution_time_ms,
            "memory_used_mb": exec_result.memory_used_mb
        }


# Singleton instance
evaluation_engine = EvaluationEngine()


"""Plagiarism Detection Service"""
import hashlib
import re
from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.coding_lab import LabSubmission, PlagiarismReport
from difflib import SequenceMatcher
import logging

logger = logging.getLogger(__name__)


class PlagiarismDetector:
    """Code similarity and plagiarism detection"""
    
    def normalize_code(self, code: str) -> str:
        """Normalize code for comparison"""
        if not code:
            return ""
        
        # Remove comments
        code = self._remove_comments(code)
        
        # Normalize whitespace
        code = re.sub(r'\s+', ' ', code)
        
        # Remove string literals (optional - can be kept for better detection)
        # code = re.sub(r'"[^"]*"', '""', code)
        # code = re.sub(r"'[^']*'", "''", code)
        
        # Remove numbers (optional)
        # code = re.sub(r'\d+', '0', code)
        
        return code.strip().lower()
    
    def _remove_comments(self, code: str) -> str:
        """Remove comments from code"""
        # Remove single-line comments
        code = re.sub(r'//.*', '', code)
        code = re.sub(r'#.*', '', code)
        
        # Remove multi-line comments
        code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
        
        return code
    
    def calculate_similarity(self, code1: str, code2: str) -> float:
        """Calculate similarity between two code snippets (0-100)"""
        normalized1 = self.normalize_code(code1)
        normalized2 = self.normalize_code(code2)
        
        if not normalized1 or not normalized2:
            return 0.0
        
        # Use SequenceMatcher for similarity
        similarity = SequenceMatcher(None, normalized1, normalized2).ratio()
        return similarity * 100
    
    def generate_fingerprint(self, code: str) -> str:
        """Generate fingerprint for quick lookup"""
        normalized = self.normalize_code(code)
        return hashlib.md5(normalized.encode()).hexdigest()
    
    def detect_plagiarism(
        self,
        db: Session,
        submission: LabSubmission
    ) -> PlagiarismReport:
        """Detect plagiarism for a submission"""
        # Normalize code
        normalized_code = self.normalize_code(submission.code)
        fingerprint = self.generate_fingerprint(submission.code)
        
        # Check against other submissions for the same problem
        similar_submissions = self._find_similar_submissions(
            db, submission, normalized_code
        )
        
        # Calculate overall similarity
        overall_similarity = 0.0
        if similar_submissions:
            # Take maximum similarity
            overall_similarity = max(s.get('similarity', 0) for s in similar_submissions)
        
        # Create or update plagiarism report
        report = db.query(PlagiarismReport).filter(
            PlagiarismReport.submission_id == submission.id
        ).first()
        
        if not report:
            report = PlagiarismReport(
                submission_id=submission.id,
                normalized_code=normalized_code,
                code_fingerprint=fingerprint,
                overall_similarity=overall_similarity,
                similar_submissions=similar_submissions,
                is_analyzed=True
            )
            db.add(report)
        else:
            report.overall_similarity = overall_similarity
            report.similar_submissions = similar_submissions
            report.is_analyzed = True
        
        db.commit()
        db.refresh(report)
        
        return report
    
    def _find_similar_submissions(
        self,
        db: Session,
        submission: LabSubmission,
        normalized_code: str
    ) -> List[Dict]:
        """Find similar submissions"""
        # Get all other submissions for the same problem
        other_submissions = db.query(LabSubmission).filter(
            LabSubmission.problem_id == submission.problem_id,
            LabSubmission.id != submission.id,
            LabSubmission.user_id != submission.user_id  # Exclude own submissions
        ).all()
        
        similar = []
        threshold = 70.0  # Minimum similarity threshold
        
        for other_sub in other_submissions:
            similarity = self.calculate_similarity(submission.code, other_sub.code)
            
            if similarity >= threshold:
                similar.append({
                    "submission_id": other_sub.id,
                    "user_id": other_sub.user_id,
                    "similarity": round(similarity, 2),
                    "submitted_at": other_sub.submitted_at.isoformat() if other_sub.submitted_at else None
                })
        
        # Sort by similarity (descending)
        similar.sort(key=lambda x: x['similarity'], reverse=True)
        
        return similar[:10]  # Return top 10 matches
    
    def batch_detect(self, db: Session, lab_id: int) -> Dict:
        """Batch detect plagiarism for all submissions in a lab"""
        submissions = db.query(LabSubmission).filter(
            LabSubmission.lab_id == lab_id
        ).all()
        
        results = {
            "total_submissions": len(submissions),
            "analyzed": 0,
            "high_similarity": 0,  # > 80%
            "medium_similarity": 0,  # 50-80%
            "reports_created": 0
        }
        
        for submission in submissions:
            try:
                report = self.detect_plagiarism(db, submission)
                results["analyzed"] += 1
                
                if report.overall_similarity >= 80:
                    results["high_similarity"] += 1
                elif report.overall_similarity >= 50:
                    results["medium_similarity"] += 1
                
                if report:
                    results["reports_created"] += 1
            except Exception as e:
                logger.error(f"Error detecting plagiarism for submission {submission.id}: {e}")
        
        return results


# Singleton instance
plagiarism_detector = PlagiarismDetector()


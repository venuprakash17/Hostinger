"""Coding Labs Module - Pydantic Schemas"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class LabMode(str, Enum):
    PRACTICE = "practice"
    ASSIGNMENT = "assignment"
    EXAM = "exam"


class LabDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"


class SubmissionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPILED = "compiled"
    ACCEPTED = "accepted"
    WRONG_ANSWER = "wrong_answer"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded"
    MEMORY_LIMIT_EXCEEDED = "memory_limit_exceeded"
    RUNTIME_ERROR = "runtime_error"
    COMPILATION_ERROR = "compilation_error"
    INTERNAL_ERROR = "internal_error"


class TestCaseType(str, Enum):
    PUBLIC = "public"
    HIDDEN = "hidden"


# Lab Schemas
class LabBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    instructions: Optional[str] = None
    # Note: mode, difficulty, topic moved to session level
    # Integrated College Management System - Linkage fields
    subject_id: Optional[int] = None  # Link to Subject
    department_id: Optional[int] = None  # Link to Department
    section_id: Optional[int] = None  # Link to Section
    semester_id: Optional[int] = None  # Link to Semester
    year: Optional[str] = None  # e.g., "1st", "2nd", "3rd", "4th", "5th"
    # Backward compatibility
    department: Optional[str] = None
    section: Optional[str] = None
    semester: Optional[str] = None
    batch: Optional[str] = None
    academic_year_id: Optional[int] = None
    is_published: bool = False
    allow_hints: bool = True
    allow_multiple_attempts: bool = True
    max_attempts: Optional[int] = Field(None, ge=1)
    # Proctoring settings removed - now session-level only
    total_points: float = Field(100.0, ge=0)
    passing_score: float = Field(60.0, ge=0)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class LabCreate(LabBase):
    college_id: Optional[int] = None
    faculty_ids: Optional[List[int]] = None  # Faculty to assign during creation


class LabUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    instructions: Optional[str] = None
    # Note: mode, difficulty, topic moved to session level
    # Integrated College Management System - Linkage fields
    subject_id: Optional[int] = None  # Link to Subject
    department_id: Optional[int] = None  # Link to Department
    section_id: Optional[int] = None  # Link to Section
    semester_id: Optional[int] = None  # Link to Semester
    year: Optional[str] = None
    # Backward compatibility
    department: Optional[str] = None
    section: Optional[str] = None
    semester: Optional[str] = None
    batch: Optional[str] = None
    academic_year_id: Optional[int] = None
    faculty_ids: Optional[List[int]] = None  # Faculty to assign/update
    allowed_languages: Optional[List[str]] = None
    version: Optional[str] = None
    is_published: Optional[bool] = None
    is_active: Optional[bool] = None
    allow_hints: Optional[bool] = None
    allow_multiple_attempts: Optional[bool] = None
    max_attempts: Optional[int] = Field(None, ge=1)
    is_proctored: Optional[bool] = None
    enforce_fullscreen: Optional[bool] = None
    detect_tab_switch: Optional[bool] = None
    camera_proctoring: Optional[bool] = None
    time_limit_minutes: Optional[int] = Field(None, ge=1)
    total_points: Optional[float] = Field(None, ge=0)
    passing_score: Optional[float] = Field(None, ge=0)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class LabResponse(LabBase):
    id: int
    created_by: int
    college_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    sessions: Optional[List['SessionWithProblems']] = []
    
    class Config:
        from_attributes = True


class LabListResponse(BaseModel):
    id: int
    title: str
    mode: LabMode
    difficulty: LabDifficulty
    topic: Optional[str]
    is_published: bool
    is_active: bool
    total_points: float
    created_at: datetime
    session_count: Optional[int] = 0
    problem_count: Optional[int] = 0
    submission_count: Optional[int] = 0
    
    class Config:
        from_attributes = True


# Session Schemas
class SessionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    instructions: Optional[str] = None
    order_index: int = Field(0, ge=0)
    is_active: bool = True
    allow_hints: bool = True
    time_limit_minutes: Optional[int] = Field(None, ge=1)
    total_points: float = Field(0.0, ge=0)


class SessionCreate(SessionBase):
    pass


class SessionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    instructions: Optional[str] = None
    order_index: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    allow_hints: Optional[bool] = None
    time_limit_minutes: Optional[int] = Field(None, ge=1)
    total_points: Optional[float] = Field(None, ge=0)


class SessionResponse(SessionBase):
    id: int
    lab_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    problem_count: Optional[int] = 0
    
    class Config:
        from_attributes = True


class SessionWithProblems(SessionResponse):
    problems: List['ProblemResponse'] = []


# Faculty Assignment Schemas
class FacultyAssignmentCreate(BaseModel):
    faculty_id: int
    can_add_problems: bool = True
    can_add_sessions: bool = True
    can_monitor: bool = True
    can_grade: bool = True


class FacultyAssignmentResponse(BaseModel):
    id: int
    lab_id: int
    faculty_id: int
    faculty_name: Optional[str] = None
    faculty_email: str
    assigned_at: datetime
    can_add_problems: bool
    can_add_sessions: bool
    can_monitor: bool
    can_grade: bool
    
    class Config:
        from_attributes = True


# Problem Schemas
class ProblemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    problem_statement: str = Field(..., min_length=1)
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    allowed_languages: List[str] = Field(default=["python", "java", "c", "cpp", "javascript"])
    default_language: str = "python"
    time_limit_seconds: int = Field(5, ge=1, le=300)
    memory_limit_mb: int = Field(256, ge=64, le=2048)
    hints: Optional[List[str]] = None
    explanation: Optional[str] = None
    points: float = Field(100.0, ge=0)
    order_index: int = Field(0, ge=0)


class ProblemCreate(ProblemBase):
    lab_id: int
    session_id: int


class ProblemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    problem_statement: Optional[str] = None
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    allowed_languages: Optional[List[str]] = None
    default_language: Optional[str] = None
    time_limit_seconds: Optional[int] = Field(None, ge=1, le=300)
    memory_limit_mb: Optional[int] = Field(None, ge=64, le=2048)
    hints: Optional[List[str]] = None
    explanation: Optional[str] = None
    points: Optional[float] = Field(None, ge=0)
    order_index: Optional[int] = Field(None, ge=0)


class ProblemResponse(ProblemBase):
    id: int
    lab_id: int
    session_id: int
    created_by: Optional[int] = None
    is_approved: bool = False
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    problem_type: str = "practice"
    deadline: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime]
    test_case_count: Optional[int] = 0
    
    class Config:
        from_attributes = True


# Test Case Schemas
class TestCaseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: TestCaseType = TestCaseType.HIDDEN
    input_data: str = Field(..., min_length=1)
    expected_output: str = Field(..., min_length=1)
    is_sample: bool = False
    points: float = Field(10.0, ge=0)
    time_limit_seconds: Optional[int] = Field(None, ge=1)
    memory_limit_mb: Optional[int] = Field(None, ge=64)
    order_index: int = Field(0, ge=0)


class TestCaseCreate(TestCaseBase):
    problem_id: int


class TestCaseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    type: Optional[TestCaseType] = None
    input_data: Optional[str] = None
    expected_output: Optional[str] = None
    is_sample: Optional[bool] = None
    points: Optional[float] = Field(None, ge=0)
    time_limit_seconds: Optional[int] = Field(None, ge=1)
    memory_limit_mb: Optional[int] = Field(None, ge=64)
    order_index: Optional[int] = Field(None, ge=0)


class TestCaseResponse(TestCaseBase):
    id: int
    problem_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Submission Schemas
class SubmissionBase(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = Field(..., min_length=1)
    is_final_submission: bool = False


class SubmissionCreate(SubmissionBase):
    lab_id: int
    problem_id: int


class SubmissionResponse(BaseModel):
    id: int
    lab_id: int
    problem_id: int
    user_id: int
    code: str
    language: str
    status: SubmissionStatus
    score: float
    max_score: Optional[float]
    execution_time_ms: Optional[int]
    memory_used_mb: Optional[float]
    test_cases_passed: int
    test_cases_total: int
    error_message: Optional[str]
    compile_output: Optional[str]
    runtime_output: Optional[str]
    attempt_number: int
    is_final_submission: bool
    submitted_at: datetime
    evaluated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ExecutionResultResponse(BaseModel):
    id: int
    test_case_id: int
    passed: bool
    status: SubmissionStatus
    actual_output: Optional[str]
    expected_output: Optional[str]
    error_message: Optional[str]
    execution_time_ms: Optional[int]
    memory_used_mb: Optional[float]
    points_earned: float
    
    class Config:
        from_attributes = True


class SubmissionWithResults(SubmissionResponse):
    execution_results: List[ExecutionResultResponse] = []


# Execution Request Schema
class CodeExecutionRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = Field(..., min_length=1)
    input_data: Optional[str] = None
    time_limit_seconds: int = Field(5, ge=1, le=300)
    memory_limit_mb: int = Field(256, ge=64, le=2048)


class CodeExecutionResponse(BaseModel):
    status: SubmissionStatus
    output: Optional[str] = None
    error_message: Optional[str] = None
    execution_time_ms: Optional[int] = None
    memory_used_mb: Optional[float] = None
    compile_output: Optional[str] = None


# Plagiarism Schemas
class PlagiarismReportResponse(BaseModel):
    id: int
    submission_id: int
    overall_similarity: float
    similar_submissions: Optional[List[Dict[str, Any]]] = None
    github_matches: Optional[List[Dict[str, Any]]] = None
    stackoverflow_matches: Optional[List[Dict[str, Any]]] = None
    is_analyzed: bool
    analyzed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Analytics Schemas
class LabAnalyticsResponse(BaseModel):
    id: int
    lab_id: int
    total_students: int
    students_attempted: int
    students_completed: int
    students_passed: int
    total_submissions: int
    average_attempts: float
    average_score: float
    average_time_spent_minutes: float
    score_distribution: Optional[Dict[str, int]] = None
    problem_stats: Optional[List[Dict[str, Any]]] = None
    difficulty_heatmap: Optional[Dict[str, Any]] = None
    last_calculated_at: datetime
    
    class Config:
        from_attributes = True


# Monitoring Schemas
class StudentActivity(BaseModel):
    user_id: int
    lab_id: int
    problem_id: Optional[int]
    current_code: Optional[str] = None
    language: Optional[str] = None
    time_spent_seconds: int = 0
    attempt_count: int = 0
    last_activity: datetime
    is_active: bool = True
    tab_switches: int = 0
    fullscreen_exits: int = 0


class LabMonitoringResponse(BaseModel):
    lab_id: int
    active_students: List[StudentActivity]
    total_students: int
    completed_students: int


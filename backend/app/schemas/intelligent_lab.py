"""Intelligent Lab Module - Pydantic Schemas"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date, time, datetime
from enum import Enum
from app.schemas.coding_lab import LabMode  # Import LabMode enum


class MaterialType(str, Enum):
    PDF = "pdf"
    SLIDE = "slide"
    CODE_FILE = "code_file"
    NOTE = "note"
    VIDEO_LINK = "video_link"
    DOCUMENT = "document"


class TestType(str, Enum):
    QUIZ = "quiz"
    CODING_TEST = "coding_test"
    MIXED = "mixed"


class QuestionType(str, Enum):
    MCQ = "mcq"
    MULTIPLE_SELECT = "multiple_select"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    CODING = "coding"


# ==================== Session Schemas ====================

class SessionMaterialCreate(BaseModel):
    title: str
    description: Optional[str] = None
    material_type: MaterialType
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    order_index: int = 0
    is_required: bool = False


class SessionMaterialResponse(BaseModel):
    id: int
    session_id: int
    title: str
    description: Optional[str]
    material_type: MaterialType
    file_path: Optional[str]
    file_url: Optional[str]
    file_size: Optional[int]
    order_index: int
    is_required: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SessionEnhancedCreate(BaseModel):
    lab_id: int
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    session_date: date
    session_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    order_index: int = 0
    mode: LabMode = LabMode.PRACTICE  # Practice/Assignment/Exam - controls feature enablement
    allow_hints: Optional[bool] = None  # Auto-set based on mode if not provided
    allow_multiple_attempts: Optional[bool] = None  # Auto-set based on mode
    max_attempts: Optional[int] = None  # Auto-set based on mode
    time_limit_minutes: Optional[int] = None
    is_proctored: Optional[bool] = None  # Auto-set based on mode, but can be enabled for any mode
    enforce_fullscreen: Optional[bool] = None  # Auto-set based on mode
    detect_tab_switch: Optional[bool] = None  # Auto-set based on mode
    camera_proctoring: Optional[bool] = None  # Camera monitoring (optional)
    total_points: float = 100.0
    passing_score: float = 60.0
    materials: Optional[List[SessionMaterialCreate]] = []


class SessionEnhancedUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    session_date: Optional[date] = None
    session_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None
    is_completed: Optional[bool] = None
    mode: Optional[LabMode] = None  # Changing mode will auto-update settings
    allow_hints: Optional[bool] = None
    allow_multiple_attempts: Optional[bool] = None
    max_attempts: Optional[int] = None
    time_limit_minutes: Optional[int] = None
    is_proctored: Optional[bool] = None
    enforce_fullscreen: Optional[bool] = None
    detect_tab_switch: Optional[bool] = None
    camera_proctoring: Optional[bool] = None
    total_points: Optional[float] = None
    passing_score: Optional[float] = None


class SessionEnhancedResponse(BaseModel):
    id: int
    lab_id: int
    title: str
    description: Optional[str]
    instructions: Optional[str]
    session_date: date
    session_time: Optional[time]
    duration_minutes: Optional[int]
    order_index: int
    is_active: bool
    is_completed: bool
    mode: LabMode  # Practice/Assignment/Exam
    allow_hints: bool
    allow_multiple_attempts: bool
    max_attempts: Optional[int]
    time_limit_minutes: Optional[int]
    is_proctored: bool
    enforce_fullscreen: bool
    detect_tab_switch: bool
    camera_proctoring: bool
    total_points: float
    passing_score: float
    created_at: datetime
    updated_at: Optional[datetime]
    completed_at: Optional[datetime]
    materials: List[SessionMaterialResponse] = []
    problem_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ==================== Test Schemas ====================

class TestQuestionOption(BaseModel):
    text: str
    is_correct: bool


class TestQuestionCreate(BaseModel):
    question_type: QuestionType
    question_text: str
    question_image_url: Optional[str] = None
    options: Optional[List[TestQuestionOption]] = None  # For MCQ/Multiple select
    correct_answer: Optional[str] = None  # For short answer, true/false
    problem_id: Optional[int] = None  # For coding questions
    points: float = 10.0
    negative_marking: float = 0.0
    order_index: int = 0


class TestQuestionResponse(BaseModel):
    id: int
    test_id: int
    question_type: QuestionType
    question_text: str
    question_image_url: Optional[str]
    options: Optional[List[Dict[str, Any]]]
    correct_answer: Optional[str]
    problem_id: Optional[int]
    points: float
    negative_marking: float
    order_index: int
    created_at: datetime

    class Config:
        from_attributes = True


class LabTestCreate(BaseModel):
    lab_id: int
    session_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    test_type: TestType = TestType.MIXED
    start_time: datetime
    end_time: datetime
    duration_minutes: Optional[int] = None
    auto_lock: bool = True
    allow_backtracking: bool = True
    shuffle_questions: bool = False
    show_results_immediately: bool = False
    total_points: float = 100.0
    passing_score: float = 60.0
    is_proctored: bool = False
    require_fullscreen: bool = False
    detect_tab_switch: bool = False
    questions: Optional[List[TestQuestionCreate]] = []


class LabTestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    auto_lock: Optional[bool] = None
    allow_backtracking: Optional[bool] = None
    shuffle_questions: Optional[bool] = None
    show_results_immediately: Optional[bool] = None
    total_points: Optional[float] = None
    passing_score: Optional[float] = None
    is_proctored: Optional[bool] = None
    require_fullscreen: Optional[bool] = None
    detect_tab_switch: Optional[bool] = None
    is_active: Optional[bool] = None
    is_published: Optional[bool] = None


class LabTestResponse(BaseModel):
    id: int
    lab_id: int
    session_id: Optional[int]
    title: str
    description: Optional[str]
    test_type: TestType
    start_time: datetime
    end_time: datetime
    duration_minutes: Optional[int]
    auto_lock: bool
    allow_backtracking: bool
    shuffle_questions: bool
    show_results_immediately: bool
    total_points: float
    passing_score: float
    is_proctored: bool
    require_fullscreen: bool
    detect_tab_switch: bool
    is_active: bool
    is_published: bool
    created_at: datetime
    updated_at: Optional[datetime]
    question_count: Optional[int] = 0
    attempt_count: Optional[int] = 0

    class Config:
        from_attributes = True


class LabTestWithQuestions(LabTestResponse):
    questions: List[TestQuestionResponse] = []


# ==================== Test Attempt Schemas ====================

class TestAnswerCreate(BaseModel):
    question_id: int
    answer_text: Optional[str] = None
    selected_options: Optional[List[int]] = None  # Array of option indices
    code: Optional[str] = None
    language: Optional[str] = None


class TestAttemptCreate(BaseModel):
    test_id: int
    answers: List[TestAnswerCreate]


class TestAnswerResponse(BaseModel):
    id: int
    attempt_id: int
    question_id: int
    answer_text: Optional[str]
    selected_options: Optional[List[int]]
    code: Optional[str]
    language: Optional[str]
    is_correct: Optional[bool]
    points_earned: float
    max_points: Optional[float]
    feedback: Optional[str]
    answered_at: datetime
    graded_at: Optional[datetime]

    class Config:
        from_attributes = True


class TestAttemptResponse(BaseModel):
    id: int
    test_id: int
    user_id: int
    started_at: datetime
    submitted_at: Optional[datetime]
    auto_submitted_at: Optional[datetime]
    is_submitted: bool
    is_auto_submitted: bool
    is_graded: bool
    total_score: float
    max_score: Optional[float]
    percentage: float
    is_passed: bool
    tab_switches: int
    fullscreen_exits: int
    created_at: datetime
    graded_at: Optional[datetime]
    answers: List[TestAnswerResponse] = []

    class Config:
        from_attributes = True


# ==================== Progress Schemas ====================

class StudentSessionProgressResponse(BaseModel):
    id: int
    session_id: int
    user_id: int
    materials_viewed: Optional[List[int]]
    materials_completed: Optional[List[int]]
    exercises_attempted: int
    exercises_completed: int
    exercises_passed: int
    total_score: float
    max_score: float
    time_spent_minutes: float
    first_accessed_at: datetime
    last_accessed_at: Optional[datetime]
    completed_at: Optional[datetime]
    is_completed: bool
    completion_percentage: float

    class Config:
        from_attributes = True


class StudentLabProgressResponse(BaseModel):
    id: int
    lab_id: int
    user_id: int
    sessions_completed: int
    sessions_total: int
    completion_percentage: float
    total_exercises: int
    exercises_attempted: int
    exercises_completed: int
    exercises_passed: int
    tests_attempted: int
    tests_passed: int
    average_test_score: float
    total_score: float
    max_score: float
    overall_percentage: float
    total_time_spent_minutes: float
    is_completed: bool
    current_session_id: Optional[int]
    first_accessed_at: datetime
    last_accessed_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ==================== Leaderboard Schemas ====================

class LeaderboardEntry(BaseModel):
    user_id: int
    user_name: Optional[str]
    rank: int
    score: float
    completion_percentage: float
    exercises_completed: int
    tests_passed: int


class LabLeaderboardResponse(BaseModel):
    lab_id: int
    rankings: List[LeaderboardEntry]
    total_participants: int
    average_score: float
    top_score: float
    last_updated: datetime

    class Config:
        from_attributes = True


"""Schemas for global content (quizzes, coding problems)"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class QuestionSchema(BaseModel):
    question: str
    question_type: str = Field(default="mcq", pattern="^(mcq|fill_blank|true_false)$")  # MCQ, Fill in the blank, True/False
    # MCQ fields (required for MCQ, optional for others)
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: Optional[str] = Field(None, pattern="^[ABCD]$")  # For MCQ: A, B, C, D | For True/False: "True" or "False"
    # Fill in the blank / Short answer fields
    correct_answer_text: Optional[str] = None  # For fill_blank
    # True/False fields
    is_true: Optional[bool] = None  # For true_false type (True/False)
    marks: int = 1
    negative_marking: Optional[float] = Field(default=0.0, ge=0.0)  # Negative marking for wrong answer
    timer_seconds: Optional[int] = None  # Timer for this specific question (in seconds)


class QuizBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    subject: Optional[str] = Field(None, max_length=100)
    duration_minutes: int = Field(default=30, ge=0)  # 0 means no timer
    total_marks: int = Field(default=100, ge=1)
    questions: List[QuestionSchema] = Field(default_factory=list)
    is_active: bool = True
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    # Scope fields
    scope_type: str = Field(default="svnapro", pattern="^(svnapro|college|department|section)$")
    college_id: Optional[int] = None
    department: Optional[str] = Field(None, max_length=100)
    section_id: Optional[int] = None
    year: Optional[str] = Field(None, max_length=20)
    # Advanced features
    code_snippet: Optional[str] = None
    question_timers: Optional[Dict[str, int]] = None  # {"0": 60, "1": 90} - question index to seconds
    per_question_timer_enabled: bool = False
    
    # Enhanced Quiz Features
    assigned_branches: Optional[List[int]] = None  # Array of department/branch IDs
    assigned_sections: Optional[List[int]] = None  # Array of section IDs
    allow_negative_marking: bool = False
    shuffle_questions: bool = False
    shuffle_options: bool = False
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")
    passing_marks: Optional[int] = None
    question_bank_ids: Optional[List[int]] = None  # Array of question bank IDs to use
    use_random_questions: bool = False  # Use random questions from bank
    random_question_count: Optional[int] = None  # Number of random questions


class QuizCreate(QuizBase):
    pass


class QuizUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    subject: Optional[str] = Field(None, max_length=100)
    duration_minutes: Optional[int] = Field(None, ge=0)  # 0 means no timer
    total_marks: Optional[int] = Field(None, ge=1)
    questions: Optional[List[QuestionSchema]] = None
    is_active: Optional[bool] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    scope_type: Optional[str] = Field(None, pattern="^(svnapro|college|department|section)$")
    college_id: Optional[int] = None
    department: Optional[str] = Field(None, max_length=100)
    section_id: Optional[int] = None
    year: Optional[str] = Field(None, max_length=20)
    # Advanced features
    code_snippet: Optional[str] = None
    question_timers: Optional[Dict[str, int]] = None
    per_question_timer_enabled: Optional[bool] = None
    
    # Enhanced Quiz Features
    assigned_branches: Optional[List[int]] = None
    assigned_sections: Optional[List[int]] = None
    allow_negative_marking: Optional[bool] = None
    shuffle_questions: Optional[bool] = None
    shuffle_options: Optional[bool] = None
    status: Optional[str] = Field(None, pattern="^(draft|published|archived)$")
    passing_marks: Optional[int] = None
    question_bank_ids: Optional[List[int]] = None
    use_random_questions: Optional[bool] = None
    random_question_count: Optional[int] = None


class QuizResponse(QuizBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    college_id: Optional[int] = None
    section_id: Optional[int] = None
    
    class Config:
        from_attributes = True


# Quiz Attempt Schemas
class QuizAnswerSchema(BaseModel):
    question_index: int
    question_type: str
    answer: Optional[Any] = None  # Can be string, array, boolean, etc.
    time_spent_seconds: Optional[int] = None


class QuizAttemptCreate(BaseModel):
    quiz_id: int


class QuizAttemptUpdate(BaseModel):
    answers: Optional[List[QuizAnswerSchema]] = None


class QuizAttemptResponse(BaseModel):
    id: int
    quiz_id: int
    user_id: int
    started_at: datetime
    submitted_at: Optional[datetime] = None
    auto_submitted_at: Optional[datetime] = None
    is_submitted: bool
    is_auto_submitted: bool
    is_graded: bool
    total_score: float
    max_score: Optional[float] = None
    percentage: float
    answers: Optional[List[Dict[str, Any]]] = None
    
    class Config:
        from_attributes = True


class CodingProblemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str
    difficulty: Optional[str] = Field(None, pattern="^(Easy|Medium|Hard)$")
    tags: List[str] = Field(default_factory=list)
    test_cases: Optional[Dict[str, Any]] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    is_active: bool = True
    expiry_date: Optional[datetime] = None
    # Scope fields
    scope_type: str = Field(default="svnapro", pattern="^(svnapro|college|department|section)$")
    college_id: Optional[int] = None
    department: Optional[str] = Field(None, max_length=100)
    section_id: Optional[int] = None
    year: Optional[str] = Field(None, max_length=20)


class CodingProblemCreate(CodingProblemBase):
    pass


class CodingProblemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    difficulty: Optional[str] = Field(None, pattern="^(Easy|Medium|Hard)$")
    tags: Optional[List[str]] = None
    test_cases: Optional[Dict[str, Any]] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    is_active: Optional[bool] = None
    expiry_date: Optional[datetime] = None
    scope_type: Optional[str] = Field(None, pattern="^(svnapro|college|department|section)$")
    college_id: Optional[int] = None
    department: Optional[str] = Field(None, max_length=100)
    section_id: Optional[int] = None
    year: Optional[str] = Field(None, max_length=20)


class CodingProblemResponse(CodingProblemBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    college_id: Optional[int] = None
    section_id: Optional[int] = None
    
    class Config:
        from_attributes = True


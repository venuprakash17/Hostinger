"""Schemas for global content (quizzes, coding problems)"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class QuestionSchema(BaseModel):
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str = Field(..., pattern="^[ABCD]$")
    marks: int = 1
    timer_seconds: Optional[int] = None  # Timer for this specific question (in seconds)


class QuizBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    subject: Optional[str] = Field(None, max_length=100)
    duration_minutes: int = Field(default=30, ge=1)
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


class QuizCreate(QuizBase):
    pass


class QuizUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    subject: Optional[str] = Field(None, max_length=100)
    duration_minutes: Optional[int] = Field(None, ge=1)
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


class QuizResponse(QuizBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    college_id: Optional[int] = None
    section_id: Optional[int] = None
    
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


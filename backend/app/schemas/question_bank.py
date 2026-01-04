"""Schemas for Question Bank"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class QuestionBankBase(BaseModel):
    question_text: str = Field(..., min_length=1)
    question_type: str = Field(..., pattern="^(MCQ|TRUE_FALSE)$")
    options: Optional[List[str]] = None  # For MCQ: ["Option A", "Option B", "Option C", "Option D"]
    correct_answer: str = Field(..., pattern="^(A|B|C|D|True|False)$")
    marks: int = Field(default=1, ge=1)
    difficulty: Optional[str] = Field(None, pattern="^(easy|medium|hard)$")
    topic: Optional[str] = None
    subject: Optional[str] = None
    negative_marking: float = Field(default=0.0, ge=0.0)
    college_id: Optional[int] = None
    department_id: Optional[int] = None
    is_active: bool = True


class QuestionBankCreate(QuestionBankBase):
    pass


class QuestionBankUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[str] = Field(None, pattern="^(MCQ|TRUE_FALSE)$")
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = Field(None, pattern="^(A|B|C|D|True|False)$")
    marks: Optional[int] = Field(None, ge=1)
    difficulty: Optional[str] = Field(None, pattern="^(easy|medium|hard)$")
    topic: Optional[str] = None
    subject: Optional[str] = None
    negative_marking: Optional[float] = Field(None, ge=0.0)
    is_active: Optional[bool] = None


class QuestionBankResponse(QuestionBankBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class QuestionBankBulkCreate(BaseModel):
    """Bulk create questions from a list"""
    questions: List[QuestionBankCreate]


class QuestionBankFilter(BaseModel):
    """Filter for querying question bank"""
    question_type: Optional[str] = None
    difficulty: Optional[str] = None
    topic: Optional[str] = None
    subject: Optional[str] = None
    college_id: Optional[int] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = True

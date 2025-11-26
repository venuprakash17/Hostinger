"""Mock Interview schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.mock_interview import InterviewStatus, InterviewType


class MockInterviewBase(BaseModel):
    """Base mock interview schema"""
    title: str = Field(..., min_length=1, max_length=255)
    interview_type: InterviewType = InterviewType.MOCK
    description: Optional[str] = None
    student_id: int
    interviewer_id: Optional[int] = None
    interviewer_name: Optional[str] = Field(None, max_length=255)
    scheduled_at: datetime
    duration_minutes: int = Field(default=60, ge=15, le=180)
    meeting_link: Optional[str] = None
    venue: Optional[str] = None


class MockInterviewCreate(MockInterviewBase):
    """Schema for creating a mock interview"""
    pass


class MockInterviewUpdate(BaseModel):
    """Schema for updating a mock interview"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    interview_type: Optional[InterviewType] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=180)
    meeting_link: Optional[str] = None
    venue: Optional[str] = None
    status: Optional[InterviewStatus] = None


class MockInterviewFeedback(BaseModel):
    """Schema for interview feedback"""
    feedback: Optional[str] = None
    rating: Optional[int] = Field(None, ge=0, le=10)
    strengths: Optional[List[str]] = None
    areas_for_improvement: Optional[List[str]] = None
    technical_score: Optional[int] = Field(None, ge=0, le=100)
    communication_score: Optional[int] = Field(None, ge=0, le=100)
    problem_solving_score: Optional[int] = Field(None, ge=0, le=100)
    notes: Optional[str] = None
    recording_url: Optional[str] = None


class MockInterviewResponse(MockInterviewBase):
    """Schema for mock interview response"""
    id: int
    status: InterviewStatus
    feedback: Optional[str] = None
    rating: Optional[int] = None
    strengths: Optional[List[str]] = None
    areas_for_improvement: Optional[List[str]] = None
    technical_score: Optional[int] = None
    communication_score: Optional[int] = None
    problem_solving_score: Optional[int] = None
    recording_url: Optional[str] = None
    notes: Optional[str] = None
    college_id: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


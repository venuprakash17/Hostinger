"""Training session schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TrainingSessionBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    session_type: str = Field(..., description="quiz, coding, mock_interview, aptitude")
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_active: bool = True
    
    # Targeting
    target_type: str = Field(default="all", description="all, department, year, section, department_year, department_section")
    target_departments: Optional[List[str]] = None
    target_years: Optional[List[str]] = None
    target_sections: Optional[List[str]] = None


class TrainingSessionCreate(TrainingSessionBase):
    college_id: Optional[int] = None  # Auto-set based on creator role


class TrainingSessionUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    session_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_active: Optional[bool] = None
    target_type: Optional[str] = None
    target_departments: Optional[List[str]] = None
    target_years: Optional[List[str]] = None
    target_sections: Optional[List[str]] = None


class TrainingSessionResponse(TrainingSessionBase):
    id: int
    college_id: Optional[int] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Creator info (for display)
    creator_name: Optional[str] = None
    creator_role: Optional[str] = None
    
    class Config:
        from_attributes = True


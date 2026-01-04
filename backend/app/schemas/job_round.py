"""Job Round schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class JobRoundBase(BaseModel):
    """Base job round schema"""
    name: str = Field(..., description="Round name (e.g., 'Aptitude', 'Quiz', 'Technical')")
    order: int = Field(..., description="Order of the round (1, 2, 3, ...)")
    description: Optional[str] = None
    is_active: bool = True


class JobRoundCreate(JobRoundBase):
    """Schema for creating a job round"""
    pass


class JobRoundUpdate(BaseModel):
    """Schema for updating a job round"""
    name: Optional[str] = None
    order: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class JobRoundResponse(JobRoundBase):
    """Schema for job round response"""
    id: int
    job_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class JobApplicationRoundBase(BaseModel):
    """Base job application round schema"""
    status: str = Field(default="PENDING", pattern="^(PENDING|QUALIFIED|REJECTED|ABSENT)$")
    remarks: Optional[str] = None


class JobApplicationRoundCreate(JobApplicationRoundBase):
    """Schema for creating a job application round"""
    round_id: int


class JobApplicationRoundUpdate(BaseModel):
    """Schema for updating a job application round"""
    status: Optional[str] = Field(None, pattern="^(PENDING|QUALIFIED|REJECTED|ABSENT)$")
    remarks: Optional[str] = None


class JobApplicationRoundResponse(JobApplicationRoundBase):
    """Schema for job application round response"""
    id: int
    job_application_id: int
    round_id: int
    updated_by: Optional[int] = None
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BulkRoundUpdateRow(BaseModel):
    """Schema for a single row in bulk round update"""
    student_id: int = Field(..., description="Student user ID")
    student_name: Optional[str] = None
    email: Optional[str] = None
    status: str = Field(..., pattern="^(QUALIFIED|REJECTED|ABSENT)$")
    remarks: Optional[str] = None


class BulkRoundUpdateRequest(BaseModel):
    """Schema for bulk round update request"""
    job_id: int
    round_id: int
    updates: List[BulkRoundUpdateRow]

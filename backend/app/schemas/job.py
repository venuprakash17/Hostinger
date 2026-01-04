"""Job/Placement schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class JobBase(BaseModel):
    """Base job schema"""
    title: str
    company: str
    role: str
    description: Optional[str] = None
    location: Optional[str] = None
    ctc: Optional[str] = None
    eligibility_type: str = Field(default="all_students", pattern="^(all_students|branch|specific_students)$")
    eligible_branches: Optional[List[str]] = None
    eligible_user_ids: Optional[List[int]] = None
    eligible_years: Optional[List[str]] = None  # e.g., ["1st", "2nd", "3rd", "4th"] - if provided, filters by year
    job_type: str = Field(default="On-Campus", pattern="^(On-Campus|Off-Campus|Internship)$")
    requirements: Optional[List[str]] = None
    rounds: Optional[List[str]] = None
    deadline: Optional[datetime] = None
    apply_link: Optional[str] = None  # External application URL
    company_logo: Optional[str] = None  # URL or path to company logo
    is_active: bool = True


class JobCreate(JobBase):
    """Schema for creating a job"""
    college_id: Optional[int] = None  # Optional - NULL means global (available to all students)


class JobUpdate(BaseModel):
    """Schema for updating a job"""
    title: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    ctc: Optional[str] = None
    eligibility_type: Optional[str] = Field(None, pattern="^(all_students|branch|specific_students)$")
    eligible_branches: Optional[List[str]] = None
    eligible_user_ids: Optional[List[int]] = None
    eligible_years: Optional[List[str]] = None  # e.g., ["1st", "2nd", "3rd", "4th"] - if provided, filters by year
    job_type: Optional[str] = Field(None, pattern="^(On-Campus|Off-Campus|Internship)$")
    requirements: Optional[List[str]] = None
    rounds: Optional[List[str]] = None
    deadline: Optional[datetime] = None
    apply_link: Optional[str] = None  # External application URL
    company_logo: Optional[str] = None  # URL or path to company logo
    is_active: Optional[bool] = None
    college_id: Optional[int] = None  # For super admin to change college


class JobResponse(JobBase):
    """Schema for job response"""
    id: int
    college_id: Optional[int] = None  # NULL means global
    created_by: Optional[int] = None
    posted_date: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class JobApplicationBase(BaseModel):
    """Base job application schema"""
    job_id: int
    status: Optional[str] = Field(default="Applied", pattern="^(Applied|Shortlisted|Interview|Rejected|Selected|Offer)$")
    current_round: Optional[str] = None
    notes: Optional[str] = None


class JobApplicationCreate(JobApplicationBase):
    """Schema for creating a job application"""
    pass


class JobApplicationUpdate(BaseModel):
    """Schema for updating a job application"""
    status: Optional[str] = Field(None, pattern="^(Applied|Shortlisted|Interview|Rejected|Selected|Offer)$")
    current_round: Optional[str] = None
    notes: Optional[str] = None


class JobApplicationResponse(JobApplicationBase):
    """Schema for job application response"""
    id: int
    user_id: int
    applied_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


"""Job Aggregation schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class JobAggregationBase(BaseModel):
    """Base job aggregation schema"""
    source: str = Field(..., pattern="^(linkedin|indeed|naukri|glassdoor|monster|other)$")
    external_id: Optional[str] = None
    source_url: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    company: str = Field(..., min_length=1, max_length=255)
    role: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = None
    ctc: Optional[str] = None
    job_type: Optional[str] = None
    experience_required: Optional[str] = None
    skills_required: Optional[List[str]] = None
    qualifications: Optional[str] = None
    posted_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None


class JobAggregationCreate(JobAggregationBase):
    """Schema for creating a job aggregation"""
    college_id: Optional[int] = None


class JobAggregationUpdate(BaseModel):
    """Schema for updating a job aggregation"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    company: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = None
    ctc: Optional[str] = None
    is_active: Optional[bool] = None
    is_imported: Optional[bool] = None


class JobAggregationResponse(JobAggregationBase):
    """Schema for job aggregation response"""
    id: int
    is_active: bool
    is_imported: bool
    college_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_synced_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class JobAggregationSyncRequest(BaseModel):
    """Request for syncing jobs from external sources"""
    sources: List[str] = Field(default=["linkedin", "indeed"])
    keywords: Optional[List[str]] = None
    location: Optional[str] = None
    max_results: int = Field(default=50, ge=1, le=200)
    college_id: Optional[int] = None


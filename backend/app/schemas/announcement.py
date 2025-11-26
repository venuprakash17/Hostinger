"""Announcement schemas"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AnnouncementBase(BaseModel):
    """Base announcement schema"""
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    type: str = Field(default="info", pattern="^(info|success|warning|error)$")


class AnnouncementCreate(AnnouncementBase):
    """Schema for creating an announcement with targeting options"""
    college_id: Optional[int] = None
    department: Optional[str] = None
    section: Optional[str] = None
    present_year: Optional[str] = None  # e.g., "1st", "2nd", "3rd", "4th"
    role: Optional[str] = Field(None, pattern="^(student|faculty|admin|hod|super_admin)$")
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Welcome to the New Academic Year!",
                "message": "We are excited to welcome you to the new academic year. Please check your schedules.",
                "type": "info",
                "college_id": 1,
                "department": "Computer Science",
                "present_year": "2nd",
                "role": "student"
            }
        }


class AnnouncementUpdate(BaseModel):
    """Schema for updating an announcement"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    message: Optional[str] = Field(None, min_length=1)
    type: Optional[str] = Field(None, pattern="^(info|success|warning|error)$")
    is_active: Optional[bool] = None


class AnnouncementResponse(AnnouncementBase):
    """Schema for announcement response"""
    id: int
    college_id: Optional[int] = None
    department: Optional[str] = None
    section: Optional[str] = None
    present_year: Optional[str] = None
    role: Optional[str] = None
    created_by: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AnnouncementListResponse(BaseModel):
    """Schema for listing announcements"""
    announcements: list[AnnouncementResponse]
    total: int


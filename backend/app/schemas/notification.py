"""Notification schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class NotificationBase(BaseModel):
    """Base notification schema"""
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1, max_length=2000)
    type: str = Field(default="info", pattern="^(info|success|warning|error)$")


class NotificationCreate(NotificationBase):
    """Schema for creating a notification with targeting options"""
    # Targeting options - at least one must be specified
    college_id: Optional[int] = None
    department: Optional[str] = None
    section: Optional[str] = None
    present_year: Optional[str] = None  # e.g., "1st", "2nd", "3rd", "4th"
    user_ids: Optional[List[int]] = Field(None, description="Specific user IDs to target")
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Important Announcement",
                "message": "This is an important message for all students",
                "type": "info",
                "college_id": 1,
                "department": "Computer Science",
                "section": "A",
                "present_year": "2nd"
            }
        }


class NotificationResponse(NotificationBase):
    """Schema for notification response"""
    id: int
    college_id: Optional[int] = None
    created_by: Optional[int] = None
    is_active: bool
    created_at: datetime
    recipient_count: Optional[int] = Field(None, description="Number of students who received this notification")
    
    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Schema for listing notifications"""
    notifications: List[NotificationResponse]
    total: int


class UserNotificationResponse(BaseModel):
    """Schema for user notification (with read status)"""
    id: int
    notification_id: int
    user_id: int
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    notification: Optional[NotificationResponse] = None
    
    class Config:
        from_attributes = True


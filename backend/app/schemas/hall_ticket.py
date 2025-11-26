"""Hall Ticket schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class HallTicketBase(BaseModel):
    """Base hall ticket schema"""
    exam_id: int
    exam_type: str = Field(..., pattern="^(quiz|coding|mock_test|placement)$")
    exam_title: str = Field(..., min_length=1, max_length=255)
    exam_date: datetime
    exam_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    venue: Optional[str] = None
    room_number: Optional[str] = None
    seat_number: Optional[str] = None
    address: Optional[str] = None
    instructions: Optional[List[str]] = None


class HallTicketCreate(HallTicketBase):
    """Schema for creating a hall ticket"""
    user_id: int


class HallTicketBulkCreate(BaseModel):
    """Schema for bulk creating hall tickets"""
    exam_id: int
    exam_type: str
    exam_title: str
    exam_date: datetime
    exam_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    venue: Optional[str] = None
    user_ids: List[int] = Field(..., min_items=1)  # List of student IDs
    instructions: Optional[List[str]] = None


class HallTicketResponse(HallTicketBase):
    """Schema for hall ticket response"""
    id: int
    user_id: int
    is_generated: bool
    generated_at: Optional[datetime] = None
    generated_by: Optional[int] = None
    pdf_url: Optional[str] = None
    college_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


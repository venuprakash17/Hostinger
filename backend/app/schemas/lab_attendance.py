"""Lab Attendance Schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class LabAttendanceCreate(BaseModel):
    """Schema for creating lab attendance"""
    lab_id: int
    student_id: int
    date: date
    status: str = Field(default="present", description="present, absent, late, excused")
    notes: Optional[str] = None
    session_number: Optional[int] = None


class LabAttendanceBulkCreate(BaseModel):
    """Schema for bulk creating lab attendance"""
    lab_id: int
    date: date
    attendance_records: List[dict] = Field(..., description="List of {student_id, status, notes}")
    session_number: Optional[int] = None


class LabAttendanceResponse(BaseModel):
    """Schema for lab attendance response"""
    id: int
    lab_id: int
    faculty_id: int
    student_id: int
    date: date
    status: str
    notes: Optional[str] = None
    session_number: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LabAttendanceSummary(BaseModel):
    """Summary of attendance for a lab"""
    lab_id: int
    total_students: int
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int
    attendance_percentage: float
    date: date


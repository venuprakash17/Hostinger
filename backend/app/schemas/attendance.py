"""Attendance schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class AttendanceBase(BaseModel):
    student_id: int
    subject_id: Optional[int] = None
    subject: str = Field(..., max_length=100)  # Keep for backward compatibility
    date: date
    status: str = Field(..., description="present, absent, late, or excused")
    semester_id: Optional[int] = None
    period_number: Optional[int] = None
    section: Optional[str] = None  # Section name (backward compatibility)
    section_id: Optional[int] = None  # Section ID reference
    notes: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceBulkCreate(BaseModel):
    """Bulk create attendance records"""
    records: List[AttendanceCreate]


class AttendanceUpdate(BaseModel):
    status: Optional[str] = Field(None, description="present, absent, late, or excused")
    notes: Optional[str] = None


class AttendanceApprovalRequest(BaseModel):
    """Request for HOD to approve/modify attendance"""
    approval_status: str = Field(..., description="approved, rejected, or requested_modification")
    approval_notes: Optional[str] = None


class AttendanceResponse(AttendanceBase):
    id: int
    college_id: Optional[int] = None
    department_id: Optional[int] = None
    marked_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Approval workflow
    approval_status: Optional[str] = None
    approved_by: Optional[int] = None
    approval_notes: Optional[str] = None
    approval_date: Optional[datetime] = None
    
    # Student info
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_roll_number: Optional[str] = None
    
    # Subject info
    subject_code: Optional[str] = None
    semester_name: Optional[str] = None
    
    class Config:
        from_attributes = True


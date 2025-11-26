"""User schemas"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class SubjectAssignmentInput(BaseModel):
    """Subject assignment input for user creation/update"""
    subject_id: int
    semester_id: Optional[int] = None
    section: Optional[str] = Field(None, max_length=50)
    section_id: Optional[int] = None


class UserListResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    department: Optional[str] = None
    section: Optional[str] = None
    roll_number: Optional[str] = None
    staff_id: Optional[str] = None
    college_id: Optional[int] = None
    present_year: Optional[str] = None
    roles: List[dict] = []
    is_active: bool
    created_at: datetime
    handled_years: Optional[List[str]] = None
    handled_sections: Optional[List[str]] = None
    
    class Config:
        from_attributes = True


class UserUpdateSchema(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    section: Optional[str] = Field(None, max_length=100)
    roll_number: Optional[str] = Field(None, max_length=50)
    staff_id: Optional[str] = Field(None, max_length=50, description="Staff ID for faculty/HOD/admin")
    college_id: Optional[int] = Field(None, description="College ID - can only be updated by super admin")
    role: Optional[str] = Field(None, description="User role - can only be updated by super admin")
    present_year: Optional[str] = Field(None, max_length=20)
    # For faculty: subject assignments
    subject_assignments: Optional[List[SubjectAssignmentInput]] = Field(None, description="Subject assignments for faculty")
    # For faculty/HOD: years/sections they handle
    handled_years: Optional[List[str]] = Field(None, description="Years handled (e.g., ['1st', '2nd', '3rd'])")
    handled_sections: Optional[List[str]] = Field(None, description="Sections handled (e.g., ['A', 'B', 'C'])")


class UserCreateSchema(BaseModel):
    email: Optional[EmailStr] = Field(None, description="Email address. If staff_id is provided for staff roles, this will be auto-generated as {staff_id}@staff.elevate.edu")
    password: Optional[str] = Field(None, min_length=6)  # Optional - will auto-generate from staff_id or user_id if not provided
    full_name: Optional[str] = Field(None, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    section: Optional[str] = Field(None, max_length=100)
    roll_number: Optional[str] = Field(None, max_length=50)
    staff_id: Optional[str] = Field(None, max_length=50, description="Staff ID for faculty/HOD/admin. If provided, email will be set to {staff_id}@staff.elevate.edu and password will be set to staff_id")
    present_year: Optional[str] = Field(None, max_length=20)
    role: str = Field(default="student")  # student, faculty, hod, admin, super_admin
    user_id: Optional[str] = Field(None, description="ID number for password generation (will be used as password in caps if password not provided)")
    # For faculty: subject assignments
    subject_assignments: Optional[List[SubjectAssignmentInput]] = Field(None, description="Subject assignments for faculty")
    # For faculty/HOD: years/sections they handle
    handled_years: Optional[List[str]] = Field(None, description="Years handled (e.g., ['1st', '2nd', '3rd'])")
    handled_sections: Optional[List[str]] = Field(None, description="Sections handled (e.g., ['A', 'B', 'C'])")


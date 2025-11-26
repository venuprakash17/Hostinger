"""Academic structure schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AcademicYearBase(BaseModel):
    name: str = Field(..., max_length=100)
    start_date: datetime
    end_date: datetime
    is_current: bool = False


class AcademicYearCreate(AcademicYearBase):
    pass


class AcademicYearUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_current: Optional[bool] = None


class AcademicYearResponse(AcademicYearBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class DepartmentBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    branch_id: Optional[str] = Field(None, max_length=50, description="Unique branch identifier")
    number_of_years: Optional[int] = Field(None, ge=1, le=10)
    vertical: Optional[str] = Field(None, max_length=100)


class DepartmentCreate(DepartmentBase):
    college_id: Optional[int] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    branch_id: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    number_of_years: Optional[int] = Field(None, ge=1, le=10)
    vertical: Optional[str] = Field(None, max_length=100)


class DepartmentResponse(DepartmentBase):
    id: int
    college_id: int
    branch_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SemesterBase(BaseModel):
    name: str = Field(..., max_length=50)
    number: int
    academic_year_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SemesterCreate(SemesterBase):
    college_id: Optional[int] = None


class SemesterUpdate(BaseModel):
    name: Optional[str] = None
    number: Optional[int] = None
    academic_year_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None


class SemesterResponse(SemesterBase):
    id: int
    college_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SubjectBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    department_id: Optional[int] = None
    semester_id: Optional[int] = None
    year: Optional[str] = Field(None, max_length=20, description="Academic year e.g., '1st', '2nd', '3rd', '4th', '5th'")
    credits: Optional[int] = None


class SubjectCreate(SubjectBase):
    college_id: Optional[int] = None


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    department_id: Optional[int] = None
    semester_id: Optional[int] = None
    year: Optional[str] = Field(None, max_length=20, description="Academic year e.g., '1st', '2nd', '3rd', '4th', '5th'")
    credits: Optional[int] = None
    is_active: Optional[bool] = None


class SubjectResponse(SubjectBase):
    id: int
    college_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SectionBase(BaseModel):
    name: str = Field(..., max_length=50)
    department_id: int
    semester_id: Optional[int] = None
    year: Optional[int] = Field(None, ge=1, le=10)


class SectionCreate(SectionBase):
    college_id: Optional[int] = None


class SectionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    department_id: Optional[int] = None
    semester_id: Optional[int] = None
    year: Optional[int] = Field(None, ge=1, le=10)
    is_active: Optional[bool] = None


class SectionResponse(SectionBase):
    id: int
    college_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    department_name: Optional[str] = None
    semester_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class SubjectAssignmentBase(BaseModel):
    faculty_id: int
    subject_id: int
    semester_id: Optional[int] = None
    section: Optional[str] = None
    section_id: Optional[int] = None


class SubjectAssignmentCreate(SubjectAssignmentBase):
    pass


class SubjectAssignmentUpdate(BaseModel):
    section: Optional[str] = None
    is_active: Optional[bool] = None


class SubjectAssignmentResponse(SubjectAssignmentBase):
    id: int
    is_active: bool
    assigned_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Related info
    subject_name: Optional[str] = None
    faculty_name: Optional[str] = None
    semester_name: Optional[str] = None
    section_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class PeriodBase(BaseModel):
    number: int
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class PeriodCreate(PeriodBase):
    college_id: Optional[int] = None


class PeriodUpdate(BaseModel):
    number: Optional[int] = None
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_active: Optional[bool] = None


class PeriodResponse(PeriodBase):
    id: int
    college_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


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
    year: Optional[str] = Field(None, max_length=20, description="Academic year e.g., '1st', '2nd', '3rd', '4th', '5th'")


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


# ==================== Academic Year Migration Schemas ====================

class AcademicYearMigrationBase(BaseModel):
    from_academic_year_id: Optional[int] = None
    to_academic_year_id: Optional[int] = None
    college_id: int
    migration_type: str = Field(..., description="year_transition or semester_transition")
    notes: Optional[str] = None


class AcademicYearMigrationCreate(AcademicYearMigrationBase):
    pass


class AcademicYearMigrationResponse(AcademicYearMigrationBase):
    id: int
    status: str
    students_promoted: int
    sections_archived: int
    subjects_archived: int
    assignments_cleared: int
    initiated_by: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    can_rollback: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PromotionRule(BaseModel):
    from_year: str = Field(..., description="e.g., '1st', '2nd', '3rd', '4th'")
    to_year: str = Field(..., description="e.g., '2nd', '3rd', '4th', '5th'")


class PromoteStudentsRequest(BaseModel):
    academic_year_id: int
    college_id: Optional[int] = None
    promotion_rules: List[PromotionRule]
    auto_approve: bool = True


class ArchiveOldYearRequest(BaseModel):
    from_academic_year_id: int
    to_academic_year_id: int
    college_id: int
    archive_sections: bool = True
    archive_subjects: bool = True
    archive_assignments: bool = True


class MigrationPreviewResponse(BaseModel):
    students_to_promote: int
    sections_to_archive: int
    subjects_to_archive: int
    assignments_to_clear: int
    promotion_breakdown: List[dict] = []
    sections_breakdown: List[dict] = []


# ==================== Bulk Upload Academic Structure ====================

class AcademicStructureUploadRow(BaseModel):
    subject_name: str
    subject_code: Optional[str] = None
    department_code: str
    year: str = Field(..., description="e.g., '1st', '2nd', '3rd', '4th'")
    semester: str = Field(..., description="Semester name or number")
    section: str = Field(..., description="Section name e.g., 'A', 'B', 'C'")
    faculty_email: Optional[str] = None
    faculty_staff_id: Optional[str] = None
    academic_year: Optional[str] = None


class AcademicStructureUploadResponse(BaseModel):
    total_rows: int
    successful: int
    failed: int
    created_subjects: int
    created_sections: int
    created_assignments: int
    errors: List[dict] = []


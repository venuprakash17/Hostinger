"""Academic structure models for LMS"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Text, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class AcademicYear(Base):
    """Academic year model (global settings by Super Admin)"""
    __tablename__ = "academic_years"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)  # e.g., "2024-2025"
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    is_current = Column(Boolean, default=False, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Department(Base):
    """Department/Branch model (created by College Admin)"""
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # e.g., "Computer Science", "Electronics"
    code = Column(String(20), nullable=True)  # e.g., "CSE", "ECE"
    branch_id = Column(String(50), nullable=True, unique=True, index=True)  # Unique branch identifier
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    hod_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    number_of_years = Column(Integer, nullable=True)
    vertical = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    college = relationship("College", backref="departments")
    hod = relationship("User", foreign_keys=[hod_id])


class Semester(Base):
    """Semester model (created by College Admin)"""
    __tablename__ = "semesters"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)  # e.g., "Semester 1", "Semester 2"
    number = Column(Integer, nullable=False)  # 1, 2, 3, 4, etc.
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    college = relationship("College", backref="semesters")
    academic_year = relationship("AcademicYear", backref="semesters")


class Subject(Base):
    """Subject model (created by College Admin)"""
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # e.g., "Data Structures", "Database Systems"
    code = Column(String(20), nullable=True)  # e.g., "CS301", "DB401"
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=True, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True, index=True)
    year = Column(String(20), nullable=True)  # e.g., "1st", "2nd", "3rd", "4th", "5th" - matches student present_year
    credits = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    college = relationship("College", backref="subjects")
    department = relationship("Department", backref="subjects")
    semester = relationship("Semester", backref="subjects")


class Section(Base):
    """Section model (created by College Admin)"""
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)  # e.g., "A", "B"
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True, index=True)
    year = Column(Integer, nullable=True)  # Academic year (1,2,3,...)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    college = relationship("College", backref="sections")
    department = relationship("Department", backref="sections")
    semester = relationship("Semester", backref="sections")


class FacultySectionAssignment(Base):
    """Faculty assignment to sections (for viewing/managing students)"""
    __tablename__ = "faculty_section_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Unique constraint: one assignment per faculty per section
    __table_args__ = (
        UniqueConstraint('faculty_id', 'section_id', name='unique_faculty_section'),
    )
    
    # Relationships
    faculty = relationship("User", foreign_keys=[faculty_id])
    section = relationship("Section", backref="faculty_assignments")


class SubjectAssignment(Base):
    """Subject assignment to faculty (created by College Admin)"""
    __tablename__ = "subject_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True, index=True)
    section = Column(String(50), nullable=True)  # e.g., "A", "B", "C"
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True, index=True)
    year = Column(String(20), nullable=True)  # e.g., "1st", "2nd", "3rd", "4th", "5th" - Academic year for this assignment
    is_active = Column(Boolean, default=True, nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Unique constraint: one assignment per faculty per subject per section per semester
    __table_args__ = (
        UniqueConstraint('faculty_id', 'subject_id', 'semester_id', 'section', 'section_id', name='unique_faculty_subject_semester_section'),
    )
    
    # Relationships
    faculty = relationship("User", foreign_keys=[faculty_id])
    subject = relationship("Subject", backref="assignments")
    semester = relationship("Semester", backref="subject_assignments")
    section_obj = relationship("Section", backref="subject_assignments")


class Period(Base):
    """Period/Hour model for class timing"""
    __tablename__ = "periods"
    
    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    name = Column(String(50), nullable=True)  # e.g., "Period 1", "First Hour"
    start_time = Column(String(10), nullable=True)  # e.g., "09:00"
    end_time = Column(String(10), nullable=True)  # e.g., "10:00"
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    college = relationship("College", backref="periods")


class AcademicYearMigration(Base):
    """Tracks academic year migration operations"""
    __tablename__ = "academic_year_migrations"
    
    id = Column(Integer, primary_key=True, index=True)
    from_academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True, index=True)
    to_academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Migration Type
    migration_type = Column(String(20), nullable=False)  # "year_transition", "semester_transition"
    
    # Status
    status = Column(String(20), default="pending", nullable=False, index=True)  # "pending", "in_progress", "completed", "failed"
    
    # Statistics
    students_promoted = Column(Integer, default=0)
    sections_archived = Column(Integer, default=0)
    subjects_archived = Column(Integer, default=0)
    assignments_cleared = Column(Integer, default=0)
    
    # Metadata
    initiated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Rollback support
    can_rollback = Column(Boolean, default=True)
    rollback_data = Column(JSON, nullable=True)  # Store state for potential rollback
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    from_academic_year = relationship("AcademicYear", foreign_keys=[from_academic_year_id])
    to_academic_year = relationship("AcademicYear", foreign_keys=[to_academic_year_id])
    college = relationship("College", backref="academic_year_migrations")
    initiator = relationship("User", foreign_keys=[initiated_by])


class ArchivedSubjectAssignment(Base):
    """Archived subject assignments from previous academic years"""
    __tablename__ = "archived_subject_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    original_id = Column(Integer, nullable=False)  # Original SubjectAssignment ID
    faculty_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True, index=True)
    section = Column(String(50), nullable=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Academic year context
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True, index=True)
    migration_id = Column(Integer, ForeignKey("academic_year_migrations.id", ondelete="SET NULL"), nullable=True, index=True)
    
    archived_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    faculty = relationship("User", foreign_keys=[faculty_id])
    subject = relationship("Subject", foreign_keys=[subject_id])
    semester = relationship("Semester", foreign_keys=[semester_id])
    section_obj = relationship("Section", foreign_keys=[section_id])
    academic_year = relationship("AcademicYear", foreign_keys=[academic_year_id])
    migration = relationship("AcademicYearMigration", foreign_keys=[migration_id])


class ArchivedFacultySectionAssignment(Base):
    """Archived faculty-section assignments from previous academic years"""
    __tablename__ = "archived_faculty_section_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    original_id = Column(Integer, nullable=False)  # Original FacultySectionAssignment ID
    faculty_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Academic year context
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True, index=True)
    migration_id = Column(Integer, ForeignKey("academic_year_migrations.id", ondelete="SET NULL"), nullable=True, index=True)
    
    archived_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    faculty = relationship("User", foreign_keys=[faculty_id])
    section = relationship("Section", foreign_keys=[section_id])
    academic_year = relationship("AcademicYear", foreign_keys=[academic_year_id])
    migration = relationship("AcademicYearMigration", foreign_keys=[migration_id])


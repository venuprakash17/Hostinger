"""Attendance model"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Date, UniqueConstraint, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Attendance(Base):
    """Attendance model for tracking student attendance"""
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True, index=True)
    subject = Column(String(100), nullable=False)  # Keep for backward compatibility
    date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False)  # present, absent, late, excused
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True, index=True)
    period_number = Column(Integer, nullable=True)  # Period/hour number (1, 2, 3, etc.)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="SET NULL"), nullable=True, index=True)
    section = Column(String(100), nullable=True)  # Section name for reference (backward compatibility)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True, index=True)  # Section ID reference
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    marked_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Approval workflow
    approval_status = Column(String(20), default="pending", nullable=False)  # pending, approved, rejected, requested_modification
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    approval_notes = Column(Text, nullable=True)
    approval_date = Column(DateTime(timezone=True), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)  # Additional notes by faculty
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Unique constraint: one attendance record per student per subject per date per period
    # Note: SQLite treats NULL as distinct in unique constraints, so multiple NULL period_numbers
    # are allowed. We handle this in application logic by checking for existing records.
    # For databases other than SQLite, we could use a partial unique index.
    __table_args__ = (
        # UniqueConstraint is commented out because SQLite doesn't handle NULL well in unique constraints
        # We handle uniqueness in application logic in the API endpoint
        # UniqueConstraint('student_id', 'subject_id', 'date', 'period_number', name='unique_student_subject_date_period'),
    )
    
    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    marker = relationship("User", foreign_keys=[marked_by])
    subject_rel = relationship("Subject", foreign_keys=[subject_id])
    semester = relationship("Semester", foreign_keys=[semester_id])
    department = relationship("Department", foreign_keys=[department_id])
    section_rel = relationship("Section", foreign_keys=[section_id])
    approver = relationship("User", foreign_keys=[approved_by])


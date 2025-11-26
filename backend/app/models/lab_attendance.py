"""Lab Attendance Model - For tracking attendance in coding labs"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class LabAttendance(Base):
    """Lab-specific attendance tracking"""
    __tablename__ = "lab_attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False, index=True)  # Faculty who marked attendance
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Attendance details
    date = Column(Date, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="present")  # present, absent, late, excused
    notes = Column(Text, nullable=True)  # Additional notes
    
    # Session details
    session_number = Column(Integer, nullable=True)  # Lab session number (1, 2, 3, etc.)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Unique constraint: one attendance record per student per lab per date
    __table_args__ = (
        UniqueConstraint('lab_id', 'student_id', 'date', name='unique_lab_student_date'),
    )
    
    # Relationships
    lab = relationship("CodingLab", back_populates="lab_attendance")
    faculty = relationship("User", foreign_keys=[faculty_id])
    student = relationship("User", foreign_keys=[student_id])


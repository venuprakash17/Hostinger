"""Proctoring Violations Model - Detailed tracking of student violations"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class ViolationType(str, enum.Enum):
    """Types of proctoring violations"""
    TAB_SWITCH = "tab_switch"
    FULLSCREEN_EXIT = "fullscreen_exit"
    WINDOW_BLUR = "window_blur"
    COPY_PASTE = "copy_paste"
    DEVTOOLS = "devtools"
    OTHER = "other"


class ViolationSeverity(str, enum.Enum):
    """Severity levels for violations"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ProctoringViolation(Base):
    """Individual proctoring violation record"""
    __tablename__ = "proctoring_violations"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_id = Column(Integer, ForeignKey("lab_submissions.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Violation details
    violation_type = Column(Enum(ViolationType), nullable=False, index=True)
    severity = Column(Enum(ViolationSeverity), default=ViolationSeverity.LOW, nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Additional details
    details = Column(JSON, nullable=True)  # Store additional violation data
    description = Column(Text, nullable=True)  # Human-readable description
    
    # Context
    time_spent_seconds = Column(Integer, nullable=True)  # Time spent when violation occurred
    problem_id = Column(Integer, ForeignKey("lab_problems.id", ondelete="SET NULL"), nullable=True)
    
    # Review status
    is_reviewed = Column(Boolean, default=False, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)
    
    # Relationships
    lab = relationship("CodingLab")
    user = relationship("User", foreign_keys=[user_id])
    submission = relationship("LabSubmission", foreign_keys=[submission_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    problem = relationship("LabProblem")
    session_id = Column(Integer, ForeignKey("proctoring_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    session = relationship("ProctoringSession", back_populates="violations")


class ProctoringSession(Base):
    """Proctoring session tracking for each student-lab combination"""
    __tablename__ = "proctoring_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Session tracking
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    total_time_seconds = Column(Integer, default=0, nullable=False)
    
    # Violation counts
    total_violations = Column(Integer, default=0, nullable=False)
    tab_switches = Column(Integer, default=0, nullable=False)
    fullscreen_exits = Column(Integer, default=0, nullable=False)
    window_blurs = Column(Integer, default=0, nullable=False)
    copy_paste_events = Column(Integer, default=0, nullable=False)
    devtools_opens = Column(Integer, default=0, nullable=False)
    
    # Activity tracking
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Summary
    violation_summary = Column(JSON, nullable=True)  # Summary by type and severity
    
    # Relationships
    lab = relationship("CodingLab")
    user = relationship("User")
    violations = relationship("ProctoringViolation", back_populates="session", cascade="all, delete-orphan")


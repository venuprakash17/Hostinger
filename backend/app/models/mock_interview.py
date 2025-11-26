"""Mock Interview model"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class InterviewStatus(str, enum.Enum):
    """Interview status"""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class InterviewType(str, enum.Enum):
    """Interview type"""
    TECHNICAL = "technical"
    HR = "hr"
    MANAGERIAL = "managerial"
    MOCK = "mock"
    BEHAVIORAL = "behavioral"


class MockInterview(Base):
    """Mock Interview model"""
    __tablename__ = "mock_interviews"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Interview Details
    title = Column(String(255), nullable=False)
    interview_type = Column(SQLEnum(InterviewType), nullable=False, default=InterviewType.MOCK)
    description = Column(Text, nullable=True)
    
    # Participants
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    interviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    interviewer_name = Column(String(255), nullable=True)  # External interviewer name
    
    # Scheduling
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, default=60, nullable=False)  # Interview duration
    meeting_link = Column(String(500), nullable=True)  # Zoom/Google Meet link
    venue = Column(String(255), nullable=True)  # Physical venue if offline
    
    # Status
    status = Column(SQLEnum(InterviewStatus), default=InterviewStatus.SCHEDULED, nullable=False, index=True)
    
    # Feedback & Results
    feedback = Column(Text, nullable=True)  # Interviewer feedback
    rating = Column(Integer, nullable=True)  # Rating out of 10
    strengths = Column(JSON, nullable=True)  # Array of strengths
    areas_for_improvement = Column(JSON, nullable=True)  # Array of improvement areas
    technical_score = Column(Integer, nullable=True)  # Technical skills score (0-100)
    communication_score = Column(Integer, nullable=True)  # Communication score (0-100)
    problem_solving_score = Column(Integer, nullable=True)  # Problem solving score (0-100)
    
    # Recording & Materials
    recording_url = Column(String(500), nullable=True)  # Video recording URL
    notes = Column(Text, nullable=True)  # Additional notes
    
    # College & Admin
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)  # When interview actually started
    completed_at = Column(DateTime(timezone=True), nullable=True)  # When interview completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    interviewer = relationship("User", foreign_keys=[interviewer_id])
    college = relationship("College", foreign_keys=[college_id])


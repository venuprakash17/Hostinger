"""Coding problem submission model"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CodingSubmission(Base):
    """Store student submissions for coding problems"""
    __tablename__ = "coding_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(Integer, ForeignKey("coding_problems.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(20), nullable=False)  # python, c, cpp, java, javascript
    code = Column(Text, nullable=False)
    
    # Execution results
    status = Column(String(20), nullable=False, default="pending")  # pending, accepted, wrong_answer, runtime_error, time_limit_exceeded
    passed_tests = Column(Integer, default=0, nullable=False)
    total_tests = Column(Integer, default=0, nullable=False)
    execution_time = Column(Float, nullable=True)  # seconds
    memory_used = Column(Float, nullable=True)  # MB
    
    # Test case results (JSON array)
    test_results = Column(JSON, nullable=True)  # Array of {test_case, passed, expected, actual, error}
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    problem = relationship("CodingProblem")
    
    # Indexes for common queries
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class CodingActivity(Base):
    """Track detailed coding activity - time spent, sessions, etc."""
    __tablename__ = "coding_activity"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(Integer, ForeignKey("coding_problems.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_code = Column(String(100), nullable=True, index=True)  # For analytics tracking
    
    # Time tracking
    time_spent_seconds = Column(Integer, nullable=False)  # Time spent on this problem
    session_time_seconds = Column(Integer, nullable=False)  # Total session time
    
    # Activity type
    action = Column(String(50), nullable=False, default="time_track")  # time_track, session_end, submission_accepted, submission_failed
    is_final = Column(Boolean, default=False, nullable=False)  # Final tracking before leaving
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User")
    problem = relationship("CodingProblem")
    
    # Indexes for common queries
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


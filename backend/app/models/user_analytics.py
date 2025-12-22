"""Comprehensive User Analytics Models - Track everything users do"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, JSON, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ActivityType(str, enum.Enum):
    """Types of user activities to track"""
    # Coding
    CODING_PROBLEM_VIEWED = "coding_problem_viewed"
    CODING_PROBLEM_STARTED = "coding_problem_started"
    CODE_EXECUTED = "code_executed"
    CODE_SUBMITTED = "code_submitted"
    CODE_ACCEPTED = "code_accepted"
    CODE_FAILED = "code_failed"
    TIME_SPENT = "time_spent"
    
    # Quizzes
    QUIZ_STARTED = "quiz_started"
    QUIZ_COMPLETED = "quiz_completed"
    QUIZ_QUESTION_ANSWERED = "quiz_question_answered"
    
    # Company Training
    COMPANY_TRAINING_STARTED = "company_training_started"
    COMPANY_ROUND_STARTED = "company_round_started"
    COMPANY_ROUND_COMPLETED = "company_round_completed"
    
    # Labs
    LAB_STARTED = "lab_started"
    LAB_SESSION_STARTED = "lab_session_started"
    LAB_SESSION_COMPLETED = "lab_session_completed"
    LAB_SUBMITTED = "lab_submitted"
    
    # Jobs
    JOB_VIEWED = "job_viewed"
    JOB_APPLIED = "job_applied"
    
    # General
    PAGE_VIEWED = "page_viewed"
    FEATURE_USED = "feature_used"
    LOGIN = "login"
    LOGOUT = "logout"


class UserActivity(Base):
    """Track all user activities in detail"""
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Activity details
    activity_type = Column(String(50), nullable=False, index=True)
    activity_category = Column(String(50), nullable=True, index=True)  # coding, quiz, lab, job, etc.
    
    # Context - what was the user doing
    entity_type = Column(String(50), nullable=True, index=True)  # coding_problem, quiz, lab, job, etc.
    entity_id = Column(Integer, nullable=True, index=True)  # ID of the entity
    entity_name = Column(String(255), nullable=True)  # Name/title for easy reference
    
    # Detailed metadata
    activity_metadata = Column(JSON, nullable=True)  # Store any additional data (renamed from metadata to avoid SQLAlchemy conflict)
    
    # Time tracking
    duration_seconds = Column(Integer, nullable=True)  # How long the activity took
    active_time_seconds = Column(Integer, nullable=True)  # Active time (not idle)
    
    # Status/Result
    status = Column(String(50), nullable=True)  # success, failed, in_progress, etc.
    result = Column(JSON, nullable=True)  # Result data (scores, errors, etc.)
    
    # Session info
    session_id = Column(String(100), nullable=True, index=True)  # Track sessions
    page_url = Column(String(500), nullable=True)  # Which page was viewed
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", backref="activities")
    
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class UserSession(Base):
    """Track user sessions - active time, pages visited, etc."""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Session tracking
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Time tracking
    total_time_seconds = Column(Integer, default=0, nullable=False)
    active_time_seconds = Column(Integer, default=0, nullable=False)  # Active (not idle)
    idle_time_seconds = Column(Integer, default=0, nullable=False)
    
    # Activity counts
    page_views = Column(Integer, default=0, nullable=False)
    actions_count = Column(Integer, default=0, nullable=False)
    
    # Pages visited (JSON array)
    pages_visited = Column(JSON, nullable=True)  # Array of page URLs
    
    # Device/Browser info
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", backref="sessions")
    
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class StudentProgress(Base):
    """Comprehensive student progress tracking"""
    __tablename__ = "student_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Coding progress
    total_coding_problems_viewed = Column(Integer, default=0, nullable=False)
    total_coding_problems_attempted = Column(Integer, default=0, nullable=False)
    total_coding_problems_solved = Column(Integer, default=0, nullable=False)
    total_coding_submissions = Column(Integer, default=0, nullable=False)
    total_coding_time_minutes = Column(Integer, default=0, nullable=False)
    coding_acceptance_rate = Column(Float, default=0.0, nullable=False)
    
    # Quiz progress
    total_quizzes_attempted = Column(Integer, default=0, nullable=False)
    total_quizzes_completed = Column(Integer, default=0, nullable=False)
    total_quiz_questions_answered = Column(Integer, default=0, nullable=False)
    average_quiz_score = Column(Float, default=0.0, nullable=False)
    
    # Lab progress
    total_labs_started = Column(Integer, default=0, nullable=False)
    total_labs_completed = Column(Integer, default=0, nullable=False)
    total_lab_sessions = Column(Integer, default=0, nullable=False)
    total_lab_time_minutes = Column(Integer, default=0, nullable=False)
    
    # Company training progress
    total_company_trainings_started = Column(Integer, default=0, nullable=False)
    total_company_rounds_completed = Column(Integer, default=0, nullable=False)
    total_company_rounds_passed = Column(Integer, default=0, nullable=False)
    
    # Job applications
    total_jobs_viewed = Column(Integer, default=0, nullable=False)
    total_jobs_applied = Column(Integer, default=0, nullable=False)
    
    # Overall activity
    total_active_minutes = Column(Integer, default=0, nullable=False)  # Total active time across all features
    total_sessions = Column(Integer, default=0, nullable=False)
    last_activity_at = Column(DateTime(timezone=True), nullable=True)
    
    # Performance metrics
    problems_by_difficulty = Column(JSON, nullable=True)  # {easy: count, medium: count, hard: count}
    languages_used = Column(JSON, nullable=True)  # {python: count, java: count, etc.}
    topics_covered = Column(JSON, nullable=True)  # Array of topics/tags
    
    # Streak tracking
    current_streak_days = Column(Integer, default=0, nullable=False)
    longest_streak_days = Column(Integer, default=0, nullable=False)
    last_activity_date = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    user = relationship("User", backref="progress", uselist=False)
    
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class FeatureAnalytics(Base):
    """Analytics for specific features - aggregated data"""
    __tablename__ = "feature_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Feature identification
    feature_name = Column(String(100), nullable=False, index=True)  # coding_problems, quizzes, labs, etc.
    entity_type = Column(String(50), nullable=True, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    
    # Time period
    date = Column(DateTime(timezone=True), nullable=False, index=True)  # Date for daily aggregation
    period_type = Column(String(20), default="daily", nullable=False)  # daily, weekly, monthly
    
    # Metrics
    total_users = Column(Integer, default=0, nullable=False)
    active_users = Column(Integer, default=0, nullable=False)
    total_actions = Column(Integer, default=0, nullable=False)
    total_time_minutes = Column(Integer, default=0, nullable=False)
    
    # Success metrics
    total_completions = Column(Integer, default=0, nullable=False)
    total_successes = Column(Integer, default=0, nullable=False)
    success_rate = Column(Float, default=0.0, nullable=False)
    
    # Detailed metrics (JSON)
    metrics = Column(JSON, nullable=True)  # Feature-specific metrics
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


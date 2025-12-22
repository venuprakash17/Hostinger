"""Resume Analytics Models - Track resume usage, ATS scores, and optimizations"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ResumeAnalytics(Base):
    """Track resume-related activities and metrics"""
    __tablename__ = "resume_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Activity type
    activity_type = Column(String(50), nullable=False, index=True)  # ats_check, cover_letter, role_optimization, pdf_generation, text_enhancement
    
    # Resume metrics
    ats_score = Column(Float, nullable=True)  # ATS score (0-100)
    previous_ats_score = Column(Float, nullable=True)  # Previous score for comparison
    score_improvement = Column(Float, nullable=True)  # Improvement percentage
    
    # Activity details
    target_role = Column(String(200), nullable=True)  # Role being optimized for
    company_name = Column(String(200), nullable=True)  # Company for cover letter
    job_description_provided = Column(String(10), default="false")  # Whether job description was provided
    
    # Performance metrics
    duration_seconds = Column(Integer, nullable=True)  # How long the operation took
    tokens_used = Column(Integer, nullable=True)  # OpenAI tokens used
    estimated_cost = Column(Float, nullable=True)  # Estimated API cost
    
    # Results and recommendations
    recommendations = Column(JSON, nullable=True)  # List of recommendations
    missing_keywords = Column(JSON, nullable=True)  # Missing keywords
    strengths = Column(JSON, nullable=True)  # Resume strengths
    improvements = Column(JSON, nullable=True)  # Areas for improvement
    
    # Status
    status = Column(String(50), nullable=False, default="success")  # success, failed, error
    error_message = Column(Text, nullable=True)  # Error message if failed
    
    # Additional metadata (renamed from 'metadata' as it's reserved in SQLAlchemy)
    extra_data = Column(JSON, nullable=True)  # Additional data (resume sections completed, etc.)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", backref="resume_analytics")
    
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class StudentResumeProgress(Base):
    """Aggregated resume progress for each student"""
    __tablename__ = "student_resume_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Resume completion
    profile_completeness = Column(Float, default=0.0, nullable=False)  # 0-100
    sections_completed = Column(JSON, nullable=True)  # Which sections are complete
    
    # ATS metrics
    current_ats_score = Column(Float, nullable=True)  # Latest ATS score
    best_ats_score = Column(Float, nullable=True)  # Best ATS score achieved
    average_ats_score = Column(Float, default=0.0, nullable=False)  # Average ATS score
    total_ats_checks = Column(Integer, default=0, nullable=False)  # Number of ATS checks
    
    # Usage statistics
    total_resumes_generated = Column(Integer, default=0, nullable=False)
    total_cover_letters_generated = Column(Integer, default=0, nullable=False)
    total_role_optimizations = Column(Integer, default=0, nullable=False)
    total_text_enhancements = Column(Integer, default=0, nullable=False)
    
    # AI usage
    total_tokens_used = Column(Integer, default=0, nullable=False)
    total_estimated_cost = Column(Float, default=0.0, nullable=False)
    
    # Last activity
    last_ats_check_at = Column(DateTime(timezone=True), nullable=True)
    last_resume_generated_at = Column(DateTime(timezone=True), nullable=True)
    last_cover_letter_at = Column(DateTime(timezone=True), nullable=True)
    last_optimization_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    user = relationship("User", backref="resume_progress")
    
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


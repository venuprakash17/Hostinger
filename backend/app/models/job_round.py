"""Job Round model for placement tracking"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class JobRound(Base):
    """Job Round model - defines rounds for a job (Aptitude, Quiz, Technical, HR, Final Selection)"""
    __tablename__ = "job_rounds"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Round Information
    name = Column(String(100), nullable=False)  # e.g., "Aptitude", "Quiz", "Technical", "HR", "Final Selection"
    order = Column(Integer, nullable=False)  # Order of the round (1, 2, 3, ...)
    description = Column(String(500), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    job = relationship("Job", back_populates="job_rounds")
    application_rounds = relationship("JobApplicationRound", back_populates="round", cascade="all, delete-orphan")


class JobApplicationRound(Base):
    """Job Application Round model - tracks student progress through rounds"""
    __tablename__ = "job_application_rounds"
    
    id = Column(Integer, primary_key=True, index=True)
    job_application_id = Column(Integer, ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    round_id = Column(Integer, ForeignKey("job_rounds.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Round Status
    status = Column(String(50), nullable=False, default="PENDING")
    # Options: "PENDING", "QUALIFIED", "REJECTED", "ABSENT"
    
    # Additional Information
    remarks = Column(String(1000), nullable=True)  # Admin remarks/feedback
    
    # Audit Trail
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    application = relationship("JobApplication", back_populates="round_statuses")
    round = relationship("JobRound", back_populates="application_rounds")
    updater = relationship("User", foreign_keys=[updated_by])

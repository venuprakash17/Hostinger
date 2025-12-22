"""Job/Placement model"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Job(Base):
    """Job/Placement posting model"""
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Job Information
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    ctc = Column(String(100), nullable=True)  # Can be "₹12 LPA" or range
    
    # Eligibility Criteria
    eligibility_type = Column(String(50), nullable=False, default="all_students")  
    # Options: "all_students", "branch", "specific_students"
    
    # If eligibility_type is "branch", store branches in this JSON array
    # Example: ["CSE", "ECE", "IT"]
    eligible_branches = Column(JSON, nullable=True)
    
    # If eligibility_type is "specific_students", store user IDs in this JSON array
    # Example: [1, 2, 3, 4, 5]
    eligible_user_ids = Column(JSON, nullable=True)
    
    # Job Details
    job_type = Column(String(50), nullable=False, default="On-Campus")
    # Options: "On-Campus", "Off-Campus", "Internship"
    
    requirements = Column(JSON, nullable=True)  # Array of requirement strings
    rounds = Column(JSON, nullable=True)  # Array of round names
    
    # Dates
    deadline = Column(DateTime(timezone=True), nullable=True)
    posted_date = Column(DateTime(timezone=True), server_default=func.now())
    
    # Application Link
    apply_link = Column(String(500), nullable=True)  # External application URL
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # College and Admin (college_id is nullable - NULL means available to all students)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    college = relationship("College", back_populates="jobs")
    creator = relationship("User", foreign_keys=[created_by])
    applications = relationship("JobApplication", back_populates="job", cascade="all, delete-orphan")


class JobApplication(Base):
    """Job application tracking model"""
    __tablename__ = "job_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    status = Column(String(50), nullable=False, default="Applied")
    # Options: "Applied", "Shortlisted", "Interview", "Rejected", "Selected", "Offer"
    
    current_round = Column(String(100), nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Additional notes/feedback (admin can add)
    notes = Column(Text, nullable=True)
    
    # Relationships
    job = relationship("Job", back_populates="applications")
    user = relationship("User")


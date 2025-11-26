"""Job Aggregation model for external job sources"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class JobAggregation(Base):
    """Job aggregation model for jobs from external sources"""
    __tablename__ = "job_aggregations"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # External Source Information
    source = Column(String(50), nullable=False, index=True)  # "linkedin", "indeed", "naukri", etc.
    external_id = Column(String(255), nullable=True, index=True)  # ID from external source
    source_url = Column(String(500), nullable=True)  # Original job posting URL
    
    # Job Information (mirrors Job model)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    ctc = Column(String(100), nullable=True)
    
    # Additional fields from external sources
    job_type = Column(String(50), nullable=True)  # "Full-time", "Part-time", "Contract", etc.
    experience_required = Column(String(100), nullable=True)  # "0-2 years", "2-5 years", etc.
    skills_required = Column(JSON, nullable=True)  # Array of required skills
    qualifications = Column(Text, nullable=True)  # Education requirements
    
    # Metadata
    posted_date = Column(DateTime(timezone=True), nullable=True)  # Date from external source
    expiry_date = Column(DateTime(timezone=True), nullable=True)  # If available from source
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_imported = Column(Boolean, default=False, nullable=False)  # Whether imported to main jobs table
    
    # College association (optional - can be global)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="SET NULL"), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_synced_at = Column(DateTime(timezone=True), nullable=True)  # Last time synced from source
    
    # Relationships
    college = relationship("College", foreign_keys=[college_id])


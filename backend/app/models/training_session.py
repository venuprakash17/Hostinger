"""Training session model for placement training"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class TrainingSession(Base):
    """Training session model for placement training"""
    __tablename__ = "training_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    session_type = Column(String(50), nullable=False)  # quiz, coding, mock_interview, aptitude
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Targeting - can target by department, year, or section
    target_type = Column(String(50), nullable=False, default="all")  
    # Options: "all", "department", "year", "section", "department_year", "department_section"
    
    # If target_type includes department, store department name(s)
    target_departments = Column(JSON, nullable=True)  # Array of department names
    
    # If target_type includes year, store year(s)
    target_years = Column(JSON, nullable=True)  # Array of years (e.g., ["1", "2", "3"])
    
    # If target_type includes section, store section name(s)
    target_sections = Column(JSON, nullable=True)  # Array of section names
    
    # College and Creator
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    college = relationship("College", back_populates="training_sessions")


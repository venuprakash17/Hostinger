"""College model"""
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class College(Base):
    """College model"""
    __tablename__ = "colleges"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)  # Added pincode field
    is_active = Column(String(10), default="true")  # "true" or "false" to disable college
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    profiles = relationship("Profile", back_populates="college")
    users_with_role = relationship("UserRole", back_populates="college")
    jobs = relationship("Job", back_populates="college", cascade="all, delete-orphan")
    training_sessions = relationship("TrainingSession", back_populates="college", cascade="all, delete-orphan")
    coding_labs = relationship("CodingLab", back_populates="college", cascade="all, delete-orphan")


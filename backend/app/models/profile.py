"""User profile model"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Profile(Base):
    """User profile model"""
    __tablename__ = "profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="SET NULL"), nullable=True, index=True)
    department = Column(String(100), nullable=True)  # Backward compatibility - department name
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)  # Link to Department
    section = Column(String(100), nullable=True)  # Backward compatibility - section name
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True, index=True)  # Link to Section
    roll_number = Column(String(50), nullable=True)
    staff_id = Column(String(50), nullable=True, index=True)  # Staff ID for faculty/HOD/admin (used as login ID)
    present_year = Column(String(20), nullable=True)  # e.g., "1st", "2nd", "3rd", "4th", "5th"
    # For faculty/HOD: years and sections they handle (stored as comma-separated strings)
    handled_years = Column(String(255), nullable=True)  # e.g., "1st,2nd,3rd"
    handled_sections = Column(String(255), nullable=True)  # e.g., "A,B,C"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="profile")
    college = relationship("College", back_populates="profiles")
    department_obj = relationship("Department", foreign_keys=[department_id], backref="profiles")
    section_obj = relationship("Section", foreign_keys=[section_id], backref="profiles")


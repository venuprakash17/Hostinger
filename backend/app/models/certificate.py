"""Certificate model for student certificates"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class CertificateType(str, enum.Enum):
    """Certificate type enumeration"""
    TENTH = "10th"
    INTERMEDIATE = "intermediate"
    COLLEGE = "college"
    OTHER = "other"


class CertificateStatus(str, enum.Enum):
    """Certificate review status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Certificate(Base):
    """Certificate model for student certificates"""
    __tablename__ = "certificates"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Certificate Information
    certificate_type = Column(SQLEnum(CertificateType), nullable=False)
    certificate_name = Column(String(255), nullable=False)  # e.g., "10th Standard Marksheet"
    issuing_authority = Column(String(255), nullable=True)  # e.g., "CBSE", "State Board"
    issue_date = Column(DateTime(timezone=True), nullable=True)
    
    # File Storage
    file_url = Column(String(500), nullable=False)  # Path to uploaded file
    file_name = Column(String(255), nullable=False)  # Original filename
    file_size = Column(Integer, nullable=True)  # File size in bytes
    mime_type = Column(String(100), nullable=True)  # e.g., "application/pdf", "image/jpeg"
    
    # Review Status
    status = Column(SQLEnum(CertificateStatus), default=CertificateStatus.PENDING, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)  # Admin can add notes
    
    # Additional Information
    description = Column(Text, nullable=True)
    grade_percentage = Column(String(50), nullable=True)  # e.g., "95%", "A+"
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


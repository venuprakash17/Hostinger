"""Year Promotion model for fee-based promotion"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, Enum as SQLEnum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class PromotionStatus(str, enum.Enum):
    """Promotion request status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


class YearPromotion(Base):
    """Year Promotion model for fee-based student promotion"""
    __tablename__ = "year_promotions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Promotion Details
    from_year = Column(String(20), nullable=False)  # e.g., "1st", "2nd", "3rd", "4th"
    to_year = Column(String(20), nullable=False)  # e.g., "2nd", "3rd", "4th", "5th"
    
    # Fee Information
    fee_paid = Column(Boolean, default=False, nullable=False)
    fee_amount = Column(Numeric(10, 2), nullable=True)  # Fee amount in currency
    payment_date = Column(DateTime(timezone=True), nullable=True)
    payment_reference = Column(String(255), nullable=True)  # Payment transaction ID/reference
    payment_proof_url = Column(String(500), nullable=True)  # Receipt/document URL
    
    # Approval
    status = Column(SQLEnum(PromotionStatus), default=PromotionStatus.PENDING, nullable=False, index=True)
    promoted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # Admin who approved
    promoted_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)  # If rejected, reason
    
    # Notes
    notes = Column(Text, nullable=True)  # Additional notes from admin
    
    # College
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    promoter = relationship("User", foreign_keys=[promoted_by])
    college = relationship("College", foreign_keys=[college_id])


"""Year Promotion schemas"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.models.year_promotion import PromotionStatus


class YearPromotionBase(BaseModel):
    """Base year promotion schema"""
    from_year: str = Field(..., pattern="^(1st|2nd|3rd|4th)$")
    to_year: str = Field(..., pattern="^(2nd|3rd|4th|5th)$")
    fee_amount: Optional[Decimal] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None


class YearPromotionCreate(YearPromotionBase):
    """Schema for creating a promotion request"""
    pass


class YearPromotionUpdate(BaseModel):
    """Schema for updating a promotion"""
    fee_paid: Optional[bool] = None
    fee_amount: Optional[Decimal] = None
    payment_date: Optional[datetime] = None
    payment_reference: Optional[str] = None
    payment_proof_url: Optional[str] = None
    status: Optional[PromotionStatus] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None


class YearPromotionApprove(BaseModel):
    """Schema for approving a promotion"""
    status: PromotionStatus = PromotionStatus.APPROVED
    notes: Optional[str] = None


class YearPromotionResponse(YearPromotionBase):
    """Schema for year promotion response"""
    id: int
    user_id: int
    fee_paid: bool
    payment_date: Optional[datetime] = None
    payment_proof_url: Optional[str] = None
    status: PromotionStatus
    promoted_by: Optional[int] = None
    promoted_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    college_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class BulkPromotionRequest(BaseModel):
    """Schema for bulk promotion"""
    user_ids: list[int] = Field(..., min_items=1)
    from_year: str = Field(..., pattern="^(1st|2nd|3rd|4th)$")
    to_year: str = Field(..., pattern="^(2nd|3rd|4th|5th)$")
    fee_amount: Optional[Decimal] = None
    auto_approve: bool = Field(default=False)  # Auto-approve if fee is paid


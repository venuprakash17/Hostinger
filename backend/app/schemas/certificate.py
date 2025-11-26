"""Certificate schemas"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.certificate import CertificateType, CertificateStatus


class CertificateBase(BaseModel):
    """Base certificate schema"""
    certificate_type: CertificateType
    certificate_name: str = Field(..., min_length=1, max_length=255)
    issuing_authority: Optional[str] = Field(None, max_length=255)
    issue_date: Optional[datetime] = None
    description: Optional[str] = None
    grade_percentage: Optional[str] = Field(None, max_length=50)


class CertificateCreate(CertificateBase):
    """Schema for creating a certificate"""
    pass


class CertificateUpdate(BaseModel):
    """Schema for updating a certificate"""
    certificate_name: Optional[str] = Field(None, min_length=1, max_length=255)
    issuing_authority: Optional[str] = Field(None, max_length=255)
    issue_date: Optional[datetime] = None
    description: Optional[str] = None
    grade_percentage: Optional[str] = Field(None, max_length=50)


class CertificateReview(BaseModel):
    """Schema for reviewing a certificate"""
    status: CertificateStatus
    review_notes: Optional[str] = None


class CertificateResponse(CertificateBase):
    """Schema for certificate response"""
    id: int
    user_id: int
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    status: CertificateStatus
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


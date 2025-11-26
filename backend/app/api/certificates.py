"""Certificate API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.certificate import Certificate, CertificateType, CertificateStatus
from app.models.user import User, UserRole, RoleEnum
from app.schemas.certificate import (
    CertificateCreate, CertificateUpdate, CertificateReview, CertificateResponse
)
from app.api.auth import get_current_user, get_current_admin
import os
import uuid
from pathlib import Path
from datetime import datetime

def get_current_admin_faculty_or_hod(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Verify user is admin, faculty, HOD, or super admin"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if (RoleEnum.ADMIN not in role_names and 
        RoleEnum.FACULTY not in role_names and 
        RoleEnum.HOD not in role_names and
        RoleEnum.SUPER_ADMIN not in role_names):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, faculty, HOD, or super admins can perform this action"
        )
    
    return current_user

router = APIRouter(prefix="/certificates", tags=["certificates"])

# File upload directory
UPLOAD_DIR = Path("uploads/certificates")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file types - Accept all common file formats
ALLOWED_EXTENSIONS = {
    # Documents
    ".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt",
    # Images
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".tiff", ".tif",
    # Spreadsheets
    ".xls", ".xlsx", ".csv", ".ods",
    # Presentations
    ".ppt", ".pptx", ".odp",
    # Archives
    ".zip", ".rar", ".7z",
    # Other
    ".html", ".xml"
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def save_uploaded_file(file: UploadFile, user_id: int) -> tuple[str, str, int]:
    """Save uploaded file and return (file_url, file_name, file_size)"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Generate unique filename
    unique_filename = f"{user_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Read and save file
    contents = file.file.read()
    file_size = len(contents)
    
    # Validate file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024*1024)}MB"
        )
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Return relative path for storage in database
    file_url = f"/uploads/certificates/{unique_filename}"
    return file_url, file.filename, file_size


@router.post("/", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED)
async def upload_certificate(
    certificate_type: str = Form(...),
    certificate_name: str = Form(...),
    issuing_authority: Optional[str] = Form(None),
    issue_date: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    grade_percentage: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a certificate (Student only)"""
    try:
        # Validate certificate type
        cert_type = CertificateType(certificate_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid certificate_type. Must be one of: {[e.value for e in CertificateType]}"
        )
    
    # Save file
    file_url, file_name, file_size = save_uploaded_file(file, current_user.id)
    
    # Parse issue date if provided
    parsed_issue_date = None
    if issue_date:
        try:
            parsed_issue_date = datetime.fromisoformat(issue_date.replace('Z', '+00:00'))
        except:
            pass
    
    # Create certificate record
    certificate = Certificate(
        user_id=current_user.id,
        certificate_type=cert_type,
        certificate_name=certificate_name,
        issuing_authority=issuing_authority,
        issue_date=parsed_issue_date,
        description=description,
        grade_percentage=grade_percentage,
        file_url=file_url,
        file_name=file_name,
        file_size=file_size,
        mime_type=file.content_type,
        status=CertificateStatus.PENDING
    )
    
    db.add(certificate)
    db.commit()
    db.refresh(certificate)
    
    return certificate


@router.get("/my", response_model=List[CertificateResponse])
async def get_my_certificates(
    certificate_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's certificates"""
    query = db.query(Certificate).filter(Certificate.user_id == current_user.id)
    
    if certificate_type:
        try:
            cert_type = CertificateType(certificate_type)
            query = query.filter(Certificate.certificate_type == cert_type)
        except ValueError:
            pass
    
    if status_filter:
        try:
            cert_status = CertificateStatus(status_filter)
            query = query.filter(Certificate.status == cert_status)
        except ValueError:
            pass
    
    certificates = query.order_by(Certificate.created_at.desc()).all()
    return certificates


@router.get("/pending", response_model=List[CertificateResponse])
async def get_pending_certificates(
    college_id: Optional[int] = None,
    certificate_type: Optional[str] = None,
    current_user: User = Depends(get_current_admin_faculty_or_hod),
    db: Session = Depends(get_db)
):
    """Get pending certificates for review (Admin, Faculty, HOD, or Super Admin)"""
    from app.models.profile import Profile
    
    # Get user's college from their role
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    # Super admin can see all certificates
    if RoleEnum.SUPER_ADMIN in role_names:
        target_college_id = college_id
    else:
        # For admin, faculty, or HOD, get their college
        user_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role.in_([RoleEnum.ADMIN, RoleEnum.FACULTY, RoleEnum.HOD])
        ).first()
        
        if not user_role or not user_role.college_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be associated with a college"
            )
        
        target_college_id = college_id or user_role.college_id
    
    # Query pending certificates
    if target_college_id:
        # Get all users in the college
        college_user_ids = db.query(Profile.user_id).filter(
            Profile.college_id == target_college_id
        ).subquery()
        
        query = db.query(Certificate).filter(
            Certificate.user_id.in_(college_user_ids),
            Certificate.status == CertificateStatus.PENDING
        )
    else:
        # Super admin - get all pending certificates
        query = db.query(Certificate).filter(
            Certificate.status == CertificateStatus.PENDING
        )
    
    if certificate_type:
        try:
            cert_type = CertificateType(certificate_type)
            query = query.filter(Certificate.certificate_type == cert_type)
        except ValueError:
            pass
    
    certificates = query.order_by(Certificate.created_at.asc()).all()
    return certificates


@router.put("/{certificate_id}/review", response_model=CertificateResponse)
async def review_certificate(
    certificate_id: int,
    review_data: CertificateReview,
    current_user: User = Depends(get_current_admin_faculty_or_hod),
    db: Session = Depends(get_db)
):
    """Review a certificate (Approve/Reject) - Admin, Faculty, HOD, or Super Admin"""
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    # Verify user has access to this certificate's user's college
    from app.models.profile import Profile
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    # Super admin can review any certificate
    if RoleEnum.SUPER_ADMIN not in role_names:
        # For admin, faculty, or HOD, verify they're from the same college
        user_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role.in_([RoleEnum.ADMIN, RoleEnum.FACULTY, RoleEnum.HOD])
        ).first()
        
        if user_role and user_role.college_id:
            user_profile = db.query(Profile).filter(Profile.user_id == certificate.user_id).first()
            if user_profile and user_profile.college_id != user_role.college_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only review certificates from your own college"
                )
    
    # Update certificate
    certificate.status = review_data.status
    certificate.reviewed_by = current_user.id
    certificate.reviewed_at = datetime.utcnow()
    certificate.review_notes = review_data.review_notes
    
    db.commit()
    db.refresh(certificate)
    
    return certificate


@router.get("/{certificate_id}", response_model=CertificateResponse)
async def get_certificate(
    certificate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific certificate"""
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    # Verify user has access (own certificate or admin)
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    
    if certificate.user_id != current_user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this certificate"
        )
    
    return certificate


@router.put("/{certificate_id}", response_model=CertificateResponse)
async def update_certificate(
    certificate_id: int,
    certificate_data: CertificateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a certificate (only if pending)"""
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    # Only owner can update, and only if pending
    if certificate.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own certificates"
        )
    
    if certificate.status != CertificateStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update certificate that has been reviewed"
        )
    
    # Update fields
    update_data = certificate_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(certificate, field, value)
    
    db.commit()
    db.refresh(certificate)
    
    return certificate


@router.delete("/{certificate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_certificate(
    certificate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a certificate (only if pending)"""
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    # Only owner can delete, and only if pending
    if certificate.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own certificates"
        )
    
    if certificate.status != CertificateStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete certificate that has been reviewed"
        )
    
    # Delete file if exists
    if certificate.file_url:
        file_path = Path(certificate.file_url.lstrip('/'))
        if file_path.exists():
            file_path.unlink()
    
    db.delete(certificate)
    db.commit()
    
    return None


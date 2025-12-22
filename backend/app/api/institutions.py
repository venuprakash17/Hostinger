"""Institution management API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.institution import Institution
from app.models.user import User, UserRole, RoleEnum
from app.models.audit_log import AuditLog
from app.api.auth import get_current_user
from app.schemas.institution import InstitutionCreate, InstitutionUpdate, InstitutionResponse
from datetime import datetime

router = APIRouter(prefix="/institutions", tags=["institutions"])


def get_current_super_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Verify user is super admin"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.SUPER_ADMIN not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can perform this action"
        )
    
    return current_user


def create_audit_log(
    db: Session,
    user: User,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    entity_name: Optional[str] = None,
    changes: Optional[dict] = None,
    description: Optional[str] = None,
    request: Optional[Request] = None
):
    """Create an audit log entry"""
    try:
        ip_address = None
        user_agent = None
        if request and hasattr(request, 'client') and request.client:
            ip_address = request.client.host
        if request and hasattr(request, 'headers'):
            user_agent = request.headers.get("user-agent")
        
        audit_log = AuditLog(
            user_id=user.id,
            user_email=user.email,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            changes=changes,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_log)
        db.commit()
    except Exception as e:
        # Log error but don't fail the main operation
        print(f"Warning: Failed to create audit log: {e}")
        db.rollback()


@router.post("/", response_model=InstitutionResponse, status_code=status.HTTP_201_CREATED)
async def create_institution(
    institution_data: InstitutionCreate,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Create a new institution (super admin only)"""
    # Check if code already exists
    existing = db.query(Institution).filter(Institution.code == institution_data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Institution with code '{institution_data.code}' already exists"
        )
    
    # Create institution
    institution = Institution(**institution_data.model_dump())
    db.add(institution)
    db.commit()
    db.refresh(institution)
    
    # Create audit log
    create_audit_log(
        db=db,
        user=current_user,
        action="CREATE",
        entity_type="institution",
        entity_id=institution.id,
        entity_name=institution.name,
        changes={"created": institution_data.model_dump()},
        description=f"Created institution '{institution.name}' (Code: {institution.code})",
        request=request
    )
    
    return institution


@router.get("/", response_model=List[InstitutionResponse])
async def list_institutions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all institutions"""
    from app.core.db_utils import safe_list_query
    institutions = safe_list_query(db, db.query(Institution).order_by(Institution.created_at.desc()).offset(skip).limit(limit))
    return institutions


@router.get("/{institution_id}", response_model=InstitutionResponse)
async def get_institution(
    institution_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific institution by ID"""
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    return institution


@router.get("/{institution_id}/stats")
async def get_institution_stats(
    institution_id: int,
    db: Session = Depends(get_db)
):
    """Get statistics for an institution"""
    from app.models.profile import Profile
    
    # Count students
    student_count = db.query(Profile).filter(Profile.institution_id == institution_id).count()
    
    # Count admins
    admin_count = db.query(UserRole).filter(
        UserRole.institution_id == institution_id,
        UserRole.role == RoleEnum.INSTITUTION_ADMIN
    ).count()
    
    return {
        "total_students": student_count,
        "total_admins": admin_count
    }


@router.put("/{institution_id}", response_model=InstitutionResponse)
async def update_institution(
    institution_id: int,
    institution_data: InstitutionUpdate,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Update an institution (super admin only)"""
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    # Store old values for audit log
    old_values = {
        "name": institution.name,
        "code": institution.code,
        "address": institution.address,
        "city": institution.city,
        "state": institution.state,
        "pincode": institution.pincode
    }
    
    # Update fields
    update_data = institution_data.model_dump(exclude_unset=True)
    
    # Check if code is being changed and if new code exists
    if "code" in update_data and update_data["code"] != institution.code:
        existing = db.query(Institution).filter(Institution.code == update_data["code"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Institution with code '{update_data['code']}' already exists"
            )
    
    for field, value in update_data.items():
        setattr(institution, field, value)
    
    # If disabling institution, also disable all users in that institution
    if "is_active" in update_data and update_data["is_active"] == "false":
        from app.models.profile import Profile
        profiles = db.query(Profile).filter(Profile.institution_id == institution_id).all()
        for profile in profiles:
            user = db.query(User).filter(User.id == profile.user_id).first()
            if user:
                user.is_active = "false"
    
    institution.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(institution)
    
    # Get new values
    new_values = {
        "name": institution.name,
        "code": institution.code,
        "address": institution.address,
        "city": institution.city,
        "state": institution.state,
        "pincode": institution.pincode
    }
    
    # Create audit log
    changes = {
        "before": {k: v for k, v in old_values.items() if k in update_data},
        "after": {k: v for k, v in new_values.items() if k in update_data}
    }
    
    create_audit_log(
        db=db,
        user=current_user,
        action="UPDATE",
        entity_type="institution",
        entity_id=institution.id,
        entity_name=institution.name,
        changes=changes,
        description=f"Updated institution '{institution.name}' (Code: {institution.code})",
        request=request
    )
    
    return institution


@router.delete("/{institution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_institution(
    institution_id: int,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Delete an institution (super admin only)"""
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    # Store info for audit log before deletion
    institution_name = institution.name
    institution_code = institution.code
    institution_info = {
        "id": institution.id,
        "name": institution.name,
        "code": institution.code,
        "address": institution.address,
        "city": institution.city,
        "state": institution.state,
        "pincode": institution.pincode
    }
    
    # Delete institution
    db.delete(institution)
    db.commit()
    
    # Create audit log
    create_audit_log(
        db=db,
        user=current_user,
        action="DELETE",
        entity_type="institution",
        entity_id=institution_id,
        entity_name=institution_name,
        changes={"deleted": institution_info},
        description=f"Deleted institution '{institution_name}' (Code: {institution_code})",
        request=request
    )
    
    return None


"""College management API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.college import College
from app.models.user import User, UserRole, RoleEnum
from app.models.audit_log import AuditLog
from app.api.auth import get_current_user
from app.schemas.college import CollegeCreate, CollegeUpdate, CollegeResponse
from datetime import datetime

router = APIRouter(prefix="/colleges", tags=["colleges"])


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


@router.post("/", response_model=CollegeResponse, status_code=status.HTTP_201_CREATED)
async def create_college(
    college_data: CollegeCreate,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Create a new college (super admin only)"""
    # Check if code already exists
    existing = db.query(College).filter(College.code == college_data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"College with code '{college_data.code}' already exists"
        )
    
    # Create college
    college = College(**college_data.model_dump())
    db.add(college)
    db.commit()
    db.refresh(college)
    
    # Create audit log
    create_audit_log(
        db=db,
        user=current_user,
        action="CREATE",
        entity_type="college",
        entity_id=college.id,
        entity_name=college.name,
        changes={"created": college_data.model_dump()},
        description=f"Created college '{college.name}' (Code: {college.code})",
        request=request
    )
    
    return college


@router.get("/", response_model=List[CollegeResponse])
async def list_colleges(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all colleges"""
    # Order must come before offset/limit in SQLAlchemy
    colleges = db.query(College).order_by(College.created_at.desc()).offset(skip).limit(limit).all()
    return colleges


@router.get("/{college_id}", response_model=CollegeResponse)
async def get_college(
    college_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific college by ID"""
    college = db.query(College).filter(College.id == college_id).first()
    if not college:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="College not found"
        )
    return college


@router.get("/{college_id}/stats")
async def get_college_stats(
    college_id: int,
    db: Session = Depends(get_db)
):
    """Get statistics for a college"""
    from app.models.profile import Profile
    from app.models.job import Job
    
    # Count students
    student_count = db.query(Profile).filter(Profile.college_id == college_id).count()
    
    # Count jobs
    job_count = db.query(Job).filter(Job.college_id == college_id).count()
    active_jobs = db.query(Job).filter(
        Job.college_id == college_id,
        Job.is_active == True
    ).count()
    
    return {
        "total_students": student_count,
        "total_jobs": job_count,
        "active_jobs": active_jobs
    }


@router.put("/{college_id}", response_model=CollegeResponse)
async def update_college(
    college_id: int,
    college_data: CollegeUpdate,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Update a college (super admin only)"""
    college = db.query(College).filter(College.id == college_id).first()
    if not college:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="College not found"
        )
    
    # Store old values for audit log
    old_values = {
        "name": college.name,
        "code": college.code,
        "address": college.address,
        "city": college.city,
        "state": college.state,
        "pincode": college.pincode
    }
    
    # Update fields
    update_data = college_data.model_dump(exclude_unset=True)
    
    # Check if code is being changed and if new code exists
    if "code" in update_data and update_data["code"] != college.code:
        existing = db.query(College).filter(College.code == update_data["code"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"College with code '{update_data['code']}' already exists"
            )
    
    for field, value in update_data.items():
        setattr(college, field, value)
    
    # If disabling college, also disable all users in that college
    if "is_active" in update_data and update_data["is_active"] == "false":
        # Get all profiles for this college
        from app.models.profile import Profile
        profiles = db.query(Profile).filter(Profile.college_id == college_id).all()
        for profile in profiles:
            user = db.query(User).filter(User.id == profile.user_id).first()
            if user:
                user.is_active = "false"
    
    # If enabling college, we don't auto-enable users (let admin do it manually)
    
    college.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(college)
    
    # Get new values
    new_values = {
        "name": college.name,
        "code": college.code,
        "address": college.address,
        "city": college.city,
        "state": college.state,
        "pincode": college.pincode
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
        entity_type="college",
        entity_id=college.id,
        entity_name=college.name,
        changes=changes,
        description=f"Updated college '{college.name}' (Code: {college.code})",
        request=request
    )
    
    return college


@router.delete("/{college_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_college(
    college_id: int,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Delete a college (super admin only)"""
    college = db.query(College).filter(College.id == college_id).first()
    if not college:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="College not found"
        )
    
    # Store info for audit log before deletion
    college_name = college.name
    college_code = college.code
    college_info = {
        "id": college.id,
        "name": college.name,
        "code": college.code,
        "address": college.address,
        "city": college.city,
        "state": college.state,
        "pincode": college.pincode
    }
    
    # Delete college
    db.delete(college)
    db.commit()
    
    # Create audit log
    create_audit_log(
        db=db,
        user=current_user,
        action="DELETE",
        entity_type="college",
        entity_id=college_id,
        entity_name=college_name,
        changes={"deleted": college_info},
        description=f"Deleted college '{college_name}' (Code: {college_code})",
        request=request
    )
    
    return None


@router.get("/audit-logs/list", response_model=List[dict])
async def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """List audit logs (super admin only)"""
    query = db.query(AuditLog)
    
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "user_email": log.user_email,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "entity_name": log.entity_name,
            "changes": log.changes,
            "description": log.description,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]


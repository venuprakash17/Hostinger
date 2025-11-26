"""Student promotion API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.year_promotion import YearPromotion, PromotionStatus
from app.api.auth import get_current_user
from app.schemas.year_promotion import (
    YearPromotionCreate, YearPromotionUpdate, YearPromotionApprove,
    YearPromotionResponse, BulkPromotionRequest
)
from app.models.audit_log import AuditLog
from datetime import datetime

router = APIRouter(prefix="/promotion", tags=["promotion"])


def get_current_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Verify user is admin or super admin"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.ADMIN not in role_names and RoleEnum.SUPER_ADMIN not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can perform this action"
        )
    
    return current_user


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
            detail="Only super admins can perform promotion"
        )
    
    return current_user


def get_next_year(current_year: str) -> str:
    """Get next year from current year (returns numeric format for backend storage)"""
    from app.core.year_utils import get_next_year as get_next_numeric
    return get_next_numeric(current_year)


@router.post("/all")
async def promote_all_students(
    college_id: Optional[int] = Query(None, description="Filter by college (optional)"),
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Promote all students to next year (super admin only)
    
    - Promotes all students across all colleges, or
    - Promotes students in a specific college if college_id is provided
    - 4th year students go to 5th year
    - 5th year students stay at 5th year
    """
    # Get all student profiles
    query = db.query(Profile).join(User).join(UserRole).filter(
        UserRole.role == RoleEnum.STUDENT
    )
    
    if college_id:
        query = query.filter(Profile.college_id == college_id)
    
    profiles = query.all()
    
    if not profiles:
        return {
            "message": "No students found to promote",
            "promoted_count": 0,
            "details": []
        }
    
    promoted = []
    for profile in profiles:
        if profile.present_year:
            old_year = profile.present_year
            new_year = get_next_year(old_year)
            
            if old_year != new_year:
                profile.present_year = new_year
                promoted.append({
                    "user_id": profile.user_id,
                    "email": profile.email,
                    "name": profile.full_name,
                    "old_year": old_year,
                    "new_year": new_year
                })
    
    if promoted:
        db.commit()
        
        # Log promotion in audit log
        audit_log = AuditLog(
            user_id=current_user.id,
            user_email=current_user.email,
            action="UPDATE",
            entity_type="student_promotion",
            entity_id=None,
            entity_name=f"Bulk promotion - {len(promoted)} students",
            description=f"Promoted {len(promoted)} students to next year",
            changes={"promoted_count": len(promoted), "college_id": college_id},
            created_at=datetime.utcnow()
        )
        db.add(audit_log)
        db.commit()
    
    return {
        "message": f"Successfully promoted {len(promoted)} students",
        "promoted_count": len(promoted),
        "details": promoted
    }


@router.post("/year/{year}")
async def promote_year_students(
    year: str,  # Path parameter
    college_id: Optional[int] = Query(None, description="Filter by college (optional)"),
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Promote students from a specific year to next year (super admin only)
    
    Example: Promote all 3rd year students to 4th year
    - year=3rd -> promotes to 4th
    - year=4th -> promotes to 5th
    """
    if year not in ["1st", "2nd", "3rd", "4th"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Year must be one of: 1st, 2nd, 3rd, 4th"
        )
    
    # Get student profiles for the specific year
    query = db.query(Profile).join(User).join(UserRole).filter(
        UserRole.role == RoleEnum.STUDENT,
        Profile.present_year == year
    )
    
    if college_id:
        query = query.filter(Profile.college_id == college_id)
    
    profiles = query.all()
    
    if not profiles:
        return {
            "message": f"No {year} year students found to promote",
            "promoted_count": 0,
            "details": []
        }
    
    new_year = get_next_year(year)
    promoted = []
    
    for profile in profiles:
        profile.present_year = new_year
        promoted.append({
            "user_id": profile.user_id,
            "email": profile.email,
            "name": profile.full_name,
            "old_year": year,
            "new_year": new_year
        })
    
    db.commit()
    
    # Log promotion in audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="UPDATE",
        entity_type="student_promotion",
        entity_id=None,
        entity_name=f"Year promotion - {year} to {new_year}",
        description=f"Promoted {len(promoted)} {year} year students to {new_year} year",
        changes={"year": year, "new_year": new_year, "promoted_count": len(promoted), "college_id": college_id},
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "message": f"Successfully promoted {len(promoted)} {year} year students to {new_year}",
        "promoted_count": len(promoted),
        "from_year": year,
        "to_year": new_year,
        "details": promoted
    }


@router.get("/stats")
async def get_promotion_stats(
    college_id: Optional[int] = Query(None, description="Filter by college (optional)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics about students by year"""
    query = db.query(Profile).join(User).join(UserRole).filter(
        UserRole.role == RoleEnum.STUDENT
    )
    
    if college_id:
        query = query.filter(Profile.college_id == college_id)
    
    profiles = query.all()
    
    stats = {
        "1st": 0,
        "2nd": 0,
        "3rd": 0,
        "4th": 0,
        "5th": 0,
        "no_year": 0,
        "total": len(profiles)
    }
    
    for profile in profiles:
        if profile.present_year:
            if profile.present_year in stats:
                stats[profile.present_year] += 1
            else:
                stats["no_year"] += 1
        else:
            stats["no_year"] += 1
    
    return stats


# Fee-based Promotion Endpoints (College Admin)

@router.post("/request", response_model=YearPromotionResponse, status_code=status.HTTP_201_CREATED)
async def request_promotion(
    promotion_data: YearPromotionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request year promotion (Student only)"""
    # Verify user is a student
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.STUDENT not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can request promotion"
        )
    
    # Get student profile
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found"
        )
    
    # Verify from_year matches current year
    if profile.present_year != promotion_data.from_year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Your current year is {profile.present_year}, not {promotion_data.from_year}"
        )
    
    # Check if there's already a pending request
    existing = db.query(YearPromotion).filter(
        YearPromotion.user_id == current_user.id,
        YearPromotion.status == PromotionStatus.PENDING
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending promotion request"
        )
    
    # Create promotion request
    new_promotion = YearPromotion(
        user_id=current_user.id,
        from_year=promotion_data.from_year,
        to_year=promotion_data.to_year,
        fee_amount=promotion_data.fee_amount,
        payment_reference=promotion_data.payment_reference,
        notes=promotion_data.notes,
        college_id=profile.college_id,
        status=PromotionStatus.PENDING,
        fee_paid=promotion_data.fee_amount is not None and promotion_data.payment_reference is not None
    )
    
    if new_promotion.fee_paid:
        new_promotion.payment_date = datetime.utcnow()
    
    db.add(new_promotion)
    db.commit()
    db.refresh(new_promotion)
    
    return new_promotion


@router.get("/requests/my", response_model=List[YearPromotionResponse])
async def get_my_promotion_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's promotion requests"""
    requests = db.query(YearPromotion).filter(
        YearPromotion.user_id == current_user.id
    ).order_by(YearPromotion.created_at.desc()).all()
    
    return requests


@router.get("/requests/pending", response_model=List[YearPromotionResponse])
async def get_pending_promotion_requests(
    college_id: Optional[int] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get pending promotion requests (Admin only)"""
    # Get admin's college
    admin_role = db.query(UserRole).filter(
        UserRole.user_id == current_user.id,
        UserRole.role == RoleEnum.ADMIN
    ).first()
    
    if not admin_role or not admin_role.college_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin must be associated with a college"
        )
    
    target_college_id = college_id or admin_role.college_id
    
    requests = db.query(YearPromotion).filter(
        YearPromotion.college_id == target_college_id,
        YearPromotion.status == PromotionStatus.PENDING
    ).order_by(YearPromotion.created_at.asc()).all()
    
    return requests


@router.put("/requests/{promotion_id}/approve", response_model=YearPromotionResponse)
async def approve_promotion(
    promotion_id: int,
    approval_data: YearPromotionApprove,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Approve a promotion request (Admin only)"""
    promotion = db.query(YearPromotion).filter(YearPromotion.id == promotion_id).first()
    
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promotion request not found"
        )
    
    # Verify admin has access
    admin_role = db.query(UserRole).filter(
        UserRole.user_id == current_user.id,
        UserRole.role == RoleEnum.ADMIN
    ).first()
    
    if admin_role and admin_role.college_id != promotion.college_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only approve promotions from your own college"
        )
    
    # Check if fee is paid (if required)
    if approval_data.status == PromotionStatus.APPROVED:
        if not promotion.fee_paid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot approve promotion without fee payment"
            )
        
        # Update student's year
        profile = db.query(Profile).filter(Profile.user_id == promotion.user_id).first()
        if profile:
            profile.present_year = promotion.to_year
        
        promotion.status = PromotionStatus.APPROVED
        promotion.promoted_by = current_user.id
        promotion.promoted_at = datetime.utcnow()
        promotion.notes = approval_data.notes
    else:
        promotion.status = approval_data.status
        promotion.notes = approval_data.notes
    
    db.commit()
    db.refresh(promotion)
    
    return promotion


@router.post("/bulk", response_model=dict)
async def bulk_promote_students(
    request: BulkPromotionRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Bulk promote students (Admin only)"""
    # Get admin's college
    admin_role = db.query(UserRole).filter(
        UserRole.user_id == current_user.id,
        UserRole.role == RoleEnum.ADMIN
    ).first()
    
    if not admin_role or not admin_role.college_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin must be associated with a college"
        )
    
    # Get profiles for the users
    profiles = db.query(Profile).filter(
        Profile.user_id.in_(request.user_ids),
        Profile.college_id == admin_role.college_id
    ).all()
    
    if len(profiles) != len(request.user_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some students not found or not in your college"
        )
    
    promoted = []
    for profile in profiles:
        if profile.present_year == request.from_year:
            # Create promotion record
            promotion = YearPromotion(
                user_id=profile.user_id,
                from_year=request.from_year,
                to_year=request.to_year,
                fee_amount=request.fee_amount,
                fee_paid=request.fee_amount is not None,
                payment_date=datetime.utcnow() if request.fee_amount else None,
                college_id=admin_role.college_id,
                status=PromotionStatus.APPROVED if (request.auto_approve and request.fee_amount) else PromotionStatus.PENDING,
                promoted_by=current_user.id if (request.auto_approve and request.fee_amount) else None,
                promoted_at=datetime.utcnow() if (request.auto_approve and request.fee_amount) else None
            )
            db.add(promotion)
            
            # Update profile if auto-approved
            if request.auto_approve and request.fee_amount:
                profile.present_year = request.to_year
                promoted.append({
                    "user_id": profile.user_id,
                    "email": profile.email,
                    "name": profile.full_name,
                    "from_year": request.from_year,
                    "to_year": request.to_year
                })
    
    db.commit()
    
    return {
        "message": f"Created {len(profiles)} promotion requests",
        "auto_promoted": len(promoted) if request.auto_approve else 0,
        "pending_approval": len(profiles) - len(promoted) if request.auto_approve else len(profiles),
        "promoted": promoted
    }


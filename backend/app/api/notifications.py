"""Notification API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from app.core.database import get_db
from app.models.notification import Notification
from app.models.user_notification import UserNotification
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.schemas.notification import (
    NotificationCreate, NotificationResponse, NotificationListResponse, UserNotificationResponse
)
from app.api.auth import get_current_user
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_current_admin_faculty_hod_or_super(
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


def get_target_student_ids(
    db: Session,
    college_id: Optional[int] = None,
    department: Optional[str] = None,
    section: Optional[str] = None,
    present_year: Optional[str] = None,
    user_ids: Optional[List[int]] = None,
    sender_college_id: Optional[int] = None
) -> List[int]:
    """Get list of student user IDs based on targeting criteria"""
    # If specific user IDs provided, use those
    if user_ids:
        # Verify these are students
        student_user_ids = db.query(UserRole.user_id).filter(
            UserRole.user_id.in_(user_ids),
            UserRole.role == RoleEnum.STUDENT
        ).all()
        return [uid[0] for uid in student_user_ids]
    
    # Build query for students
    query = db.query(UserRole.user_id).join(
        Profile, UserRole.user_id == Profile.user_id
    ).filter(
        UserRole.role == RoleEnum.STUDENT
    )
    
    # Apply college filter
    if college_id:
        query = query.filter(Profile.college_id == college_id)
    elif sender_college_id:
        # If no college_id specified but sender has a college, use sender's college
        query = query.filter(Profile.college_id == sender_college_id)
    
    # Apply department filter
    if department:
        query = query.filter(Profile.department == department)
    
    # Apply section filter
    if section:
        query = query.filter(Profile.section == section)
    
    # Apply year filter
    if present_year:
        # Handle both numeric ("1", "2") and formatted ("1st", "2nd") formats
        from app.core.year_utils import parse_year, format_year
        normalized_year = parse_year(present_year)
        formatted_version = format_year(normalized_year) if normalized_year else None
        
        year_formats = {normalized_year, formatted_version, present_year}
        year_formats = {y for y in year_formats if y}  # Remove None
        
        if year_formats:
            conditions = [Profile.present_year == fmt for fmt in year_formats]
            query = query.filter(or_(*conditions))
    
    student_user_ids = query.all()
    return [uid[0] for uid in student_user_ids]


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_admin_faculty_hod_or_super),
    db: Session = Depends(get_db)
):
    """Create and send a notification to targeted students"""
    # Get sender's college
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    sender_college_id = None
    if RoleEnum.SUPER_ADMIN not in role_names:
        # For non-super admins, get their college
        user_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role.in_([RoleEnum.ADMIN, RoleEnum.FACULTY, RoleEnum.HOD])
        ).first()
        if user_role:
            sender_college_id = user_role.college_id
    
    # Validate targeting criteria
    if not any([
        notification_data.college_id,
        notification_data.department,
        notification_data.section,
        notification_data.present_year,
        notification_data.user_ids
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one targeting criteria must be specified (college_id, department, section, present_year, or user_ids)"
        )
    
    # Get target student IDs
    target_student_ids = get_target_student_ids(
        db=db,
        college_id=notification_data.college_id,
        department=notification_data.department,
        section=notification_data.section,
        present_year=notification_data.present_year,
        user_ids=notification_data.user_ids,
        sender_college_id=sender_college_id
    )
    
    if not target_student_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No students found matching the specified criteria"
        )
    
    # Determine college_id for notification
    notification_college_id = notification_data.college_id or sender_college_id
    
    # Create notification
    notification = Notification(
        title=notification_data.title,
        message=notification_data.message,
        type=notification_data.type,
        college_id=notification_college_id,
        created_by=current_user.id,
        is_active=True
    )
    
    db.add(notification)
    db.flush()  # Get the notification ID
    
    # Create user_notification records for all target students
    user_notifications = [
        UserNotification(
            notification_id=notification.id,
            user_id=user_id,
            is_read=False
        )
        for user_id in target_student_ids
    ]
    
    db.add_all(user_notifications)
    db.commit()
    db.refresh(notification)
    
    # Return notification with recipient count
    notification_dict = {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "college_id": notification.college_id,
        "created_by": notification.created_by,
        "is_active": notification.is_active,
        "created_at": notification.created_at,
        "recipient_count": len(target_student_ids)
    }
    
    return notification_dict


@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    college_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_admin_faculty_hod_or_super),
    db: Session = Depends(get_db)
):
    """List all notifications (for admins/faculty/HOD/super admin)"""
    query = db.query(Notification)
    
    # Filter by college if not super admin
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.SUPER_ADMIN not in role_names:
        user_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role.in_([RoleEnum.ADMIN, RoleEnum.FACULTY, RoleEnum.HOD])
        ).first()
        if user_role and user_role.college_id:
            query = query.filter(Notification.college_id == user_role.college_id)
    
    if college_id:
        query = query.filter(Notification.college_id == college_id)
    
    if is_active is not None:
        query = query.filter(Notification.is_active == is_active)
    
    total = query.count()
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    
    # Get recipient counts for each notification
    notifications_with_counts = []
    for notification in notifications:
        recipient_count = db.query(UserNotification).filter(
            UserNotification.notification_id == notification.id
        ).count()
        
        notifications_with_counts.append({
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "type": notification.type,
            "college_id": notification.college_id,
            "created_by": notification.created_by,
            "is_active": notification.is_active,
            "created_at": notification.created_at,
            "recipient_count": recipient_count
        })
    
    return {
        "notifications": notifications_with_counts,
        "total": total
    }


@router.get("/my", response_model=List[UserNotificationResponse])
async def get_my_notifications(
    is_read: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's notifications"""
    query = db.query(UserNotification).filter(
        UserNotification.user_id == current_user.id
    )
    
    if is_read is not None:
        query = query.filter(UserNotification.is_read == is_read)
    
    user_notifications = query.order_by(
        UserNotification.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    # Load notification details
    result = []
    for user_notif in user_notifications:
        notification = db.query(Notification).filter(
            Notification.id == user_notif.notification_id,
            Notification.is_active == True
        ).first()
        
        if notification:
            result.append({
                "id": user_notif.id,
                "notification_id": user_notif.notification_id,
                "user_id": user_notif.user_id,
                "is_read": user_notif.is_read,
                "read_at": user_notif.read_at,
                "created_at": user_notif.created_at,
                "notification": {
                    "id": notification.id,
                    "title": notification.title,
                    "message": notification.message,
                    "type": notification.type,
                    "college_id": notification.college_id,
                    "created_by": notification.created_by,
                    "is_active": notification.is_active,
                    "created_at": notification.created_at,
                    "recipient_count": None
                }
            })
    
    return result


@router.put("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read for the current user"""
    user_notification = db.query(UserNotification).filter(
        UserNotification.notification_id == notification_id,
        UserNotification.user_id == current_user.id
    ).first()
    
    if not user_notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    user_notification.is_read = True
    user_notification.read_at = datetime.utcnow()
    db.commit()
    
    return None


@router.put("/{notification_id}/toggle-active", response_model=NotificationResponse)
async def toggle_notification_active(
    notification_id: int,
    current_user: User = Depends(get_current_admin_faculty_hod_or_super),
    db: Session = Depends(get_db)
):
    """Toggle notification active status"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Verify user has access to this notification's college
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.SUPER_ADMIN not in role_names:
        user_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role.in_([RoleEnum.ADMIN, RoleEnum.FACULTY, RoleEnum.HOD])
        ).first()
        if user_role and user_role.college_id and notification.college_id != user_role.college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only manage notifications from your own college"
            )
    
    notification.is_active = not notification.is_active
    db.commit()
    db.refresh(notification)
    
    recipient_count = db.query(UserNotification).filter(
        UserNotification.notification_id == notification.id
    ).count()
    
    return {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "college_id": notification.college_id,
        "created_by": notification.created_by,
        "is_active": notification.is_active,
        "created_at": notification.created_at,
        "recipient_count": recipient_count
    }


@router.get("/{notification_id}/recipients", response_model=List[dict])
async def get_notification_recipients(
    notification_id: int,
    current_user: User = Depends(get_current_admin_faculty_hod_or_super),
    db: Session = Depends(get_db)
):
    """Get list of students who received a notification"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Verify access
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.SUPER_ADMIN not in role_names:
        user_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role.in_([RoleEnum.ADMIN, RoleEnum.FACULTY, RoleEnum.HOD])
        ).first()
        if user_role and user_role.college_id and notification.college_id != user_role.college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view recipients of notifications from your own college"
            )
    
    # Get recipients
    user_notifications = db.query(UserNotification).filter(
        UserNotification.notification_id == notification_id
    ).all()
    
    recipients = []
    for user_notif in user_notifications:
        profile = db.query(Profile).filter(Profile.user_id == user_notif.user_id).first()
        user = db.query(User).filter(User.id == user_notif.user_id).first()
        
        if profile and user:
            recipients.append({
                "user_id": user.id,
                "email": user.email,
                "full_name": profile.full_name,
                "roll_number": profile.roll_number,
                "department": profile.department,
                "section": profile.section,
                "present_year": profile.present_year,
                "is_read": user_notif.is_read,
                "read_at": user_notif.read_at
            })
    
    return recipients


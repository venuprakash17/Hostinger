"""Announcement/Popup API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from app.core.database import get_db
from app.models.announcement import Announcement, UserAnnouncement
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.schemas.announcement import (
    AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse, AnnouncementListResponse
)
from app.api.auth import get_current_user, get_current_super_admin
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/announcements", tags=["announcements"])


def get_user_announcements(
    db: Session,
    user_id: int,
    user_roles: List[UserRole],
    profile: Optional[Profile]
) -> List[Announcement]:
    """Get announcements that match the user's criteria and haven't been seen"""
    # Get user's role names
    role_names = [role.role.value for role in user_roles]
    
    # Get user's college_id
    college_id = None
    if profile:
        college_id = profile.college_id
    elif user_roles:
        college_id = user_roles[0].college_id
    
    # Get announcements that user has already seen
    seen_announcement_ids = db.query(UserAnnouncement.announcement_id).filter(
        UserAnnouncement.user_id == user_id
    ).subquery()
    
    # Query active announcements that match user criteria
    query = db.query(Announcement).filter(
        Announcement.is_active == True,
        ~Announcement.id.in_(seen_announcement_ids)
    )
    
    # Build matching conditions
    conditions = []
    
    # Match by college (if specified in announcement)
    if college_id:
        conditions.append(
            or_(
                Announcement.college_id == None,  # Global announcement
                Announcement.college_id == college_id
            )
        )
    else:
        # If user has no college, only show global announcements
        conditions.append(Announcement.college_id == None)
    
    # Match by role
    role_conditions = []
    for role_name in role_names:
        role_conditions.append(
            or_(
                Announcement.role == None,  # All roles
                Announcement.role == role_name
            )
        )
    if role_conditions:
        conditions.append(or_(*role_conditions))
    
    # Match by department (if user has profile and announcement specifies department)
    if profile and profile.department:
        conditions.append(
            or_(
                Announcement.department == None,  # All departments
                Announcement.department == profile.department
            )
        )
    
    # Match by section (if user has profile and announcement specifies section)
    if profile and profile.section:
        conditions.append(
            or_(
                Announcement.section == None,  # All sections
                Announcement.section == profile.section
            )
        )
    
    # Match by year (if user has profile and announcement specifies year)
    if profile and profile.present_year:
        from app.core.year_utils import parse_year, format_year
        normalized_year = parse_year(profile.present_year)
        formatted_version = format_year(normalized_year) if normalized_year else None
        
        year_formats = {normalized_year, formatted_version, profile.present_year}
        year_formats = {y for y in year_formats if y}  # Remove None
        
        if year_formats:
            year_conditions = [
                or_(
                    Announcement.present_year == None,  # All years
                    Announcement.present_year == fmt
                )
                for fmt in year_formats
            ]
            conditions.append(or_(*year_conditions))
    
    # Apply all conditions
    if conditions:
        query = query.filter(and_(*conditions))
    
    # Order by creation date (newest first)
    announcements = query.order_by(Announcement.created_at.desc()).all()
    
    return announcements


@router.get("/my", response_model=List[AnnouncementResponse])
async def get_my_announcements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get announcements for the current user that they haven't seen yet"""
    # Get user roles
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    
    # Get user profile
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    
    # Get matching announcements
    announcements = get_user_announcements(db, current_user.id, user_roles, profile)
    
    return announcements


@router.post("/{announcement_id}/mark-seen", status_code=status.HTTP_204_NO_CONTENT)
async def mark_announcement_seen(
    announcement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark an announcement as seen by the current user"""
    # Verify announcement exists
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )
    
    # Check if already seen
    existing = db.query(UserAnnouncement).filter(
        UserAnnouncement.announcement_id == announcement_id,
        UserAnnouncement.user_id == current_user.id
    ).first()
    
    if not existing:
        # Create record
        user_announcement = UserAnnouncement(
            announcement_id=announcement_id,
            user_id=current_user.id
        )
        db.add(user_announcement)
        db.commit()
    
    return None


@router.post("/", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    announcement_data: AnnouncementCreate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Create a new announcement (Super Admin only)"""
    announcement = Announcement(
        title=announcement_data.title,
        message=announcement_data.message,
        type=announcement_data.type,
        college_id=announcement_data.college_id,
        department=announcement_data.department,
        section=announcement_data.section,
        present_year=announcement_data.present_year,
        role=announcement_data.role,
        created_by=current_user.id,
        is_active=True
    )
    
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    
    return announcement


@router.get("/", response_model=AnnouncementListResponse)
async def list_announcements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """List all announcements (Super Admin only)"""
    query = db.query(Announcement)
    
    if is_active is not None:
        query = query.filter(Announcement.is_active == is_active)
    
    total = query.count()
    announcements = query.order_by(Announcement.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "announcements": announcements,
        "total": total
    }


@router.get("/{announcement_id}", response_model=AnnouncementResponse)
async def get_announcement(
    announcement_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Get a specific announcement (Super Admin only)"""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )
    
    return announcement


@router.put("/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: int,
    announcement_data: AnnouncementUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Update an announcement (Super Admin only)"""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )
    
    # Update fields
    update_data = announcement_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(announcement, field, value)
    
    db.commit()
    db.refresh(announcement)
    
    return announcement


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    announcement_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Delete an announcement (Super Admin only)"""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )
    
    db.delete(announcement)
    db.commit()
    
    return None


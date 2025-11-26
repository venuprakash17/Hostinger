"""Mock Interview API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.mock_interview import MockInterview, InterviewStatus, InterviewType
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.schemas.mock_interview import (
    MockInterviewCreate, MockInterviewUpdate, MockInterviewFeedback, MockInterviewResponse
)
from app.api.auth import get_current_user, get_current_admin_or_faculty
from datetime import datetime

router = APIRouter(prefix="/mock-interviews", tags=["mock-interviews"])


@router.post("/", response_model=MockInterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_mock_interview(
    interview_data: MockInterviewCreate,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Schedule a mock interview (Admin/Faculty only)"""
    # Get user's college
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    college_id = None
    if RoleEnum.ADMIN in role_names:
        admin_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role == RoleEnum.ADMIN
        ).first()
        college_id = admin_role.college_id if admin_role else None
    elif RoleEnum.FACULTY in role_names:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        college_id = profile.college_id if profile else None
    
    # Verify student exists and is in same college
    student_profile = db.query(Profile).filter(Profile.user_id == interview_data.student_id).first()
    if not student_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    if college_id and student_profile.college_id != college_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student must be from the same college"
        )
    
    # Create interview
    new_interview = MockInterview(
        **interview_data.model_dump(),
        college_id=college_id,
        created_by=current_user.id,
        status=InterviewStatus.SCHEDULED
    )
    
    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)
    
    return new_interview


@router.get("/my", response_model=List[MockInterviewResponse])
async def get_my_interviews(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's interviews (as student or interviewer)"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    query = db.query(MockInterview).filter(
        (MockInterview.student_id == current_user.id) |
        (MockInterview.interviewer_id == current_user.id)
    )
    
    if status_filter:
        try:
            status_enum = InterviewStatus(status_filter)
            query = query.filter(MockInterview.status == status_enum)
        except ValueError:
            pass
    
    interviews = query.order_by(MockInterview.scheduled_at.desc()).all()
    return interviews


@router.get("/scheduled", response_model=List[MockInterviewResponse])
async def get_scheduled_interviews(
    student_id: Optional[int] = None,
    interviewer_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Get scheduled interviews (Admin/Faculty only)"""
    query = db.query(MockInterview)
    
    # Get user's college for filtering
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.ADMIN in role_names:
        admin_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role == RoleEnum.ADMIN
        ).first()
        if admin_role and admin_role.college_id:
            query = query.filter(MockInterview.college_id == admin_role.college_id)
    elif RoleEnum.FACULTY in role_names:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.college_id:
            query = query.filter(MockInterview.college_id == profile.college_id)
    
    if student_id:
        query = query.filter(MockInterview.student_id == student_id)
    
    if interviewer_id:
        query = query.filter(MockInterview.interviewer_id == interviewer_id)
    
    if date_from:
        try:
            date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.filter(MockInterview.scheduled_at >= date_from_obj)
        except:
            pass
    
    if date_to:
        try:
            date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query = query.filter(MockInterview.scheduled_at <= date_to_obj)
        except:
            pass
    
    interviews = query.order_by(MockInterview.scheduled_at.asc()).all()
    return interviews


@router.get("/{interview_id}", response_model=MockInterviewResponse)
async def get_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific interview"""
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Verify user has access
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    
    if (interview.student_id != current_user.id and 
        interview.interviewer_id != current_user.id and 
        not is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this interview"
        )
    
    return interview


@router.put("/{interview_id}", response_model=MockInterviewResponse)
async def update_interview(
    interview_id: int,
    update_data: MockInterviewUpdate,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Update an interview (Admin/Faculty only)"""
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Verify permissions
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    
    if not is_admin and interview.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update interviews you created"
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(interview, field, value)
    
    db.commit()
    db.refresh(interview)
    
    return interview


@router.put("/{interview_id}/feedback", response_model=MockInterviewResponse)
async def add_feedback(
    interview_id: int,
    feedback_data: MockInterviewFeedback,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Add feedback to an interview (Admin/Faculty/Interviewer only)"""
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Verify user is interviewer or admin
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    
    if not is_admin and interview.interviewer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the interviewer can add feedback"
        )
    
    # Update feedback
    feedback_dict = feedback_data.model_dump(exclude_unset=True)
    for field, value in feedback_dict.items():
        setattr(interview, field, value)
    
    # Update status and timestamps
    if interview.status == InterviewStatus.IN_PROGRESS:
        interview.status = InterviewStatus.COMPLETED
        interview.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(interview)
    
    return interview


@router.put("/{interview_id}/start", response_model=MockInterviewResponse)
async def start_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start an interview"""
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Verify user is participant
    if interview.student_id != current_user.id and interview.interviewer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this interview"
        )
    
    if interview.status != InterviewStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview can only be started if it's scheduled"
        )
    
    interview.status = InterviewStatus.IN_PROGRESS
    interview.started_at = datetime.utcnow()
    
    db.commit()
    db.refresh(interview)
    
    return interview


@router.put("/{interview_id}/cancel", response_model=MockInterviewResponse)
async def cancel_interview(
    interview_id: int,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Cancel an interview (Admin/Faculty only)"""
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    interview.status = InterviewStatus.CANCELLED
    
    db.commit()
    db.refresh(interview)
    
    return interview


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interview(
    interview_id: int,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Delete an interview (Admin/Faculty only)"""
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Verify permissions
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    
    if not is_admin and interview.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete interviews you created"
        )
    
    db.delete(interview)
    db.commit()
    
    return None


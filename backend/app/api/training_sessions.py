"""Training session API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.training_session import TrainingSession
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.api.auth import get_current_user
from app.schemas.training_session import (
    TrainingSessionCreate,
    TrainingSessionUpdate,
    TrainingSessionResponse
)
from sqlalchemy import or_, and_

router = APIRouter(prefix="/training-sessions", tags=["training-sessions"])


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


def get_admin_college_id(current_user: User, db: Session) -> Optional[int]:
    """Get college_id for admin/HOD"""
    admin_role = db.query(UserRole).filter(
        UserRole.user_id == current_user.id,
        UserRole.role.in_([RoleEnum.ADMIN, RoleEnum.HOD])
    ).first()
    
    if admin_role and admin_role.college_id:
        return admin_role.college_id
    
    # Try to get from profile
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if profile and profile.college_id:
        return profile.college_id
    
    return None


def get_current_admin_faculty_hod_or_super(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> tuple[User, bool]:
    """Verify user is admin, faculty, HOD, or super admin. Returns (user, is_super_admin)"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    is_admin = RoleEnum.ADMIN in role_names
    is_hod = RoleEnum.HOD in role_names
    is_faculty = RoleEnum.FACULTY in role_names
    
    if not (is_super_admin or is_admin or is_hod or is_faculty):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, faculty, HOD, or super admins can perform this action"
        )
    
    return (current_user, is_super_admin)


def should_see_session(session: TrainingSession, profile: Optional[Profile]) -> bool:
    """Check if a student profile should see this session based on targeting"""
    if not profile:
        return False
    
    # If target_type is "all", everyone can see it
    if session.target_type == "all":
        return True
    
    # Check department targeting
    if "department" in session.target_type:
        if not session.target_departments or not profile.department:
            return False
        if profile.department not in session.target_departments:
            return False
    
    # Check year targeting
    if "year" in session.target_type:
        if not session.target_years:
            return False
        # Normalize year for comparison
        from app.core.year_utils import parse_year
        profile_year = parse_year(profile.present_year) if profile.present_year else None
        if not profile_year or profile_year not in session.target_years:
            return False
    
    # Check section targeting
    if "section" in session.target_type:
        if not session.target_sections or not profile.section:
            return False
        if profile.section not in session.target_sections:
            return False
    
    return True


@router.post("/", response_model=TrainingSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_training_session(
    session_data: TrainingSessionCreate,
    current_user_tuple = Depends(get_current_admin_faculty_hod_or_super),
    db: Session = Depends(get_db)
):
    """Create a new training session (super admin, admin, HOD, or faculty)"""
    current_user, is_super_admin = current_user_tuple
    
    # Determine college_id
    college_id = session_data.college_id
    
    # If not super admin, use their college_id
    if not is_super_admin:
        user_college_id = get_admin_college_id(current_user, db)
        if not user_college_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must be associated with a college to create training sessions"
            )
        college_id = user_college_id
    
    # Create session
    new_session = TrainingSession(
        title=session_data.title,
        description=session_data.description,
        session_type=session_data.session_type,
        start_time=session_data.start_time,
        end_time=session_data.end_time,
        is_active=session_data.is_active,
        target_type=session_data.target_type,
        target_departments=session_data.target_departments,
        target_years=session_data.target_years,
        target_sections=session_data.target_sections,
        college_id=college_id,
        created_by=current_user.id
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # Get creator info
    creator_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    creator_name = creator_profile.full_name if creator_profile else None
    
    # Get creator role
    creator_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    creator_role = creator_roles[0].role.value if creator_roles else None
    
    return TrainingSessionResponse(
        id=new_session.id,
        title=new_session.title,
        description=new_session.description,
        session_type=new_session.session_type,
        start_time=new_session.start_time,
        end_time=new_session.end_time,
        is_active=new_session.is_active,
        target_type=new_session.target_type,
        target_departments=new_session.target_departments,
        target_years=new_session.target_years,
        target_sections=new_session.target_sections,
        college_id=new_session.college_id,
        created_by=new_session.created_by,
        created_at=new_session.created_at,
        updated_at=new_session.updated_at,
        creator_name=creator_name,
        creator_role=creator_role
    )


@router.get("/", response_model=List[TrainingSessionResponse])
async def list_training_sessions(
    skip: int = 0,
    limit: int = 100,
    college_id: Optional[int] = None,
    session_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List training sessions (filtered by user's access)"""
    # Get user profile and roles
    profile = None
    user_roles = []
    if current_user:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    
    role_names = [role.role for role in user_roles]
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    is_admin = RoleEnum.ADMIN in role_names
    is_hod = RoleEnum.HOD in role_names
    is_faculty = RoleEnum.FACULTY in role_names
    is_student = RoleEnum.STUDENT in role_names
    
    # Build query
    query = db.query(TrainingSession)
    
    # Apply filters
    if college_id:
        query = query.filter(TrainingSession.college_id == college_id)
    
    if session_type:
        query = query.filter(TrainingSession.session_type == session_type)
    
    if is_active is not None:
        query = query.filter(TrainingSession.is_active == is_active)
    
    # If student, filter by targeting
    if is_student and profile:
        # Get all sessions that match student's profile
        all_sessions = query.all()
        matching_sessions = [
            s for s in all_sessions
            if should_see_session(s, profile)
        ]
        
        # Convert to response format
        result = []
        for session in matching_sessions:
            # Get creator info
            creator_profile = None
            creator_name = None
            creator_role = None
            if session.created_by:
                creator_profile = db.query(Profile).filter(Profile.user_id == session.created_by).first()
                creator_name = creator_profile.full_name if creator_profile else None
                creator_roles = db.query(UserRole).filter(UserRole.user_id == session.created_by).all()
                creator_role = creator_roles[0].role.value if creator_roles else None
            
            result.append(TrainingSessionResponse(
                id=session.id,
                title=session.title,
                description=session.description,
                session_type=session.session_type,
                start_time=session.start_time,
                end_time=session.end_time,
                is_active=session.is_active,
                target_type=session.target_type,
                target_departments=session.target_departments,
                target_years=session.target_years,
                target_sections=session.target_sections,
                college_id=session.college_id,
                created_by=session.created_by,
                created_at=session.created_at,
                updated_at=session.updated_at,
                creator_name=creator_name,
                creator_role=creator_role
            ))
        
        return result
    
    # For admin/faculty/HOD/super admin, show all sessions in their college (or all if super admin)
    if not is_super_admin and profile and profile.college_id:
        query = query.filter(
            or_(
                TrainingSession.college_id == profile.college_id,
                TrainingSession.college_id.is_(None)  # Super admin sessions (college_id=None)
            )
        )
    
    sessions = query.offset(skip).limit(limit).all()
    
    # Convert to response format
    result = []
    for session in sessions:
        # Get creator info
        creator_profile = None
        creator_name = None
        creator_role = None
        if session.created_by:
            creator_profile = db.query(Profile).filter(Profile.user_id == session.created_by).first()
            creator_name = creator_profile.full_name if creator_profile else None
            creator_roles = db.query(UserRole).filter(UserRole.user_id == session.created_by).all()
            creator_role = creator_roles[0].role.value if creator_roles else None
        
        result.append(TrainingSessionResponse(
            id=session.id,
            title=session.title,
            description=session.description,
            session_type=session.session_type,
            start_time=session.start_time,
            end_time=session.end_time,
            is_active=session.is_active,
            target_type=session.target_type,
            target_departments=session.target_departments,
            target_years=session.target_years,
            target_sections=session.target_sections,
            college_id=session.college_id,
            created_by=session.created_by,
            created_at=session.created_at,
            updated_at=session.updated_at,
            creator_name=creator_name,
            creator_role=creator_role
        ))
    
    return result


@router.get("/{session_id}", response_model=TrainingSessionResponse)
async def get_training_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific training session"""
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found"
        )
    
    # Check if user can access this session
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    is_admin = RoleEnum.ADMIN in role_names
    is_hod = RoleEnum.HOD in role_names
    is_faculty = RoleEnum.FACULTY in role_names
    is_student = RoleEnum.STUDENT in role_names
    
    # Students need to check targeting
    if is_student:
        if not should_see_session(session, profile):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this training session"
            )
    else:
        # Admin/faculty/HOD can see sessions in their college
        if not is_super_admin and profile and profile.college_id:
            if session.college_id != profile.college_id and session.college_id is not None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have access to this training session"
                )
    
    # Get creator info
    creator_profile = None
    creator_name = None
    creator_role = None
    if session.created_by:
        creator_profile = db.query(Profile).filter(Profile.user_id == session.created_by).first()
        creator_name = creator_profile.full_name if creator_profile else None
        creator_roles = db.query(UserRole).filter(UserRole.user_id == session.created_by).all()
        creator_role = creator_roles[0].role.value if creator_roles else None
    
    return TrainingSessionResponse(
        id=session.id,
        title=session.title,
        description=session.description,
        session_type=session.session_type,
        start_time=session.start_time,
        end_time=session.end_time,
        is_active=session.is_active,
        target_type=session.target_type,
        target_departments=session.target_departments,
        target_years=session.target_years,
        target_sections=session.target_sections,
        college_id=session.college_id,
        created_by=session.created_by,
        created_at=session.created_at,
        updated_at=session.updated_at,
        creator_name=creator_name,
        creator_role=creator_role
    )


@router.put("/{session_id}", response_model=TrainingSessionResponse)
async def update_training_session(
    session_id: int,
    session_data: TrainingSessionUpdate,
    current_user_tuple = Depends(get_current_admin_faculty_hod_or_super),
    db: Session = Depends(get_db)
):
    """Update a training session (only creator or super admin)"""
    current_user, is_super_admin = current_user_tuple
    
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found"
        )
    
    # Check permissions: creator or super admin can update
    if session.created_by != current_user.id and not is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update sessions you created"
        )
    
    # Update fields
    update_data = session_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)
    
    db.commit()
    db.refresh(session)
    
    # Get creator info
    creator_profile = db.query(Profile).filter(Profile.user_id == session.created_by).first()
    creator_name = creator_profile.full_name if creator_profile else None
    creator_roles = db.query(UserRole).filter(UserRole.user_id == session.created_by).all()
    creator_role = creator_roles[0].role.value if creator_roles else None
    
    return TrainingSessionResponse(
        id=session.id,
        title=session.title,
        description=session.description,
        session_type=session.session_type,
        start_time=session.start_time,
        end_time=session.end_time,
        is_active=session.is_active,
        target_type=session.target_type,
        target_departments=session.target_departments,
        target_years=session.target_years,
        target_sections=session.target_sections,
        college_id=session.college_id,
        created_by=session.created_by,
        created_at=session.created_at,
        updated_at=session.updated_at,
        creator_name=creator_name,
        creator_role=creator_role
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_training_session(
    session_id: int,
    current_user_tuple = Depends(get_current_admin_faculty_hod_or_super),
    db: Session = Depends(get_db)
):
    """Delete a training session (only creator or super admin)"""
    current_user, is_super_admin = current_user_tuple
    
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found"
        )
    
    # Check permissions: creator or super admin can delete
    if session.created_by != current_user.id and not is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete sessions you created"
        )
    
    db.delete(session)
    db.commit()
    
    return None


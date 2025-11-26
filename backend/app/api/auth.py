"""Authentication API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.models.user import User, UserRole
from app.models.profile import Profile
from app.models.college import College
from app.schemas.auth import (
    UserLogin,
    UserSignup,
    Token,
    UserResponse,
    RefreshTokenRequest
)
from pydantic import BaseModel, Field
from datetime import timedelta
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, otherwise None (for optional auth)"""
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        payload = decode_token(token)
        
        if not payload or payload.get("type") != "access":
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except Exception:
        return None


def get_current_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Verify user is admin or super admin"""
    from app.models.user import UserRole, RoleEnum
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.ADMIN not in role_names and RoleEnum.SUPER_ADMIN not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can perform this action"
        )
    
    return current_user


def get_current_admin_or_faculty(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Verify user is admin, faculty, or super admin"""
    from app.models.user import UserRole, RoleEnum
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if (RoleEnum.ADMIN not in role_names and 
        RoleEnum.FACULTY not in role_names and 
        RoleEnum.SUPER_ADMIN not in role_names):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins or faculty can perform this action"
        )
    
    return current_user


def get_current_super_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Verify user is super admin"""
    from app.models.user import UserRole, RoleEnum
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.SUPER_ADMIN not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can perform this action"
        )
    
    return current_user


def get_current_hod(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Verify user is HOD"""
    from app.models.user import UserRole, RoleEnum
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.HOD not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HODs can perform this action"
        )
    
    return current_user


def get_current_faculty(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Verify user is faculty"""
    from app.models.user import UserRole, RoleEnum
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.FACULTY not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty can perform this action"
        )
    
    return current_user


def get_current_hod_or_faculty(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Verify user is HOD or Faculty"""
    from app.models.user import UserRole, RoleEnum
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.HOD not in role_names and RoleEnum.FACULTY not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HODs or Faculty can perform this action"
        )
    
    return current_user


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """User login endpoint - supports multiple login methods.
    
    Username options (can use any of these):
    - Email (for all users)
    - Roll number (for students)
    - Faculty ID / Staff ID (for staff: faculty, HOD, admin, super_admin)
    
    Password options:
    - Roll number (for students)
    - Faculty ID / Staff ID (for staff)
    - User's actual password
    """
    user = None
    
    # Try to find user by email first
    if user_data.email:
        email_lower = user_data.email.lower().strip()
        user = db.query(User).filter(User.email == email_lower).first()
        
        # If not found by email, try finding by roll_number (for students)
        if not user:
            profile = db.query(Profile).filter(Profile.roll_number == user_data.email.strip().upper()).first()
            if profile:
                user = db.query(User).filter(User.id == profile.user_id).first()
        
        # If still not found, try finding by staff_id/faculty_id (for staff)
        if not user:
            profile = db.query(Profile).filter(Profile.staff_id == user_data.email.strip().upper()).first()
            if profile:
                user = db.query(User).filter(User.id == profile.user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/roll number/faculty ID or password"
        )
    
    # Get user profile and roles to determine login method
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    user_roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
    is_student = any(role.role.value == 'student' for role in user_roles)
    is_staff = any(role.role.value in ['faculty', 'hod', 'admin', 'super_admin'] for role in user_roles)
    
    # Verify password
    password_upper = user_data.password.upper().strip()
    password_original = user_data.password.strip()
    
    # For students: password can be roll_number (in caps) or user.id (in caps) or stored password
    # For staff: password can be staff_id (in caps) or user.id (in caps) or stored password
    # For others: try both original and uppercase password
    password_valid = False
    
    if is_student:
        # Students can login with roll_number (uppercase) or user.id (uppercase) or their password
        roll_number_match = profile and profile.roll_number and password_upper == profile.roll_number.upper()
        user_id_match = password_upper == str(user.id).upper()
        password_valid = (
            verify_password(password_original, user.password_hash) or
            verify_password(password_upper, user.password_hash) or
            roll_number_match or
            user_id_match
        )
    elif is_staff:
        # Staff (faculty, HOD, admin, super_admin) can login with staff_id (uppercase) or user.id (uppercase) or stored password
        staff_id_match = profile and profile.staff_id and password_upper == profile.staff_id.upper()
        user_id_match = password_upper == str(user.id).upper()
        password_valid = (
            verify_password(password_original, user.password_hash) or
            verify_password(password_upper, user.password_hash) or
            staff_id_match or
            user_id_match
        )
    else:
        # Other users: try both original and uppercase password
        password_valid = (
            verify_password(password_original, user.password_hash) or
            verify_password(password_upper, user.password_hash)
        )
    
    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/roll number/faculty ID or password"
        )
    
    # Check if user is active
    if user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact administrator."
        )
    
    # Check if user is verified
    if user.is_verified != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not verified. Please contact administrator."
        )
    
    # Check if user's college is active (if user belongs to a college)
    if profile and profile.college_id:
        college = db.query(College).filter(College.id == profile.college_id).first()
        if college and college.is_active != "true":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="College account is disabled. Please contact administrator."
            )
    
    # Create tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/signup", response_model=UserResponse)
async def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    """User signup endpoint"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User(
        email=user_data.email.lower(),
        password_hash=get_password_hash(user_data.password),
        is_active="true",
        is_verified="false"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create default role (student)
    user_role = UserRole(
        user_id=new_user.id,
        role="student"
    )
    db.add(user_role)
    
    # Create profile
    profile = Profile(
        user_id=new_user.id,
        email=new_user.email,
        full_name=user_data.full_name
    )
    db.add(profile)
    
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token"""
    payload = decode_token(token_data.refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Create new tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


class PasswordChangeRequest(BaseModel):
    """Password change request schema"""
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password - all users can change their password"""
    current_password = request.current_password
    new_password = request.new_password
    
    # Verify current password
    password_upper = current_password.upper().strip()
    password_original = current_password.strip()
    
    # Get user profile to check if they're a student (can use roll_number) or staff (can use staff_id)
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    is_student = any(role.role.value == 'student' for role in user_roles)
    is_staff = any(role.role.value in ['faculty', 'hod', 'admin', 'super_admin'] for role in user_roles)
    
    password_valid = False
    if is_student and profile and profile.roll_number:
        # Students can verify with roll_number or stored password
        roll_number_match = password_upper == profile.roll_number.upper()
        user_id_match = password_upper == str(current_user.id).upper()
        password_valid = (
            verify_password(password_original, current_user.password_hash) or
            verify_password(password_upper, current_user.password_hash) or
            roll_number_match or
            user_id_match
        )
    elif is_staff and profile and profile.staff_id:
        # Staff can verify with staff_id or stored password
        staff_id_match = password_upper == profile.staff_id.upper()
        password_valid = (
            verify_password(password_original, current_user.password_hash) or
            verify_password(password_upper, current_user.password_hash) or
            staff_id_match
        )
    else:
        password_valid = (
            verify_password(password_original, current_user.password_hash) or
            verify_password(password_upper, current_user.password_hash)
        )
    
    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(new_password)
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Password changed successfully"
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


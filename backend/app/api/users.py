"""User management API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.api.auth import get_current_user
from app.core.security import get_password_hash
from app.schemas.user import UserListResponse, UserUpdateSchema, UserCreateSchema
from pydantic import BaseModel, Field
from typing import List as TypingList

router = APIRouter(prefix="/users", tags=["users"])


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


def get_current_admin_or_super(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> tuple[User, bool]:
    """Verify user is admin or super admin, return (user, is_super_admin)"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    is_admin = RoleEnum.ADMIN in role_names
    
    if not (is_super_admin or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins or super admins can perform this action"
        )
    
    return current_user, is_super_admin


def get_current_admin_or_super_or_hod(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> tuple[User, bool, bool, bool, Optional[int]]:
    """Verify user is admin, super admin, or HOD. 
    Returns (user, is_super_admin, is_admin, is_hod, hod_department_id)"""
    from app.models.academic import Department
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    is_admin = RoleEnum.ADMIN in role_names
    is_hod = RoleEnum.HOD in role_names
    
    if not (is_super_admin or is_admin or is_hod):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, super admins, or HODs can perform this action"
        )
    
    # Get HOD's department if HOD
    hod_department_id = None
    if is_hod:
        hod_department = db.query(Department).filter(Department.hod_id == current_user.id).first()
        if not hod_department:
            profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
            if profile and profile.department:
                hod_department = db.query(Department).filter(
                    Department.name == profile.department
                ).first()
        if hod_department:
            hod_department_id = hod_department.id
    
    return current_user, is_super_admin, is_admin, is_hod, hod_department_id


def get_admin_college_id(
    current_user: User,
    db: Session
) -> Optional[int]:
    """Get college_id for admin user"""
    admin_role = db.query(UserRole).filter(
        UserRole.user_id == current_user.id,
        UserRole.role == RoleEnum.ADMIN
    ).first()
    
    return admin_role.college_id if admin_role else None


class UserRoleResponse(BaseModel):
    role: str
    college_id: int | None
    
    class Config:
        from_attributes = True


class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    department: str | None
    section: str | None
    roll_number: str | None
    college_id: int | None
    roles: List[UserRoleResponse]
    
    class Config:
        from_attributes = True


@router.get("/me/roles", response_model=List[UserRoleResponse])
async def get_current_user_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's roles"""
    roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    return [
        UserRoleResponse(role=role.role.value, college_id=role.college_id)
        for role in roles
    ]


@router.get("/me/profile", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's full profile with roles"""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=profile.full_name,
        department=profile.department,
        section=profile.section,
        roll_number=profile.roll_number,
        college_id=profile.college_id,
        roles=[
            UserRoleResponse(role=role.role.value, college_id=role.college_id)
            for role in roles
        ]
    )


@router.put("/me/profile", response_model=UserProfileResponse)
async def update_current_user_profile(
    user_data: UserUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's own profile (name only, email/ID cannot be changed)"""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Only allow updating full_name - email and ID are read-only
    update_data = user_data.model_dump(exclude_unset=True)
    
    # Remove fields that users cannot update themselves
    restricted_fields = ['email', 'department', 'section', 'roll_number', 'present_year', 'college_id']
    for field in restricted_fields:
        update_data.pop(field, None)
    
    # Update only allowed fields (currently just full_name)
    if 'full_name' in update_data:
        profile.full_name = update_data['full_name']
    
    db.commit()
    db.refresh(profile)
    
    roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=profile.full_name,
        department=profile.department,
        section=profile.section,
        roll_number=profile.roll_number,
        college_id=profile.college_id,
        roles=[
            UserRoleResponse(role=role.role.value, college_id=role.college_id)
            for role in roles
        ]
    )


@router.get("/all-students", response_model=List[UserListResponse])
async def get_all_students(
    skip: int = 0,
    limit: int = 1000,
    college_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all students across all colleges (or filtered by college)"""
    # Get all student user IDs
    query = db.query(UserRole.user_id).filter(
        UserRole.role == RoleEnum.STUDENT
    )
    
    if college_id:
        # Filter by college
        profile_user_ids = db.query(Profile.user_id).filter(
            Profile.college_id == college_id
        ).subquery()
        query = query.filter(UserRole.user_id.in_(profile_user_ids))
    
    student_user_ids = query.subquery()
    
    # Get users
    users = db.query(User).filter(
        User.id.in_(student_user_ids)
    ).offset(skip).limit(limit).all()
    
    result = []
    for user in users:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        roles = db.query(UserRole).filter(
            UserRole.user_id == user.id,
            UserRole.role == RoleEnum.STUDENT
        ).all()
        
        if profile:
            result.append(UserListResponse(
                id=user.id,
                email=user.email,
                full_name=profile.full_name,
                department=profile.department,
                section=profile.section,
                roll_number=profile.roll_number,
                college_id=profile.college_id,
                present_year=profile.present_year,
                roles=[{"role": r.role.value, "college_id": r.college_id} for r in roles],
                is_active=user.is_active == "true",
                created_at=user.created_at
            ))
    
    return result


@router.get("/", response_model=List[UserListResponse])
async def list_users(
    college_id: Optional[int] = Query(None, description="Filter by college ID"),
    institution_id: Optional[int] = Query(None, description="Filter by institution ID"),
    role: Optional[str] = Query(None, description="Filter by role"),
    skip: int = 0,
    limit: int = Query(100, ge=1, le=500),  # Optimized limit for performance (max 500 per request)
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List users, optionally filtered by college, institution, role, and department (for HOD)
    
    - Super Admin: Can see all users
    - College Admin: Can see users in their college
    - Institution Admin: Can see users in their institution
    - HOD: Can only see students and faculty in their department
    """
    print(f"[List Users] Request - college_id: {college_id}, institution_id: {institution_id}, role: {role}, current_user: {current_user.email}")
    
    # Check if current user is HOD
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [r.role for r in user_roles]
    is_hod = RoleEnum.HOD in role_names
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    
    # Get HOD's department if HOD
    hod_department = None
    hod_department_id = None
    if is_hod:
        from app.models.academic import Department
        hod_department = db.query(Department).filter(Department.hod_id == current_user.id).first()
        if not hod_department:
            current_user_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
            if current_user_profile and current_user_profile.department:
                hod_department = db.query(Department).filter(
                    Department.name == current_user_profile.department
                ).first()
        if hod_department:
            hod_department_id = hod_department.id
            print(f"[List Users] HOD detected - department: {hod_department.name} (ID: {hod_department_id})")
    
    # Start with all users
    users_query = db.query(User)
    
    # Apply filters based on user role
    if is_hod and hod_department:
        # HOD: Filter by department - only show students and faculty in their department
        # Get user IDs from profiles with this department
        profile_user_ids = db.query(Profile.user_id).filter(
            Profile.department == hod_department.name
        ).subquery()
        users_query = users_query.filter(User.id.in_(profile_user_ids))
        
        # Further filter to only students and faculty (exclude HODs, admins, and super admins)
        student_faculty_user_ids = db.query(UserRole.user_id).filter(
            UserRole.role.in_([RoleEnum.STUDENT, RoleEnum.FACULTY])
        ).subquery()
        users_query = users_query.filter(User.id.in_(student_faculty_user_ids))
        
        # Exclude current HOD themselves from the list
        users_query = users_query.filter(User.id != current_user.id)
        
        print(f"[List Users] HOD filtering - department: {hod_department.name}, found {users_query.count()} users")
    elif not is_super_admin:
        # College Admin: Filter by college
        current_user_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if current_user_profile and current_user_profile.college_id:
            admin_college_id = current_user_profile.college_id
            if college_id and college_id != admin_college_id:
                # Admin can only see users from their college
                return []
            # Get user IDs from profiles with this college
            profile_user_ids = db.query(Profile.user_id).filter(
                Profile.college_id == admin_college_id
            ).subquery()
            users_query = users_query.filter(User.id.in_(profile_user_ids))
            print(f"[List Users] Admin filtering - college_id: {admin_college_id}")
    
    # Apply additional filters if provided
    if college_id and not is_hod:
        # Get user IDs from profiles with this college
        profile_user_ids = db.query(Profile.user_id).filter(
            Profile.college_id == college_id
        ).subquery()
        users_query = users_query.filter(User.id.in_(profile_user_ids))
        print(f"[List Users] Filtered by college_id={college_id}")
    
    if institution_id:
        # Get user IDs from profiles with this institution
        profile_user_ids = db.query(Profile.user_id).filter(
            Profile.institution_id == institution_id
        ).subquery()
        users_query = users_query.filter(User.id.in_(profile_user_ids))
        print(f"[List Users] Filtered by institution_id={institution_id}")
    
    if role:
        # Get user IDs with this role
        role_user_ids = db.query(UserRole.user_id).filter(
            UserRole.role == RoleEnum(role)
        ).subquery()
        users_query = users_query.filter(User.id.in_(role_user_ids))
    
    users = users_query.offset(skip).limit(limit).all()
    print(f"[List Users] Found {len(users)} users after query")
    
    result = []
    for user in users:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
        
        # Additional filtering for HOD - ensure user is in their department
        if is_hod and hod_department:
            # Exclude current HOD themselves
            if user.id == current_user.id:
                continue
            if not profile or profile.department != hod_department.name:
                continue
            # Only include students and faculty (exclude HODs, admins, super admins)
            user_role_names = [r.role for r in roles]
            if not (RoleEnum.STUDENT in user_role_names or RoleEnum.FACULTY in user_role_names):
                continue
            # Explicitly exclude HODs, admins, and super admins
            if RoleEnum.HOD in user_role_names or RoleEnum.ADMIN in user_role_names or RoleEnum.SUPER_ADMIN in user_role_names:
                continue
        
        # Apply additional filters if needed
        if college_id and not is_hod and (not profile or profile.college_id != college_id):
            continue
        if institution_id and (not profile or profile.institution_id != institution_id):
            continue
        if role and not any(r.role == RoleEnum(role) for r in roles):
            continue
        
        # Parse handled_years and handled_sections from comma-separated strings
        handled_years_list = None
        handled_sections_list = None
        if profile:
            if profile.handled_years:
                handled_years_list = [y.strip() for y in profile.handled_years.split(',') if y.strip()]
            if profile.handled_sections:
                handled_sections_list = [s.strip() for s in profile.handled_sections.split(',') if s.strip()]
        
        result.append(UserListResponse(
            id=user.id,
            email=user.email,
            full_name=profile.full_name if profile else None,
            department=profile.department if profile else None,
            section=profile.section if profile else None,
            roll_number=profile.roll_number if profile else None,
            college_id=profile.college_id if profile else None,
            present_year=profile.present_year if profile else None,
            roles=[{"role": r.role.value, "college_id": r.college_id} for r in roles],
            is_active=user.is_active == "true",
            created_at=user.created_at,
            handled_years=handled_years_list,
            handled_sections=handled_sections_list
        ))
    
    return result


@router.post("/", response_model=UserListResponse)
async def create_user(
    user_data: UserCreateSchema,
    college_id: Optional[int] = Query(None, description="College ID from query parameter"),
    institution_id: Optional[int] = Query(None, description="Institution ID from query parameter"),
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Create a new user (SUPER ADMIN ONLY).
    
    Only super admin can create users: super_admin, admin, hod, faculty, student, institution_admin, institution_student
    
    Pass college_id or institution_id as query parameter: ?college_id=123 or ?institution_id=456
    """
    current_user, is_super_admin = current_user_tuple
    
    if not is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admin can create new users. Admins and HODs can only edit existing users."
        )
    
    # Set defaults for HOD/admin checks (not used but needed for compatibility)
    is_admin = False
    is_hod = False
    hod_department_id = None
    
    # Permission checks
    requested_role = RoleEnum(user_data.role)
    
    # Determine if this is a staff role (faculty, HOD, admin, super_admin)
    is_staff_role = requested_role in [RoleEnum.FACULTY, RoleEnum.HOD, RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]
    
    # Handle staff_id: if provided for staff roles, use it as email and password
    final_email = None
    if is_staff_role and user_data.staff_id:
        # For staff roles with staff_id, set email to {staff_id}@staff.elevate.edu
        final_email = f"{user_data.staff_id}@staff.elevate.edu"
        # Password will be set to staff_id
        password = user_data.staff_id
    elif user_data.email:
        # Use provided email
        final_email = user_data.email.lower()
    else:
        # Email is required if staff_id is not provided
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either email or staff_id (for staff roles) must be provided"
        )
    
    # Check if user already exists
    existing = db.query(User).filter(User.email == final_email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{final_email}' already exists"
        )
    
    if is_hod:
        # HOD permissions: can only create faculty and students in their department
        from app.models.academic import Department
        hod_department = db.query(Department).filter(Department.id == hod_department_id).first()
        if not hod_department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="HOD department not found"
            )
        
        # HOD can only create faculty and students
        if requested_role not in [RoleEnum.FACULTY, RoleEnum.STUDENT]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only create faculty and students"
            )
        
        # Auto-set college_id and department_id from HOD's department
        college_id = hod_department.college_id
        # Ensure department_id matches HOD's department if provided
        if user_data.department_id and user_data.department_id != hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only create users in their own department"
            )
    elif is_admin and not is_super_admin:
        # College admin permissions
        admin_college_id = get_admin_college_id(current_user, db)
        if not admin_college_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin must be associated with a college"
            )
        
        # College admin CANNOT create students
        if requested_role == RoleEnum.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="College admins cannot create students. Only super admins and HODs can create students."
            )
        
        # College admin CANNOT create other admins or super admins
        if requested_role in [RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="College admins can only create HOD and faculty users"
            )
        
        # Auto-set college_id to admin's college
        college_id = admin_college_id
    else:  # is_super_admin
        # Super admin can create any role
        # For admin role, college_id must be provided
        if requested_role == RoleEnum.ADMIN and not college_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="college_id is required when creating an admin"
            )
    
    # Generate password: use provided password, or use staff_id, or use user_id in caps, or use user ID in caps
    if user_data.password:
        password = user_data.password
    elif is_staff_role and user_data.staff_id:
        # Already set above
        pass
    elif user_data.user_id:
        password = str(user_data.user_id).upper()
    else:
        # Generate temporary password - will be set after user creation using user.id
        password = "TEMP_PASSWORD_PLACEHOLDER"
    
    # Normalize present_year: convert "1st", "2nd", "3rd" to "1", "2", "3" for storage
    from app.core.year_utils import parse_year
    numeric_year = parse_year(user_data.present_year) if user_data.present_year else None
    
    # Create user
    user = User(
        email=final_email.lower(),
        password_hash=get_password_hash(password),
        is_active="true",
        is_verified="true"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # If password was placeholder, update it with user.id in caps
    if password == "TEMP_PASSWORD_PLACEHOLDER":
        user.password_hash = get_password_hash(str(user.id).upper())
        db.commit()
        db.refresh(user)
    
    # Prepare handled_years and handled_sections (store as comma-separated strings)
    handled_years_str = None
    if user_data.handled_years:
        handled_years_str = ",".join(user_data.handled_years)
    
    handled_sections_str = None
    if user_data.handled_sections:
        handled_sections_str = ",".join(user_data.handled_sections)
    
    # Set college_id or institution_id from query parameter
    final_college_id = college_id
    final_institution_id = institution_id
    
    # Validate: institution roles must have institution_id, college roles must have college_id
    is_institution_role = requested_role in [RoleEnum.INSTITUTION_ADMIN, RoleEnum.INSTITUTION_STUDENT]
    
    if is_institution_role and not final_institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="institution_id is required for institution roles"
        )
    
    if not is_institution_role and not final_college_id:
        # Allow college_id to be None for some roles (will be set later)
        pass
    
    print(f"[Create User] DEBUG - college_id: {final_college_id}, institution_id: {final_institution_id}, requested_role: {requested_role.value}")
    
    # Create profile
    profile = Profile(
        user_id=user.id,
        email=user.email,
        full_name=user_data.full_name,
        college_id=final_college_id,
        institution_id=final_institution_id,
        department=user_data.department,
        section=user_data.section,
        roll_number=user_data.roll_number,
        staff_id=user_data.staff_id if is_staff_role else None,
        present_year=numeric_year,
        handled_years=handled_years_str,
        handled_sections=handled_sections_str
    )
    db.add(profile)
    
    # If creating HOD, ensure only one HOD per department
    if requested_role == RoleEnum.HOD:
        if not user_data.department_id and not user_data.department:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department is required when creating an HOD"
            )
        
        from app.models.academic import Department
        
        # Find department by ID or name
        hod_department = None
        if user_data.department_id:
            hod_department = db.query(Department).filter(Department.id == user_data.department_id).first()
        elif user_data.department:
            hod_department = db.query(Department).filter(
                Department.name == user_data.department
            ).first()
            if not hod_department:
                # Try by code
                hod_department = db.query(Department).filter(
                    Department.code == user_data.department
                ).first()
        
        if not hod_department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department not found: {user_data.department_id or user_data.department}"
            )
        
        # Check if department already has an HOD
        if hod_department.hod_id and hod_department.hod_id != user.id:
            old_hod_id = hod_department.hod_id
            print(f"[Create User] Department {hod_department.name} already has HOD (user_id: {old_hod_id}). Replacing with new HOD (user_id: {user.id})")
            
            # Remove HOD role from old user
            old_hod_role = db.query(UserRole).filter(
                UserRole.user_id == old_hod_id,
                UserRole.role == RoleEnum.HOD
            ).first()
            if old_hod_role:
                db.delete(old_hod_role)
            
            # Clear department's hod_id
            hod_department.hod_id = None
        
        # Assign new HOD to department
        hod_department.hod_id = user.id
        db.add(hod_department)
        db.flush()  # Flush to ensure department update is saved
    
    # Create role (after HOD assignment to ensure department is set)
    role = UserRole(
        user_id=user.id,
        role=requested_role,
        college_id=final_college_id,
        institution_id=final_institution_id
    )
    db.add(role)
    
    db.commit()
    db.refresh(profile)
    db.refresh(role)
    
    # Debug logging
    print(f"[Create User] Created {requested_role.value} with college_id={final_college_id}, profile.college_id={profile.college_id}, role.college_id={role.college_id}")
    
    # Create subject assignments for faculty
    if requested_role == RoleEnum.FACULTY and user_data.subject_assignments:
        from app.models.academic import SubjectAssignment, Section
        for assignment_input in user_data.subject_assignments:
            section_name = assignment_input.section
            section_id = assignment_input.section_id
            if section_id and not section_name:
                section_obj = db.query(Section).filter(Section.id == section_id).first()
                if section_obj:
                    section_name = section_obj.name
            assignment = SubjectAssignment(
                faculty_id=user.id,
                subject_id=assignment_input.subject_id,
                semester_id=assignment_input.semester_id,
                section=section_name,
                section_id=section_id,
                assigned_by=current_user.id,
                is_active=True
            )
            db.add(assignment)
        db.commit()
    
    db.refresh(user)
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
    
    # Parse handled_years and handled_sections from comma-separated strings
    handled_years_list = None
    handled_sections_list = None
    if profile:
        if profile.handled_years:
            handled_years_list = [y.strip() for y in profile.handled_years.split(',') if y.strip()]
        if profile.handled_sections:
            handled_sections_list = [s.strip() for s in profile.handled_sections.split(',') if s.strip()]
    
    return UserListResponse(
        id=user.id,
        email=user.email,
        full_name=profile.full_name if profile else None,
        department=profile.department if profile else None,
        section=profile.section if profile else None,
        roll_number=profile.roll_number if profile else None,
        staff_id=profile.staff_id if profile else None,
        college_id=profile.college_id if profile else None,
        present_year=profile.present_year if profile else None,
        roles=[{"role": r.role.value, "college_id": r.college_id} for r in roles],
        is_active=user.is_active == "true",
        created_at=user.created_at,
        handled_years=handled_years_list,
        handled_sections=handled_sections_list
    )


@router.get("/{user_id}")
async def get_user(
    user_id: int,
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Get user by ID with full profile and roles (super admin, college admin, or HOD).
    
    Super admin: Can view anyone
    College admin: Can view users in their college
    HOD: Can view users in their department
    """
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
    
    # Permission checks
    if is_super_admin:
        # Super admin can view anyone
        pass
    elif is_admin:
        # Admin can only view users in their college
        admin_college_id = get_admin_college_id(current_user, db)
        if profile and profile.college_id != admin_college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view users in your college"
            )
    elif is_hod:
        # HOD can only view users in their department
        if not profile or not profile.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User profile or department not found"
            )
        if profile.department_id != hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view users in your department"
            )
    
    # Parse handled_years and handled_sections from JSON strings
    handled_years_list = []
    handled_sections_list = []
    
    if profile:
        if profile.handled_years:
            try:
                import json
                handled_years_list = json.loads(profile.handled_years) if isinstance(profile.handled_years, str) else profile.handled_years
            except:
                handled_years_list = []
        
        if profile.handled_sections:
            try:
                import json
                handled_sections_list = json.loads(profile.handled_sections) if isinstance(profile.handled_sections, str) else profile.handled_sections
            except:
                handled_sections_list = []
    
    # Build response with profile data
    user_response = UserListResponse(
        id=user.id,
        email=user.email,
        full_name=profile.full_name if profile else None,
        department=profile.department if profile else None,
        section=profile.section if profile else None,
        roll_number=profile.roll_number if profile else None,
        staff_id=profile.staff_id if profile else None,
        college_id=profile.college_id if profile else None,
        present_year=profile.present_year if profile else None,
        roles=[{"role": r.role.value, "college_id": r.college_id} for r in roles],
        is_active=user.is_active == "true",
        created_at=user.created_at,
        handled_years=handled_years_list,
        handled_sections=handled_sections_list
    )
    
    # Convert to dict and add profile field for frontend compatibility
    response_dict = user_response.model_dump()
    if profile:
        response_dict["profile"] = {
            "id": profile.id,
            "user_id": profile.user_id,
            "email": profile.email,
            "full_name": profile.full_name,
            "department": profile.department,
            "department_id": profile.department_id,
            "section": profile.section,
            "section_id": profile.section_id,
            "roll_number": profile.roll_number,
            "staff_id": profile.staff_id,
            "college_id": profile.college_id,
            "present_year": profile.present_year,
            "handled_years": handled_years_list,
            "handled_sections": handled_sections_list
        }
    
    return response_dict


@router.put("/{user_id}", response_model=UserListResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdateSchema,
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Update user profile (super admin, college admin, or HOD).
    
    Super admin: Can update anyone
    College admin: Can update students, faculty, and HOD in their college
    HOD: Can update faculty and students in their department only
    """
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Permission checks
    update_data = user_data.model_dump(exclude_unset=True)
    
    if is_hod:
        # HOD can only update faculty and students in their department
        from app.models.academic import Department
        hod_department = db.query(Department).filter(Department.id == hod_department_id).first()
        if not hod_department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="HOD department not found"
            )
        
        user_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
        role_names = [r.role for r in user_roles]
        
        # HOD can only update faculty and students
        is_student = RoleEnum.STUDENT in role_names
        is_faculty = RoleEnum.FACULTY in role_names
        
        if not (is_student or is_faculty):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only update faculty and students in their department"
            )
        
        # Verify user is in HOD's department
        user_in_dept = (
            profile.department_id == hod_department_id or
            profile.department == hod_department.name
        )
        if not user_in_dept:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only update users from their own department"
            )
        
        # HOD cannot change college_id, role, or department (scoped to their department)
        if 'college_id' in update_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD cannot change user's college"
            )
        if 'role' in update_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD cannot change user's role"
            )
        
        # HOD cannot edit their own department - they are locked to their assigned department
        is_hod_editing_self = (user_id == current_user.id and RoleEnum.HOD in role_names)
        if is_hod_editing_self and 'department' in update_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD cannot change their own department. To change department, please delete and recreate the HOD account."
            )
        
        # Ensure department stays within HOD's department if being updated (for other users)
        if 'department' in update_data and update_data.get('department') != hod_department.name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only assign users to their own department"
            )
        
        # Prevent HOD from changing their own department_id
        if is_hod_editing_self and 'department_id' in update_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD cannot change their own department. To change department, please delete and recreate the HOD account."
            )
    elif is_admin and not is_super_admin:
        # College admin can update students, faculty, and HOD in their college
        admin_college_id = get_admin_college_id(current_user, db)
        if not admin_college_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin must be associated with a college"
            )
        
        user_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
        role_names = [r.role for r in user_roles]
        
        # Check if user is student, faculty, or HOD
        is_student = RoleEnum.STUDENT in role_names
        is_faculty = RoleEnum.FACULTY in role_names
        is_hod_user = RoleEnum.HOD in role_names
        
        if not (is_student or is_faculty or is_hod_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="College admins can only update students, faculty, and HOD profiles"
            )
        
        if profile.college_id != admin_college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only update users from your college"
            )
    
    # Prevent email/username changes - email is in User model and should never be updated
    # This applies to ALL users, not just students
    
    # Never allow email updates through this endpoint
    # Email should only be set during user creation
    if "email" in update_data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email/username cannot be changed. Please contact administrator."
        )
    
    # Update profile fields only (email is in User model, which we don't update here)
    from app.core.year_utils import parse_year
    from app.models.academic import SubjectAssignment, Section
    
    # Handle subject_assignments separately (not a profile field)
    # Get subject_assignments - they come as list of dicts from model_dump
    subject_assignments = update_data.pop('subject_assignments', None)
    
    # Handle college_id separately (only super admin can update)
    college_id_update = update_data.pop('college_id', None)
    if college_id_update is not None:
        if not is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super admin can update college_id"
            )
        profile.college_id = college_id_update
    
    # Handle role separately (only super admin can update)
    role_update = update_data.pop('role', None)
    if role_update is not None:
        if not is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super admin can update user role"
            )
        try:
            new_role = RoleEnum(role_update)
            # Get existing roles
            existing_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
            old_role = existing_roles[0].role if existing_roles else None
            
            # If role is different, update it
            if not any(r.role == new_role for r in existing_roles):
                # Handle HOD role assignment - ensure only one HOD per department
                if new_role == RoleEnum.HOD:
                    # Department is required when assigning HOD role
                    if not profile.department:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Department is required when assigning HOD role. Please set the user's department first."
                        )
                    
                    from app.models.academic import Department
                    
                    # Find department by name or code
                    hod_department = db.query(Department).filter(
                        Department.name == profile.department
                    ).first()
                    if not hod_department and profile.department:
                        # Try by code
                        hod_department = db.query(Department).filter(
                            Department.code == profile.department
                        ).first()
                    
                    if not hod_department:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Department '{profile.department}' not found. Please ensure the department exists."
                        )
                    
                    # Check if department already has an HOD
                    if hod_department.hod_id and hod_department.hod_id != user_id:
                        old_hod_id = hod_department.hod_id
                        print(f"[Update User] Department {hod_department.name} already has HOD (user_id: {old_hod_id}). Replacing with new HOD (user_id: {user_id})")
                        
                        # Remove HOD role from old user
                        old_hod_role = db.query(UserRole).filter(
                            UserRole.user_id == old_hod_id,
                            UserRole.role == RoleEnum.HOD
                        ).first()
                        if old_hod_role:
                            db.delete(old_hod_role)
                        
                        # Clear department's hod_id
                        hod_department.hod_id = None
                    
                    # Assign new HOD to department
                    hod_department.hod_id = user_id
                    db.add(hod_department)
                
                # Handle removing HOD role - clear department's hod_id
                elif old_role == RoleEnum.HOD and new_role != RoleEnum.HOD:
                    from app.models.academic import Department
                    # Find departments where this user is the HOD
                    departments_with_this_hod = db.query(Department).filter(
                        Department.hod_id == user_id
                    ).all()
                    for dept in departments_with_this_hod:
                        dept.hod_id = None
                        db.add(dept)
                    print(f"[Update User] Removed HOD role from user {user_id}. Cleared hod_id from {len(departments_with_this_hod)} department(s)")
                
                # Delete all existing roles
                db.query(UserRole).filter(UserRole.user_id == user_id).delete()
                
                # Create new role with updated college_id
                new_user_role = UserRole(
                    user_id=user_id,
                    role=new_role,
                    college_id=profile.college_id  # Use profile's college_id
                )
                db.add(new_user_role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {role_update}. Must be one of: {[r.value for r in RoleEnum]}"
            )
    
    handled_years = update_data.pop('handled_years', None)
    handled_sections = update_data.pop('handled_sections', None)
    
    for field, value in update_data.items():
        if hasattr(profile, field):  # Only update Profile fields
            # Normalize present_year to numeric format for storage
            if field == 'present_year' and value:
                value = parse_year(value)
            setattr(profile, field, value)
    
    # Update handled_years and handled_sections
    if handled_years is not None:
        profile.handled_years = ",".join(handled_years) if handled_years else None
    if handled_sections is not None:
        profile.handled_sections = ",".join(handled_sections) if handled_sections else None
    
    # Update subject assignments for faculty
    user_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
    is_faculty = any(r.role == RoleEnum.FACULTY for r in user_roles)
    
    if is_faculty and subject_assignments is not None:
        try:
            # Delete existing assignments
            db.query(SubjectAssignment).filter(SubjectAssignment.faculty_id == user_id).delete()
            
            # Create new assignments - only if subject_assignments is not empty
            if subject_assignments:
                from app.models.academic import Subject
                from app.schemas.user import SubjectAssignmentInput
                
                for assignment_data in subject_assignments:
                    # assignment_data is a dict from model_dump, convert to Pydantic model for validation
                    try:
                        # Handle both dict and already-validated Pydantic model cases
                        if isinstance(assignment_data, dict):
                            assignment_input = SubjectAssignmentInput(**assignment_data)
                        else:
                            # Already a Pydantic model (shouldn't happen, but handle it)
                            assignment_input = assignment_data
                    except Exception as e:
                        db.rollback()
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid subject assignment data: {str(e)}"
                        )
                    
                    # Validate subject_id is provided and valid
                    if not assignment_input.subject_id or assignment_input.subject_id <= 0:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid subject_id: {assignment_input.subject_id}. Subject ID must be a positive integer."
                        )
                    
                    # Validate subject exists and belongs to the same college
                    subject = db.query(Subject).filter(Subject.id == assignment_input.subject_id).first()
                    if not subject:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Subject with ID {assignment_input.subject_id} not found"
                        )
                    
                    # Verify subject belongs to the same college as the faculty
                    if not is_super_admin:
                        admin_college_id = get_admin_college_id(current_user, db)
                        if subject.college_id != admin_college_id:
                            raise HTTPException(
                                status_code=status.HTTP_403_FORBIDDEN,
                                detail=f"Subject {subject.name} does not belong to your college"
                            )
                    
                    # Get section name if section_id is provided
                    section_name = assignment_input.section
                    section_id = assignment_input.section_id
                    
                    if section_id:
                        section_obj = db.query(Section).filter(Section.id == section_id).first()
                        if section_obj:
                            section_name = section_obj.name
                            # Verify section belongs to the same college
                            if not is_super_admin:
                                admin_college_id = get_admin_college_id(current_user, db)
                                if section_obj.college_id != admin_college_id:
                                    raise HTTPException(
                                        status_code=status.HTTP_403_FORBIDDEN,
                                        detail=f"Section {section_obj.name} does not belong to your college"
                                    )
                        elif not section_name:
                            # If section_id provided but section not found, raise error
                            raise HTTPException(
                                status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Section with ID {section_id} not found"
                            )
                    
                    # Create the assignment
                    assignment = SubjectAssignment(
                        faculty_id=user_id,
                        subject_id=assignment_input.subject_id,
                        semester_id=assignment_input.semester_id,
                        section=section_name,
                        section_id=section_id,
                        assigned_by=current_user.id,
                        is_active=True
                    )
                    db.add(assignment)
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            # Rollback on any other error
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating subject assignments: {str(e)}"
            )
    
    try:
        db.commit()
        db.refresh(profile)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving user updates: {str(e)}"
        )
    
    roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
    
    # Parse handled_years and handled_sections from comma-separated strings
    handled_years_list = None
    handled_sections_list = None
    if profile.handled_years:
        handled_years_list = [y.strip() for y in profile.handled_years.split(',') if y.strip()]
    if profile.handled_sections:
        handled_sections_list = [s.strip() for s in profile.handled_sections.split(',') if s.strip()]
    
    return UserListResponse(
        id=user.id,
        email=user.email,
        full_name=profile.full_name,
        department=profile.department,
        section=profile.section,
        roll_number=profile.roll_number,
        staff_id=profile.staff_id,
        college_id=profile.college_id,
        present_year=profile.present_year,
        roles=[{"role": r.role.value, "college_id": r.college_id} for r in roles],
        is_active=user.is_active == "true",
        created_at=user.created_at,
        handled_years=handled_years_list,
        handled_sections=handled_sections_list
    )


@router.get("/colleges/{college_id}/students", response_model=List[UserListResponse])
async def get_college_students(
    college_id: int,
    skip: int = 0,
    limit: int = 10000,  # Increased limit to show all students (was 100)
    department: Optional[str] = None,
    section: Optional[str] = None,
    present_year: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all students for a specific college with enhanced filtering"""
    # Fix: Use explicit join with select_from
    from sqlalchemy import and_, or_
    from app.core.year_utils import parse_year, format_year
    
    # Get student user IDs for this college - fix the join
    query = db.query(UserRole.user_id).select_from(
        UserRole
    ).join(
        Profile, UserRole.user_id == Profile.user_id
    ).join(
        User, User.id == UserRole.user_id
    ).filter(
        and_(
            UserRole.role == RoleEnum.STUDENT,
            Profile.college_id == college_id
        )
    )
    
    # Apply filters
    if department:
        query = query.filter(Profile.department == department)
    if section:
        query = query.filter(Profile.section == section)
    if present_year:
        # Normalize present_year filter to handle both numeric ("1", "2", "3") and formatted ("1st", "2nd", "3rd") values
        # The database might have either format, so we need to check both
        normalized_year = parse_year(present_year)
        formatted_version = format_year(normalized_year) if normalized_year else None
        
        # Build list of possible year formats to match in database
        # Always check both numeric and formatted versions
        year_formats_to_match = set()
        
        if normalized_year:
            year_formats_to_match.add(normalized_year)  # e.g., "1"
        
        if formatted_version:
            year_formats_to_match.add(formatted_version)  # e.g., "1st"
        
        # Include original if it's different (handles edge cases)
        if present_year:
            year_formats_to_match.add(present_year)
        
        # Remove None values
        year_formats_to_match = {y for y in year_formats_to_match if y}
        
        # Convert to list for SQLAlchemy
        year_formats_list = list(year_formats_to_match)
        
        # Filter by all possible year formats (e.g., filtering "1" matches both "1" and "1st" in DB)
        if year_formats_list:
            print(f"DEBUG Year Filter - Input: '{present_year}', Normalized: '{normalized_year}', Formatted: '{formatted_version}', Matching: {year_formats_list}")
            conditions = [Profile.present_year == fmt for fmt in year_formats_list]
            query = query.filter(or_(*conditions))
            print(f"DEBUG Year Filter - Applied OR conditions: {[str(c) for c in conditions]}")
    if search:
        # Search in name, email, roll_number
        query = query.filter(
            or_(
                Profile.full_name.ilike(f"%{search}%"),
                Profile.roll_number.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%")
            )
        )
    
    # Filter by is_active status
    if is_active is not None:
        if is_active.lower() == 'true':
            query = query.filter(User.is_active == "true")
        elif is_active.lower() == 'false':
            query = query.filter(User.is_active == "false")
    
    student_user_ids = [row[0] for row in query.all()]
    
    if not student_user_ids:
        return []
    
    # Get users and their profiles
    users = db.query(User).filter(
        User.id.in_(student_user_ids)
    ).offset(skip).limit(limit).all()
    
    result = []
    for user in users:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        roles = db.query(UserRole).filter(
            UserRole.user_id == user.id,
            UserRole.role == RoleEnum.STUDENT
        ).all()
        
        if profile and profile.college_id == college_id:
            # Apply year filter again at profile level to ensure consistency
            if present_year:
                # Re-check year format matching (in case query filter didn't catch it)
                normalized_year = parse_year(present_year)
                formatted_version = format_year(normalized_year) if normalized_year else None
                year_formats_to_match = {normalized_year, formatted_version, present_year}
                year_formats_to_match = {y for y in year_formats_to_match if y}  # Remove None values
                
                # If profile year doesn't match any of the expected formats, skip
                if profile.present_year and profile.present_year not in year_formats_to_match:
                    continue  # Skip this student if year doesn't match
            
            result.append(UserListResponse(
                id=user.id,
                email=user.email,
                full_name=profile.full_name,
                department=profile.department,
                section=profile.section,
                roll_number=profile.roll_number,
                college_id=profile.college_id,
                present_year=profile.present_year,
                roles=[{"role": r.role.value, "college_id": r.college_id} for r in roles],
                is_active=user.is_active == "true",
                created_at=user.created_at
            ))
    
    return result


class BulkEditRequest(BaseModel):
    student_ids: TypingList[int] = Field(..., description="List of student user IDs")
    update_data: UserUpdateSchema

class BulkPromoteRequest(BaseModel):
    student_ids: TypingList[int] = Field(..., description="List of student user IDs")

@router.post("/bulk-edit", response_model=dict)
async def bulk_edit_students(
    request: BulkEditRequest,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Bulk edit multiple students at once (super admin or college admin)"""
    current_user, is_super_admin = current_user_tuple
    student_ids = request.student_ids
    update_data = request.update_data
    
    if not student_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one student ID is required"
        )
    
    updated_count = 0
    failed = []
    
    for student_id in student_ids:
        try:
            user = db.query(User).filter(User.id == student_id).first()
            if not user:
                failed.append({"user_id": student_id, "error": "User not found"})
                continue
            
            profile = db.query(Profile).filter(Profile.user_id == student_id).first()
            if not profile:
                failed.append({"user_id": student_id, "error": "Profile not found"})
                continue
            
            # Permission check
            if not is_super_admin:
                admin_college_id = get_admin_college_id(current_user, db)
                if profile.college_id != admin_college_id:
                    failed.append({"user_id": student_id, "error": "Not authorized"})
                    continue
            
            # Update profile
            from app.core.year_utils import parse_year
            update_fields = update_data.model_dump(exclude_unset=True)
            for field, value in update_fields.items():
                if hasattr(profile, field):
                    # Normalize present_year to numeric format for storage
                    if field == 'present_year' and value:
                        value = parse_year(value)
                    setattr(profile, field, value)
            
            updated_count += 1
        except Exception as e:
            failed.append({"user_id": student_id, "error": str(e)})
    
    db.commit()
    
    return {
        "message": f"Successfully updated {updated_count} students",
        "updated_count": updated_count,
        "failed": failed
    }


@router.post("/bulk-promote", response_model=dict)
async def bulk_promote_students(
    request: BulkPromoteRequest,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Bulk promote multiple students to next year"""
    from app.api.promotion import get_next_year
    from app.models.audit_log import AuditLog
    from datetime import datetime
    
    current_user, is_super_admin = current_user_tuple
    student_ids = request.student_ids
    
    if not student_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one student ID is required"
        )
    
    promoted_count = 0
    failed = []
    
    for student_id in student_ids:
        try:
            profile = db.query(Profile).filter(Profile.user_id == student_id).first()
            if not profile:
                failed.append({"user_id": student_id, "error": "Profile not found"})
                continue
            
            # Permission check
            if not is_super_admin:
                admin_college_id = get_admin_college_id(current_user, db)
                if profile.college_id != admin_college_id:
                    failed.append({"user_id": student_id, "error": "Not authorized"})
                    continue
            
            # Promote student
            if profile.present_year:
                old_year = profile.present_year
                new_year = get_next_year(old_year)
                if old_year != new_year:
                    profile.present_year = new_year
                    promoted_count += 1
        except Exception as e:
            failed.append({"user_id": student_id, "error": str(e)})
    
    db.commit()
    
    # Log audit
    audit_log = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="UPDATE",
        entity_type="student_promotion",
        entity_id=None,
        entity_name=f"Bulk promotion - {promoted_count} students",
        description=f"Bulk promoted {promoted_count} students",
        changes={"promoted_count": promoted_count, "student_ids": student_ids},
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "message": f"Successfully promoted {promoted_count} students",
        "promoted_count": promoted_count,
        "failed": failed
    }


class DeleteByYearRequest(BaseModel):
    college_id: int
    present_year: str = Field(..., description="Year to delete (e.g., '1st', '2nd', '3rd', '4th', '5th')")

@router.post("/delete-by-year", response_model=dict)
async def delete_students_by_year(
    request: DeleteByYearRequest,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Delete all students from a specific year in a college (super admin or college admin)"""
    from app.models.audit_log import AuditLog
    from datetime import datetime
    from sqlalchemy import and_, or_
    
    current_user, is_super_admin = current_user_tuple
    college_id = request.college_id
    present_year = request.present_year
    
    # Permission check
    if not is_super_admin:
        admin_college_id = get_admin_college_id(current_user, db)
        if admin_college_id != college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only delete students from your college"
            )
    
    # Normalize present_year to handle both numeric ("1", "2", "3") and formatted ("1st", "2nd", "3rd") values
    # The database might have either format, so we need to check both
    from app.core.year_utils import parse_year, format_year
    
    normalized_year = parse_year(present_year)
    formatted_version = format_year(normalized_year) if normalized_year else None
    
    # Build list of possible year formats to match in database
    year_formats_to_match = set()
    if normalized_year:
        year_formats_to_match.add(normalized_year)  # e.g., "1"
    if formatted_version:
        year_formats_to_match.add(formatted_version)  # e.g., "1st"
    if present_year:
        year_formats_to_match.add(present_year)
    
    # Remove None values
    year_formats_to_match = {y for y in year_formats_to_match if y}
    year_formats_list = list(year_formats_to_match)
    
    # Get all student profiles for this year and college (matching both formats)
    if year_formats_list:
        conditions = [Profile.present_year == fmt for fmt in year_formats_list]
        profiles = db.query(Profile).join(UserRole).filter(
            and_(
                UserRole.role == RoleEnum.STUDENT,
                Profile.college_id == college_id,
                or_(*conditions),
                Profile.user_id == UserRole.user_id
            )
        ).all()
    else:
        # Fallback to exact match if no formats found
        profiles = db.query(Profile).join(UserRole).filter(
            and_(
                UserRole.role == RoleEnum.STUDENT,
                Profile.college_id == college_id,
                Profile.present_year == present_year,
                Profile.user_id == UserRole.user_id
            )
        ).all()
    
    if not profiles:
        return {
            "message": f"No {present_year} year students found in this college",
            "deleted_count": 0
        }
    
    deleted_count = 0
    deleted_user_ids = []
    
    for profile in profiles:
        user = db.query(User).filter(User.id == profile.user_id).first()
        if user:
            deleted_user_ids.append(user.id)
            db.delete(user)  # This will cascade delete profile and roles
            deleted_count += 1
    
    db.commit()
    
    # Log audit
    audit_log = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="DELETE",
        entity_type="students",
        entity_id=None,
        entity_name=f"Deleted {present_year} year students",
        description=f"Deleted {deleted_count} {present_year} year students from college {college_id}",
        changes={"college_id": college_id, "year": present_year, "deleted_count": deleted_count, "user_ids": deleted_user_ids},
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "message": f"Successfully deleted {deleted_count} {present_year} year students",
        "deleted_count": deleted_count,
        "year": present_year,
        "college_id": college_id
    }


# Individual user delete
@router.delete("/{user_id}", response_model=dict)
async def delete_user(
    user_id: int,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Delete a single user (super admin or college admin)"""
    from app.models.audit_log import AuditLog
    from datetime import datetime
    
    current_user, is_super_admin = current_user_tuple
    
    # Get user to delete
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Permission check - college admins can only delete users from their college
    if not is_super_admin:
        admin_college_id = get_admin_college_id(current_user, db)
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile or profile.college_id != admin_college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only delete users from your college"
            )
    
    # Store info for audit log
    user_email = user.email
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    user_name = profile.full_name if profile else user_email
    
    # Check if user is faculty - if so, reassign their data to HOD before deletion
    user_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
    role_names = [r.role for r in user_roles]
    is_faculty = RoleEnum.FACULTY in role_names
    
    if is_faculty and profile:
        # Find HOD for the same department
        from app.models.academic import Department
        hod_id = None
        
        if profile.department_id:
            department = db.query(Department).filter(Department.id == profile.department_id).first()
            if department and department.hod_id:
                hod_id = department.hod_id
        elif profile.department:
            # Fallback: find department by name
            department = db.query(Department).filter(
                Department.name == profile.department,
                Department.college_id == profile.college_id
            ).first()
            if department and department.hod_id:
                hod_id = department.hod_id
        
        if hod_id:
            # Reassign coding problems
            from app.models.quiz import CodingProblem
            coding_problems = db.query(CodingProblem).filter(CodingProblem.created_by == user_id).all()
            for problem in coding_problems:
                problem.created_by = hod_id
                db.flush()
            
            # Reassign quizzes
            from app.models.quiz import Quiz
            quizzes = db.query(Quiz).filter(Quiz.created_by == user_id).all()
            for quiz in quizzes:
                quiz.created_by = hod_id
                db.flush()
            
            # Reassign coding labs (labs created by faculty, but typically HOD creates labs)
            from app.models.coding_lab import CodingLab
            labs = db.query(CodingLab).filter(CodingLab.created_by == user_id).all()
            for lab in labs:
                lab.created_by = hod_id
                db.flush()
            
            # Reassign lab problems
            from app.models.coding_lab import LabProblem
            lab_problems = db.query(LabProblem).filter(LabProblem.created_by == user_id).all()
            for lab_problem in lab_problems:
                lab_problem.created_by = hod_id
                db.flush()
            
            # Reassign lab faculty assignments (remove faculty from labs)
            from app.models.coding_lab import LabFacultyAssignment
            lab_assignments = db.query(LabFacultyAssignment).filter(
                LabFacultyAssignment.faculty_id == user_id
            ).all()
            for assignment in lab_assignments:
                db.delete(assignment)
            
            db.commit()
    
    # Delete user (cascades to profile and roles)
    db.delete(user)
    db.commit()
    
    # Log audit
    audit_log = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="DELETE",
        entity_type="user",
        entity_id=user_id,
        entity_name=user_name,
        description=f"Deleted user '{user_name}' ({user_email})",
        changes={"deleted_user_id": user_id, "deleted_email": user_email},
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "message": f"Successfully deleted user {user_name}",
        "deleted_user_id": user_id,
        "data_reassigned_to_hod": is_faculty and hod_id is not None if is_faculty else False
    }


# Reassign faculty data to another faculty
class ReassignFacultyDataRequest(BaseModel):
    from_faculty_id: int = Field(..., description="ID of the faculty whose data will be reassigned")
    to_faculty_id: int = Field(..., description="ID of the faculty who will receive the data")
    reassign_coding_problems: bool = Field(True, description="Reassign coding problems")
    reassign_quizzes: bool = Field(True, description="Reassign quizzes")
    reassign_labs: bool = Field(True, description="Reassign coding labs")
    reassign_lab_problems: bool = Field(True, description="Reassign lab problems")
    reassign_lab_assignments: bool = Field(True, description="Reassign lab faculty assignments")

@router.post("/reassign-faculty-data", response_model=dict)
async def reassign_faculty_data(
    request: ReassignFacultyDataRequest,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Reassign data from one faculty to another (Admin or Super Admin only)
    
    This allows transferring coding problems, quizzes, labs, etc. from a deleted
    faculty to a new faculty member. The new faculty can then edit and manage this data.
    """
    from app.models.audit_log import AuditLog
    from datetime import datetime
    
    current_user, is_super_admin = current_user_tuple
    
    # Verify both users exist and are faculty
    from_faculty = db.query(User).filter(User.id == request.from_faculty_id).first()
    to_faculty = db.query(User).filter(User.id == request.to_faculty_id).first()
    
    if not from_faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source faculty (ID: {request.from_faculty_id}) not found"
        )
    
    if not to_faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target faculty (ID: {request.to_faculty_id}) not found"
        )
    
    # Verify both are faculty
    from_roles = db.query(UserRole).filter(UserRole.user_id == request.from_faculty_id).all()
    to_roles = db.query(UserRole).filter(UserRole.user_id == request.to_faculty_id).all()
    
    from_is_faculty = any(r.role == RoleEnum.FACULTY for r in from_roles)
    to_is_faculty = any(r.role == RoleEnum.FACULTY for r in to_roles)
    
    if not from_is_faculty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source user (ID: {request.from_faculty_id}) is not a faculty member"
        )
    
    if not to_is_faculty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target user (ID: {request.to_faculty_id}) is not a faculty member"
        )
    
    # Permission check - college admins can only reassign within their college
    if not is_super_admin:
        admin_college_id = get_admin_college_id(current_user, db)
        from_profile = db.query(Profile).filter(Profile.user_id == request.from_faculty_id).first()
        to_profile = db.query(Profile).filter(Profile.user_id == request.to_faculty_id).first()
        
        if not from_profile or not to_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty profiles not found"
            )
        
        if from_profile.college_id != admin_college_id or to_profile.college_id != admin_college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only reassign data between faculty in your college"
            )
    
    reassigned_counts = {
        "coding_problems": 0,
        "quizzes": 0,
        "labs": 0,
        "lab_problems": 0,
        "lab_assignments": 0
    }
    
    # Reassign coding problems
    if request.reassign_coding_problems:
        from app.models.quiz import CodingProblem
        coding_problems = db.query(CodingProblem).filter(CodingProblem.created_by == request.from_faculty_id).all()
        for problem in coding_problems:
            problem.created_by = request.to_faculty_id
            reassigned_counts["coding_problems"] += 1
        db.flush()
    
    # Reassign quizzes
    if request.reassign_quizzes:
        from app.models.quiz import Quiz
        quizzes = db.query(Quiz).filter(Quiz.created_by == request.from_faculty_id).all()
        for quiz in quizzes:
            quiz.created_by = request.to_faculty_id
            reassigned_counts["quizzes"] += 1
        db.flush()
    
    # Reassign coding labs
    if request.reassign_labs:
        from app.models.coding_lab import CodingLab
        labs = db.query(CodingLab).filter(CodingLab.created_by == request.from_faculty_id).all()
        for lab in labs:
            lab.created_by = request.to_faculty_id
            reassigned_counts["labs"] += 1
        db.flush()
    
    # Reassign lab problems
    if request.reassign_lab_problems:
        from app.models.coding_lab import LabProblem
        lab_problems = db.query(LabProblem).filter(LabProblem.created_by == request.from_faculty_id).all()
        for lab_problem in lab_problems:
            lab_problem.created_by = request.to_faculty_id
            reassigned_counts["lab_problems"] += 1
        db.flush()
    
    # Reassign lab faculty assignments
    if request.reassign_lab_assignments:
        from app.models.coding_lab import LabFacultyAssignment
        lab_assignments = db.query(LabFacultyAssignment).filter(
            LabFacultyAssignment.faculty_id == request.from_faculty_id
        ).all()
        for assignment in lab_assignments:
            assignment.faculty_id = request.to_faculty_id
            reassigned_counts["lab_assignments"] += 1
        db.flush()
    
    db.commit()
    
    # Log audit
    from_profile = db.query(Profile).filter(Profile.user_id == request.from_faculty_id).first()
    to_profile = db.query(Profile).filter(Profile.user_id == request.to_faculty_id).first()
    
    audit_log = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="REASSIGN",
        entity_type="faculty_data",
        entity_id=request.from_faculty_id,
        entity_name=f"Faculty data reassignment",
        description=f"Reassigned data from faculty {from_profile.full_name if from_profile else request.from_faculty_id} to {to_profile.full_name if to_profile else request.to_faculty_id}",
        changes={
            "from_faculty_id": request.from_faculty_id,
            "to_faculty_id": request.to_faculty_id,
            "reassigned_counts": reassigned_counts
        },
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "message": f"Successfully reassigned faculty data from {request.from_faculty_id} to {request.to_faculty_id}",
        "reassigned_counts": reassigned_counts
    }


# Block/disable user
class BlockUserRequest(BaseModel):
    user_ids: TypingList[int] = Field(..., description="List of user IDs to block")
    block: bool = Field(True, description="True to block, False to unblock")

@router.post("/block", response_model=dict)
async def block_users(
    request: BlockUserRequest,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Block or unblock users (set is_active)"""
    from app.models.audit_log import AuditLog
    from datetime import datetime
    
    current_user, is_super_admin = current_user_tuple
    user_ids = request.user_ids
    block = request.block
    
    # Permission check
    if not is_super_admin:
        admin_college_id = get_admin_college_id(current_user, db)
        # Check all users belong to admin's college
        for user_id in user_ids:
            profile = db.query(Profile).filter(Profile.user_id == user_id).first()
            if not profile or profile.college_id != admin_college_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Can only block users from your college"
                )
    
    blocked_count = 0
    for user_id in user_ids:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_active = "false" if block else "true"
            blocked_count += 1
    
    db.commit()
    
    # Log audit
    action = "BLOCK" if block else "UNBLOCK"
    audit_log = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action=action,
        entity_type="users",
        entity_id=None,
        entity_name=f"{action} {blocked_count} users",
        description=f"{action} {blocked_count} users",
        changes={"user_ids": user_ids, "blocked": block, "count": blocked_count},
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "message": f"Successfully {'blocked' if block else 'unblocked'} {blocked_count} users",
        "blocked_count": blocked_count,
        "blocked": block
    }


# Block all users in college
class BlockCollegeUsersRequest(BaseModel):
    college_id: int
    block: bool = Field(True, description="True to block, False to unblock")

@router.post("/block-college", response_model=dict)
async def block_college_users(
    request: BlockCollegeUsersRequest,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Block or unblock all users in a college"""
    from app.models.audit_log import AuditLog
    from datetime import datetime
    from sqlalchemy import and_
    
    current_user, is_super_admin = current_user_tuple
    college_id = request.college_id
    block = request.block
    
    # Permission check
    if not is_super_admin:
        admin_college_id = get_admin_college_id(current_user, db)
        if admin_college_id != college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only block users from your college"
            )
    
    # Get all users in college
    profiles = db.query(Profile).filter(Profile.college_id == college_id).all()
    user_ids = [p.user_id for p in profiles if p.user_id]
    
    blocked_count = 0
    for user_id in user_ids:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_active = "false" if block else "true"
            blocked_count += 1
    
    db.commit()
    
    # Log audit
    action = "BLOCK" if block else "UNBLOCK"
    audit_log = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action=action,
        entity_type="college_users",
        entity_id=college_id,
        entity_name=f"{action} all users in college {college_id}",
        description=f"{action} {blocked_count} users in college {college_id}",
        changes={"college_id": college_id, "blocked": block, "count": blocked_count},
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "message": f"Successfully {'blocked' if block else 'unblocked'} {blocked_count} users in college",
        "blocked_count": blocked_count,
        "college_id": college_id,
        "blocked": block
    }


# Block all users by year
class BlockYearUsersRequest(BaseModel):
    college_id: int
    present_year: str = Field(..., description="Year to block (e.g., '1st', '2nd', '3rd')")
    block: bool = Field(True, description="True to block, False to unblock")

@router.post("/block-year", response_model=dict)
async def block_year_users(
    request: BlockYearUsersRequest,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Block or unblock all users in a specific year"""
    try:
        from app.models.audit_log import AuditLog
        from datetime import datetime
        from sqlalchemy import and_, or_
        from app.core.year_utils import parse_year, format_year
        
        current_user, is_super_admin = current_user_tuple
        college_id = request.college_id
        present_year = request.present_year
        block = request.block
        
        # Permission check
        if not is_super_admin:
            admin_college_id = get_admin_college_id(current_user, db)
            if admin_college_id != college_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only block users from your college"
                )
        
        # Normalize year format
        normalized_year = parse_year(present_year)
        formatted_version = format_year(normalized_year) if normalized_year else None
        
        year_formats_to_match = set()
        if normalized_year:
            year_formats_to_match.add(normalized_year)
        if formatted_version:
            year_formats_to_match.add(formatted_version)
        if present_year:
            year_formats_to_match.add(present_year)
        
        year_formats_to_match = {y for y in year_formats_to_match if y}
        year_formats_list = list(year_formats_to_match)
        
        # Get all student profiles for this year and college - fix the join
        if year_formats_list:
            conditions = [Profile.present_year == fmt for fmt in year_formats_list]
            profiles = db.query(Profile).select_from(
                UserRole
            ).join(
                Profile, UserRole.user_id == Profile.user_id
            ).filter(
                and_(
                    UserRole.role == RoleEnum.STUDENT,
                    Profile.college_id == college_id,
                    or_(*conditions)
                )
            ).all()
        else:
            profiles = db.query(Profile).select_from(
                UserRole
            ).join(
                Profile, UserRole.user_id == Profile.user_id
            ).filter(
                and_(
                    UserRole.role == RoleEnum.STUDENT,
                    Profile.college_id == college_id,
                    Profile.present_year == present_year
                )
            ).all()
        
        blocked_count = 0
        user_ids = []
        for profile in profiles:
            user = db.query(User).filter(User.id == profile.user_id).first()
            if user:
                user.is_active = "false" if block else "true"
                blocked_count += 1
                user_ids.append(user.id)
        
        db.commit()
        
        # Log audit
        action = "BLOCK" if block else "UNBLOCK"
        try:
            audit_log = AuditLog(
                user_id=current_user.id,
                user_email=current_user.email,
                action=action,
                entity_type="year_users",
                entity_id=None,
                entity_name=f"{action} {present_year} year students",
                description=f"{action} {blocked_count} {present_year} year students in college {college_id}",
                changes={"college_id": college_id, "year": present_year, "blocked": block, "count": blocked_count, "user_ids": user_ids},
                created_at=datetime.utcnow()
            )
            db.add(audit_log)
            db.commit()
        except Exception as audit_error:
            # Don't fail the whole operation if audit log fails
            print(f"Warning: Failed to create audit log: {audit_error}")
            db.rollback()
        
        return {
            "message": f"Successfully {'blocked' if block else 'unblocked'} {blocked_count} {present_year} year students",
            "blocked_count": blocked_count,
            "year": present_year,
            "college_id": college_id,
            "blocked": block
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in block_year_users: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error blocking/unblocking users: {str(e)}"
        )


@router.get("/colleges/{college_id}/analytics")
async def get_college_analytics(
    college_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get analytics for a specific college"""
    # Get total students
    student_profiles = db.query(Profile).filter(Profile.college_id == college_id).all()
    student_count = len([p for p in student_profiles if p.user_id])
    
    # Get students by department
    departments = {}
    for profile in student_profiles:
        if profile.department:
            departments[profile.department] = departments.get(profile.department, 0) + 1
    
    # Get students by section
    sections = {}
    for profile in student_profiles:
        if profile.section:
            sections[profile.section] = sections.get(profile.section, 0) + 1
    
    # Get faculty count
    faculty_roles = db.query(UserRole).filter(
        UserRole.college_id == college_id,
        UserRole.role == RoleEnum.FACULTY
    ).count()
    
    # Get admin count
    admin_roles = db.query(UserRole).filter(
        UserRole.college_id == college_id,
        UserRole.role == RoleEnum.ADMIN
    ).count()
    
    return {
        "total_students": student_count,
        "total_faculty": faculty_roles,
        "total_admins": admin_roles,
        "students_by_department": departments,
        "students_by_section": sections
    }


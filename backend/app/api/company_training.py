"""Company Training API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, cast, String, text
from typing import List, Optional
from app.core.database import get_db
from app.core.db_utils import safe_list_query, safe_query
from app.models.company_training import (
    Company as CompanyModel,
    CompanyRole as CompanyRoleModel,
    PracticeSection as PracticeSectionModel,
    Round as RoundModel,
    RoundContent as RoundContentModel,
    RoundType
)
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.schemas.company_training import (
    CompanyCreate, CompanyUpdate, Company,
    CompanyRoleCreate, CompanyRoleUpdate, CompanyRole, CompanyRoleWithSections,
    PracticeSectionCreate, PracticeSectionUpdate, PracticeSection, PracticeSectionWithRounds,
    RoundCreate, RoundUpdate, Round, RoundWithContent,
    RoundContentCreate, RoundContentUpdate, RoundContent
)
from app.api.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/company-training", tags=["company-training"])


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


def filter_by_scope(roles_query, current_user: Optional[User], db: Session):
    """Filter roles based on user's scope (college, department, year, section)
    
    IMPORTANT: All students can access 'svnapro' scoped roles regardless of their profile.
    This ensures company training material is accessible to all students.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Always include svnapro roles - accessible to everyone
    conditions = [CompanyRoleModel.scope_type == "svnapro"]
    
    if not current_user:
        # Not logged in - show only svnapro
        logger.info("[COMPANY_TRAINING] No current user, filtering for svnapro only")
        return roles_query.filter(CompanyRoleModel.scope_type == "svnapro")
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    logger.info(f"[COMPANY_TRAINING] User {current_user.id} has roles: {role_names}")
    
    # Super admin sees all
    if RoleEnum.SUPER_ADMIN in role_names:
        logger.info("[COMPANY_TRAINING] Super admin detected, returning all roles")
        return roles_query
    
    # Get user profile for filtering additional scopes
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    
    logger.info(f"[COMPANY_TRAINING] User profile exists: {profile is not None}, college_id: {profile.college_id if profile else None}, department: {profile.department if profile else None}")
    
    # Even without profile, students can see svnapro roles (already in conditions)
    if profile:
        # College level
        if profile.college_id:
            conditions.append(
                and_(
                    CompanyRoleModel.scope_type == "college",
                    # For college scope, we'd need to check if role targets this college
                    # For now, show all college-scoped roles
                )
            )
        
        # Department level
        if profile.department:
            # For JSON columns in SQLite, they are stored as TEXT
            # Use SQLAlchemy's cast function for database-agnostic casting (works in SQLite and PostgreSQL)
            dept_pattern = f'%{profile.department}%'
            conditions.append(
                and_(
                    CompanyRoleModel.scope_type == "department",
                    or_(
                        CompanyRoleModel.target_departments.is_(None),
                        # Cast JSON to text using database-agnostic syntax
                        cast(CompanyRoleModel.target_departments, String).like(dept_pattern)
                    )
                )
            )
        
        # Section level
        if profile.section:
            # For JSON columns in SQLite, they are stored as TEXT
            # Use SQLAlchemy's cast function for database-agnostic casting (works in SQLite and PostgreSQL)
            section_pattern = f'%{profile.section}%'
            conditions.append(
                and_(
                    CompanyRoleModel.scope_type == "section",
                    or_(
                        CompanyRoleModel.target_sections.is_(None),
                        # Cast JSON to text using database-agnostic syntax
                        cast(CompanyRoleModel.target_sections, String).like(section_pattern)
                    )
                )
            )
    
    # Return roles matching any condition (svnapro is always included)
    # CRITICAL: Ensure svnapro is always accessible by using explicit OR logic
    logger.info(f"[COMPANY_TRAINING] Applying scope filter with {len(conditions)} conditions")
    
    # If we only have svnapro condition, use simple filter
    if len(conditions) == 1:
        result = roles_query.filter(CompanyRoleModel.scope_type == "svnapro")
    else:
        # Multiple conditions: svnapro OR (other scopes)
        result = roles_query.filter(or_(*conditions))
    
    count = result.count()
    logger.info(f"[COMPANY_TRAINING] Scope filter result: {count} roles")
    return result


# ========== Company Endpoints ==========

@router.post("/companies", response_model=Company, status_code=status.HTTP_201_CREATED)
async def create_company(
    company_data: CompanyCreate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Create a new company (Super Admin only)"""
    # Check if company with same name exists
    existing = db.query(CompanyModel).filter(CompanyModel.name == company_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company with this name already exists"
        )
    
    company = CompanyModel(**company_data.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/companies", response_model=List[Company])
async def list_companies(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """List all companies"""
    query = db.query(CompanyModel)
    if is_active is not None:
        query = query.filter(CompanyModel.is_active == is_active)
    return safe_list_query(db, query.order_by(CompanyModel.name))


@router.get("/companies/{company_id}", response_model=Company)
async def get_company(
    company_id: int,
    db: Session = Depends(get_db)
):
    """Get a company by ID"""
    company = safe_query(db, lambda: db.query(CompanyModel).filter(CompanyModel.id == company_id).first())
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    return company


@router.put("/companies/{company_id}", response_model=Company)
async def update_company(
    company_id: int,
    company_data: CompanyUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Update a company (Super Admin only)"""
    company = safe_query(db, lambda: db.query(CompanyModel).filter(CompanyModel.id == company_id).first())
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    update_data = company_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    db.commit()
    db.refresh(company)
    return company


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Delete a company (Super Admin only)"""
    company = safe_query(db, lambda: db.query(CompanyModel).filter(CompanyModel.id == company_id).first())
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    db.delete(company)
    db.commit()
    return None


# ========== Company Role Endpoints ==========

@router.post("/roles", response_model=CompanyRole, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: CompanyRoleCreate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Create a new company role (Super Admin only)"""
    # Verify company exists
    company = db.query(CompanyModel).filter(CompanyModel.id == role_data.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    role_dict = role_data.model_dump()
    role_dict["created_by"] = current_user.id
    role = CompanyRoleModel(**role_dict)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.get("/roles", response_model=List[CompanyRole])
async def list_roles(
    company_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """List all company roles (filtered by scope)
    
    IMPORTANT: All students can access 'svnapro' scoped roles.
    This ensures company training material is accessible to all students.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    query = db.query(CompanyRoleModel)
    
    if company_id:
        query = query.filter(CompanyRoleModel.company_id == company_id)
    
    if is_active is not None:
        query = query.filter(CompanyRoleModel.is_active == is_active)
    
    # Log before scope filtering for debugging
    total_before_scope = query.count()
    logger.info(f"[COMPANY_TRAINING] Total roles before scope filter: {total_before_scope}, is_active={is_active}, user_id={current_user.id if current_user else None}")
    
    # Filter by scope - this ensures svnapro roles are always accessible
    query = filter_by_scope(query, current_user, db)
    
    # Log after scope filtering
    total_after_scope = query.count()
    logger.info(f"[COMPANY_TRAINING] Total roles after scope filter: {total_after_scope}")
    
    # CRITICAL: Eagerly load company relationship to prevent lazy loading issues
    from sqlalchemy.orm import joinedload
    query = query.options(joinedload(CompanyRoleModel.company))
    
    # Execute query and get results
    roles = safe_list_query(db, query.order_by(CompanyRoleModel.company_id, CompanyRoleModel.role_name))
    
    # Additional safety check: if no roles found but we have svnapro roles in DB, force include them
    if len(roles) == 0:
        logger.warning(f"[COMPANY_TRAINING] No roles found after filtering, checking for svnapro roles")
        svnapro_query = db.query(CompanyRoleModel).filter(
            CompanyRoleModel.scope_type == "svnapro"
        )
        if is_active is not None:
            svnapro_query = svnapro_query.filter(CompanyRoleModel.is_active == is_active)
        svnapro_query = svnapro_query.options(joinedload(CompanyRoleModel.company))
        roles = safe_list_query(db, svnapro_query.order_by(CompanyRoleModel.company_id, CompanyRoleModel.role_name))
        logger.info(f"[COMPANY_TRAINING] Fallback: Found {len(roles)} svnapro roles")
    
    logger.info(f"[COMPANY_TRAINING] Returning {len(roles)} roles to client")
    
    return roles


@router.get("/roles/{role_id}", response_model=CompanyRoleWithSections)
async def get_role(
    role_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Get a role by ID with practice sections (filtered by scope for security)"""
    # CRITICAL: Extract all data while session is active to avoid lazy loading issues
    # Load practice sections and their rounds eagerly
    from sqlalchemy.orm import joinedload
    query = db.query(CompanyRoleModel).options(
        joinedload(CompanyRoleModel.practice_sections).joinedload(PracticeSectionModel.rounds).joinedload(RoundModel.contents)
    ).filter(CompanyRoleModel.id == role_id)
    
    # Apply scope filtering to ensure user has access to this role
    query = filter_by_scope(query, current_user, db)
    
    role_with_sections = query.first()
    
    if not role_with_sections:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found or access denied"
        )
    
    return role_with_sections


@router.put("/roles/{role_id}", response_model=CompanyRole)
async def update_role(
    role_id: int,
    role_data: CompanyRoleUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Update a role (Super Admin only)"""
    role = db.query(CompanyRoleModel).filter(CompanyRoleModel.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    update_data = role_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)
    
    db.commit()
    db.refresh(role)
    return role


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Delete a role (Super Admin only)"""
    role = db.query(CompanyRoleModel).filter(CompanyRoleModel.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    db.delete(role)
    db.commit()
    return None


# ========== Practice Section Endpoints ==========

@router.post("/practice-sections", response_model=PracticeSection, status_code=status.HTTP_201_CREATED)
async def create_practice_section(
    section_data: PracticeSectionCreate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Create a new practice section (Super Admin only)"""
    # Verify role exists
    role = db.query(CompanyRoleModel).filter(CompanyRoleModel.id == section_data.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    section = PracticeSectionModel(**section_data.model_dump())
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.get("/practice-sections", response_model=List[PracticeSection])
async def list_practice_sections(
    role_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """List practice sections"""
    query = db.query(PracticeSectionModel)
    
    if role_id:
        query = query.filter(PracticeSectionModel.role_id == role_id)
    
    if is_active is not None:
        query = query.filter(PracticeSectionModel.is_active == is_active)
    
    return safe_list_query(db, query.order_by(PracticeSectionModel.order_index, PracticeSectionModel.id))


@router.get("/practice-sections/{section_id}", response_model=PracticeSectionWithRounds)
async def get_practice_section(
    section_id: int,
    db: Session = Depends(get_db)
):
    """Get a practice section with rounds"""
    section = db.query(PracticeSectionModel).filter(PracticeSectionModel.id == section_id).first()
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice section not found"
        )
    return section


@router.put("/practice-sections/{section_id}", response_model=PracticeSection)
async def update_practice_section(
    section_id: int,
    section_data: PracticeSectionUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Update a practice section (Super Admin only)"""
    section = db.query(PracticeSectionModel).filter(PracticeSectionModel.id == section_id).first()
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice section not found"
        )
    
    update_data = section_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(section, field, value)
    
    db.commit()
    db.refresh(section)
    return section


@router.delete("/practice-sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_practice_section(
    section_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Delete a practice section (Super Admin only)"""
    section = db.query(PracticeSectionModel).filter(PracticeSectionModel.id == section_id).first()
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice section not found"
        )
    
    db.delete(section)
    db.commit()
    return None


# ========== Round Endpoints ==========

@router.post("/rounds", response_model=Round, status_code=status.HTTP_201_CREATED)
async def create_round(
    round_data: RoundCreate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Create a new round (Super Admin only)"""
    # Verify practice section exists
    section = db.query(PracticeSectionModel).filter(PracticeSectionModel.id == round_data.practice_section_id).first()
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice section not found"
        )
    
    round_obj = RoundModel(**round_data.model_dump())
    db.add(round_obj)
    db.commit()
    db.refresh(round_obj)
    return round_obj


@router.get("/rounds", response_model=List[Round])
async def list_rounds(
    practice_section_id: Optional[int] = Query(None),
    round_type: Optional[RoundType] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """List rounds"""
    query = db.query(RoundModel)
    
    if practice_section_id:
        query = query.filter(RoundModel.practice_section_id == practice_section_id)
    
    if round_type:
        query = query.filter(RoundModel.round_type == round_type)
    
    if is_active is not None:
        query = query.filter(RoundModel.is_active == is_active)
    
    return safe_list_query(db, query.order_by(RoundModel.order_index, RoundModel.id))


@router.get("/rounds/{round_id}", response_model=RoundWithContent)
async def get_round(
    round_id: int,
    db: Session = Depends(get_db)
):
    """Get a round with content"""
    # CRITICAL: Load round with contents eagerly to avoid lazy loading issues
    from sqlalchemy.orm import joinedload
    round_obj = db.query(RoundModel).options(
        joinedload(RoundModel.contents)
    ).filter(RoundModel.id == round_id).first()
    
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found"
        )
    return round_obj


@router.put("/rounds/{round_id}", response_model=Round)
async def update_round(
    round_id: int,
    round_data: RoundUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Update a round (Super Admin only)"""
    round_obj = db.query(RoundModel).filter(RoundModel.id == round_id).first()
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found"
        )
    
    update_data = round_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(round_obj, field, value)
    
    db.commit()
    db.refresh(round_obj)
    return round_obj


@router.delete("/rounds/{round_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_round(
    round_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Delete a round (Super Admin only)"""
    round_obj = db.query(RoundModel).filter(RoundModel.id == round_id).first()
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found"
        )
    
    db.delete(round_obj)
    db.commit()
    return None


# ========== Round Content Endpoints ==========

@router.post("/round-contents", response_model=RoundContent, status_code=status.HTTP_201_CREATED)
async def create_round_content(
    content_data: RoundContentCreate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Create round content (Super Admin only)"""
    # Verify round exists
    round_obj = db.query(RoundModel).filter(RoundModel.id == content_data.round_id).first()
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found"
        )
    
    content = RoundContentModel(**content_data.model_dump())
    db.add(content)
    db.commit()
    db.refresh(content)
    return content


@router.get("/round-contents", response_model=List[RoundContent])
async def list_round_contents(
    round_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """List round contents"""
    query = db.query(RoundContentModel)
    
    if round_id:
        query = query.filter(RoundContentModel.round_id == round_id)
    
    if is_active is not None:
        query = query.filter(RoundContentModel.is_active == is_active)
    
    return safe_list_query(db, query.order_by(RoundContentModel.order_index, RoundContentModel.id))


@router.get("/round-contents/{content_id}", response_model=RoundContent)
async def get_round_content(
    content_id: int,
    db: Session = Depends(get_db)
):
    """Get round content by ID"""
    content = db.query(RoundContentModel).filter(RoundContentModel.id == content_id).first()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round content not found"
        )
    return content


@router.put("/round-contents/{content_id}", response_model=RoundContent)
async def update_round_content(
    content_id: int,
    content_data: RoundContentUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Update round content (Super Admin only)"""
    content = db.query(RoundContentModel).filter(RoundContentModel.id == content_id).first()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round content not found"
        )
    
    update_data = content_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(content, field, value)
    
    db.commit()
    db.refresh(content)
    return content


@router.delete("/round-contents/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_round_content(
    content_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Delete round content (Super Admin only)"""
    content = db.query(RoundContentModel).filter(RoundContentModel.id == content_id).first()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round content not found"
        )
    
    db.delete(content)
    db.commit()
    return None


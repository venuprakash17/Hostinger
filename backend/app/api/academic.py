"""Academic structure management API"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.academic import (
    AcademicYear,
    Department,
    Semester,
    Subject,
    Section,
    SubjectAssignment,
    Period,
    FacultySectionAssignment,
)
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.api.auth import get_current_user
from app.api.users import get_current_admin_or_super, get_current_super_admin, get_current_admin_or_super_or_hod
from app.schemas.academic import (
    AcademicYearCreate,
    AcademicYearUpdate,
    AcademicYearResponse,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    SemesterCreate,
    SemesterUpdate,
    SemesterResponse,
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse,
    SectionCreate,
    SectionUpdate,
    SectionResponse,
    SubjectAssignmentCreate,
    SubjectAssignmentUpdate,
    SubjectAssignmentResponse,
    PeriodCreate,
    PeriodUpdate,
    PeriodResponse,
)

router = APIRouter(prefix="/academic", tags=["academic"])


# ==================== Academic Year (Super Admin Only) ====================

@router.post("/academic-years", response_model=AcademicYearResponse, status_code=status.HTTP_201_CREATED)
async def create_academic_year(
    year_data: AcademicYearCreate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Create academic year (Super Admin only)"""
    # If setting as current, unset other current years
    if year_data.is_current:
        db.query(AcademicYear).update({"is_current": False})
    
    academic_year = AcademicYear(
        **year_data.model_dump(),
        created_by=current_user.id
    )
    db.add(academic_year)
    db.commit()
    db.refresh(academic_year)
    
    return academic_year


@router.get("/academic-years", response_model=List[AcademicYearResponse])
async def get_academic_years(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all academic years"""
    return db.query(AcademicYear).order_by(AcademicYear.start_date.desc()).all()


@router.put("/academic-years/{year_id}", response_model=AcademicYearResponse)
async def update_academic_year(
    year_id: int,
    year_data: AcademicYearUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Update academic year (Super Admin only)"""
    academic_year = db.query(AcademicYear).filter(AcademicYear.id == year_id).first()
    if not academic_year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    
    update_data = year_data.model_dump(exclude_unset=True)
    if update_data.get("is_current"):
        db.query(AcademicYear).filter(AcademicYear.id != year_id).update({"is_current": False})
    
    for field, value in update_data.items():
        setattr(academic_year, field, value)
    
    db.commit()
    db.refresh(academic_year)
    return academic_year


# ==================== Departments (College Admin) ====================

@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    dept_data: DepartmentCreate,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Create department (College Admin or Super Admin)"""
    current_user, is_super_admin = current_user_tuple
    
    # Get college_id
    if is_super_admin:
        college_id = dept_data.college_id
        if not college_id:
            raise HTTPException(status_code=400, detail="College ID is required when creating a department as super admin")
    else:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        college_id = profile.college_id if profile else None
        if not college_id:
            raise HTTPException(status_code=400, detail="College admin must be associated with a college")
    
    department_data = dept_data.model_dump(exclude={"college_id"})
    
    # Auto-generate branch_id if not provided
    if not department_data.get('branch_id'):
        if department_data.get('code'):
            department_data['branch_id'] = department_data['code'].upper()
        else:
            # Generate from name
            department_data['branch_id'] = department_data['name'].upper().replace(' ', '_')[:20]
    
    # Check if branch_id already exists
    if department_data.get('branch_id'):
        existing = db.query(Department).filter(Department.branch_id == department_data['branch_id']).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Branch ID '{department_data['branch_id']}' already exists"
            )
    
    department = Department(**department_data, college_id=college_id)
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


@router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(
    college_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get departments (filtered by college if not super admin)"""
    query = db.query(Department)
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.SUPER_ADMIN not in role_names:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.college_id:
            query = query.filter(Department.college_id == profile.college_id)
    
    if college_id:
        query = query.filter(Department.college_id == college_id)
    
    return query.filter(Department.is_active == True).all()


@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: int,
    dept_data: DepartmentUpdate,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Update department"""
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    update_data = dept_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(department, field, value)
    
    db.commit()
    db.refresh(department)
    return department


# ==================== Semesters (College Admin) ====================

@router.post("/semesters", response_model=SemesterResponse, status_code=status.HTTP_201_CREATED)
async def create_semester(
    semester_data: SemesterCreate,
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Create semester (College Admin, Super Admin, or HOD)
    
    - Super Admin: Can create semesters for any college
    - College Admin: Can create semesters for their college
    - HOD: Can create semesters for their college (semesters are college-wide)
    """
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple
    
    if is_super_admin:
        college_id = semester_data.college_id
    elif is_hod:
        # HOD: get college_id from their department
        from app.models.academic import Department
        hod_department = db.query(Department).filter(Department.id == hod_department_id).first()
        if not hod_department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="HOD department not found"
            )
        college_id = hod_department.college_id
    else:  # is_admin
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        college_id = profile.college_id if profile else None
        if not college_id:
            raise HTTPException(status_code=400, detail="College admin must be associated with a college")
    
    semester_payload = semester_data.model_dump(exclude={"college_id"})
    semester = Semester(**semester_payload, college_id=college_id)
    db.add(semester)
    db.commit()
    db.refresh(semester)
    return semester


@router.get("/semesters", response_model=List[SemesterResponse])
async def get_semesters(
    college_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get semesters"""
    query = db.query(Semester)
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.SUPER_ADMIN not in role_names:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.college_id:
            query = query.filter(Semester.college_id == profile.college_id)
    
    if college_id:
        query = query.filter(Semester.college_id == college_id)
    
    return query.filter(Semester.is_active == True).order_by(Semester.number).all()


@router.put("/semesters/{semester_id}", response_model=SemesterResponse)
async def update_semester(
    semester_id: int,
    semester_data: SemesterUpdate,
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Update semester (College Admin, Super Admin, or HOD)
    
    - Super Admin: Can update any semester
    - College Admin: Can update semesters in their college
    - HOD: Can update semesters in their college
    """
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple
    
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    
    # Permission checks
    if is_hod:
        # HOD can only update semesters in their college
        from app.models.academic import Department
        hod_department = db.query(Department).filter(Department.id == hod_department_id).first()
        if hod_department and semester.college_id != hod_department.college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only update semesters in their college"
            )
    elif is_admin and not is_super_admin:
        # College admin can only update semesters in their college
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.college_id and semester.college_id != profile.college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only update semesters from your college"
            )
    
    update_data = semester_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(semester, field, value)
    
    db.commit()
    db.refresh(semester)
    return semester


# ==================== Subjects (College Admin) ====================

@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    subject_data: SubjectCreate,
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Create subject (College Admin, Super Admin, or HOD)
    
    - Super Admin: Can create subjects for any college
    - College Admin: Can create subjects for their college
    - HOD: Can create subjects only for their department
    """
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple
    
    # Get college_id and department_id
    if is_super_admin:
        college_id = subject_data.college_id
        department_id = subject_data.department_id
    elif is_hod:
        # HOD can only create subjects in their department
        if not hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="HOD must be associated with a department"
            )
        # Verify department_id matches HOD's department
        if subject_data.department_id and subject_data.department_id != hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only create subjects for their own department"
            )
        department_id = hod_department_id
        # Get college_id from department
        from app.models.academic import Department
        hod_department = db.query(Department).filter(Department.id == hod_department_id).first()
        if not hod_department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="HOD department not found"
            )
        college_id = hod_department.college_id
    else:  # is_admin
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        college_id = profile.college_id if profile else None
        if not college_id:
            raise HTTPException(status_code=400, detail="College admin must be associated with a college")
        department_id = subject_data.department_id
    
    subject_payload = subject_data.model_dump(exclude={"college_id"})
    subject = Subject(**subject_payload, college_id=college_id, department_id=department_id)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.get("/subjects", response_model=List[SubjectResponse])
async def get_subjects(
    college_id: Optional[int] = None,
    department_id: Optional[int] = None,
    semester_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get subjects
    
    - Super Admin: Can see all subjects
    - College Admin: Can see subjects in their college
    - HOD: Can see subjects in their department only
    - Others: Can see subjects in their college
    """
    from app.models.academic import Department
    
    query = db.query(Subject)
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.SUPER_ADMIN not in role_names:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        
        if RoleEnum.HOD in role_names:
            # HOD can only see subjects in their department
            hod_department = db.query(Department).filter(Department.hod_id == current_user.id).first()
            if not hod_department and profile and profile.department:
                hod_department = db.query(Department).filter(
                    Department.name == profile.department
                ).first()
            if hod_department:
                query = query.filter(Subject.department_id == hod_department.id)
            elif profile and profile.department:
                # Fallback: filter by department name if department_id not available
                query = query.join(Department).filter(Department.name == profile.department)
        elif profile and profile.college_id:
            # College admin and others: filter by college
            query = query.filter(Subject.college_id == profile.college_id)
    
    if college_id:
        query = query.filter(Subject.college_id == college_id)
    if department_id:
        query = query.filter(Subject.department_id == department_id)
    if semester_id:
        query = query.filter(Subject.semester_id == semester_id)
    
    return query.filter(Subject.is_active == True).all()


@router.put("/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    subject_data: SubjectUpdate,
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Update subject (College Admin, Super Admin, or HOD)
    
    - Super Admin: Can update any subject
    - College Admin: Can update subjects in their college
    - HOD: Can only update subjects in their department
    """
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple
    
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Permission checks
    if is_hod:
        # HOD can only update subjects in their department
        if subject.department_id != hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only update subjects in their own department"
            )
        # Prevent HOD from changing department_id
        update_data = subject_data.model_dump(exclude_unset=True)
        if 'department_id' in update_data and update_data['department_id'] != hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD cannot change subject department"
            )
    elif is_admin and not is_super_admin:
        # College admin can only update subjects in their college
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.college_id and subject.college_id != profile.college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only update subjects from your college"
            )
    
    update_data = subject_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subject, field, value)
    
    db.commit()
    db.refresh(subject)
    return subject


# ==================== Sections (College Admin) ====================

@router.post("/sections", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
async def create_section(
    section_data: SectionCreate,
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Create section (College Admin, Super Admin, or HOD)
    
    - Super Admin: Can create sections for any department
    - College Admin: Can create sections for departments in their college
    - HOD: Can only create sections for their own department
    """
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple

    if is_super_admin:
        college_id = section_data.college_id
        if not college_id:
            raise HTTPException(status_code=400, detail="College ID is required when creating a section as super admin")
    elif is_hod:
        # HOD: get college_id from their department and enforce department_id
        from app.models.academic import Department
        hod_department = db.query(Department).filter(Department.id == hod_department_id).first()
        if not hod_department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="HOD department not found"
            )
        college_id = hod_department.college_id
        # HOD can only create sections for their own department
        if section_data.department_id != hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only create sections for their own department"
            )
    else:  # is_admin
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        college_id = profile.college_id if profile else None
        if not college_id:
            raise HTTPException(status_code=400, detail="College admin must be associated with a college")

    section_name = section_data.name.strip()

    # Validate department belongs to college
    department = db.query(Department).filter(Department.id == section_data.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    if department.college_id != college_id:
        raise HTTPException(status_code=400, detail="Department does not belong to the selected college")

    # Validate semester if provided
    semester = None
    if section_data.semester_id:
        semester = db.query(Semester).filter(Semester.id == section_data.semester_id).first()
        if not semester:
            raise HTTPException(status_code=404, detail="Semester not found")
        if semester.college_id != college_id:
            raise HTTPException(status_code=400, detail="Semester does not belong to the selected college")

    # Prevent duplicate sections with same name in same department/year
    existing_section = (
        db.query(Section)
        .filter(
            Section.college_id == college_id,
            Section.department_id == section_data.department_id,
            Section.name == section_name,
            Section.is_active == True,
        )
        .first()
    )
    if existing_section:
        raise HTTPException(status_code=400, detail="Section with this name already exists for the department")

    try:
        # Create section with explicit fields
        section = Section(
            name=section_name,
            college_id=college_id,
            department_id=section_data.department_id,
            semester_id=section_data.semester_id,
            year=section_data.year,
            is_active=True,
        )
        db.add(section)
        db.commit()
        db.refresh(section)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create section: {str(e)}"
        )

    # Auto-link students with matching section name in the same department
    # This allows super admin to upload students with section names (A, B, C)
    # and college admin to create sections later, which will automatically link
    from app.models.profile import Profile
    from app.models.user import UserRole, RoleEnum
    
    # Find students in the same department with matching section name but no section_id
    students_to_link = db.query(Profile).join(UserRole).filter(
        Profile.department_id == section_data.department_id,
        Profile.section == section_name,
        Profile.section_id.is_(None),  # Not yet linked
        UserRole.role == RoleEnum.STUDENT,
        Profile.college_id == college_id
    ).all()
    
    # Update section_id for matching students
    if students_to_link:
        for student_profile in students_to_link:
            student_profile.section_id = section.id
        db.commit()
        print(f"[Create Section] Auto-linked {len(students_to_link)} students to section '{section_name}'")

    # Get department name safely
    department_name = department.name if department else None
    
    # Get semester name safely
    semester_name = semester.name if semester else None
    
    return SectionResponse(
        id=section.id,
        name=section.name,
        department_id=section.department_id,
        semester_id=section.semester_id,
        year=section.year,
        college_id=section.college_id,
        is_active=section.is_active,
        created_at=section.created_at,
        updated_at=section.updated_at,
        department_name=department_name,
        semester_name=semester_name,
    )


@router.get("/sections", response_model=List[SectionResponse])
async def get_sections(
    college_id: Optional[int] = None,
    department_id: Optional[int] = None,
    semester_id: Optional[int] = None,
    include_inactive: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sections"""
    query = db.query(Section)
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.SUPER_ADMIN not in role_names:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        
        if RoleEnum.HOD in role_names:
            # HOD can only see sections in their department
            hod_department = db.query(Department).filter(Department.hod_id == current_user.id).first()
            if not hod_department and profile and profile.department:
                hod_department = db.query(Department).filter(
                    Department.name == profile.department
                ).first()
            if hod_department:
                query = query.filter(Section.department_id == hod_department.id)
        elif profile and profile.college_id:
            # College admin and others: filter by college
            query = query.filter(Section.college_id == profile.college_id)
    
    if college_id:
        query = query.filter(Section.college_id == college_id)
    if department_id:
        query = query.filter(Section.department_id == department_id)
    if semester_id:
        query = query.filter(Section.semester_id == semester_id)
    if not include_inactive:
        query = query.filter(Section.is_active == True)

    from app.core.db_utils import safe_list_query
    sections = safe_list_query(db, query.order_by(Section.name.asc()))

    results: List[SectionResponse] = []
    for section in sections:
        # Get department name safely to avoid loading relationship if not needed
        department_name = None
        if section.department_id:
            try:
                department = db.query(Department).filter(Department.id == section.department_id).first()
                department_name = department.name if department else None
            except Exception:
                # Fallback if department query fails
                department_name = None
        
        # Get semester name safely
        semester_name = None
        if section.semester_id:
            try:
                semester = db.query(Semester).filter(Semester.id == section.semester_id).first()
                semester_name = semester.name if semester else None
            except Exception:
                semester_name = None
        
        results.append(
            SectionResponse(
                id=section.id,
                name=section.name,
                department_id=section.department_id,
                semester_id=section.semester_id,
                year=section.year,
                college_id=section.college_id,
                is_active=section.is_active,
                created_at=section.created_at,
                updated_at=section.updated_at,
                department_name=department_name,
                semester_name=semester_name,
            )
        )
    return results


@router.put("/sections/{section_id}", response_model=SectionResponse)
async def update_section(
    section_id: int,
    section_data: SectionUpdate,
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Update section (College Admin, Super Admin, or HOD)
    
    - Super Admin: Can update any section
    - College Admin: Can update sections in their college
    - HOD: Can only update sections in their department
    """
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple
    
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Permission checks
    if is_hod:
        # HOD can only update sections in their department
        if section.department_id != hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only update sections in their own department"
            )
    elif is_admin and not is_super_admin:
        # College admin can only update sections in their college
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if not profile or profile.college_id != section.college_id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this section")

    update_data = section_data.model_dump(exclude_unset=True)

    # If department is changing, validate belongs to same college and HOD's department
    if "department_id" in update_data and update_data["department_id"] is not None:
        new_department = db.query(Department).filter(Department.id == update_data["department_id"]).first()
        if not new_department:
            raise HTTPException(status_code=404, detail="Department not found")
        if new_department.college_id != section.college_id:
            raise HTTPException(status_code=400, detail="Department does not belong to the section's college")
        # HOD cannot change department
        if is_hod and update_data["department_id"] != hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD cannot change section department"
            )

    if "semester_id" in update_data and update_data["semester_id"] is not None:
        new_semester = db.query(Semester).filter(Semester.id == update_data["semester_id"]).first()
        if not new_semester:
            raise HTTPException(status_code=404, detail="Semester not found")
        if new_semester.college_id != section.college_id:
            raise HTTPException(status_code=400, detail="Semester does not belong to the section's college")

    for field, value in update_data.items():
        setattr(section, field, value)

    db.commit()
    db.refresh(section)

    # Get department name safely
    department_name = None
    if section.department_id:
        try:
            dept = db.query(Department).filter(Department.id == section.department_id).first()
            department_name = dept.name if dept else None
        except Exception:
            department_name = None
    
    # Get semester name safely
    semester_name = None
    if section.semester_id:
        try:
            sem = db.query(Semester).filter(Semester.id == section.semester_id).first()
            semester_name = sem.name if sem else None
        except Exception:
            semester_name = None

    return SectionResponse(
        id=section.id,
        name=section.name,
        department_id=section.department_id,
        semester_id=section.semester_id,
        year=section.year,
        college_id=section.college_id,
        is_active=section.is_active,
        created_at=section.created_at,
        updated_at=section.updated_at,
        department_name=department_name,
        semester_name=semester_name,
    )


# ==================== Subject Assignments (College Admin) ====================

@router.post("/subject-assignments", response_model=SubjectAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_subject_assignment(
    assignment_data: SubjectAssignmentCreate,
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Assign subject to faculty (College Admin, Super Admin, or HOD)
    
    - Super Admin: Can assign any subject to any faculty
    - College Admin: Can assign subjects in their college to faculty in their college
    - HOD: Can assign subjects in their department to faculty in their department
    """
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple
    
    # Verify faculty exists and has faculty role
    faculty = db.query(User).filter(User.id == assignment_data.faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    faculty_roles = db.query(UserRole).filter(
        UserRole.user_id == assignment_data.faculty_id,
        UserRole.role == RoleEnum.FACULTY
    ).first()
    if not faculty_roles:
        raise HTTPException(status_code=400, detail="User must have faculty role")

    subject = db.query(Subject).filter(Subject.id == assignment_data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Permission checks
    if is_hod:
        # HOD can only assign subjects in their department
        if subject.department_id != hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only assign subjects from their own department"
            )
        # Verify faculty is in HOD's department
        faculty_profile = db.query(Profile).filter(Profile.user_id == assignment_data.faculty_id).first()
        if not faculty_profile:
            raise HTTPException(status_code=404, detail="Faculty profile not found")
        
        # Check if faculty is in HOD's department (by department_id or department name)
        from app.models.academic import Department
        hod_department = db.query(Department).filter(Department.id == hod_department_id).first()
        if hod_department:
            faculty_in_dept = (
                faculty_profile.department_id == hod_department_id or
                faculty_profile.department == hod_department.name
            )
            if not faculty_in_dept:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="HOD can only assign faculty from their own department"
                )
    elif is_admin and not is_super_admin:
        # College admin can only assign subjects in their college
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if not profile or not profile.college_id:
            raise HTTPException(status_code=400, detail="College admin must be associated with a college")
        if subject.college_id != profile.college_id:
            raise HTTPException(status_code=400, detail="Subject does not belong to your college")
        
        # Verify faculty is in same college
        faculty_profile = db.query(Profile).filter(Profile.user_id == assignment_data.faculty_id).first()
        if faculty_profile and faculty_profile.college_id != profile.college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Faculty must belong to your college"
            )

    section_obj = None
    if assignment_data.section_id:
        section_obj = db.query(Section).filter(Section.id == assignment_data.section_id).first()
        if not section_obj:
            raise HTTPException(status_code=404, detail="Section not found")
        if section_obj.college_id != subject.college_id:
            raise HTTPException(status_code=400, detail="Section does not belong to the subject's college")

    assignment_payload = assignment_data.model_dump()
    if section_obj:
        if not assignment_payload.get("section"):
            assignment_payload["section"] = section_obj.name
    if assignment_payload.get("section"):
        assignment_payload["section"] = assignment_payload["section"].strip()

    assignment = SubjectAssignment(
        **assignment_payload,
        assigned_by=current_user.id
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    # Get related info for response
    profile = db.query(Profile).filter(Profile.user_id == assignment.faculty_id).first()
    semester = db.query(Semester).filter(Semester.id == assignment.semester_id).first() if assignment.semester_id else None
    
    response = SubjectAssignmentResponse(
        **assignment.__dict__,
        subject_name=subject.name if subject else None,
        faculty_name=profile.full_name if profile else None,
        semester_name=semester.name if semester else None,
        section_name=section_obj.name if section_obj else assignment.section
    )
    return response


@router.get("/subject-assignments", response_model=List[SubjectAssignmentResponse])
async def get_subject_assignments(
    faculty_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    section_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get subject assignments"""
    query = db.query(SubjectAssignment)
    
    # Role-based filtering: if faculty, only show their own assignments unless explicitly requested
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_faculty = RoleEnum.FACULTY in role_names
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    
    # If faculty and no faculty_id specified, filter to their assignments
    if is_faculty and not faculty_id and not is_admin:
        query = query.filter(SubjectAssignment.faculty_id == current_user.id)
    elif faculty_id:
        query = query.filter(SubjectAssignment.faculty_id == faculty_id)
    
    if subject_id:
        query = query.filter(SubjectAssignment.subject_id == subject_id)
    if section_id:
        query = query.filter(SubjectAssignment.section_id == section_id)
    
    assignments = query.filter(SubjectAssignment.is_active == True).all()
    
    result = []
    for assignment in assignments:
        subject = db.query(Subject).filter(Subject.id == assignment.subject_id).first()
        profile = db.query(Profile).filter(Profile.user_id == assignment.faculty_id).first()
        semester = db.query(Semester).filter(Semester.id == assignment.semester_id).first() if assignment.semester_id else None
        section_obj = db.query(Section).filter(Section.id == assignment.section_id).first() if assignment.section_id else None
        
        result.append(SubjectAssignmentResponse(
            **assignment.__dict__,
            subject_name=subject.name if subject else None,
            faculty_name=profile.full_name if profile else None,
            semester_name=semester.name if semester else None,
            section_name=section_obj.name if section_obj else assignment.section
        ))
    
    return result


@router.put("/subject-assignments/{assignment_id}", response_model=SubjectAssignmentResponse)
async def update_subject_assignment(
    assignment_id: int,
    assignment_data: SubjectAssignmentUpdate,
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Update subject assignment (College Admin, Super Admin, or HOD)
    
    - Super Admin: Can update any assignment
    - College Admin: Can update assignments for subjects in their college
    - HOD: Can only update assignments for subjects in their department
    """
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple
    
    assignment = db.query(SubjectAssignment).filter(SubjectAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    subject = db.query(Subject).filter(Subject.id == assignment.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Permission checks
    if is_hod:
        # HOD can only update assignments for subjects in their department
        if subject.department_id != hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only update assignments for subjects in their own department"
            )
    elif is_admin and not is_super_admin:
        # College admin can only update assignments for subjects in their college
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.college_id and subject.college_id != profile.college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only update assignments for subjects from your college"
            )

    update_data = assignment_data.model_dump(exclude_unset=True)

    # Handle section updates explicitly
    if "section_id" in update_data:
        new_section_id = update_data.pop("section_id")
        if new_section_id:
            section_obj = db.query(Section).filter(Section.id == new_section_id).first()
            if not section_obj:
                raise HTTPException(status_code=404, detail="Section not found")
            if subject and section_obj.college_id != subject.college_id:
                raise HTTPException(status_code=400, detail="Section does not belong to the subject's college")
            assignment.section_id = new_section_id
            # If section name not provided in update_data, sync from section
            if "section" not in update_data or update_data.get("section") is None:
                assignment.section = section_obj.name
        else:
            assignment.section_id = None

    if "section" in update_data and update_data["section"] is not None:
        update_data["section"] = update_data["section"].strip()

    for field, value in update_data.items():
        setattr(assignment, field, value)
    
    db.commit()
    db.refresh(assignment)
    
    subject = db.query(Subject).filter(Subject.id == assignment.subject_id).first()
    profile = db.query(Profile).filter(Profile.user_id == assignment.faculty_id).first()
    semester = db.query(Semester).filter(Semester.id == assignment.semester_id).first() if assignment.semester_id else None
    section_obj = db.query(Section).filter(Section.id == assignment.section_id).first() if assignment.section_id else None
    
    return SubjectAssignmentResponse(
        **assignment.__dict__,
        subject_name=subject.name if subject else None,
        faculty_name=profile.full_name if profile else None,
        semester_name=semester.name if semester else None,
        section_name=section_obj.name if section_obj else assignment.section
    )


# ==================== Periods (College Admin) ====================

@router.post("/periods", response_model=PeriodResponse, status_code=status.HTTP_201_CREATED)
async def create_period(
    period_data: PeriodCreate,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Create period/hour (College Admin or Super Admin)"""
    current_user, is_super_admin = current_user_tuple
    
    if is_super_admin:
        college_id = period_data.college_id
    else:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        college_id = profile.college_id if profile else None
        if not college_id:
            raise HTTPException(status_code=400, detail="College admin must be associated with a college")
    
    period = Period(**period_data.model_dump(), college_id=college_id)
    db.add(period)
    db.commit()
    db.refresh(period)
    return period


@router.get("/periods", response_model=List[PeriodResponse])
async def get_periods(
    college_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get periods"""
    query = db.query(Period)
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.SUPER_ADMIN not in role_names:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.college_id:
            query = query.filter(Period.college_id == profile.college_id)
    
    if college_id:
        query = query.filter(Period.college_id == college_id)
    
    return query.filter(Period.is_active == True).order_by(Period.number).all()


# ==================== Auto-populate Sections from Students ====================

@router.post("/sections/auto-populate", response_model=List[SectionResponse], status_code=status.HTTP_201_CREATED)
async def auto_populate_sections(
    college_id: Optional[int] = None,
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Auto-populate sections from student data (format: department-year-section, e.g., 'cse-3rd year - A')
    
    This endpoint:
    1. Scans all student profiles
    2. Extracts unique combinations of (department, year, section)
    3. Creates sections with display_name format: '{dept}-{year} - {section}'
    4. Links students to these sections
    """
    from sqlalchemy import func
    
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple
    
    # Determine college_id
    if is_super_admin:
        if not college_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="college_id is required for super admin"
            )
    elif is_hod:
        # Get college_id from HOD's department
        if not hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="HOD must be associated with a department"
            )
        dept = db.query(Department).filter(Department.id == hod_department_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="HOD department not found")
        college_id = dept.college_id
    else:  # is_admin
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        college_id = profile.college_id if profile else None
        if not college_id:
            raise HTTPException(status_code=400, detail="College admin must be associated with a college")
    
    # Get all students for this college
    student_role = db.query(UserRole).filter(UserRole.role == RoleEnum.STUDENT).all()
    student_user_ids = [sr.user_id for sr in student_role]
    
    # Get student profiles with department, year, and section
    profiles = db.query(Profile).filter(
        Profile.user_id.in_(student_user_ids),
        Profile.college_id == college_id
    ).all()
    
    # Group by department, year, section
    section_map = {}  # key: (department, year_str, section_name) -> list of profile_ids
    
    for profile in profiles:
        if not profile.department or not profile.present_year or not profile.section:
            continue
        
        dept_name = profile.department.strip().lower()
        year_str = profile.present_year.strip()
        section_name = profile.section.strip().upper()
        
        key = (dept_name, year_str, section_name)
        if key not in section_map:
            section_map[key] = []
        section_map[key].append(profile.user_id)
    
    created_sections = []
    
    for (dept_name, year_str, section_name), profile_ids in section_map.items():
        # Get department_id
        dept = db.query(Department).filter(
            Department.college_id == college_id,
            func.lower(Department.name) == dept_name
        ).first()
        
        if not dept:
            continue
        
        # Convert year_str to integer
        year_int = None
        if year_str:
            year_str_lower = year_str.lower().strip()
            if year_str_lower.startswith('1'):
                year_int = 1
            elif year_str_lower.startswith('2'):
                year_int = 2
            elif year_str_lower.startswith('3'):
                year_int = 3
            elif year_str_lower.startswith('4'):
                year_int = 4
            elif year_str_lower.startswith('5'):
                year_int = 5
        
        # Create display name: "cse-3rd year - A"
        dept_code = dept.code or dept.name.upper()[:3]
        display_name = f"{dept_code.lower()}-{year_str} - {section_name}"
        
        # Check if section already exists
        existing_section = db.query(Section).filter(
            Section.college_id == college_id,
            Section.department_id == dept.id,
            Section.name == section_name,
            Section.year == year_int
        ).first()
        
        if existing_section:
            # Update display_name if not set
            if not existing_section.display_name:
                existing_section.display_name = display_name
                existing_section.is_auto_generated = True
                db.flush()
            
            # Link students to this section
            for user_id in profile_ids:
                profile = db.query(Profile).filter(Profile.user_id == user_id).first()
                if profile:
                    profile.section_id = existing_section.id
                    db.flush()
            
            created_sections.append(existing_section)
        else:
            # Create new section
            section = Section(
                name=section_name,
                display_name=display_name,
                college_id=college_id,
                department_id=dept.id,
                year=year_int,
                year_str=year_str,
                is_active=True,
                is_auto_generated=True
            )
            db.add(section)
            db.flush()
            
            # Link students to this section
            for user_id in profile_ids:
                profile = db.query(Profile).filter(Profile.user_id == user_id).first()
                if profile:
                    profile.section_id = section.id
                    db.flush()
            
            created_sections.append(section)
    
    db.commit()
    
    # Refresh all sections
    for section in created_sections:
        db.refresh(section)
    
    return created_sections


# ==================== Auto-distribute Students to Sections ====================

@router.post("/sections/auto-distribute-students", response_model=dict, status_code=status.HTTP_200_OK)
async def auto_distribute_students_to_sections(
    college_id: Optional[int] = None,
    department_id: Optional[int] = None,
    year: Optional[str] = None,  # e.g., "1st", "2nd", "3rd", "4th"
    max_students_per_section: Optional[int] = None,  # Optional limit per section
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Auto-distribute students to sections based on department and year
    
    This endpoint:
    1. Finds all students for the given college/department/year
    2. Finds or creates sections for that department/year
    3. Distributes students evenly across sections
    4. Updates student profiles with section_id
    """
    from sqlalchemy import func
    from collections import defaultdict
    
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple
    
    # Determine college_id
    if is_super_admin:
        if not college_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="college_id is required for super admin"
            )
    elif is_hod:
        if not hod_department_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="HOD must be associated with a department"
            )
        dept = db.query(Department).filter(Department.id == hod_department_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="HOD department not found")
        college_id = dept.college_id
        department_id = hod_department_id  # HOD can only distribute in their department
    else:  # is_admin
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        college_id = profile.college_id if profile else None
        if not college_id:
            raise HTTPException(status_code=400, detail="College admin must be associated with a college")
    
    # Get student profiles
    query = db.query(Profile).join(User).join(UserRole).filter(
        UserRole.role == RoleEnum.STUDENT,
        Profile.college_id == college_id
    )
    
    if department_id:
        query = query.filter(Profile.department_id == department_id)
    
    if year:
        query = query.filter(Profile.present_year == year)
    
    student_profiles = query.all()
    
    if not student_profiles:
        return {
            "message": "No students found to distribute",
            "distributed_count": 0,
            "details": []
        }
    
    # Group students by department and year
    students_by_dept_year = defaultdict(list)
    for profile in student_profiles:
        dept_id = profile.department_id
        year_str = profile.present_year
        
        if dept_id and year_str:
            students_by_dept_year[(dept_id, year_str)].append(profile)
    
    distributed_count = 0
    details = []
    
    # Convert year_str to integer for section matching
    year_mapping = {"1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5}
    
    for (dept_id, year_str), students in students_by_dept_year.items():
        year_int = year_mapping.get(year_str.lower(), None)
        
        # Get all active sections for this department and year
        sections_query = db.query(Section).filter(
            Section.college_id == college_id,
            Section.department_id == dept_id,
            Section.is_active == True
        )
        
        if year_int:
            sections_query = sections_query.filter(Section.year == year_int)
        
        sections = sections_query.order_by(Section.name).all()
        
        if not sections:
            # Create default sections if none exist
            dept = db.query(Department).filter(Department.id == dept_id).first()
            if dept:
                dept_code = dept.code or dept.name.upper()[:3]
                # Create sections A, B, C
                for section_name in ['A', 'B', 'C']:
                    section = Section(
                        name=section_name,
                        display_name=f"{dept_code.lower()}-{year_str} - {section_name}",
                        college_id=college_id,
                        department_id=dept_id,
                        year=year_int,
                        year_str=year_str,
                        is_active=True,
                        is_auto_generated=True
                    )
                    db.add(section)
                    db.flush()
                    sections.append(section)
        
        if not sections:
            continue
        
        # Distribute students evenly across sections
        num_sections = len(sections)
        students_per_section = len(students) // num_sections
        remainder = len(students) % num_sections
        
        section_index = 0
        students_assigned = 0
        
        for i, student in enumerate(students):
            # Apply max_students_per_section limit if specified
            if max_students_per_section:
                # Check if current section is full
                current_section = sections[section_index]
                students_in_section = db.query(Profile).filter(
                    Profile.section_id == current_section.id
                ).count()
                
                if students_in_section >= max_students_per_section:
                    # Move to next section
                    section_index = (section_index + 1) % num_sections
                    if section_index == 0:
                        # All sections are full, stop
                        break
            else:
                # Even distribution
                if i > 0 and i % (students_per_section + (1 if section_index < remainder else 0)) == 0:
                    section_index = (section_index + 1) % num_sections
            
            # Assign student to section
            student.section_id = sections[section_index].id
            distributed_count += 1
            students_assigned += 1
            
            details.append({
                "student_id": student.user_id,
                "student_name": student.full_name,
                "section_id": sections[section_index].id,
                "section_name": sections[section_index].name,
                "department_id": dept_id,
                "year": year_str
            })
    
    db.commit()
    
    return {
        "message": f"Distributed {distributed_count} students to sections",
        "distributed_count": distributed_count,
        "details": details
    }


# ==================== Faculty Section Assignment ====================

@router.post("/faculty-sections/assign", status_code=status.HTTP_201_CREATED)
async def assign_sections_to_faculty(
    faculty_id: int = Body(...),
    section_ids: List[int] = Body(...),
    current_user_tuple = Depends(get_current_admin_or_super_or_hod),
    db: Session = Depends(get_db)
):
    """Assign sections to faculty (Admin, Super Admin, or HOD)
    
    This allows faculty to view and manage students in their assigned sections.
    """
    
    current_user, is_super_admin, is_admin, is_hod, hod_department_id = current_user_tuple
    
    # Verify faculty exists and is actually faculty
    faculty = db.query(User).filter(User.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    faculty_roles = db.query(UserRole).filter(
        UserRole.user_id == faculty_id,
        UserRole.role == RoleEnum.FACULTY
    ).first()
    if not faculty_roles:
        raise HTTPException(status_code=400, detail="User is not a faculty member")
    
    # Get faculty profile to check college/department
    faculty_profile = db.query(Profile).filter(Profile.user_id == faculty_id).first()
    if not faculty_profile:
        raise HTTPException(status_code=400, detail="Faculty profile not found")
    
    assigned_sections = []
    
    for section_id in section_ids:
        section = db.query(Section).filter(Section.id == section_id).first()
        if not section:
            continue
        
        # Verify section belongs to same college as faculty (unless super admin)
        if not is_super_admin:
            if faculty_profile.college_id != section.college_id:
                continue
            
            # HOD can only assign sections from their department
            if is_hod and hod_department_id:
                if section.department_id != hod_department_id:
                    continue
        
        # Check if assignment already exists
        existing = db.query(FacultySectionAssignment).filter(
            FacultySectionAssignment.faculty_id == faculty_id,
            FacultySectionAssignment.section_id == section_id,
            FacultySectionAssignment.is_active == True
        ).first()
        
        if not existing:
            assignment = FacultySectionAssignment(
                faculty_id=faculty_id,
                section_id=section_id,
                assigned_by=current_user.id,
                is_active=True
            )
            db.add(assignment)
            assigned_sections.append(section_id)
    
    db.commit()
    
    return {
        "message": f"Assigned {len(assigned_sections)} sections to faculty",
        "faculty_id": faculty_id,
        "section_ids": assigned_sections
    }


@router.get("/faculty-sections/{faculty_id}/students")
async def get_faculty_assigned_students(
    faculty_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get students assigned to faculty's sections
    
    Faculty can only see students from their assigned sections.
    Admin/Super Admin can view any faculty's students.
    """
    # Check if current user is the faculty or admin/super admin
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    is_admin = RoleEnum.ADMIN in role_names
    
    if not (is_super_admin or is_admin) and current_user.id != faculty_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own assigned students"
        )
    
    # Get faculty's assigned sections
    assignments = db.query(FacultySectionAssignment).filter(
        FacultySectionAssignment.faculty_id == faculty_id,
        FacultySectionAssignment.is_active == True
    ).all()
    
    section_ids = [a.section_id for a in assignments]
    
    if not section_ids:
        return {
            "faculty_id": faculty_id,
            "sections": [],
            "students": [],
            "total_students": 0
        }
    
    # Get sections
    sections = db.query(Section).filter(Section.id.in_(section_ids)).all()
    
    # Get students from these sections
    student_role = db.query(UserRole).filter(UserRole.role == RoleEnum.STUDENT).all()
    student_user_ids = [sr.user_id for sr in student_role]
    
    profiles = db.query(Profile).filter(
        Profile.user_id.in_(student_user_ids),
        Profile.section_id.in_(section_ids)
    ).all()
    
    # Get user details
    students = []
    for profile in profiles:
        user = db.query(User).filter(User.id == profile.user_id).first()
        if user:
            section = next((s for s in sections if s.id == profile.section_id), None)
            students.append({
                "id": user.id,
                "email": user.email,
                "full_name": profile.full_name,
                "roll_number": profile.roll_number,
                "department": profile.department,
                "section": profile.section,
                "section_id": profile.section_id,
                "section_display_name": section.display_name if section else None,
                "present_year": profile.present_year,
                "college_id": profile.college_id
            })
    
    return {
        "faculty_id": faculty_id,
        "sections": [
            {
                "id": s.id,
                "name": s.name,
                "display_name": s.display_name,
                "department_id": s.department_id,
                "year": s.year,
                "year_str": s.year_str
            }
            for s in sections
        ],
        "students": students,
        "total_students": len(students)
    }


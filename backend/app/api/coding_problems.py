"""Coding Problems API - Super Admin only, year-based visibility"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime
import hashlib
import time

from app.core.database import get_db
from app.api.auth import get_current_user, get_current_super_admin
from app.models.user import User
from app.models.quiz import CodingProblem
from app.models.user_saved_code import UserSavedCode
from app.models.profile import Profile
from app.models.coding_submission import CodingSubmission
from pydantic import BaseModel

router = APIRouter(prefix="/coding-problems", tags=["coding-problems"])


# ==================== Schemas ====================

class TestCaseInput(BaseModel):
    stdin: str
    expected_output: str
    is_public: bool = True

class CodingProblemCreate(BaseModel):
    title: str
    description: str
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = []
    year: int  # Required: 1, 2, 3, or 4
    allowed_languages: List[str] = ["python", "c", "cpp", "java", "javascript"]
    restricted_languages: Optional[List[str]] = []
    recommended_languages: Optional[List[str]] = []
    starter_code_python: Optional[str] = None
    starter_code_c: Optional[str] = None
    starter_code_cpp: Optional[str] = None
    starter_code_java: Optional[str] = None
    starter_code_javascript: Optional[str] = None
    time_limit: int = 5
    memory_limit: int = 256
    test_cases: List[TestCaseInput] = []
    is_active: bool = True
    # Scope fields
    scope_type: Optional[str] = "svnapro"  # "svnapro", "college", "department", "section"
    college_id: Optional[int] = None
    department: Optional[str] = None
    section_id: Optional[int] = None

class CodingProblemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    year: Optional[int] = None
    allowed_languages: Optional[List[str]] = None
    restricted_languages: Optional[List[str]] = None
    recommended_languages: Optional[List[str]] = None
    starter_code_python: Optional[str] = None
    starter_code_c: Optional[str] = None
    starter_code_cpp: Optional[str] = None
    starter_code_java: Optional[str] = None
    starter_code_javascript: Optional[str] = None
    time_limit: Optional[int] = None
    memory_limit: Optional[int] = None
    test_cases: Optional[List[TestCaseInput]] = None
    is_active: Optional[bool] = None
    # Scope fields
    scope_type: Optional[str] = None
    college_id: Optional[int] = None
    department: Optional[str] = None
    section_id: Optional[int] = None

class CodingProblemResponse(BaseModel):
    id: int
    title: str
    description: str
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = []
    year: int
    allowed_languages: List[str]
    restricted_languages: List[str]
    recommended_languages: List[str]
    starter_code_python: Optional[str] = None
    starter_code_c: Optional[str] = None
    starter_code_cpp: Optional[str] = None
    starter_code_java: Optional[str] = None
    starter_code_javascript: Optional[str] = None
    time_limit: int
    memory_limit: int
    test_cases: List[dict]
    is_active: bool
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Scope fields
    scope_type: Optional[str] = "svnapro"
    college_id: Optional[int] = None
    department: Optional[str] = None
    section_id: Optional[int] = None
    # Analytics tracking
    problem_code: Optional[str] = None  # Unique identifier for analytics

    class Config:
        from_attributes = True

class CodeSaveRequest(BaseModel):
    language: str
    code: str

class CodeExecutionRequest(BaseModel):
    language: str
    code: str
    stdin: Optional[str] = None

class SubmissionRequest(BaseModel):
    language: str
    code: str

class TestCaseRunRequest(BaseModel):
    language: str
    code: str
    test_case_index: int


# ==================== Helper Functions ====================

def parse_year_to_int(year_str: str) -> Optional[int]:
    """Parse year string to integer (1-4)
    
    Handles formats like:
    - "1st", "2nd", "3rd", "4th"
    - "1", "2", "3", "4"
    - "First", "Second", etc.
    """
    if isinstance(year_str, int):
        return year_str if 1 <= year_str <= 4 else None
    
    if not isinstance(year_str, str):
        return None
    
    year_str = year_str.strip().lower()
    
    # Remove ordinal suffixes
    year_str = year_str.replace('st', '').replace('nd', '').replace('rd', '').replace('th', '')
    
    # Try direct number
    try:
        year = int(year_str)
        if 1 <= year <= 4:
            return year
    except:
        pass
    
    # Try word format
    year_map = {
        'first': 1, 'second': 2, 'third': 3, 'fourth': 4,
        'one': 1, 'two': 2, 'three': 3, 'four': 4
    }
    if year_str in year_map:
        return year_map[year_str]
    
    return None


def get_student_year(user: User, db: Session) -> Optional[int]:
    """Get student's year as integer (1-4)"""
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile or not profile.present_year:
        return None
    
    return parse_year_to_int(profile.present_year)


def normalize_text(text: str) -> str:
    """Normalize text for duplicate comparison"""
    if not text:
        return ""
    return ' '.join(text.lower().strip().split())


def find_duplicates(db: Session) -> List[dict]:
    """Find duplicate problems based on normalized title and description"""
    all_problems = db.query(CodingProblem).all()
    seen = {}
    duplicates = []
    
    for problem in all_problems:
        title_norm = normalize_text(problem.title or "")
        desc_norm = normalize_text(problem.description or "")
        key = f"{title_norm}|||{desc_norm}"
        
        if key in seen:
            # Found duplicate
            original = seen[key]
            duplicates.append({
                "original_id": original["id"],
                "original_title": original["title"],
                "duplicate_id": problem.id,
                "duplicate_title": problem.title,
                "created_at": problem.created_at.isoformat() if problem.created_at else None
            })
        else:
            seen[key] = {
                "id": problem.id,
                "title": problem.title
            }
    
    return duplicates


# ==================== CRUD Endpoints ====================

@router.get("/", response_model=List[CodingProblemResponse])
async def list_problems(
    difficulty: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    year: Optional[int] = Query(None, description="Filter by year (1-4)"),
    language: Optional[str] = Query(None, description="Filter by language"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    complexity: Optional[str] = Query(None, description="Filter by complexity (Easy/Medium/Hard)"),
    scope_type: Optional[str] = Query(None, description="Filter by scope (svnapro/college/department/section)"),
    solved: Optional[bool] = Query(None, description="Filter by solved status (students only)"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List coding problems - year-based visibility for students
    
    - Students: Only see problems where problem.year <= student.year
    - Super Admin: See all problems
    - Filters: difficulty, year, language, tags, complexity, scope_type, solved status, search
    """
    try:
        from app.models.user import UserRole, RoleEnum
        
        # Check if user is super admin
        user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
        role_names = [role.role for role in user_roles]
        is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    except Exception as e:
        # If there's an error checking roles, assume not super admin
        import logging
        logging.error(f"Error checking user roles: {e}")
        is_super_admin = False
    
    query = db.query(CodingProblem)
    
    # Apply filters
    if difficulty:
        query = query.filter(CodingProblem.difficulty == difficulty)
    
    if complexity:  # Alias for difficulty
        query = query.filter(CodingProblem.difficulty == complexity)
    
    if is_active is not None:
        query = query.filter(CodingProblem.is_active == is_active)
    
    if year:
        # Handle both string and integer year values
        query = query.filter(
            or_(
                CodingProblem.year == year,
                CodingProblem.year == str(year),
                CodingProblem.year == f"{year}st" if year == 1 else f"{year}nd" if year == 2 else f"{year}rd" if year == 3 else f"{year}th"
            )
        )
    
    # Language filter - check if problem supports the language
    if language:
        query = query.filter(
            or_(
                CodingProblem.allowed_languages.contains([language]),
                CodingProblem.restricted_languages.contains([language]),
                CodingProblem.recommended_languages.contains([language])
            )
        )
    
    # Tags filter
    if tags:
        tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
        for tag in tag_list:
            query = query.filter(CodingProblem.tags.contains([tag]))
    
    # Scope type filter
    if scope_type:
        query = query.filter(CodingProblem.scope_type == scope_type)
    
    # Search filter
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(CodingProblem.title).like(search_term),
                func.lower(CodingProblem.description).like(search_term)
            )
        )
    
    # Filter expired problems
    now = datetime.utcnow()
    query = query.filter(
        or_(
            CodingProblem.expiry_date.is_(None),
            CodingProblem.expiry_date > now
        )
    )
    
    problems = query.order_by(CodingProblem.created_at.desc()).all()
    
    # Year-based and scope-based filtering for students (after fetching, to handle string years)
    if not is_super_admin:
        student_year = get_student_year(current_user, db)
        student_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        
        if student_year:
            # Filter problems by year and scope after converting string years to integers
            filtered_problems = []
            for problem in problems:
                problem_year = problem.year
                if isinstance(problem_year, str):
                    problem_year = parse_year_to_int(problem_year) or 1
                elif problem_year is None:
                    problem_year = 1
                
                # Year check: problem.year <= student.year
                if problem_year > student_year:
                    continue
                
                # Scope check: 
                # - "svnapro": visible to all students (no scope filtering)
                # - "college": visible if student.college_id matches problem.college_id
                # - "department": visible if student.college_id and department match
                # - "section": visible if student.section_id matches problem.section_id
                if problem.scope_type == "svnapro":
                    # SvnaPro problems visible to all
                    filtered_problems.append(problem)
                elif problem.scope_type == "college":
                    # College-level: check college_id match
                    if student_profile and student_profile.college_id and problem.college_id:
                        if student_profile.college_id == problem.college_id:
                            filtered_problems.append(problem)
                elif problem.scope_type == "department":
                    # Department-level: check college_id and department match
                    if student_profile and student_profile.college_id and problem.college_id:
                        if (student_profile.college_id == problem.college_id and 
                            student_profile.department and problem.department and
                            student_profile.department.lower() == problem.department.lower()):
                            filtered_problems.append(problem)
                elif problem.scope_type == "section":
                    # Section-level: check section_id match
                    if student_profile and student_profile.section_id and problem.section_id:
                        if student_profile.section_id == problem.section_id:
                            filtered_problems.append(problem)
            
            problems = filtered_problems
            
            # Solved status filter (for students only)
            if solved is not None:
                # Get all problem IDs the student has solved
                solved_problem_ids = set()
                if solved:
                    submissions = db.query(CodingSubmission).filter(
                        CodingSubmission.user_id == current_user.id,
                        CodingSubmission.status == "accepted"
                    ).all()
                    solved_problem_ids = {s.problem_id for s in submissions}
                
                if solved:
                    # Show only solved problems
                    problems = [p for p in problems if p.id in solved_problem_ids]
                else:
                    # Show only unsolved problems
                    problems = [p for p in problems if p.id not in solved_problem_ids]
        else:
            # If student has no year set, show nothing
            problems = []
    
    # Convert to response format
    result = []
    try:
        for problem in problems:
            try:
                # Convert year to integer if it's a string (handle old data format)
                year_value = problem.year
                if isinstance(year_value, str):
                    year_value = parse_year_to_int(year_value) or 1
                elif year_value is None:
                    year_value = 1
                
                result.append(CodingProblemResponse(
                    id=problem.id,
                    title=problem.title or "",
                    description=problem.description or "",
                    input_format=problem.input_format,
                    output_format=problem.output_format,
                    constraints=problem.constraints,
                    sample_input=problem.sample_input,
                    sample_output=problem.sample_output,
                    difficulty=problem.difficulty,
                    tags=problem.tags or [],
                    year=year_value,
                    allowed_languages=problem.allowed_languages or [],
                    restricted_languages=problem.restricted_languages or [],
                    recommended_languages=problem.recommended_languages or [],
                    starter_code_python=problem.starter_code_python,
                    starter_code_c=problem.starter_code_c,
                    starter_code_cpp=problem.starter_code_cpp,
                    starter_code_java=problem.starter_code_java,
                    starter_code_javascript=problem.starter_code_javascript,
                    time_limit=problem.time_limit or 5,
                    memory_limit=problem.memory_limit or 256,
                    test_cases=problem.test_cases or [],
                    is_active=problem.is_active if hasattr(problem, 'is_active') else True,
                    created_by=problem.created_by if hasattr(problem, 'created_by') else None,
                    created_at=problem.created_at if hasattr(problem, 'created_at') else None,
                    updated_at=problem.updated_at if hasattr(problem, 'updated_at') else None,
                    scope_type=getattr(problem, 'scope_type', None) or "svnapro",
                    college_id=getattr(problem, 'college_id', None),
                    department=getattr(problem, 'department', None),
                    section_id=getattr(problem, 'section_id', None),
                    problem_code=getattr(problem, 'problem_code', None)  # Handle missing column gracefully
                ))
            except Exception as e:
                # Skip problematic records and log error
                import logging
                logging.error(f"Error processing problem {getattr(problem, 'id', 'unknown')}: {e}")
                continue
        
        return result
    except Exception as e:
        import logging
        import traceback
        logging.error(f"Error in list_problems: {e}")
        logging.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching coding problems: {str(e)}"
        )


def get_current_content_creator(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify user can create coding problems (super admin, admin, HOD, or faculty)"""
    from app.models.user import UserRole, RoleEnum
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    is_admin = RoleEnum.ADMIN in role_names
    is_hod = RoleEnum.HOD in role_names
    is_faculty = RoleEnum.FACULTY in role_names
    
    if not (is_super_admin or is_admin or is_hod or is_faculty):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins, admins, faculty, or HODs can create coding problems"
        )
    
    # Get college_id from role or profile
    college_id = None
    if user_roles:
        college_id = user_roles[0].college_id
    if not college_id and profile:
        college_id = profile.college_id
    
    return current_user, {
        "is_super_admin": is_super_admin,
        "is_admin": is_admin,
        "is_hod": is_hod,
        "is_faculty": is_faculty,
        "college_id": college_id,
        "profile": profile
    }


@router.post("/", response_model=CodingProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    problem_data: CodingProblemCreate,
    current_user_tuple = Depends(get_current_content_creator),
    db: Session = Depends(get_db)
):
    """Create coding problem - Super Admin, Admin, Faculty, or HOD"""
    current_user, user_info = current_user_tuple
    
    # Validate year
    if problem_data.year not in [1, 2, 3, 4]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Year must be 1, 2, 3, or 4"
        )
    
    # Validate languages
    valid_languages = ["python", "c", "cpp", "java", "javascript", "js"]
    for lang in problem_data.allowed_languages:
        if lang not in valid_languages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid language: {lang}. Allowed: {valid_languages}"
            )
    
    # Validate test cases
    if not problem_data.test_cases or len(problem_data.test_cases) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one test case is required to evaluate solutions"
        )
    
    # Validate each test case
    for i, test_case in enumerate(problem_data.test_cases):
        if not test_case.stdin or not test_case.stdin.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Test case {i + 1} is missing input (stdin)"
            )
        if not test_case.expected_output or not test_case.expected_output.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Test case {i + 1} is missing expected output"
            )
    
    # Check for duplicates (case-insensitive)
    title_norm = normalize_text(problem_data.title)
    desc_norm = normalize_text(problem_data.description)
    
    all_problems = db.query(CodingProblem).all()
    duplicate = None
    for prob in all_problems:
        prob_title_norm = normalize_text(prob.title or "")
        prob_desc_norm = normalize_text(prob.description or "")
        if prob_title_norm == title_norm and prob_desc_norm == desc_norm:
            duplicate = prob
            break
    
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate problem found: '{duplicate.title}' (ID: {duplicate.id}). Please update the existing problem instead."
        )
    
    # Determine scope_type and related fields
    scope_type = problem_data.scope_type or "svnapro"
    college_id = problem_data.college_id
    department = problem_data.department
    section_id = problem_data.section_id
    
    # Super Admin can create SvnaPro problems (scope_type = "svnapro")
    # College Admin/Faculty/HOD must create college-level problems
    if user_info["is_super_admin"]:
        # Super Admin defaults to "svnapro" if not specified
        if not scope_type or scope_type == "svnapro":
            scope_type = "svnapro"
            college_id = None
            department = None
            section_id = None
        else:
            # Super Admin can also create college-level problems
            if scope_type == "college" and not college_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="college_id is required for college-level problems"
                )
    else:
        # College Admin/Faculty/HOD must create college-level problems
        if scope_type == "svnapro":
            scope_type = "college"  # Force to college level
        
        # Set college_id from user's profile/role
        if not college_id:
            college_id = user_info["college_id"]
            if not college_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="college_id is required for college-level problems"
                )
        
        # Set department from profile if not provided
        if not department and user_info["profile"] and user_info["profile"].department:
            department = user_info["profile"].department
        
        # Validate section_id if scope is "section"
        if scope_type == "section" and not section_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="section_id is required for section-level problems"
            )
    
    # Generate unique problem_code for analytics tracking
    problem_code = f"CP_{hashlib.md5(f'{problem_data.title}_{problem_data.description}_{time.time()}'.encode()).hexdigest()[:12].upper()}"
    
    # Create problem
    problem = CodingProblem(
        title=problem_data.title,
        description=problem_data.description,
        input_format=problem_data.input_format,
        output_format=problem_data.output_format,
        constraints=problem_data.constraints,
        sample_input=problem_data.sample_input,
        sample_output=problem_data.sample_output,
        difficulty=problem_data.difficulty,
        tags=problem_data.tags or [],
        year=problem_data.year,
        allowed_languages=problem_data.allowed_languages,
        restricted_languages=problem_data.restricted_languages or [],
        recommended_languages=problem_data.recommended_languages or [],
        starter_code_python=problem_data.starter_code_python,
        starter_code_c=problem_data.starter_code_c,
        starter_code_cpp=problem_data.starter_code_cpp,
        starter_code_java=problem_data.starter_code_java,
        starter_code_javascript=problem_data.starter_code_javascript,
        time_limit=problem_data.time_limit,
        memory_limit=problem_data.memory_limit,
        test_cases=[tc.dict() for tc in problem_data.test_cases],
        is_active=problem_data.is_active,
        created_by=current_user.id,
        scope_type=scope_type,
        college_id=college_id,
        department=department,
        section_id=section_id,
        problem_code=problem_code
    )
    
    db.add(problem)
    db.commit()
    db.refresh(problem)
    
    # Convert year to integer if needed
    year_value = problem.year
    if isinstance(year_value, str):
        year_value = parse_year_to_int(year_value) or 1
    elif year_value is None:
        year_value = 1
    
    return CodingProblemResponse(
        id=problem.id,
        title=problem.title,
        description=problem.description,
        input_format=problem.input_format,
        output_format=problem.output_format,
        constraints=problem.constraints,
        sample_input=problem.sample_input,
        sample_output=problem.sample_output,
        difficulty=problem.difficulty,
        tags=problem.tags or [],
        year=year_value,
        allowed_languages=problem.allowed_languages or [],
        restricted_languages=problem.restricted_languages or [],
        recommended_languages=problem.recommended_languages or [],
        starter_code_python=problem.starter_code_python,
        starter_code_c=problem.starter_code_c,
        starter_code_cpp=problem.starter_code_cpp,
        starter_code_java=problem.starter_code_java,
        starter_code_javascript=problem.starter_code_javascript,
        time_limit=problem.time_limit,
        memory_limit=problem.memory_limit,
        test_cases=problem.test_cases or [],
        is_active=problem.is_active,
        created_by=problem.created_by,
        created_at=problem.created_at,
        updated_at=problem.updated_at,
        scope_type=problem.scope_type or "svnapro",
        college_id=problem.college_id,
        department=problem.department,
        section_id=problem.section_id,
        problem_code=getattr(problem, 'problem_code', None)  # Handle missing column gracefully
    )


@router.get("/{problem_id}", response_model=CodingProblemResponse)
async def get_problem(
    problem_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get problem details - year-check for students"""
    from app.models.user import UserRole, RoleEnum
    
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check year visibility for students
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    
    if not is_super_admin:
        student_year = get_student_year(current_user, db)
        student_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        
        # Convert problem.year to int for comparison
        problem_year = problem.year
        if isinstance(problem_year, str):
            problem_year = parse_year_to_int(problem_year) or 1
        elif problem_year is None:
            problem_year = 1
        
        # Year check
        if student_year and problem_year > student_year:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to problems for this year"
            )
        
        # Scope check
        if problem.scope_type == "svnapro":
            # SvnaPro problems visible to all (year check already passed)
            pass
        elif problem.scope_type == "college":
            # College-level: check college_id match
            if not student_profile or not student_profile.college_id or not problem.college_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this problem"
                )
            if student_profile.college_id != problem.college_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this problem"
                )
        elif problem.scope_type == "department":
            # Department-level: check college_id and department match
            if not student_profile or not student_profile.college_id or not problem.college_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this problem"
                )
            if (student_profile.college_id != problem.college_id or
                not student_profile.department or not problem.department or
                student_profile.department.lower() != problem.department.lower()):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this problem"
                )
        elif problem.scope_type == "section":
            # Section-level: check section_id match
            if not student_profile or not student_profile.section_id or not problem.section_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this problem"
                )
            if student_profile.section_id != problem.section_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this problem"
                )
    
    # Convert year to integer if needed
    year_value = problem.year
    if isinstance(year_value, str):
        year_value = parse_year_to_int(year_value) or 1
    elif year_value is None:
        year_value = 1
    
    return CodingProblemResponse(
        id=problem.id,
        title=problem.title,
        description=problem.description,
        input_format=problem.input_format,
        output_format=problem.output_format,
        constraints=problem.constraints,
        sample_input=problem.sample_input,
        sample_output=problem.sample_output,
        difficulty=problem.difficulty,
        tags=problem.tags or [],
        year=year_value,
        allowed_languages=problem.allowed_languages or [],
        restricted_languages=problem.restricted_languages or [],
        recommended_languages=problem.recommended_languages or [],
        starter_code_python=problem.starter_code_python,
        starter_code_c=problem.starter_code_c,
        starter_code_cpp=problem.starter_code_cpp,
        starter_code_java=problem.starter_code_java,
        starter_code_javascript=problem.starter_code_javascript,
        time_limit=problem.time_limit,
        memory_limit=problem.memory_limit,
        test_cases=problem.test_cases or [],
        is_active=problem.is_active,
        created_by=problem.created_by,
        created_at=problem.created_at,
        updated_at=problem.updated_at,
        scope_type=problem.scope_type or "svnapro",
        college_id=problem.college_id,
        department=problem.department,
        section_id=problem.section_id,
        problem_code=getattr(problem, 'problem_code', None)  # Handle missing column gracefully
    )


@router.put("/{problem_id}", response_model=CodingProblemResponse)
async def update_problem(
    problem_id: int,
    problem_data: CodingProblemUpdate,
    current_user_tuple = Depends(get_current_content_creator),
    db: Session = Depends(get_db)
):
    """Update coding problem - Super Admin, Admin, Faculty, or HOD"""
    current_user, user_info = current_user_tuple
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Validate test cases if provided
    if problem_data.test_cases is not None:
        if len(problem_data.test_cases) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one test case is required to evaluate solutions"
            )
        
        # Validate each test case
        for i, test_case in enumerate(problem_data.test_cases):
            if not test_case.stdin or not test_case.stdin.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Test case {i + 1} is missing input (stdin)"
                )
            if not test_case.expected_output or not test_case.expected_output.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Test case {i + 1} is missing expected output"
                )
    
    # Update fields
    update_data = problem_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "test_cases" and value:
            # Convert TestCaseInput to dict
            setattr(problem, field, [tc if isinstance(tc, dict) else tc.dict() for tc in value])
        else:
            setattr(problem, field, value)
    
    db.commit()
    db.refresh(problem)
    
    # Convert year to integer if needed
    year_value = problem.year
    if isinstance(year_value, str):
        year_value = parse_year_to_int(year_value) or 1
    elif year_value is None:
        year_value = 1
    
    return CodingProblemResponse(
        id=problem.id,
        title=problem.title,
        description=problem.description,
        input_format=problem.input_format,
        output_format=problem.output_format,
        constraints=problem.constraints,
        sample_input=problem.sample_input,
        sample_output=problem.sample_output,
        difficulty=problem.difficulty,
        tags=problem.tags or [],
        year=year_value,
        allowed_languages=problem.allowed_languages or [],
        restricted_languages=problem.restricted_languages or [],
        recommended_languages=problem.recommended_languages or [],
        starter_code_python=problem.starter_code_python,
        starter_code_c=problem.starter_code_c,
        starter_code_cpp=problem.starter_code_cpp,
        starter_code_java=problem.starter_code_java,
        starter_code_javascript=problem.starter_code_javascript,
        time_limit=problem.time_limit,
        memory_limit=problem.memory_limit,
        test_cases=problem.test_cases or [],
        is_active=problem.is_active,
        created_by=problem.created_by,
        created_at=problem.created_at,
        updated_at=problem.updated_at,
        scope_type=problem.scope_type or "svnapro",
        college_id=problem.college_id,
        department=problem.department,
        section_id=problem.section_id,
        problem_code=getattr(problem, 'problem_code', None)  # Handle missing column gracefully
    )


@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Delete coding problem - Super Admin only"""
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    db.delete(problem)
    db.commit()
    return None


# ==================== Deduplication Endpoints ====================

@router.get("/duplicates/find", response_model=List[dict])
async def find_duplicate_problems(
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Find duplicate problems - Super Admin only"""
    duplicates = find_duplicates(db)
    return duplicates


@router.post("/duplicates/clear", response_model=dict)
async def clear_duplicate_problems(
    keep_latest: bool = Query(True, description="Keep latest duplicate (True) or oldest (False)"),
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Clear duplicate problems - keeps one, removes others
    
    - keep_latest=True: Keep the most recently created problem
    - keep_latest=False: Keep the oldest problem
    """
    all_problems = db.query(CodingProblem).all()
    seen = {}
    to_delete = []
    kept = []
    
    for problem in all_problems:
        title_norm = normalize_text(problem.title or "")
        desc_norm = normalize_text(problem.description or "")
        key = f"{title_norm}|||{desc_norm}"
        
        if key in seen:
            # Found duplicate
            existing = seen[key]
            if keep_latest:
                # Keep the one created later
                if problem.created_at > existing["created_at"]:
                    to_delete.append(existing["id"])
                    seen[key] = {
                        "id": problem.id,
                        "title": problem.title,
                        "created_at": problem.created_at
                    }
                    kept.append(problem.id)
                else:
                    to_delete.append(problem.id)
            else:
                # Keep the oldest
                to_delete.append(problem.id)
        else:
            seen[key] = {
                "id": problem.id,
                "title": problem.title,
                "created_at": problem.created_at or datetime.utcnow()
            }
            kept.append(problem.id)
    
    # Delete duplicates
    deleted_count = 0
    for problem_id in to_delete:
        problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
        if problem:
            # Check if there are submissions - if yes, merge them to the kept problem
            submissions = db.query(CodingSubmission).filter(CodingSubmission.problem_id == problem_id).all()
            if submissions and kept:
                # Update submissions to point to the kept problem
                kept_id = kept[0] if isinstance(kept[0], int) else seen[normalize_text(problem.title or "") + "|||" + normalize_text(problem.description or "")]["id"]
                for submission in submissions:
                    submission.problem_id = kept_id
            
            db.delete(problem)
            deleted_count += 1
    
    db.commit()
    
    return {
        "message": f"Cleared {deleted_count} duplicate problems",
        "deleted_count": deleted_count,
        "kept_count": len(kept),
        "kept_ids": kept[:10]  # Show first 10 kept IDs
    }


# ==================== Code Execution Endpoints ====================

@router.post("/{problem_id}/save-code")
async def save_code(
    problem_id: int,
    save_data: CodeSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save user's code draft for a problem"""
    # Get or create saved code
    saved_code = db.query(UserSavedCode).filter(
        UserSavedCode.user_id == current_user.id,
        UserSavedCode.problem_id == problem_id,
        UserSavedCode.language == save_data.language
    ).first()
    
    if saved_code:
        saved_code.code = save_data.code
        saved_code.updated_at = datetime.utcnow()
    else:
        saved_code = UserSavedCode(
            user_id=current_user.id,
            problem_id=problem_id,
            language=save_data.language,
            code=save_data.code
        )
        db.add(saved_code)
    
    db.commit()
    return {"message": "Code saved successfully"}


@router.get("/{problem_id}/saved-code/{language}")
async def get_saved_code(
    problem_id: int,
    language: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's saved code for a problem"""
    saved_code = db.query(UserSavedCode).filter(
        UserSavedCode.user_id == current_user.id,
        UserSavedCode.problem_id == problem_id,
        UserSavedCode.language == language
    ).first()
    
    if saved_code:
        return {"code": saved_code.code}
    return {"code": None}


@router.post("/{problem_id}/execute")
async def execute_code(
    problem_id: int,
    execution_data: CodeExecutionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute code against sample input"""
    from app.services.piston_executor import execute_with_piston
    
    # Get problem
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Validate language
    if execution_data.language not in (problem.allowed_languages or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Language {execution_data.language} is not allowed"
        )
    
    # Check restricted languages
    if problem.restricted_languages and len(problem.restricted_languages) > 0:
        if execution_data.language not in problem.restricted_languages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Language {execution_data.language} is restricted. Allowed: {problem.restricted_languages}"
            )
    
    # Use provided stdin or sample input
    stdin = execution_data.stdin or problem.sample_input or ""
    
    try:
        result = await execute_with_piston(
            language=execution_data.language,
            code=execution_data.code,
            stdin=stdin,
            time_limit=problem.time_limit,
            memory_limit=problem.memory_limit
        )
        
        return {
            "output": result.get("output", ""),
            "error": result.get("error"),
            "runtime": result.get("runtime", 0)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Execution failed: {str(e)}"
        )


@router.post("/{problem_id}/run-test-case")
async def run_test_case(
    problem_id: int,
    test_data: TestCaseRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run code against a specific test case"""
    from app.services.piston_executor import execute_with_piston
    
    # Get problem
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    language = test_data.language
    code = test_data.code
    test_case_index = test_data.test_case_index
    
    # Validate language
    if language not in (problem.allowed_languages or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Language {language} is not allowed"
        )
    
    # Get test case
    test_cases = problem.test_cases or []
    if test_case_index < 0 or test_case_index >= len(test_cases):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid test case index"
        )
    
    test_case = test_cases[test_case_index]
    stdin = test_case.get("stdin", "")
    expected_output = test_case.get("expected_output", "")
    
    try:
        result = await execute_with_piston(
            language=language,
            code=code,
            stdin=stdin,
            time_limit=problem.time_limit,
            memory_limit=problem.memory_limit
        )
        
        actual = result.get("output", "").strip()
        expected = expected_output.strip()
        passed = actual == expected
        
        return {
            "test_case_index": test_case_index,
            "passed": passed,
            "expected": expected,
            "actual": actual,
            "error": result.get("error"),
            "runtime": result.get("runtime", 0),
            "is_public": test_case.get("is_public", True)
        }
    except Exception as e:
        return {
            "test_case_index": test_case_index,
            "passed": False,
            "error": str(e),
            "is_public": test_case.get("is_public", True)
        }


@router.post("/{problem_id}/submit")
async def submit_solution(
    problem_id: int,
    submission_data: SubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit solution - run all test cases"""
    from app.services.piston_executor import execute_with_piston
    
    # Get problem
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Validate language
    if submission_data.language not in (problem.allowed_languages or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Language {submission_data.language} is not allowed"
        )
    
    # Check restricted languages
    if problem.restricted_languages and len(problem.restricted_languages) > 0:
        if submission_data.language not in problem.restricted_languages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Language {submission_data.language} is restricted. Allowed: {problem.restricted_languages}"
            )
    
    # Run all test cases
    test_cases = problem.test_cases or []
    results = []
    passed = 0
    total_execution_time = 0.0
    max_memory = 0.0
    
    for i, test_case in enumerate(test_cases):
        try:
            result = await execute_with_piston(
                language=submission_data.language,
                code=submission_data.code,
                stdin=test_case.get("stdin", ""),
                time_limit=problem.time_limit,
                memory_limit=problem.memory_limit
            )
            
            expected = test_case.get("expected_output", "").strip()
            actual = result.get("output", "").strip()
            is_correct = expected == actual
            
            if is_correct:
                passed += 1
            
            # Track execution metrics
            if result.get("runtime"):
                total_execution_time += result.get("runtime", 0)
            # Memory tracking would need Piston API support
            
            results.append({
                "test_case": i + 1,
                "passed": is_correct,
                "expected": expected,
                "actual": actual,
                "is_public": test_case.get("is_public", True),
                "error": result.get("error") if not is_correct and result.get("error") else None
            })
        except Exception as e:
            results.append({
                "test_case": i + 1,
                "passed": False,
                "error": str(e),
                "is_public": test_case.get("is_public", True)
            })
    
    # Determine status
    if passed == len(test_cases):
        submission_status = "accepted"
    elif passed == 0:
        submission_status = "wrong_answer"
    else:
        submission_status = "wrong_answer"
    
    # Store submission in database
    submission = CodingSubmission(
        user_id=current_user.id,
        problem_id=problem_id,
        language=submission_data.language,
        code=submission_data.code,
        status=submission_status,
        results=results,
        passed_tests=passed,
        total_tests=len(test_cases)
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return {
        "submission_id": submission.id,
        "status": submission_status,
        "success": submission_status == "accepted",
        "passed": passed,
        "failed": len(test_cases) - passed,
        "total": len(test_cases),
        "total_tests": len(test_cases),  # Add for frontend compatibility
        "results": results,
        "execution_time": total_execution_time,
        "memory_used": max_memory if max_memory > 0 else None
    }


@router.get("/{problem_id}/submissions")
async def get_problem_submissions(
    problem_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's submissions for a problem"""
    submissions = db.query(CodingSubmission).filter(
        CodingSubmission.user_id == current_user.id,
        CodingSubmission.problem_id == problem_id
    ).order_by(CodingSubmission.created_at.desc()).all()
    
    return [
        {
            "id": s.id,
            "language": s.language,
            "status": s.status,
            "passed_tests": s.passed_tests,
            "total_tests": s.total_tests,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "results": s.results
        }
        for s in submissions
    ]

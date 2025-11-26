"""Global content management API (quizzes, coding problems) with scope-based access"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.quiz import Quiz, CodingProblem
from app.models.academic import Section
from app.api.auth import get_current_user, get_optional_user as auth_get_optional_user
from app.schemas.global_content import (
    QuizCreate, QuizUpdate, QuizResponse,
    CodingProblemCreate, CodingProblemUpdate, CodingProblemResponse
)
from datetime import datetime

router = APIRouter(prefix="/global-content", tags=["global-content"])


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
            detail="Only super admins can manage global content"
        )
    
    return current_user


def get_current_content_creator(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> tuple[User, dict]:
    """Verify user can create content (super admin, admin, HOD, or faculty)"""
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
            detail="Only admins, faculty, HOD, or super admins can create content"
        )
    
    # Get college_id from role or profile
    college_id = None
    if user_roles:
        college_id = user_roles[0].college_id
    if not college_id and profile:
        college_id = profile.college_id
    
    user_info = {
        "is_super_admin": is_super_admin,
        "is_admin": is_admin,
        "is_hod": is_hod,
        "is_faculty": is_faculty,
        "college_id": college_id,
        "profile": profile
    }
    
    return current_user, user_info


# ==================== QUIZZES ====================

@router.post("/quizzes", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    quiz_data: QuizCreate,
    current_user_tuple = Depends(get_current_content_creator),
    db: Session = Depends(get_db)
):
    """Create a quiz with scope-based visibility
    
    - Super Admin: Can create SvnaPro quizzes (scope_type='svnapro')
    - College Admin: Can create for entire college (scope_type='college')
    - HOD: Can create for department/year (scope_type='department')
    - Faculty: Can create for specific section/year (scope_type='section')
    """
    current_user, user_info = current_user_tuple
    
    # Validate scope based on role
    if user_info["is_super_admin"]:
        # Super admin can create SvnaPro content
        if quiz_data.scope_type != "svnapro":
            quiz_data.scope_type = "svnapro"
            quiz_data.college_id = None
            quiz_data.department = None
            quiz_data.section_id = None
        # Super admin must specify year for SvnaPro content
        if not quiz_data.year:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Year is required for SvnaPro content. Please specify which year this quiz is for (e.g., '1st', '2nd', '3rd', '4th')."
            )
    elif user_info["is_admin"]:
        # Admin can create for entire college
        if quiz_data.scope_type not in ["college", "department", "section"]:
            quiz_data.scope_type = "college"
        quiz_data.college_id = user_info["college_id"]
        if quiz_data.scope_type == "college":
            quiz_data.department = None
            quiz_data.section_id = None
        # Year can be specified for college admin content - if not provided, visible to all years
    elif user_info["is_hod"]:
        # HOD can create for department/year
        if quiz_data.scope_type not in ["department", "section"]:
            quiz_data.scope_type = "department"
        quiz_data.college_id = user_info["college_id"]
        quiz_data.department = user_info["profile"].department if user_info["profile"] else None
        if quiz_data.scope_type == "department":
            quiz_data.section_id = None
    elif user_info["is_faculty"]:
        # Faculty can create for specific section/year
        quiz_data.scope_type = "section"
        quiz_data.college_id = user_info["college_id"]
        quiz_data.department = user_info["profile"].department if user_info["profile"] else None
        # Validate section_id exists
        if quiz_data.section_id:
            section = db.query(Section).filter(Section.id == quiz_data.section_id).first()
            if not section:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid section_id"
                )
    
    # Build question_timers from questions if per-question timer is enabled
    question_timers = None
    if quiz_data.per_question_timer_enabled or (hasattr(quiz_data, 'question_timers') and quiz_data.question_timers):
        if hasattr(quiz_data, 'question_timers') and quiz_data.question_timers:
            question_timers = quiz_data.question_timers
        else:
            # Build from questions
            question_timers = {}
            for idx, q in enumerate(quiz_data.questions):
                q_dict = q.model_dump() if hasattr(q, 'model_dump') else q
                if q_dict.get('timer_seconds'):
                    question_timers[str(idx)] = q_dict['timer_seconds']
            question_timers = question_timers if question_timers else None
    
    quiz = Quiz(
        title=quiz_data.title,
        description=quiz_data.description,
        subject=quiz_data.subject,
        duration_minutes=quiz_data.duration_minutes,
        total_marks=quiz_data.total_marks,
        questions=[q.model_dump() if hasattr(q, 'model_dump') else q for q in quiz_data.questions],
        is_active=quiz_data.is_active,
        created_by=current_user.id,
        start_time=quiz_data.start_time,
        end_time=quiz_data.end_time,
        expiry_date=quiz_data.expiry_date,
        scope_type=quiz_data.scope_type,
        college_id=quiz_data.college_id,
        department=quiz_data.department,
        section_id=quiz_data.section_id,
        year=quiz_data.year,
        code_snippet=getattr(quiz_data, 'code_snippet', None),
        question_timers=question_timers,
        per_question_timer_enabled=getattr(quiz_data, 'per_question_timer_enabled', False)
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


@router.get("/quizzes", response_model=List[QuizResponse])
async def list_quizzes(
    is_active: Optional[bool] = None,
    scope_type: Optional[str] = Query(None, description="Filter by scope: 'svnapro' or 'college'"),
    current_user: Optional[User] = Depends(auth_get_optional_user),
    db: Session = Depends(get_db)
):
    """List quizzes with scope-based filtering
    
    - Students see quizzes based on their college, department, section, and year
    - scope_type='svnapro' shows only SvnaPro quizzes
    - scope_type='college' shows only college-scoped quizzes
    - If not specified, shows all visible quizzes
    """
    query = db.query(Quiz)
    
    # Filter by active status
    if is_active is not None:
        query = query.filter(Quiz.is_active == is_active)
    
    # Filter by expiry date (exclude expired)
    now = datetime.utcnow()
    query = query.filter(
        or_(
            Quiz.expiry_date.is_(None),
            Quiz.expiry_date > now
        )
    )
    
    # If user is authenticated, filter by scope
    if current_user:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
        role_names = [role.role for role in user_roles]
        
        # Super admin sees all
        if RoleEnum.SUPER_ADMIN not in role_names:
            if scope_type == "svnapro":
                # Only SvnaPro quizzes - filter by year if student
                if profile and profile.present_year:
                    query = query.filter(
                        and_(
                            Quiz.scope_type == "svnapro",
                            or_(
                                Quiz.year.is_(None),
                                Quiz.year == profile.present_year
                            )
                        )
                    )
                else:
                    query = query.filter(Quiz.scope_type == "svnapro")
            elif scope_type == "college":
                # Only college-scoped quizzes (college, department, section)
                if profile and profile.college_id:
                    query = query.filter(
                        and_(
                            Quiz.scope_type.in_(["college", "department", "section"]),
                            Quiz.college_id == profile.college_id
                        )
                    )
                    # Further filter by department, section, year if applicable
                    if profile.department:
                        query = query.filter(
                            or_(
                                Quiz.department.is_(None),
                                Quiz.department == profile.department
                            )
                        )
                    if profile.section:
                        # Match by section name - find section IDs matching the section name
                        matching_section_ids = db.query(Section.id).filter(
                            Section.name == profile.section
                        ).all()
                        section_id_list = [s[0] for s in matching_section_ids]
                        if section_id_list:
                            query = query.filter(
                                or_(
                                    Quiz.section_id.is_(None),
                                    Quiz.section_id.in_(section_id_list)
                                )
                            )
                        else:
                            # If no matching section found, only show quizzes with no section restriction
                            query = query.filter(Quiz.section_id.is_(None))
                    if profile.present_year:
                        query = query.filter(
                            or_(
                                Quiz.year.is_(None),
                                Quiz.year == profile.present_year
                            )
                        )
                else:
                    query = query.filter(False)  # No college, no quizzes
            else:
                # Show both SvnaPro and college-scoped (default for students)
                if profile and profile.college_id:
                    college_quizzes = and_(
                        Quiz.scope_type.in_(["college", "department", "section"]),
                        Quiz.college_id == profile.college_id
                    )
                    # Apply department/section/year filters
                    if profile.department:
                        college_quizzes = and_(
                            college_quizzes,
                            or_(
                                Quiz.department.is_(None),
                                Quiz.department == profile.department
                            )
                        )
                    if profile.section:
                        # Match by section name - find section IDs matching the section name
                        matching_section_ids = db.query(Section.id).filter(
                            Section.name == profile.section
                        ).all()
                        section_id_list = [s[0] for s in matching_section_ids]
                        if section_id_list:
                            college_quizzes = and_(
                                college_quizzes,
                                or_(
                                    Quiz.section_id.is_(None),
                                    Quiz.section_id.in_(section_id_list)
                                )
                            )
                        else:
                            # If no matching section found, only show quizzes with no section restriction
                            college_quizzes = and_(
                                college_quizzes,
                                Quiz.section_id.is_(None)
                            )
                    if profile.present_year:
                        college_quizzes = and_(
                            college_quizzes,
                            or_(
                                Quiz.year.is_(None),
                                Quiz.year == profile.present_year
                            )
                        )
                    
                    # Filter SvnaPro content by year if specified
                    svnapro_filter = Quiz.scope_type == "svnapro"
                    if profile and profile.present_year:
                        # Only show SvnaPro quizzes that match the student's year OR have no year specified
                        svnapro_filter = and_(
                            Quiz.scope_type == "svnapro",
                            or_(
                                Quiz.year.is_(None),
                                Quiz.year == profile.present_year
                            )
                        )
                    
                    query = query.filter(
                        or_(
                            svnapro_filter,
                            college_quizzes
                        )
                    )
                else:
                    # No college, only SvnaPro - filter by year if authenticated
                    if current_user:
                        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
                        if profile and profile.present_year:
                            query = query.filter(
                                and_(
                                    Quiz.scope_type == "svnapro",
                                    or_(
                                        Quiz.year.is_(None),
                                        Quiz.year == profile.present_year
                                    )
                                )
                            )
                        else:
                            query = query.filter(Quiz.scope_type == "svnapro")
                    else:
                        query = query.filter(Quiz.scope_type == "svnapro")
    else:
        # Not authenticated, only SvnaPro (no year filter for unauthenticated)
        query = query.filter(Quiz.scope_type == "svnapro")
    
    quizzes = query.order_by(Quiz.created_at.desc()).all()
    return quizzes


@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    quiz_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific quiz"""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    return quiz


@router.put("/quizzes/{quiz_id}", response_model=QuizResponse)
async def update_quiz(
    quiz_id: int,
    quiz_data: QuizUpdate,
    current_user_tuple = Depends(get_current_content_creator),
    db: Session = Depends(get_db)
):
    """Update a quiz (creator or super admin only)"""
    current_user, user_info = current_user_tuple
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    # Check if user can update (super admin or creator)
    if not user_info["is_super_admin"] and quiz.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update quizzes you created"
        )
    
    update_data = quiz_data.model_dump(exclude_unset=True)
    if "questions" in update_data:
        update_data["questions"] = [q.model_dump() if isinstance(q, dict) == False else q for q in update_data["questions"]]
    
    # Handle question_timers if per-question timer is enabled
    if update_data.get("per_question_timer_enabled") or (update_data.get("question_timers")):
        if "question_timers" in update_data and update_data["question_timers"]:
            update_data["question_timers"] = update_data["question_timers"]
        elif "questions" in update_data:
            # Build question_timers from questions
            question_timers = {}
            for idx, q in enumerate(update_data["questions"]):
                q_dict = q if isinstance(q, dict) else q.model_dump() if hasattr(q, 'model_dump') else q
                if q_dict.get('timer_seconds'):
                    question_timers[str(idx)] = q_dict['timer_seconds']
            if question_timers:
                update_data["question_timers"] = question_timers
    
    for field, value in update_data.items():
        setattr(quiz, field, value)
    
    quiz.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(quiz)
    return quiz


@router.delete("/quizzes/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    quiz_id: int,
    current_user_tuple = Depends(get_current_content_creator),
    db: Session = Depends(get_db)
):
    """Delete a quiz (creator or super admin only)"""
    current_user, user_info = current_user_tuple
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    # Check if user can delete (super admin or creator)
    if not user_info["is_super_admin"] and quiz.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete quizzes you created"
        )
    
    db.delete(quiz)
    db.commit()
    return None


# ==================== CODING PROBLEMS ====================

@router.post("/coding-problems", response_model=CodingProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_coding_problem(
    problem_data: CodingProblemCreate,
    current_user_tuple = Depends(get_current_content_creator),
    db: Session = Depends(get_db)
):
    """Create a coding problem with scope-based visibility
    
    - Super Admin: Can create SvnaPro problems (scope_type='svnapro')
    - College Admin: Can create for entire college (scope_type='college')
    - HOD: Can create for department/year (scope_type='department')
    - Faculty: Can create for specific section/year (scope_type='section')
    """
    current_user, user_info = current_user_tuple
    
    # Validate scope based on role (same logic as quizzes)
    if user_info["is_super_admin"]:
        if problem_data.scope_type != "svnapro":
            problem_data.scope_type = "svnapro"
            problem_data.college_id = None
            problem_data.department = None
            problem_data.section_id = None
        # Super admin must specify year for SvnaPro content
        if not problem_data.year:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Year is required for SvnaPro content. Please specify which year this coding problem is for (e.g., '1st', '2nd', '3rd', '4th')."
            )
    elif user_info["is_admin"]:
        if problem_data.scope_type not in ["college", "department", "section"]:
            problem_data.scope_type = "college"
        problem_data.college_id = user_info["college_id"]
        if problem_data.scope_type == "college":
            problem_data.department = None
            problem_data.section_id = None
        # Year is recommended for college admin content (not enforced, but recommended)
        # If not provided, content will be visible to all years in the scope
    elif user_info["is_hod"]:
        if problem_data.scope_type not in ["department", "section"]:
            problem_data.scope_type = "department"
        problem_data.college_id = user_info["college_id"]
        problem_data.department = user_info["profile"].department if user_info["profile"] else None
        if problem_data.scope_type == "department":
            problem_data.section_id = None
    elif user_info["is_faculty"]:
        problem_data.scope_type = "section"
        problem_data.college_id = user_info["college_id"]
        problem_data.department = user_info["profile"].department if user_info["profile"] else None
        if problem_data.section_id:
            section = db.query(Section).filter(Section.id == problem_data.section_id).first()
            if not section:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid section_id"
                )
    
    problem = CodingProblem(
        title=problem_data.title,
        description=problem_data.description,
        difficulty=problem_data.difficulty,
        tags=problem_data.tags,
        test_cases=problem_data.test_cases,
        constraints=problem_data.constraints,
        sample_input=problem_data.sample_input,
        sample_output=problem_data.sample_output,
        is_active=problem_data.is_active,
        created_by=current_user.id,
        expiry_date=problem_data.expiry_date,
        scope_type=problem_data.scope_type,
        college_id=problem_data.college_id,
        department=problem_data.department,
        section_id=problem_data.section_id,
        year=problem_data.year
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)
    return problem


@router.get("/coding-problems", response_model=List[CodingProblemResponse])
async def list_coding_problems(
    difficulty: Optional[str] = None,
    is_active: Optional[bool] = None,
    scope_type: Optional[str] = Query(None, description="Filter by scope: 'svnapro' or 'college'"),
    current_user: Optional[User] = Depends(auth_get_optional_user),
    db: Session = Depends(get_db)
):
    """List coding problems with scope-based filtering
    
    - Students see problems based on their college, department, section, and year
    - scope_type='svnapro' shows only SvnaPro problems
    - scope_type='college' shows only college-scoped problems
    - If not specified, shows all visible problems
    """
    query = db.query(CodingProblem)
    
    # Filter by difficulty
    if difficulty:
        query = query.filter(CodingProblem.difficulty == difficulty)
    
    # Filter by active status
    if is_active is not None:
        query = query.filter(CodingProblem.is_active == is_active)
    
    # Filter by expiry date (exclude expired)
    now = datetime.utcnow()
    query = query.filter(
        or_(
            CodingProblem.expiry_date.is_(None),
            CodingProblem.expiry_date > now
        )
    )
    
    # If user is authenticated, filter by scope (same logic as quizzes)
    if current_user:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
        role_names = [role.role for role in user_roles]
        
        # Super admin sees all
        if RoleEnum.SUPER_ADMIN not in role_names:
            if scope_type == "svnapro":
                # Only SvnaPro problems - filter by year if student
                if profile and profile.present_year:
                    query = query.filter(
                        and_(
                            CodingProblem.scope_type == "svnapro",
                            or_(
                                CodingProblem.year.is_(None),
                                CodingProblem.year == profile.present_year
                            )
                        )
                    )
                else:
                    query = query.filter(CodingProblem.scope_type == "svnapro")
            elif scope_type == "college":
                if profile and profile.college_id:
                    query = query.filter(
                        and_(
                            CodingProblem.scope_type.in_(["college", "department", "section"]),
                            CodingProblem.college_id == profile.college_id
                        )
                    )
                    if profile.department:
                        query = query.filter(
                            or_(
                                CodingProblem.department.is_(None),
                                CodingProblem.department == profile.department
                            )
                        )
                    if profile.section:
                        # Match by section name - find section IDs matching the section name
                        matching_section_ids = db.query(Section.id).filter(
                            Section.name == profile.section
                        ).all()
                        section_id_list = [s[0] for s in matching_section_ids]
                        if section_id_list:
                            query = query.filter(
                                or_(
                                    CodingProblem.section_id.is_(None),
                                    CodingProblem.section_id.in_(section_id_list)
                                )
                            )
                        else:
                            # If no matching section found, only show problems with no section restriction
                            query = query.filter(CodingProblem.section_id.is_(None))
                    if profile.present_year:
                        query = query.filter(
                            or_(
                                CodingProblem.year.is_(None),
                                CodingProblem.year == profile.present_year
                            )
                        )
                else:
                    query = query.filter(False)
            else:
                # Show both SvnaPro and college-scoped
                if profile and profile.college_id:
                    college_problems = and_(
                        CodingProblem.scope_type.in_(["college", "department", "section"]),
                        CodingProblem.college_id == profile.college_id
                    )
                    if profile.department:
                        college_problems = and_(
                            college_problems,
                            or_(
                                CodingProblem.department.is_(None),
                                CodingProblem.department == profile.department
                            )
                        )
                    if profile.section:
                        # Match by section name - find section IDs matching the section name
                        matching_section_ids = db.query(Section.id).filter(
                            Section.name == profile.section
                        ).all()
                        section_id_list = [s[0] for s in matching_section_ids]
                        if section_id_list:
                            college_problems = and_(
                                college_problems,
                                or_(
                                    CodingProblem.section_id.is_(None),
                                    CodingProblem.section_id.in_(section_id_list)
                                )
                            )
                        else:
                            # If no matching section found, only show problems with no section restriction
                            college_problems = and_(
                                college_problems,
                                CodingProblem.section_id.is_(None)
                            )
                    if profile.present_year:
                        college_problems = and_(
                            college_problems,
                            or_(
                                CodingProblem.year.is_(None),
                                CodingProblem.year == profile.present_year
                            )
                        )
                    
                    # Filter SvnaPro content by year if specified
                    svnapro_filter = CodingProblem.scope_type == "svnapro"
                    if profile and profile.present_year:
                        # Only show SvnaPro problems that match the student's year OR have no year specified
                        svnapro_filter = and_(
                            CodingProblem.scope_type == "svnapro",
                            or_(
                                CodingProblem.year.is_(None),
                                CodingProblem.year == profile.present_year
                            )
                        )
                    
                    query = query.filter(
                        or_(
                            svnapro_filter,
                            college_problems
                        )
                    )
                else:
                    # No college, only SvnaPro - filter by year if authenticated
                    if current_user:
                        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
                        if profile and profile.present_year:
                            query = query.filter(
                                and_(
                                    CodingProblem.scope_type == "svnapro",
                                    or_(
                                        CodingProblem.year.is_(None),
                                        CodingProblem.year == profile.present_year
                                    )
                                )
                            )
                        else:
                            query = query.filter(CodingProblem.scope_type == "svnapro")
                    else:
                        query = query.filter(CodingProblem.scope_type == "svnapro")
    else:
        # Not authenticated, only SvnaPro (no year filter for unauthenticated)
        query = query.filter(CodingProblem.scope_type == "svnapro")
    
    problems = query.order_by(CodingProblem.created_at.desc()).all()
    return problems


@router.get("/coding-problems/{problem_id}", response_model=CodingProblemResponse)
async def get_coding_problem(
    problem_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific coding problem"""
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coding problem not found"
        )
    return problem


@router.put("/coding-problems/{problem_id}", response_model=CodingProblemResponse)
async def update_coding_problem(
    problem_id: int,
    problem_data: CodingProblemUpdate,
    current_user_tuple = Depends(get_current_content_creator),
    db: Session = Depends(get_db)
):
    """Update a coding problem (creator or super admin only)"""
    current_user, user_info = current_user_tuple
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coding problem not found"
        )
    
    # Check if user can update (super admin or creator)
    if not user_info["is_super_admin"] and problem.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update coding problems you created"
        )
    
    update_data = problem_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(problem, field, value)
    
    problem.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(problem)
    return problem


@router.delete("/coding-problems/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coding_problem(
    problem_id: int,
    current_user_tuple = Depends(get_current_content_creator),
    db: Session = Depends(get_db)
):
    """Delete a coding problem (creator or super admin only)"""
    current_user, user_info = current_user_tuple
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coding problem not found"
        )
    
    # Check if user can delete (super admin or creator)
    if not user_info["is_super_admin"] and problem.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete coding problems you created"
        )
    
    db.delete(problem)
    db.commit()
    return None


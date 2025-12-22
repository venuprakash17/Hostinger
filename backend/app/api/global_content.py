"""Global content management API (quizzes, coding problems) with scope-based access"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, load_only
from sqlalchemy import or_, and_, cast, Integer, func, cast, String
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.quiz import Quiz, CodingProblem, QuizAttempt
from app.models.academic import Section
from app.api.auth import get_current_user, get_optional_user as auth_get_optional_user
from app.schemas.global_content import (
    QuizCreate, QuizUpdate, QuizResponse,
    CodingProblemCreate, CodingProblemUpdate, CodingProblemResponse,
    QuizAttemptCreate, QuizAttemptUpdate, QuizAttemptResponse, QuizAnswerSchema
)
from datetime import datetime


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


def normalize_year_for_comparison(year_value):
    """Normalize year value for comparison (handles int, string, None)"""
    if year_value is None:
        return None
    if isinstance(year_value, int):
        return year_value
    if isinstance(year_value, str):
        return parse_year_to_int(year_value)
    return None

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
        # Faculty can create for any section/year in their branch - flexible assignment
        quiz_data.scope_type = "section" if quiz_data.section_id else "department"
        quiz_data.college_id = user_info["college_id"]
        quiz_data.department = user_info["profile"].department if user_info["profile"] else None
        
        # Get faculty's department_id to validate section belongs to their branch
        faculty_profile = user_info["profile"]
        faculty_department_id = faculty_profile.department_id if faculty_profile else None
        
        # If section_id is provided, validate it exists and belongs to faculty's branch
        if quiz_data.section_id:
            section = db.query(Section).filter(Section.id == quiz_data.section_id).first()
            if not section:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid section_id. The selected section does not exist."
                )
            
            # Validate section belongs to faculty's branch (if department_id is known)
            if faculty_department_id and section.department_id != faculty_department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only assign content to sections in your branch."
                )
            
            # Validate section belongs to faculty's college
            if section.college_id != user_info["college_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only assign content to sections in your college."
                )
        
        # Year is optional - faculty can assign to any year in their branch
        # If not provided, content will be visible to all years in the department
    
    # Build question_timers from questions if per-question timer is enabled
    question_timers = None
    # per_question_timer_enabled removed - column doesn't exist in database
    if hasattr(quiz_data, 'question_timers') and quiz_data.question_timers:
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
        # code_snippet removed - column doesn't exist in database
        question_timers=question_timers,
        # per_question_timer_enabled removed - column doesn't exist in database
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
    
    # Filter by start_time (only show quizzes that have started or have no start_time)
    query = query.filter(
        or_(
            Quiz.start_time.is_(None),
            Quiz.start_time <= now
        )
    )
    
    # If user is authenticated, filter by scope
    if current_user:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
        role_names = [role.role for role in user_roles]
        
        # Super admin sees all
        is_admin = RoleEnum.ADMIN in role_names
        is_hod = RoleEnum.HOD in role_names
        is_faculty = RoleEnum.FACULTY in role_names
        is_student = RoleEnum.STUDENT in role_names
        
        if RoleEnum.SUPER_ADMIN not in role_names:
            # For faculty/HOD/admin managing quizzes, show all quizzes in their college
            # Only students get filtered by their personal section/year
            if (is_admin or is_hod or is_faculty) and not is_student:
                # Staff viewing quizzes - show all in their college (not filtered by personal section/year)
                if profile and profile.college_id:
                    if scope_type == "svnapro":
                        query = query.filter(Quiz.scope_type == "svnapro")
                    elif scope_type == "college":
                        query = query.filter(
                            and_(
                                Quiz.scope_type.in_(["college", "department", "section"]),
                                Quiz.college_id == profile.college_id
                            )
                        )
                    else:
                        # Default: show all college-scoped quizzes (and optionally SvnaPro)
                        query = query.filter(
                            and_(
                                Quiz.scope_type.in_(["college", "department", "section"]),
                                Quiz.college_id == profile.college_id
                            )
                        )
                else:
                    query = query.filter(False)  # No college, no quizzes
            elif scope_type == "svnapro":
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
                    # For section-level quizzes: match by section_id AND year exactly
                    if profile.section_id:
                        # Exact match for section_id
                        query = query.filter(
                            or_(
                                Quiz.section_id.is_(None),
                                Quiz.section_id == profile.section_id
                            )
                        )
                    elif profile.section:
                        # Fallback: Match by section name - find section IDs matching the section name
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
                    
                    # Year matching: exact match required for section-level quizzes
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
                    # For section-level quizzes: match by section_id AND year exactly
                    if profile.section_id:
                        # Exact match for section_id
                        college_quizzes = and_(
                            college_quizzes,
                            or_(
                                Quiz.section_id.is_(None),
                                Quiz.section_id == profile.section_id
                            )
                        )
                    elif profile.section:
                        # Fallback: Match by section name - find section IDs matching the section name
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
                    
                    # Year matching: exact match required for section-level quizzes
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
    
    # Use safe query utility
    from app.core.db_utils import safe_list_query
    
    try:
        quizzes = safe_list_query(db, query.order_by(Quiz.created_at.desc()))
        return quizzes
    except Exception as e:
        import traceback
        import sys
        logger = __import__('logging').getLogger(__name__)
        logger.error(f"Error in list_quizzes: {e}")
        logger.error(traceback.format_exc())
        # Return empty list rather than crashing
        return []


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
    
    # Handle question_timers (per_question_timer_enabled removed - column doesn't exist)
    if update_data.get("question_timers"):
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
    
    # Exclude non-existent columns from update
    excluded_fields = {'code_snippet', 'per_question_timer_enabled'}
    for field, value in update_data.items():
        if field not in excluded_fields:
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


# ==================== QUIZ ATTEMPTS ====================

@router.post("/quizzes/{quiz_id}/attempt", response_model=QuizAttemptResponse, status_code=status.HTTP_201_CREATED)
async def start_quiz_attempt(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a quiz attempt (Student)"""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    if not quiz.is_active:
        raise HTTPException(status_code=400, detail="Quiz is not active")
    
    # Check if quiz is available
    now = datetime.utcnow()
    if quiz.start_time and now < quiz.start_time:
        raise HTTPException(status_code=400, detail="Quiz has not started yet")
    if quiz.expiry_date and now > quiz.expiry_date:
        raise HTTPException(status_code=400, detail="Quiz has expired")
    if quiz.end_time and now > quiz.end_time:
        raise HTTPException(status_code=400, detail="Quiz has ended")
    
    # Check if already attempted
    existing = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.is_submitted == False
    ).first()
    
    if existing:
        # Return existing attempt
        attempt_dict = {c.name: getattr(existing, c.name) for c in existing.__table__.columns}
        attempt_dict['answers'] = existing.answers or []
        return attempt_dict
    
    # Create new attempt
    attempt = QuizAttempt(quiz_id=quiz_id, user_id=current_user.id)
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    
    attempt_dict = {c.name: getattr(attempt, c.name) for c in attempt.__table__.columns}
    attempt_dict['answers'] = []
    return attempt_dict


@router.put("/quiz-attempts/{attempt_id}", response_model=QuizAttemptResponse)
async def update_quiz_attempt(
    attempt_id: int,
    attempt_data: QuizAttemptUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update quiz attempt with answers"""
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if attempt.is_submitted:
        raise HTTPException(status_code=400, detail="Quiz already submitted")
    
    # Check if quiz time expired
    quiz = attempt.quiz
    now = datetime.utcnow()
    if quiz.duration_minutes > 0:
        time_elapsed = (now - attempt.started_at).total_seconds() / 60
        if time_elapsed > quiz.duration_minutes:
            attempt.is_auto_submitted = True
            attempt.auto_submitted_at = now
            attempt.is_submitted = True
            db.commit()
            raise HTTPException(status_code=400, detail="Quiz time expired")
    
    # Update answers
    if attempt_data.answers is not None:
        attempt.answers = [a.model_dump() if hasattr(a, 'model_dump') else a for a in attempt_data.answers]
    
    db.commit()
    db.refresh(attempt)
    
    attempt_dict = {c.name: getattr(attempt, c.name) for c in attempt.__table__.columns}
    attempt_dict['answers'] = attempt.answers or []
    return attempt_dict


@router.post("/quiz-attempts/{attempt_id}/submit", response_model=QuizAttemptResponse)
async def submit_quiz(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit quiz attempt and auto-grade"""
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if attempt.is_submitted:
        return attempt
    
    # Mark as submitted
    attempt.is_submitted = True
    attempt.submitted_at = datetime.utcnow()
    
    # Auto-grade
    quiz = attempt.quiz
    total_score = 0.0
    max_score = 0.0
    questions = quiz.questions if isinstance(quiz.questions, list) else []
    answers = attempt.answers or []
    
    # Create answer map by question index
    answer_map = {ans.get('question_index'): ans for ans in answers if isinstance(ans, dict)}
    
    for idx, question in enumerate(questions):
        if not isinstance(question, dict):
            continue
            
        max_score += question.get('marks', 1)
        answer = answer_map.get(idx)
        
        if answer:
            points_earned = 0.0
            question_type = question.get('question_type', 'mcq')
            user_answer = answer.get('answer')
            
            # Grade based on question type
            if question_type == 'mcq':
                correct_answer = question.get('correct_answer', '').upper()
                if user_answer and str(user_answer).upper() == correct_answer:
                    points_earned = question.get('marks', 1)
            elif question_type == 'true_false':
                correct_bool = question.get('is_true', False)
                if user_answer is not None and bool(user_answer) == correct_bool:
                    points_earned = question.get('marks', 1)
            elif question_type == 'fill_blank':
                correct_text = question.get('correct_answer_text', '').strip().lower()
                if user_answer and str(user_answer).strip().lower() == correct_text:
                    points_earned = question.get('marks', 1)
            
            # Update answer with points
            answer['points_earned'] = points_earned
            answer['max_points'] = question.get('marks', 1)
            answer['is_correct'] = points_earned > 0
            total_score += points_earned
    
    attempt.total_score = max(0, total_score)
    attempt.max_score = max_score
    attempt.percentage = (attempt.total_score / attempt.max_score * 100) if max_score > 0 else 0
    attempt.is_graded = True
    attempt.graded_at = datetime.utcnow()
    attempt.answers = answers  # Update with graded answers
    
    db.commit()
    db.refresh(attempt)
    
    attempt_dict = {c.name: getattr(attempt, c.name) for c in attempt.__table__.columns}
    attempt_dict['answers'] = attempt.answers or []
    return attempt_dict


@router.get("/quiz-attempts/{attempt_id}", response_model=QuizAttemptResponse)
async def get_quiz_attempt(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a quiz attempt"""
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    attempt_dict = {c.name: getattr(attempt, c.name) for c in attempt.__table__.columns}
    attempt_dict['answers'] = attempt.answers or []
    return attempt_dict


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
        # Faculty can create for any section/year in their branch - flexible assignment
        problem_data.scope_type = "section" if problem_data.section_id else "department"
        problem_data.college_id = user_info["college_id"]
        problem_data.department = user_info["profile"].department if user_info["profile"] else None
        
        # Get faculty's department_id to validate section belongs to their branch
        faculty_profile = user_info["profile"]
        faculty_department_id = faculty_profile.department_id if faculty_profile else None
        
        # If section_id is provided, validate it exists and belongs to faculty's branch
        if problem_data.section_id:
            section = db.query(Section).filter(Section.id == problem_data.section_id).first()
            if not section:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid section_id. The selected section does not exist."
                )
            
            # Validate section belongs to faculty's branch (if department_id is known)
            if faculty_department_id and section.department_id != faculty_department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only assign content to sections in your branch."
                )
            
            # Validate section belongs to faculty's college
            if section.college_id != user_info["college_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only assign content to sections in your college."
                )
    
    # Convert test_cases from dict to list for storage (database stores as list)
    test_cases_list = None
    if problem_data.test_cases:
        if isinstance(problem_data.test_cases, dict):
            # Convert dict to list: {"0": {...}, "1": {...}} -> [{...}, {...}]
            test_cases_list = [problem_data.test_cases[str(i)] for i in range(len(problem_data.test_cases)) if str(i) in problem_data.test_cases]
        elif isinstance(problem_data.test_cases, list):
            test_cases_list = problem_data.test_cases
        else:
            test_cases_list = problem_data.test_cases
    
    problem = CodingProblem(
        title=problem_data.title,
        description=problem_data.description,
        difficulty=problem_data.difficulty,
        tags=problem_data.tags,
        test_cases=test_cases_list,
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
    
    # Convert back to response format
    test_cases_dict = None
    if problem.test_cases:
        if isinstance(problem.test_cases, list):
            test_cases_dict = {str(i): tc for i, tc in enumerate(problem.test_cases)}
        elif isinstance(problem.test_cases, dict):
            test_cases_dict = problem.test_cases
    
    year_str = str(problem.year) if problem.year is not None else (problem.year_str if problem.year_str else None)
    
    return CodingProblemResponse(
        id=problem.id,
        title=problem.title or "",
        description=problem.description or "",
        input_format=getattr(problem, 'input_format', None),
        output_format=getattr(problem, 'output_format', None),
        constraints=getattr(problem, 'constraints', None),
        sample_input=getattr(problem, 'sample_input', None),
        sample_output=getattr(problem, 'sample_output', None),
        difficulty=getattr(problem, 'difficulty', None),
        tags=problem.tags if isinstance(problem.tags, list) else (problem.tags.split(',') if isinstance(problem.tags, str) else []),
        test_cases=test_cases_dict,
        is_active=problem.is_active if isinstance(problem.is_active, bool) else str(problem.is_active).lower() == 'true',
        expiry_date=getattr(problem, 'expiry_date', None),
        scope_type=getattr(problem, 'scope_type', 'svnapro') or 'svnapro',
        college_id=getattr(problem, 'college_id', None),
        department=getattr(problem, 'department', None),
        section_id=getattr(problem, 'section_id', None),
        year=year_str,
        created_by=getattr(problem, 'created_by', None),
        created_at=getattr(problem, 'created_at', datetime.utcnow()),
        updated_at=getattr(problem, 'updated_at', None)
    )


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
            # Check if user is a student
            is_student = RoleEnum.STUDENT in role_names
            
            if scope_type == "svnapro":
                # Only SvnaPro problems - filter by year if student
                if profile and profile.present_year and is_student:
                    # Convert student's present_year to integer for comparison
                    student_year_int = parse_year_to_int(profile.present_year)
                    if student_year_int:
                        # Students can see problems for their year and below (year <= student_year)
                        # Handle both integer and string year formats
                        # Use a CASE statement to normalize year values for comparison
                        query = query.filter(
                            and_(
                                CodingProblem.scope_type == "svnapro",
                                or_(
                                    CodingProblem.year.is_(None),
                                    # Try to convert year to integer and compare
                                    func.cast(
                                        func.nullif(
                                            func.regexp_replace(
                                                cast(CodingProblem.year, String),
                                                '[^0-9]', '', 'g'
                                            ),
                                            ''
                                        ),
                                        Integer
                                    ) <= student_year_int
                                )
                            )
                        )
                    else:
                        # If can't parse year, show only problems with no year
                        query = query.filter(
                            and_(
                                CodingProblem.scope_type == "svnapro",
                                CodingProblem.year.is_(None)
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
                        # Convert student's present_year to integer for comparison
                        student_year_int = parse_year_to_int(profile.present_year) if is_student else None
                        if student_year_int:
                            # Students can see problems for their year and below
                            query = query.filter(
                                or_(
                                    CodingProblem.year.is_(None),
                                    func.cast(
                                        func.nullif(
                                            func.regexp_replace(
                                                cast(CodingProblem.year, String),
                                                '[^0-9]', '', 'g'
                                            ),
                                            ''
                                        ),
                                        Integer
                                    ) <= student_year_int
                                )
                            )
                        else:
                            # If can't parse year or not a student, show problems with no year restriction
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
                        # Convert student's present_year to integer for comparison
                        student_year_int = parse_year_to_int(profile.present_year) if is_student else None
                        if student_year_int:
                            # Students can see problems for their year and below
                            college_problems = and_(
                                college_problems,
                                or_(
                                    CodingProblem.year.is_(None),
                                    func.cast(
                                        func.nullif(
                                            func.regexp_replace(
                                                cast(CodingProblem.year, String),
                                                '[^0-9]', '', 'g'
                                            ),
                                            ''
                                        ),
                                        Integer
                                    ) <= student_year_int
                                )
                            )
                        else:
                            # If can't parse year or not a student, use direct comparison
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
                        # Convert student's present_year to integer for comparison
                        student_year_int = parse_year_to_int(profile.present_year) if is_student else None
                        if student_year_int:
                            # Students can see problems for their year and below
                            svnapro_filter = and_(
                                CodingProblem.scope_type == "svnapro",
                                or_(
                                    CodingProblem.year.is_(None),
                                    func.cast(
                                        func.nullif(
                                            func.regexp_replace(
                                                cast(CodingProblem.year, String),
                                                '[^0-9]', '', 'g'
                                            ),
                                            ''
                                        ),
                                        Integer
                                    ) <= student_year_int
                                )
                            )
                        else:
                            # If can't parse year or not a student, use direct comparison
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
                        user_roles_check = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
                        role_names_check = [role.role for role in user_roles_check]
                        is_student_check = RoleEnum.STUDENT in role_names_check
                        
                        if profile and profile.present_year:
                            student_year_int = parse_year_to_int(profile.present_year) if is_student_check else None
                            if student_year_int:
                                query = query.filter(
                                    and_(
                                        CodingProblem.scope_type == "svnapro",
                                        or_(
                                            CodingProblem.year.is_(None),
                                            func.cast(
                                                func.nullif(
                                                    func.regexp_replace(
                                                        cast(CodingProblem.year, String),
                                                        '[^0-9]', '', 'g'
                                                    ),
                                                    ''
                                                ),
                                                Integer
                                            ) <= student_year_int
                                        )
                                    )
                                )
                            else:
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
    
    # Use load_only to exclude non-existent columns (academic_year_id, section)
    from sqlalchemy.orm import load_only
    problems = query.options(
        load_only(
            CodingProblem.id, CodingProblem.title, CodingProblem.description,
            CodingProblem.input_format, CodingProblem.output_format,
            CodingProblem.constraints, CodingProblem.sample_input,
            CodingProblem.sample_output, CodingProblem.difficulty,
            CodingProblem.tags, CodingProblem.year, CodingProblem.year_str,
            CodingProblem.allowed_languages, CodingProblem.restricted_languages,
            CodingProblem.recommended_languages, CodingProblem.starter_code_python,
            CodingProblem.starter_code_c, CodingProblem.starter_code_cpp,
            CodingProblem.starter_code_java, CodingProblem.starter_code_javascript,
            CodingProblem.time_limit, CodingProblem.memory_limit,
            CodingProblem.test_cases, CodingProblem.is_active,
            CodingProblem.created_by, CodingProblem.expiry_date,
            CodingProblem.scope_type, CodingProblem.college_id,
            CodingProblem.department, CodingProblem.section_id,
            CodingProblem.problem_code, CodingProblem.created_at,
            CodingProblem.updated_at
            # academic_year_id and section excluded
        )
    ).order_by(CodingProblem.created_at.desc()).all()
    
    # Apply year-based filtering for students in Python (more reliable than SQL)
    if current_user:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
        role_names = [role.role for role in user_roles]
        is_student = RoleEnum.STUDENT in role_names
        is_institution_student = RoleEnum.INSTITUTION_STUDENT in role_names
        
        # Institution students can see ALL problems (no year filtering)
        if is_institution_student:
            # No filtering needed - show all problems
            pass
        elif is_student and profile and profile.present_year and RoleEnum.SUPER_ADMIN not in role_names:
            # Regular college students: filter by year
            # Convert student's year to integer
            student_year_int = parse_year_to_int(profile.present_year)
            if student_year_int:
                filtered_problems = []
                for problem in problems:
                    # Convert problem year to integer
                    problem_year_int = None
                    if problem.year is not None:
                        if isinstance(problem.year, int):
                            problem_year_int = problem.year
                        elif isinstance(problem.year, str):
                            problem_year_int = parse_year_to_int(problem.year)
                    
                    # Students can see problems for their year and below (year <= student_year)
                    # Also show problems with no year specified
                    if problem_year_int is None or problem_year_int <= student_year_int:
                        filtered_problems.append(problem)
                
                problems = filtered_problems
    
    # Convert problems to match CodingProblemResponse schema
    # Schema expects: test_cases as Dict, year as str
    result = []
    for problem in problems:
        # Convert test_cases from list to dict format
        test_cases_dict = None
        if problem.test_cases:
            if isinstance(problem.test_cases, list):
                # Convert list to dict: {"0": {...}, "1": {...}}
                test_cases_dict = {str(i): tc for i, tc in enumerate(problem.test_cases)}
            elif isinstance(problem.test_cases, dict):
                test_cases_dict = problem.test_cases
            else:
                # Try to parse as JSON string
                try:
                    import json
                    parsed = json.loads(problem.test_cases) if isinstance(problem.test_cases, str) else problem.test_cases
                    if isinstance(parsed, list):
                        test_cases_dict = {str(i): tc for i, tc in enumerate(parsed)}
                    else:
                        test_cases_dict = parsed
                except:
                    test_cases_dict = None
        
        # Convert year from int to string
        year_str = None
        if problem.year is not None:
            if isinstance(problem.year, int):
                # Convert int to string (e.g., 1 -> "1", 2 -> "2")
                year_str = str(problem.year)
            elif isinstance(problem.year, str):
                year_str = problem.year
            else:
                year_str = str(problem.year)
        elif problem.year_str:
            year_str = problem.year_str
        
        # Create response object with converted data
        response_obj = CodingProblemResponse(
            id=problem.id,
            title=problem.title or "",
            description=problem.description or "",
            input_format=getattr(problem, 'input_format', None),
            output_format=getattr(problem, 'output_format', None),
            constraints=getattr(problem, 'constraints', None),
            sample_input=getattr(problem, 'sample_input', None),
            sample_output=getattr(problem, 'sample_output', None),
            difficulty=getattr(problem, 'difficulty', None),
            tags=problem.tags if isinstance(problem.tags, list) else (problem.tags.split(',') if isinstance(problem.tags, str) else []),
            test_cases=test_cases_dict,
            is_active=problem.is_active if isinstance(problem.is_active, bool) else str(problem.is_active).lower() == 'true',
            expiry_date=getattr(problem, 'expiry_date', None),
            scope_type=getattr(problem, 'scope_type', 'svnapro') or 'svnapro',
            college_id=getattr(problem, 'college_id', None),
            department=getattr(problem, 'department', None),
            section_id=getattr(problem, 'section_id', None),
            year=year_str,
            created_by=getattr(problem, 'created_by', None),
            created_at=getattr(problem, 'created_at', datetime.utcnow()),
            updated_at=getattr(problem, 'updated_at', None)
        )
        result.append(response_obj)
    
    return result


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
    
    # Convert test_cases from list to dict format
    test_cases_dict = None
    if problem.test_cases:
        if isinstance(problem.test_cases, list):
            test_cases_dict = {str(i): tc for i, tc in enumerate(problem.test_cases)}
        elif isinstance(problem.test_cases, dict):
            test_cases_dict = problem.test_cases
        else:
            try:
                import json
                parsed = json.loads(problem.test_cases) if isinstance(problem.test_cases, str) else problem.test_cases
                if isinstance(parsed, list):
                    test_cases_dict = {str(i): tc for i, tc in enumerate(parsed)}
                else:
                    test_cases_dict = parsed
            except:
                test_cases_dict = None
    
    # Convert year from int to string
    year_str = None
    if problem.year is not None:
        if isinstance(problem.year, int):
            year_str = str(problem.year)
        elif isinstance(problem.year, str):
            year_str = problem.year
        else:
            year_str = str(problem.year)
    elif problem.year_str:
        year_str = problem.year_str
    
    return CodingProblemResponse(
        id=problem.id,
        title=problem.title or "",
        description=problem.description or "",
        input_format=getattr(problem, 'input_format', None),
        output_format=getattr(problem, 'output_format', None),
        constraints=getattr(problem, 'constraints', None),
        sample_input=getattr(problem, 'sample_input', None),
        sample_output=getattr(problem, 'sample_output', None),
        difficulty=getattr(problem, 'difficulty', None),
        tags=problem.tags if isinstance(problem.tags, list) else (problem.tags.split(',') if isinstance(problem.tags, str) else []),
        test_cases=test_cases_dict,
        is_active=problem.is_active if isinstance(problem.is_active, bool) else str(problem.is_active).lower() == 'true',
        expiry_date=getattr(problem, 'expiry_date', None),
        scope_type=getattr(problem, 'scope_type', 'svnapro') or 'svnapro',
        college_id=getattr(problem, 'college_id', None),
        department=getattr(problem, 'department', None),
        section_id=getattr(problem, 'section_id', None),
        year=year_str,
        created_by=getattr(problem, 'created_by', None),
        created_at=getattr(problem, 'created_at', datetime.utcnow()),
        updated_at=getattr(problem, 'updated_at', None)
    )


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
    
    # Convert test_cases from dict to list for storage if provided
    if "test_cases" in update_data and update_data["test_cases"]:
        if isinstance(update_data["test_cases"], dict):
            # Convert dict to list: {"0": {...}, "1": {...}} -> [{...}, {...}]
            update_data["test_cases"] = [update_data["test_cases"][str(i)] for i in range(len(update_data["test_cases"])) if str(i) in update_data["test_cases"]]
        # If it's already a list, keep it as is
    
    for field, value in update_data.items():
        setattr(problem, field, value)
    
    problem.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(problem)
    
    # Convert back to response format
    test_cases_dict = None
    if problem.test_cases:
        if isinstance(problem.test_cases, list):
            test_cases_dict = {str(i): tc for i, tc in enumerate(problem.test_cases)}
        elif isinstance(problem.test_cases, dict):
            test_cases_dict = problem.test_cases
    
    year_str = str(problem.year) if problem.year is not None else (problem.year_str if problem.year_str else None)
    
    return CodingProblemResponse(
        id=problem.id,
        title=problem.title or "",
        description=problem.description or "",
        input_format=getattr(problem, 'input_format', None),
        output_format=getattr(problem, 'output_format', None),
        constraints=getattr(problem, 'constraints', None),
        sample_input=getattr(problem, 'sample_input', None),
        sample_output=getattr(problem, 'sample_output', None),
        difficulty=getattr(problem, 'difficulty', None),
        tags=problem.tags if isinstance(problem.tags, list) else (problem.tags.split(',') if isinstance(problem.tags, str) else []),
        test_cases=test_cases_dict,
        is_active=problem.is_active if isinstance(problem.is_active, bool) else str(problem.is_active).lower() == 'true',
        expiry_date=getattr(problem, 'expiry_date', None),
        scope_type=getattr(problem, 'scope_type', 'svnapro') or 'svnapro',
        college_id=getattr(problem, 'college_id', None),
        department=getattr(problem, 'department', None),
        section_id=getattr(problem, 'section_id', None),
        year=year_str,
        created_by=getattr(problem, 'created_by', None),
        created_at=getattr(problem, 'created_at', datetime.utcnow()),
        updated_at=getattr(problem, 'updated_at', None)
    )


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


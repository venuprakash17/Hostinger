"""Intelligent Lab Module API - CodeTantra-like Features"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional
from datetime import datetime, date, time

from app.core.database import get_db
from app.api.auth import (
    get_current_user, get_current_admin, get_current_super_admin,
    get_current_hod, get_current_faculty, get_current_hod_or_faculty
)
from app.models.user import User, UserRole, RoleEnum
from app.models.coding_lab import CodingLab
from app.models.intelligent_lab import (
    LabSessionEnhanced, SessionMaterial, LabTest, TestQuestion, 
    TestAttempt, TestAnswer, StudentSessionProgress, StudentLabProgress,
    LabLeaderboard, MaterialType, TestType, QuestionType
)
from app.models.coding_lab import LabMode  # Import LabMode for mode-based configuration
from app.schemas.intelligent_lab import (
    SessionEnhancedCreate, SessionEnhancedUpdate, SessionEnhancedResponse,
    SessionMaterialCreate, SessionMaterialResponse,
    LabTestCreate, LabTestUpdate, LabTestResponse, LabTestWithQuestions,
    TestQuestionCreate, TestQuestionResponse,
    TestAttemptCreate, TestAttemptResponse, TestAnswerCreate, TestAnswerResponse,
    StudentSessionProgressResponse, StudentLabProgressResponse,
    LabLeaderboardResponse
)
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intelligent-labs", tags=["intelligent-labs"])


# ==================== Enhanced Sessions ====================

@router.post("/labs/{lab_id}/sessions", response_model=SessionEnhancedResponse, status_code=status.HTTP_201_CREATED)
async def create_daily_session(
    lab_id: int,
    session_data: SessionEnhancedCreate,
    current_user: User = Depends(get_current_hod_or_faculty),
    db: Session = Depends(get_db)
):
    """Create a daily lab session (Faculty/HOD)"""
    # Verify lab exists
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Check permissions
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.HOD not in user_roles:
        # Faculty must be assigned to lab
        from app.models.coding_lab import LabFacultyAssignment
        assignment = db.query(LabFacultyAssignment).filter(
            LabFacultyAssignment.lab_id == lab_id,
            LabFacultyAssignment.faculty_id == current_user.id,
            LabFacultyAssignment.is_active == True,
            LabFacultyAssignment.can_add_sessions == True
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Not authorized to create sessions for this lab")
    
    # Create session with mode-based auto-configuration
    session_dict = session_data.dict(exclude={'materials'})
    mode = session_dict.get('mode', LabMode.PRACTICE)
    
    # Auto-configure settings based on mode if not explicitly provided
    if session_dict.get('allow_hints') is None:
        session_dict['allow_hints'] = mode != LabMode.EXAM  # Disable hints for exams
    if session_dict.get('allow_multiple_attempts') is None:
        session_dict['allow_multiple_attempts'] = mode != LabMode.EXAM  # Single attempt for exams
    if session_dict.get('max_attempts') is None:
        if mode == LabMode.EXAM:
            session_dict['max_attempts'] = 1  # Single attempt for exams
        elif mode == LabMode.ASSIGNMENT:
            session_dict['max_attempts'] = 3  # Default 3 attempts for assignments
        # Practice mode: None = unlimited
    if session_dict.get('is_proctored') is None:
        session_dict['is_proctored'] = mode == LabMode.EXAM  # Enable proctoring for exams
    if session_dict.get('enforce_fullscreen') is None:
        session_dict['enforce_fullscreen'] = mode == LabMode.EXAM  # Fullscreen for exams
    if session_dict.get('detect_tab_switch') is None:
        session_dict['detect_tab_switch'] = mode == LabMode.EXAM  # Tab detection for exams
    if session_dict.get('camera_proctoring') is None:
        session_dict['camera_proctoring'] = False  # Camera proctoring is optional, defaults to False
    
    session = LabSessionEnhanced(**session_dict, lab_id=lab_id)
    db.add(session)
    db.flush()
    
    # Add materials if provided
    if session_data.materials:
        for material_data in session_data.materials:
            material = SessionMaterial(**material_data.dict(), session_id=session.id)
            db.add(material)
    
    db.commit()
    db.refresh(session)
    
    return session


@router.get("/labs/{lab_id}/sessions", response_model=List[SessionEnhancedResponse])
async def list_daily_sessions(
    lab_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all daily sessions for a lab"""
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Check access
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.STUDENT in user_roles:
        if not lab.is_published or not lab.is_active:
            raise HTTPException(status_code=403, detail="Lab not available")
    
    sessions = db.query(LabSessionEnhanced).filter(
        LabSessionEnhanced.lab_id == lab_id
    ).order_by(LabSessionEnhanced.session_date, LabSessionEnhanced.order_index).all()
    
    # Add problem counts
    result = []
    for session in sessions:
        session_dict = {c.name: getattr(session, c.name) for c in session.__table__.columns}
        session_dict['problem_count'] = len(session.problems) if hasattr(session, 'problems') else 0
        session_dict['materials'] = [
            {c.name: getattr(m, c.name) for c in m.__table__.columns}
            for m in session.materials
        ] if hasattr(session, 'materials') else []
        result.append(session_dict)
    
    return result


@router.get("/sessions/{session_id}", response_model=SessionEnhancedResponse)
async def get_daily_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get daily session details"""
    session = db.query(LabSessionEnhanced).filter(LabSessionEnhanced.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check lab access
    lab = session.lab
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.STUDENT in user_roles:
        if not lab.is_published or not lab.is_active:
            raise HTTPException(status_code=403, detail="Lab not available")
    
    session_dict = {c.name: getattr(session, c.name) for c in session.__table__.columns}
    session_dict['problem_count'] = len(session.problems) if hasattr(session, 'problems') else 0
    session_dict['materials'] = [
        {c.name: getattr(m, c.name) for c in m.__table__.columns}
        for m in session.materials
    ] if hasattr(session, 'materials') else []
    
    return session_dict


@router.put("/sessions/{session_id}", response_model=SessionEnhancedResponse)
async def update_daily_session(
    session_id: int,
    session_data: SessionEnhancedUpdate,
    current_user: User = Depends(get_current_hod_or_faculty),
    db: Session = Depends(get_db)
):
    """Update daily session (Faculty/HOD)"""
    session = db.query(LabSessionEnhanced).filter(LabSessionEnhanced.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.HOD not in user_roles:
        from app.models.coding_lab import LabFacultyAssignment
        assignment = db.query(LabFacultyAssignment).filter(
            LabFacultyAssignment.lab_id == session.lab_id,
            LabFacultyAssignment.faculty_id == current_user.id,
            LabFacultyAssignment.is_active == True
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update fields
    update_data = session_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)
    
    db.commit()
    db.refresh(session)
    
    session_dict = {c.name: getattr(session, c.name) for c in session.__table__.columns}
    session_dict['problem_count'] = len(session.problems) if hasattr(session, 'problems') else 0
    return session_dict


@router.post("/sessions/{session_id}/materials", response_model=SessionMaterialResponse, status_code=status.HTTP_201_CREATED)
async def add_session_material(
    session_id: int,
    material_data: SessionMaterialCreate,
    current_user: User = Depends(get_current_hod_or_faculty),
    db: Session = Depends(get_db)
):
    """Add material to session (Faculty/HOD)"""
    session = db.query(LabSessionEnhanced).filter(LabSessionEnhanced.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.HOD not in user_roles:
        from app.models.coding_lab import LabFacultyAssignment
        assignment = db.query(LabFacultyAssignment).filter(
            LabFacultyAssignment.lab_id == session.lab_id,
            LabFacultyAssignment.faculty_id == current_user.id,
            LabFacultyAssignment.is_active == True
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    material = SessionMaterial(**material_data.dict(), session_id=session_id)
    db.add(material)
    db.commit()
    db.refresh(material)
    
    return material


# ==================== Lab Tests ====================

@router.post("/labs/{lab_id}/tests", response_model=LabTestResponse, status_code=status.HTTP_201_CREATED)
async def create_lab_test(
    lab_id: int,
    test_data: LabTestCreate,
    current_user: User = Depends(get_current_hod_or_faculty),
    db: Session = Depends(get_db)
):
    """Create a lab test/quiz (Faculty/HOD)"""
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Check permissions
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.HOD not in user_roles:
        from app.models.coding_lab import LabFacultyAssignment
        assignment = db.query(LabFacultyAssignment).filter(
            LabFacultyAssignment.lab_id == lab_id,
            LabFacultyAssignment.faculty_id == current_user.id,
            LabFacultyAssignment.is_active == True
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create test
    test_dict = test_data.dict(exclude={'questions'})
    test = LabTest(**test_dict, lab_id=lab_id)
    db.add(test)
    db.flush()
    
    # Add questions if provided
    if test_data.questions:
        for q_data in test_data.questions:
            q_dict = q_data.dict()
            # Convert options to JSON if present
            if q_dict.get('options'):
                q_dict['options'] = json.dumps([opt.dict() if hasattr(opt, 'dict') else opt for opt in q_dict['options']])
            question = TestQuestion(**q_dict, test_id=test.id)
            db.add(question)
    
    db.commit()
    db.refresh(test)
    
    test_dict = {c.name: getattr(test, c.name) for c in test.__table__.columns}
    test_dict['question_count'] = len(test.questions) if hasattr(test, 'questions') else 0
    return test_dict


@router.get("/labs/{lab_id}/tests", response_model=List[LabTestResponse])
async def list_lab_tests(
    lab_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all tests for a lab"""
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    tests = db.query(LabTest).filter(LabTest.lab_id == lab_id).order_by(LabTest.start_time).all()
    
    result = []
    for test in tests:
        test_dict = {c.name: getattr(test, c.name) for c in test.__table__.columns}
        test_dict['question_count'] = len(test.questions) if hasattr(test, 'questions') else 0
        test_dict['attempt_count'] = len(test.student_attempts) if hasattr(test, 'student_attempts') else 0
        result.append(test_dict)
    
    return result


@router.get("/tests/{test_id}", response_model=LabTestWithQuestions)
async def get_lab_test(
    test_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get test details with questions"""
    test = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Check access
    lab = test.lab
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.STUDENT in user_roles:
        if not lab.is_published or not lab.is_active:
            raise HTTPException(status_code=403, detail="Lab not available")
        if not test.is_published:
            raise HTTPException(status_code=403, detail="Test not available")
    
    test_dict = {c.name: getattr(test, c.name) for c in test.__table__.columns}
    
    # Parse JSON fields
    questions = []
    for q in test.questions:
        q_dict = {c.name: getattr(q, c.name) for c in q.__table__.columns}
        if q_dict.get('options'):
            try:
                q_dict['options'] = json.loads(q_dict['options']) if isinstance(q_dict['options'], str) else q_dict['options']
            except:
                q_dict['options'] = []
        questions.append(q_dict)
    
    test_dict['questions'] = questions
    return test_dict


# ==================== Test Attempts ====================

@router.post("/tests/{test_id}/attempt", response_model=TestAttemptResponse, status_code=status.HTTP_201_CREATED)
async def start_test_attempt(
    test_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a test attempt (Student)"""
    test = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Check if test is available
    now = datetime.now()
    if now < test.start_time:
        raise HTTPException(status_code=400, detail="Test has not started yet")
    if now > test.end_time:
        raise HTTPException(status_code=400, detail="Test has ended")
    
    # Check if already attempted
    existing = db.query(TestAttempt).filter(
        TestAttempt.test_id == test_id,
        TestAttempt.user_id == current_user.id
    ).first()
    
    if existing:
        if existing.is_submitted:
            raise HTTPException(status_code=400, detail="Test already submitted")
        # Return existing attempt
        attempt_dict = {c.name: getattr(existing, c.name) for c in existing.__table__.columns}
        attempt_dict['answers'] = [
            {c.name: getattr(a, c.name) for c in a.__table__.columns}
            for a in existing.answers
        ]
        return attempt_dict
    
    # Create new attempt
    attempt = TestAttempt(test_id=test_id, user_id=current_user.id)
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    
    attempt_dict = {c.name: getattr(attempt, c.name) for c in attempt.__table__.columns}
    attempt_dict['answers'] = []
    return attempt_dict


@router.post("/attempts/{attempt_id}/answers", response_model=TestAnswerResponse, status_code=status.HTTP_201_CREATED)
async def submit_answer(
    attempt_id: int,
    answer_data: TestAnswerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit answer for a test question"""
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if attempt.is_submitted:
        raise HTTPException(status_code=400, detail="Test already submitted")
    
    # Check if test time expired
    test = attempt.test
    now = datetime.now()
    if now > test.end_time and test.auto_lock:
        attempt.is_auto_submitted = True
        attempt.auto_submitted_at = now
        db.commit()
        raise HTTPException(status_code=400, detail="Test time expired")
    
    # Create or update answer
    existing = db.query(TestAnswer).filter(
        TestAnswer.attempt_id == attempt_id,
        TestAnswer.question_id == answer_data.question_id
    ).first()
    
    if existing:
        # Update existing answer
        answer_dict = answer_data.dict(exclude_unset=True)
        for field, value in answer_dict.items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new answer
        answer = TestAnswer(**answer_data.dict(), attempt_id=attempt_id)
        db.add(answer)
        db.commit()
        db.refresh(answer)
        return answer


@router.post("/attempts/{attempt_id}/submit", response_model=TestAttemptResponse)
async def submit_test(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit test attempt and auto-grade"""
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if attempt.is_submitted:
        return attempt
    
    # Mark as submitted
    attempt.is_submitted = True
    attempt.submitted_at = datetime.now()
    
    # Auto-grade
    test = attempt.test
    total_score = 0.0
    max_score = 0.0
    
    for question in test.questions:
        max_score += question.points
        answer = db.query(TestAnswer).filter(
            TestAnswer.attempt_id == attempt_id,
            TestAnswer.question_id == question.id
        ).first()
        
        if answer:
            points_earned = 0.0
            
            # Grade based on question type
            if question.question_type == QuestionType.MCQ:
                if answer.selected_options and len(answer.selected_options) > 0:
                    selected_idx = answer.selected_options[0]
                    options = json.loads(question.options) if isinstance(question.options, str) else question.options
                    if options and selected_idx < len(options) and options[selected_idx].get('is_correct'):
                        points_earned = question.points
                    else:
                        points_earned = -question.negative_marking
            elif question.question_type == QuestionType.TRUE_FALSE:
                if answer.answer_text and answer.answer_text.lower() == question.correct_answer.lower():
                    points_earned = question.points
                else:
                    points_earned = -question.negative_marking
            elif question.question_type == QuestionType.CODING:
                # For coding questions, use existing evaluation engine
                if answer.code:
                    # This would integrate with the code execution engine
                    # For now, mark as pending manual grading
                    points_earned = 0.0
            
            answer.points_earned = points_earned
            answer.max_points = question.points
            answer.is_correct = points_earned > 0
            answer.graded_at = datetime.now()
            total_score += points_earned
    
    attempt.total_score = max(0, total_score)  # Don't go below 0
    attempt.max_score = max_score
    attempt.percentage = (attempt.total_score / max_score * 100) if max_score > 0 else 0
    attempt.is_passed = attempt.percentage >= test.passing_score
    attempt.is_graded = True
    attempt.graded_at = datetime.now()
    
    db.commit()
    db.refresh(attempt)
    
    attempt_dict = {c.name: getattr(attempt, c.name) for c in attempt.__table__.columns}
    attempt_dict['answers'] = [
        {c.name: getattr(a, c.name) for c in a.__table__.columns}
        for a in attempt.answers
    ]
    return attempt_dict


# ==================== Student Progress ====================

@router.get("/labs/{lab_id}/progress", response_model=StudentLabProgressResponse)
async def get_student_lab_progress(
    lab_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get student's progress for a lab"""
    progress = db.query(StudentLabProgress).filter(
        StudentLabProgress.lab_id == lab_id,
        StudentLabProgress.user_id == current_user.id
    ).first()
    
    if not progress:
        # Create initial progress
        lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
        if not lab:
            raise HTTPException(status_code=404, detail="Lab not found")
        
        session_count = db.query(LabSessionEnhanced).filter(
            LabSessionEnhanced.lab_id == lab_id
        ).count()
        
        progress = StudentLabProgress(
            lab_id=lab_id,
            user_id=current_user.id,
            sessions_total=session_count
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    
    return progress


@router.get("/sessions/{session_id}/progress", response_model=StudentSessionProgressResponse)
async def get_student_session_progress(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get student's progress for a session"""
    progress = db.query(StudentSessionProgress).filter(
        StudentSessionProgress.session_id == session_id,
        StudentSessionProgress.user_id == current_user.id
    ).first()
    
    if not progress:
        session = db.query(LabSessionEnhanced).filter(LabSessionEnhanced.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        progress = StudentSessionProgress(
            session_id=session_id,
            user_id=current_user.id
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    
    return progress


# ==================== Leaderboard ====================

@router.get("/labs/{lab_id}/leaderboard", response_model=LabLeaderboardResponse)
async def get_lab_leaderboard(
    lab_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get leaderboard for a lab"""
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Get or create leaderboard
    leaderboard = db.query(LabLeaderboard).filter(LabLeaderboard.lab_id == lab_id).first()
    
    if not leaderboard:
        # Calculate rankings
        progress_list = db.query(StudentLabProgress).filter(
            StudentLabProgress.lab_id == lab_id
        ).order_by(desc(StudentLabProgress.overall_percentage)).all()
        
        rankings = []
        for idx, prog in enumerate(progress_list, 1):
            user = db.query(User).filter(User.id == prog.user_id).first()
            rankings.append({
                "user_id": prog.user_id,
                "user_name": user.full_name if user else "Unknown",
                "rank": idx,
                "score": prog.total_score,
                "completion_percentage": prog.completion_percentage,
                "exercises_completed": prog.exercises_completed,
                "tests_passed": prog.tests_passed
            })
        
        avg_score = sum(p.overall_percentage for p in progress_list) / len(progress_list) if progress_list else 0
        top_score = progress_list[0].overall_percentage if progress_list else 0
        
        leaderboard = LabLeaderboard(
            lab_id=lab_id,
            rankings=json.dumps(rankings),
            total_participants=len(progress_list),
            average_score=avg_score,
            top_score=top_score
        )
        db.add(leaderboard)
        db.commit()
        db.refresh(leaderboard)
    
    # Parse rankings
    rankings_data = json.loads(leaderboard.rankings) if isinstance(leaderboard.rankings, str) else leaderboard.rankings
    
    return {
        "lab_id": leaderboard.lab_id,
        "rankings": rankings_data,
        "total_participants": leaderboard.total_participants,
        "average_score": leaderboard.average_score,
        "top_score": leaderboard.top_score,
        "last_updated": leaderboard.last_updated
    }


# ==================== Student Assignment Management ====================

@router.post("/labs/{lab_id}/assign-students", status_code=status.HTTP_201_CREATED)
async def assign_students_to_lab(
    lab_id: int,
    student_ids: List[int] = Body(...),
    current_user: User = Depends(get_current_admin),  # Admin/HOD only
    db: Session = Depends(get_db)
):
    """Assign students to a lab (Admin/HOD only)"""
    from app.models.intelligent_lab import LabStudentAssignment
    
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Verify students exist and are students
    students = db.query(User).filter(User.id.in_(student_ids)).all()
    if len(students) != len(student_ids):
        raise HTTPException(status_code=404, detail="Some students not found")
    
    user_roles = [role.role for role in current_user.roles]
    assignments_created = []
    
    for student in students:
        # Check if student role
        student_role = db.query(UserRole).filter(
            UserRole.user_id == student.id,
            UserRole.role == RoleEnum.STUDENT
        ).first()
        if not student_role:
            continue  # Skip non-students
        
        # Check if already assigned
        existing = db.query(LabStudentAssignment).filter(
            LabStudentAssignment.lab_id == lab_id,
            LabStudentAssignment.student_id == student.id,
            LabStudentAssignment.is_active == True
        ).first()
        
        if existing:
            continue  # Skip already assigned
        
        # Create assignment
        assignment = LabStudentAssignment(
            lab_id=lab_id,
            student_id=student.id,
            assigned_by=current_user.id,
            is_active=True
        )
        db.add(assignment)
        assignments_created.append(student.id)
    
    db.commit()
    
    return {
        "message": f"Assigned {len(assignments_created)} students to lab",
        "lab_id": lab_id,
        "student_ids": assignments_created
    }


@router.get("/labs/{lab_id}/students", response_model=List[dict])
async def list_lab_students(
    lab_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List students assigned to a lab"""
    from app.models.intelligent_lab import LabStudentAssignment
    
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Check permissions
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.STUDENT in user_roles:
        # Students can only see if they're assigned
        assignment = db.query(LabStudentAssignment).filter(
            LabStudentAssignment.lab_id == lab_id,
            LabStudentAssignment.student_id == current_user.id,
            LabStudentAssignment.is_active == True
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Not assigned to this lab")
    
    assignments = db.query(LabStudentAssignment).filter(
        LabStudentAssignment.lab_id == lab_id,
        LabStudentAssignment.is_active == True
    ).all()
    
    result = []
    for assignment in assignments:
        student = assignment.student
        profile = student.profile if hasattr(student, 'profile') else None
        result.append({
            "id": assignment.id,
            "student_id": student.id,
            "student_name": profile.full_name if profile else student.email,
            "student_email": student.email,
            "assigned_at": assignment.assigned_at,
            "enrollment_date": assignment.enrollment_date,
            "completion_deadline": assignment.completion_deadline
        })
    
    return result


@router.delete("/labs/{lab_id}/students/{student_id}", status_code=status.HTTP_200_OK)
async def remove_student_from_lab(
    lab_id: int,
    student_id: int,
    current_user: User = Depends(get_current_admin),  # Admin/HOD only
    db: Session = Depends(get_db)
):
    """Remove student assignment from lab (Admin/HOD only)"""
    from app.models.intelligent_lab import LabStudentAssignment
    
    assignment = db.query(LabStudentAssignment).filter(
        LabStudentAssignment.lab_id == lab_id,
        LabStudentAssignment.student_id == student_id,
        LabStudentAssignment.is_active == True
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    assignment.is_active = False
    db.commit()
    
    return {"message": "Student removed from lab successfully"}


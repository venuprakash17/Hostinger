"""Coding Labs API Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.api.auth import (
    get_current_user, get_current_admin, get_current_super_admin,
    get_current_hod, get_current_faculty, get_current_hod_or_faculty
)
from app.models.user import User, RoleEnum
from app.models.coding_lab import (
    CodingLab, LabSession, LabProblem, TestCase, LabSubmission, ExecutionResult,
    SubmissionStatus, LabMode, LabDifficulty
)
from app.schemas.coding_lab import (
    LabCreate, LabUpdate, LabResponse, LabListResponse,
    SessionCreate, SessionUpdate, SessionResponse, SessionWithProblems,
    FacultyAssignmentCreate, FacultyAssignmentResponse,
    ProblemCreate, ProblemUpdate, ProblemResponse,
    TestCaseCreate, TestCaseUpdate, TestCaseResponse,
    SubmissionCreate, SubmissionResponse, SubmissionWithResults,
    CodeExecutionRequest, CodeExecutionResponse,
    LabAnalyticsResponse
)
from app.services.evaluation_engine import evaluation_engine
from app.services.code_executor import executor
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coding-labs", tags=["coding-labs"])


# ==================== Lab CRUD ====================

@router.get("/available-faculty", response_model=List[dict])
async def get_available_faculty(
    current_user: User = Depends(get_current_hod),
    db: Session = Depends(get_db)
):
    """Get faculty list from HOD's department (HOD ONLY)"""
    from app.models.academic import Department
    from app.models.profile import Profile
    from app.models.user import UserRole
    
    # Get HOD's department
    hod_department = db.query(Department).filter(Department.hod_id == current_user.id).first()
    if not hod_department:
        # Try to get from profile
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.department:
            hod_department = db.query(Department).filter(
                Department.name == profile.department
            ).first()
    
    # If no department found, return empty list instead of error
    if not hod_department:
        return []
    
    # Get all faculty in this department
    # Method 1: By department_id
    faculty_users = db.query(User).join(UserRole).join(Profile).filter(
        UserRole.role == RoleEnum.FACULTY,
        Profile.department_id == hod_department.id
    ).all()
    
    # Method 2: If no results, try by department name
    if not faculty_users:
        faculty_users = db.query(User).join(UserRole).join(Profile).filter(
            UserRole.role == RoleEnum.FACULTY,
            Profile.department == hod_department.name
        ).all()
    
    result = []
    for user in faculty_users:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        result.append({
            "id": user.id,
            "name": profile.full_name if profile and profile.full_name else user.email,
            "email": user.email,
            "department": hod_department.name
        })
    
    return result


@router.post("/", response_model=LabResponse, status_code=status.HTTP_201_CREATED)
async def create_lab(
    lab_data: LabCreate,
    current_user: User = Depends(get_current_hod),  # HOD ONLY
    db: Session = Depends(get_db)
):
    """Create a new coding lab (HOD ONLY - like creating Subjects in CodeTantra)"""
    # Verify user is HOD
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.HOD not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HODs can create labs"
        )
    
    # Get HOD's department
    from app.models.academic import Department
    from app.models.profile import Profile
    
    hod_department = db.query(Department).filter(Department.hod_id == current_user.id).first()
    if not hod_department:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.department:
            hod_department = db.query(Department).filter(
                Department.name == profile.department
            ).first()
    
    # Extract linkage fields
    lab_dict = lab_data.dict()
    # Remove mode, difficulty, topic - these are now session-level
    lab_dict.pop('mode', None)
    lab_dict.pop('difficulty', None)
    lab_dict.pop('topic', None)
    # Remove proctoring settings - these are now session-level
    lab_dict.pop('is_proctored', None)
    lab_dict.pop('enforce_fullscreen', None)
    lab_dict.pop('detect_tab_switch', None)
    lab_dict.pop('camera_proctoring', None)
    lab_dict.pop('time_limit_minutes', None)
    
    subject_id = lab_dict.pop('subject_id', None)
    department_id = lab_dict.pop('department_id', None) or (hod_department.id if hod_department else None)
    section_id = lab_dict.pop('section_id', None)
    semester_id = lab_dict.pop('semester_id', None)
    year = lab_dict.pop('year', None)
    
    lab = CodingLab(
        **lab_dict,
        subject_id=subject_id,
        department_id=department_id,
        section_id=section_id,
        semester_id=semester_id,
        year=year,
        created_by=current_user.id,  # HOD
        is_approved=True  # HOD-created labs are auto-approved
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)
    
    # Assign faculty: from faculty_ids if provided, or auto-assign from subject if subject_id provided
    faculty_ids = lab_dict.get('faculty_ids', [])
    
    # If no faculty_ids provided but subject_id is provided, auto-assign faculty from subject
    if not faculty_ids and subject_id:
        from app.models.academic import SubjectAssignment
        subject_assignments = db.query(SubjectAssignment).filter(
            SubjectAssignment.subject_id == subject_id,
            SubjectAssignment.is_active == True
        ).all()
        
        # Get unique faculty IDs from subject assignments
        faculty_ids = list(set([assignment.faculty_id for assignment in subject_assignments]))
    
    if faculty_ids:
        from app.models.coding_lab import LabFacultyAssignment
        for faculty_id in faculty_ids:
            # Verify faculty is in HOD's department
            if hod_department:
                faculty_profile = db.query(Profile).filter(
                    Profile.user_id == faculty_id,
                    Profile.department_id == hod_department.id
                ).first()
                if not faculty_profile:
                    continue  # Skip if not in department
            
            assignment = LabFacultyAssignment(
                lab_id=lab.id,
                faculty_id=faculty_id,
                assigned_by=current_user.id,
                is_active=True
            )
            db.add(assignment)
        db.commit()
    
    return lab


@router.get("/", response_model=List[LabListResponse])
async def list_labs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    is_published: Optional[bool] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List coding labs (filtered by user role)"""
    query = db.query(CodingLab)
    
    # Note: mode, difficulty, topic filters removed - these are now session-level
    
    # Filter by published status
    if is_published is not None:
        query = query.filter(CodingLab.is_published == is_published)
    
    # Students can only see published labs
    if current_user:
        user_roles = [role.role for role in current_user.roles]
        if RoleEnum.STUDENT in user_roles:
            query = query.filter(CodingLab.is_published == True)
            query = query.filter(CodingLab.is_active == True)
    
    # Order by created date
    query = query.order_by(desc(CodingLab.created_at))
    
    labs = query.offset(skip).limit(limit).all()
    
    # Add session, problem and submission counts
    result = []
    for lab in labs:
        session_count = len(lab.sessions) if hasattr(lab, 'sessions') else 0
        total_problems = sum(len(session.problems) for session in lab.sessions) if hasattr(lab, 'sessions') else len(lab.problems) if hasattr(lab, 'problems') else 0
        lab_dict = {
            **{c.name: getattr(lab, c.name) for c in lab.__table__.columns},
            "session_count": session_count,
            "problem_count": total_problems,
            "submission_count": len(lab.submissions) if hasattr(lab, 'submissions') else 0
        }
        result.append(lab_dict)
    
    return result


@router.get("/{lab_id}", response_model=LabResponse)
async def get_lab(
    lab_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get lab details"""
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Check access
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.STUDENT in user_roles:
        if not lab.is_published or not lab.is_active:
            raise HTTPException(status_code=403, detail="Lab not available")
    
    return lab


@router.put("/{lab_id}", response_model=LabResponse)
async def update_lab(
    lab_id: int,
    lab_data: LabUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update lab (Faculty/Admin only)"""
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Check ownership (unless super admin)
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.SUPER_ADMIN not in user_roles:
        if lab.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update fields
    update_data = lab_data.dict(exclude_unset=True)
    
    # Handle subject_id and faculty_ids separately
    subject_id = update_data.pop('subject_id', None)
    faculty_ids = update_data.pop('faculty_ids', None)
    
    # Update lab fields
    for field, value in update_data.items():
        if field not in ['subject_id', 'faculty_ids']:
            setattr(lab, field, value)
    
    # Update subject_id if provided
    if subject_id is not None:
        lab.subject_id = subject_id
    
    db.commit()
    db.refresh(lab)
    
    # Update faculty assignments if provided
    if faculty_ids is not None:
        from app.models.coding_lab import LabFacultyAssignment
        from app.models.profile import Profile
        from app.models.academic import Department
        
        # Get HOD's department for verification
        hod_department = db.query(Department).filter(Department.hod_id == lab.created_by).first()
        if not hod_department:
            profile = db.query(Profile).filter(Profile.user_id == lab.created_by).first()
            if profile and profile.department:
                hod_department = db.query(Department).filter(
                    Department.name == profile.department
                ).first()
        
        # Remove existing assignments
        db.query(LabFacultyAssignment).filter(
            LabFacultyAssignment.lab_id == lab_id
        ).delete()
        
        # Add new assignments
        if faculty_ids:
            for faculty_id in faculty_ids:
                # Verify faculty is in HOD's department
                if hod_department:
                    faculty_profile = db.query(Profile).filter(
                        Profile.user_id == faculty_id,
                        Profile.department_id == hod_department.id
                    ).first()
                    if not faculty_profile:
                        continue  # Skip if not in department
                
                assignment = LabFacultyAssignment(
                    lab_id=lab.id,
                    faculty_id=faculty_id,
                    assigned_by=lab.created_by,
                    is_active=True
                )
                db.add(assignment)
        
        db.commit()
    
    return lab


@router.delete("/{lab_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lab(
    lab_id: int,
    current_user: User = Depends(get_current_hod),  # HOD ONLY
    db: Session = Depends(get_db)
):
    """Delete lab (HOD ONLY)"""
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Only HOD who created or Super Admin can delete
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.SUPER_ADMIN not in user_roles:
        if lab.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Only the HOD who created this lab can delete it"
            )
    
    db.delete(lab)
    db.commit()
    return None


# ==================== Faculty Assignment Management (HOD Only) ====================

@router.post("/{lab_id}/assign-faculty", response_model=FacultyAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_faculty_to_lab(
    lab_id: int,
    assignment_data: FacultyAssignmentCreate,
    current_user: User = Depends(get_current_hod),
    db: Session = Depends(get_db)
):
    """Assign faculty to a lab (HOD ONLY)"""
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Verify HOD owns this lab
    if lab.created_by != current_user.id:
        user_roles = [role.role for role in current_user.roles]
        if RoleEnum.SUPER_ADMIN not in user_roles:
            raise HTTPException(status_code=403, detail="Only the HOD who created this lab can assign faculty")
    
    # Verify faculty exists and has faculty role
    faculty = db.query(User).filter(User.id == assignment_data.faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    faculty_roles = [role.role for role in faculty.roles]
    if RoleEnum.FACULTY not in faculty_roles:
        raise HTTPException(status_code=400, detail="User is not a faculty member")
    
    # Check if already assigned
    existing = db.query(LabFacultyAssignment).filter(
        LabFacultyAssignment.lab_id == lab_id,
        LabFacultyAssignment.faculty_id == assignment_data.faculty_id,
        LabFacultyAssignment.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Faculty is already assigned to this lab")
    
    assignment = LabFacultyAssignment(
        lab_id=lab_id,
        faculty_id=assignment_data.faculty_id,
        assigned_by=current_user.id,
        can_add_problems=assignment_data.can_add_problems,
        can_add_sessions=assignment_data.can_add_sessions,
        can_monitor=assignment_data.can_monitor,
        can_grade=assignment_data.can_grade
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    return FacultyAssignmentResponse(
        id=assignment.id,
        lab_id=lab_id,
        faculty_id=faculty.id,
        faculty_name=faculty.profile.full_name if faculty.profile else None,
        faculty_email=faculty.email,
        assigned_at=assignment.assigned_at,
        can_add_problems=assignment.can_add_problems,
        can_add_sessions=assignment.can_add_sessions,
        can_monitor=assignment.can_monitor,
        can_grade=assignment.can_grade
    )


@router.get("/{lab_id}/faculty", response_model=List[dict])
async def list_assigned_faculty(
    lab_id: int,
    current_user: User = Depends(get_current_hod_or_faculty),
    db: Session = Depends(get_db)
):
    """List faculty assigned to a lab"""
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    assignments = db.query(LabFacultyAssignment).filter(
        LabFacultyAssignment.lab_id == lab_id,
        LabFacultyAssignment.is_active == True
    ).all()
    
    result = []
    for assignment in assignments:
        faculty = assignment.faculty
        result.append({
            "id": assignment.id,
            "faculty_id": faculty.id,
            "faculty_name": faculty.profile.full_name if faculty.profile else faculty.email,
            "faculty_email": faculty.email,
            "assigned_at": assignment.assigned_at,
            "can_add_problems": assignment.can_add_problems,
            "can_add_sessions": assignment.can_add_sessions,
            "can_monitor": assignment.can_monitor,
            "can_grade": assignment.can_grade
        })
    
    return result


@router.get("/my-assigned", response_model=List[LabListResponse])
async def get_my_assigned_labs(
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Get labs assigned to current faculty (Faculty ONLY)"""
    assignments = db.query(LabFacultyAssignment).filter(
        LabFacultyAssignment.faculty_id == current_user.id,
        LabFacultyAssignment.is_active == True
    ).all()
    
    lab_ids = [a.lab_id for a in assignments]
    labs = db.query(CodingLab).filter(CodingLab.id.in_(lab_ids)).all()
    
    result = []
    for lab in labs:
        lab_dict = {
            **{c.name: getattr(lab, c.name) for c in lab.__table__.columns},
            "session_count": len(lab.sessions) if hasattr(lab, 'sessions') else 0,
            "problem_count": sum(len(s.problems) for s in lab.sessions) if hasattr(lab, 'sessions') else 0,
            "submission_count": len(lab.submissions) if hasattr(lab, 'submissions') else 0
        }
        result.append(lab_dict)
    
    return result


# ==================== Approval Workflow (HOD Only) ====================

@router.post("/problems/{problem_id}/approve", response_model=ProblemResponse)
async def approve_problem(
    problem_id: int,
    current_user: User = Depends(get_current_hod),
    db: Session = Depends(get_db)
):
    """Approve a problem created by faculty (HOD ONLY)"""
    problem = db.query(LabProblem).filter(LabProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    lab = problem.lab
    if lab.created_by != current_user.id:
        user_roles = [role.role for role in current_user.roles]
        if RoleEnum.SUPER_ADMIN not in user_roles:
            raise HTTPException(status_code=403, detail="Only the HOD who owns this lab can approve problems")
    
    problem.is_approved = True
    problem.approved_by = current_user.id
    problem.approved_at = datetime.now()
    problem.rejection_reason = None
    
    db.commit()
    db.refresh(problem)
    
    problem_dict = {c.name: getattr(problem, c.name) for c in problem.__table__.columns}
    problem_dict["test_case_count"] = len(problem.test_cases) if hasattr(problem, 'test_cases') else 0
    return ProblemResponse(**problem_dict)


class RejectionRequest(BaseModel):
    rejection_reason: str

@router.post("/problems/{problem_id}/reject", response_model=ProblemResponse)
async def reject_problem(
    problem_id: int,
    rejection_data: RejectionRequest = Body(...),
    current_user: User = Depends(get_current_hod),
    db: Session = Depends(get_db)
):
    """Reject a problem created by faculty (HOD ONLY)"""
    problem = db.query(LabProblem).filter(LabProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    lab = problem.lab
    if lab.created_by != current_user.id:
        user_roles = [role.role for role in current_user.roles]
        if RoleEnum.SUPER_ADMIN not in user_roles:
            raise HTTPException(status_code=403, detail="Only the HOD who owns this lab can reject problems")
    
    problem.is_approved = False
    problem.approved_by = None
    problem.approved_at = None
    problem.rejection_reason = rejection_data.rejection_reason
    
    db.commit()
    db.refresh(problem)
    
    problem_dict = {c.name: getattr(problem, c.name) for c in problem.__table__.columns}
    problem_dict["test_case_count"] = len(problem.test_cases) if hasattr(problem, 'test_cases') else 0
    return ProblemResponse(**problem_dict)


@router.get("/{lab_id}/pending-approvals", response_model=List[ProblemResponse])
async def get_pending_approvals(
    lab_id: int,
    current_user: User = Depends(get_current_hod),
    db: Session = Depends(get_db)
):
    """Get pending problems awaiting approval (HOD ONLY)"""
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    if lab.created_by != current_user.id:
        user_roles = [role.role for role in current_user.roles]
        if RoleEnum.SUPER_ADMIN not in user_roles:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    problems = db.query(LabProblem).filter(
        LabProblem.lab_id == lab_id,
        LabProblem.is_approved == False
    ).all()
    
    result = []
    for problem in problems:
        problem_dict = {c.name: getattr(problem, c.name) for c in problem.__table__.columns}
        problem_dict["test_case_count"] = len(problem.test_cases) if hasattr(problem, 'test_cases') else 0
        result.append(ProblemResponse(**problem_dict))
    
    return result


# ==================== Problem CRUD ====================

@router.post("/{lab_id}/sessions/{session_id}/problems", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    lab_id: int,
    session_id: int,
    problem_data: ProblemCreate,
    current_user: User = Depends(get_current_hod_or_faculty),
    db: Session = Depends(get_db)
):
    """Create a problem in a session (Faculty assigned to lab, or HOD)"""
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    session = db.query(LabSession).filter(
        LabSession.id == session_id,
        LabSession.lab_id == lab_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    user_roles = [role.role for role in current_user.roles]
    
    # HOD can always add problems to their labs
    if RoleEnum.HOD in user_roles:
        if lab.created_by != current_user.id:
            if RoleEnum.SUPER_ADMIN not in user_roles:
                raise HTTPException(status_code=403, detail="Not authorized")
    # Faculty must be assigned to the lab
    elif RoleEnum.FACULTY in user_roles:
        assignment = db.query(LabFacultyAssignment).filter(
            LabFacultyAssignment.lab_id == lab_id,
            LabFacultyAssignment.faculty_id == current_user.id,
            LabFacultyAssignment.is_active == True,
            LabFacultyAssignment.can_add_problems == True
        ).first()
        if not assignment:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this lab or don't have permission to add problems"
            )
    else:
        raise HTTPException(status_code=403, detail="Only HODs or assigned Faculty can add problems")
    
    # Create problem (requires HOD approval unless created by HOD)
    is_approved = RoleEnum.HOD in user_roles
    problem = LabProblem(
        **problem_data.dict(),
        lab_id=lab_id,
        session_id=session_id,
        created_by=current_user.id if RoleEnum.FACULTY in user_roles else None,
        is_approved=is_approved,
        approved_by=current_user.id if is_approved else None,
        approved_at=datetime.now() if is_approved else None
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)
    
    # Add test case count
    problem_dict = {c.name: getattr(problem, c.name) for c in problem.__table__.columns}
    problem_dict["test_case_count"] = len(problem.test_cases) if hasattr(problem, 'test_cases') else 0
    
    return ProblemResponse(**problem_dict)


@router.get("/{lab_id}/problems", response_model=List[ProblemResponse])
async def list_problems(
    lab_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List problems in a lab"""
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    problems = db.query(LabProblem).filter(
        LabProblem.lab_id == lab_id
    ).order_by(LabProblem.order_index).all()
    
    result = []
    for problem in problems:
        problem_dict = {c.name: getattr(problem, c.name) for c in problem.__table__.columns}
        problem_dict["test_case_count"] = len(problem.test_cases)
        result.append(problem_dict)
    
    return result


@router.get("/problems/{problem_id}", response_model=ProblemResponse)
async def get_problem(
    problem_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get problem details"""
    problem = db.query(LabProblem).filter(LabProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    problem_dict = {c.name: getattr(problem, c.name) for c in problem.__table__.columns}
    problem_dict["test_case_count"] = len(problem.test_cases)
    
    return problem_dict


@router.put("/problems/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    problem_id: int,
    problem_data: ProblemUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update problem"""
    problem = db.query(LabProblem).filter(LabProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check ownership
    lab = problem.lab
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.SUPER_ADMIN not in user_roles:
        if lab.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update fields
    update_data = problem_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(problem, field, value)
    
    db.commit()
    db.refresh(problem)
    
    problem_dict = {c.name: getattr(problem, c.name) for c in problem.__table__.columns}
    problem_dict["test_case_count"] = len(problem.test_cases)
    
    return problem_dict


@router.delete("/problems/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete problem"""
    problem = db.query(LabProblem).filter(LabProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check ownership
    lab = problem.lab
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.SUPER_ADMIN not in user_roles:
        if lab.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(problem)
    db.commit()
    return None


# ==================== Test Case CRUD ====================

@router.post("/problems/{problem_id}/test-cases", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_test_case(
    problem_id: int,
    test_case_data: TestCaseCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a test case for a problem"""
    problem = db.query(LabProblem).filter(LabProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check ownership
    lab = problem.lab
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.SUPER_ADMIN not in user_roles:
        if lab.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    test_case = TestCase(
        **test_case_data.dict(),
        problem_id=problem_id
    )
    db.add(test_case)
    db.commit()
    db.refresh(test_case)
    return test_case


@router.get("/problems/{problem_id}/test-cases", response_model=List[TestCaseResponse])
async def list_test_cases(
    problem_id: int,
    include_hidden: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List test cases for a problem"""
    problem = db.query(LabProblem).filter(LabProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    query = db.query(TestCase).filter(TestCase.problem_id == problem_id)
    
    # Students can only see public test cases
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.STUDENT in user_roles and not include_hidden:
        query = query.filter(TestCase.type == "public")
    
    test_cases = query.order_by(TestCase.order_index).all()
    return test_cases


@router.put("/test-cases/{test_case_id}", response_model=TestCaseResponse)
async def update_test_case(
    test_case_id: int,
    test_case_data: TestCaseUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update test case"""
    test_case = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    # Check ownership
    problem = test_case.problem
    lab = problem.lab
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.SUPER_ADMIN not in user_roles:
        if lab.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update fields
    update_data = test_case_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(test_case, field, value)
    
    db.commit()
    db.refresh(test_case)
    return test_case


@router.delete("/test-cases/{test_case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_case(
    test_case_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete test case"""
    test_case = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    # Check ownership
    problem = test_case.problem
    lab = problem.lab
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.SUPER_ADMIN not in user_roles:
        if lab.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(test_case)
    db.commit()
    return None


# ==================== Submissions ====================

@router.post("/submissions", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    submission_data: SubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit code for evaluation"""
    # Verify lab and problem exist
    lab = db.query(CodingLab).filter(CodingLab.id == submission_data.lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    problem = db.query(LabProblem).filter(LabProblem.id == submission_data.problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check if lab is accessible
    if not lab.is_published or not lab.is_active:
        raise HTTPException(status_code=403, detail="Lab not available")
    
    # Check attempt limits
    if not lab.allow_multiple_attempts:
        existing = db.query(LabSubmission).filter(
            and_(
                LabSubmission.lab_id == submission_data.lab_id,
                LabSubmission.problem_id == submission_data.problem_id,
                LabSubmission.user_id == current_user.id,
                LabSubmission.is_final_submission == True
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Maximum attempts reached")
    
    # Get attempt number
    previous_attempts = db.query(LabSubmission).filter(
        and_(
            LabSubmission.lab_id == submission_data.lab_id,
            LabSubmission.problem_id == submission_data.problem_id,
            LabSubmission.user_id == current_user.id
        )
    ).count()
    
    attempt_number = previous_attempts + 1
    
    # Check max attempts
    if lab.max_attempts and attempt_number > lab.max_attempts:
        raise HTTPException(status_code=400, detail=f"Maximum {lab.max_attempts} attempts allowed")
    
    # Create submission
    submission = LabSubmission(
        **submission_data.dict(),
        user_id=current_user.id,
        attempt_number=attempt_number,
        status=SubmissionStatus.PENDING
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    # Get test cases
    test_cases = db.query(TestCase).filter(
        TestCase.problem_id == submission_data.problem_id
    ).all()
    
    if not test_cases:
        submission.status = SubmissionStatus.INTERNAL_ERROR
        submission.error_message = "No test cases found"
        db.commit()
        return submission
    
    # Evaluate submission
    try:
        submission, execution_results = evaluation_engine.evaluate_submission(
            db, submission, test_cases
        )
    except Exception as e:
        logger.error(f"Evaluation error: {e}", exc_info=True)
        submission.status = SubmissionStatus.INTERNAL_ERROR
        submission.error_message = str(e)
        db.commit()
    
    return submission


@router.get("/submissions", response_model=List[SubmissionResponse])
async def list_submissions(
    lab_id: Optional[int] = None,
    problem_id: Optional[int] = None,
    user_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List submissions"""
    query = db.query(LabSubmission)
    
    # Filter by lab
    if lab_id:
        query = query.filter(LabSubmission.lab_id == lab_id)
    
    # Filter by problem
    if problem_id:
        query = query.filter(LabSubmission.problem_id == problem_id)
    
    # Filter by user (students can only see their own)
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.STUDENT in user_roles:
        query = query.filter(LabSubmission.user_id == current_user.id)
    elif user_id:
        query = query.filter(LabSubmission.user_id == user_id)
    
    submissions = query.order_by(desc(LabSubmission.submitted_at)).offset(skip).limit(limit).all()
    return submissions


@router.get("/submissions/{submission_id}", response_model=SubmissionWithResults)
async def get_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get submission details with execution results"""
    submission = db.query(LabSubmission).filter(LabSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check access
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.STUDENT in user_roles:
        if submission.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get execution results
    execution_results = db.query(ExecutionResult).filter(
        ExecutionResult.submission_id == submission_id
    ).all()
    
    submission_dict = {c.name: getattr(submission, c.name) for c in submission.__table__.columns}
    results_dict = [
        {c.name: getattr(r, c.name) for c in r.__table__.columns}
        for r in execution_results
    ]
    submission_dict["execution_results"] = results_dict
    
    return submission_dict


# ==================== Code Execution (IDE Run) ====================

@router.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(
    request: CodeExecutionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute code without evaluation (for IDE run button)"""
    result = executor.execute_code(
        code=request.code,
        language=request.language,
        input_data=request.input_data,
        time_limit_seconds=request.time_limit_seconds,
        memory_limit_mb=request.memory_limit_mb
    )
    return result


@router.post("/problems/{problem_id}/run-sample")
async def run_sample_test(
    problem_id: int,
    code: str,
    language: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run code against sample test cases"""
    problem = db.query(LabProblem).filter(LabProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Get sample test cases
    sample_cases = db.query(TestCase).filter(
        and_(
            TestCase.problem_id == problem_id,
            TestCase.is_sample == True
        )
    ).all()
    
    if not sample_cases:
        raise HTTPException(status_code=404, detail="No sample test cases found")
    
    results = []
    for test_case in sample_cases:
        result = evaluation_engine.run_sample_test(
            code=code,
            language=language,
            input_data=test_case.input_data,
            expected_output=test_case.expected_output,
            time_limit_seconds=problem.time_limit_seconds,
            memory_limit_mb=problem.memory_limit_mb
        )
        results.append({
            "test_case_name": test_case.name,
            **result
        })
    
    return {"results": results}


"""Mock Interview API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.core.database import get_db
from app.models.mock_interview import MockInterview, MockInterviewStudent, InterviewStatus, InterviewType
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.schemas.mock_interview import (
    MockInterviewCreate, MockInterviewUpdate, MockInterviewFeedback, MockInterviewResponse
)
from app.api.auth import get_current_user, get_current_admin_or_faculty
from app.services.email_service import send_interview_invitations
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mock-interviews", tags=["mock-interviews"])


@router.get("/faculty", response_model=List[dict])
async def get_available_faculty(
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Get faculty list from the same college (Admin/Faculty only)"""
    # Get user's college
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    college_id = None
    if RoleEnum.ADMIN in role_names:
        admin_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role == RoleEnum.ADMIN
        ).first()
        college_id = admin_role.college_id if admin_role else None
    elif RoleEnum.FACULTY in role_names or RoleEnum.HOD in role_names:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        college_id = profile.college_id if profile else None
    
    if not college_id:
        return []
    
    # Get all faculty in this college
    faculty_user_ids_list = [
        uid[0] for uid in db.query(UserRole.user_id).filter(
            UserRole.role == RoleEnum.FACULTY,
            UserRole.college_id == college_id
        ).all()
    ]
    
    # Also include HODs from the same college
    hod_user_ids_list = [
        uid[0] for uid in db.query(UserRole.user_id).filter(
            UserRole.role == RoleEnum.HOD,
            UserRole.college_id == college_id
        ).all()
    ]
    
    all_faculty_ids = list(set(faculty_user_ids_list + hod_user_ids_list))
    
    if not all_faculty_ids:
        return []
    
    faculty_users = db.query(User).filter(User.id.in_(all_faculty_ids)).all()
    
    result = []
    for user in faculty_users:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        result.append({
            "id": user.id,
            "name": profile.full_name if profile and profile.full_name else user.email,
            "email": user.email,
            "department": profile.department if profile else None
        })
    
    return result


@router.post("/", response_model=MockInterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_mock_interview(
    interview_data: MockInterviewCreate,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Schedule a mock interview (Admin/Faculty only)"""
    # Get user's college
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    college_id = None
    if RoleEnum.ADMIN in role_names:
        admin_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role == RoleEnum.ADMIN
        ).first()
        college_id = admin_role.college_id if admin_role else None
    elif RoleEnum.FACULTY in role_names:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        college_id = profile.college_id if profile else None
    
    # Verify interviewer if provided
    if interview_data.interviewer_id:
        interviewer_role = db.query(UserRole).filter(
            UserRole.user_id == interview_data.interviewer_id,
            UserRole.role.in_([RoleEnum.FACULTY, RoleEnum.HOD])
        ).first()
        if not interviewer_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Interviewer must be a faculty member or HOD"
            )
        if college_id and interviewer_role.college_id != college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Interviewer must be from the same college"
            )
    
    # Determine student IDs to assign
    student_ids = []
    if interview_data.student_ids:
        student_ids = interview_data.student_ids
    elif interview_data.student_id:
        student_ids = [interview_data.student_id]
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one student must be specified (use student_id or student_ids)"
        )
    
    if not student_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one student must be specified"
        )
    
    # Verify all students exist and are in same college
    for sid in student_ids:
        student_profile = db.query(Profile).filter(Profile.user_id == sid).first()
        if not student_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with ID {sid} not found"
            )
        
        # Verify student is actually a student
        student_role = db.query(UserRole).filter(
            UserRole.user_id == sid,
            UserRole.role == RoleEnum.STUDENT
        ).first()
        if not student_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {sid} is not a student"
            )
        
        if college_id and student_profile.college_id != college_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Student {sid} must be from the same college"
            )
    
    # Create interview (use first student_id for backward compatibility)
    interview_dict = interview_data.model_dump(exclude={'student_ids'})
    interview_dict['student_id'] = student_ids[0] if student_ids else None  # Set first student for backward compatibility
    
    new_interview = MockInterview(
        **interview_dict,
        college_id=college_id,
        created_by=current_user.id,
        status=InterviewStatus.SCHEDULED
    )
    
    db.add(new_interview)
    db.flush()  # Get the interview ID
    
    # Create student assignments in junction table
    for sid in student_ids:
        interview_student = MockInterviewStudent(
            interview_id=new_interview.id,
            student_id=sid
        )
        db.add(interview_student)
    
    db.commit()
    db.refresh(new_interview)
    
    # Load students for response
    interview_students = db.query(MockInterviewStudent).filter(
        MockInterviewStudent.interview_id == new_interview.id
    ).all()
    
    students_info = []
    student_emails = []
    student_names = []
    for ist in interview_students:
        student_user = db.query(User).filter(User.id == ist.student_id).first()
        student_profile = db.query(Profile).filter(Profile.user_id == ist.student_id).first()
        if student_user:
            students_info.append({
                'id': student_user.id,
                'email': student_user.email,
                'full_name': student_profile.full_name if student_profile else None
            })
            student_emails.append(student_user.email)
            student_names.append(student_profile.full_name if student_profile and student_profile.full_name else student_user.email.split('@')[0])
    
    # Get interviewer email if interviewer_id is set
    interviewer_email = None
    interviewer_name = interview_data.interviewer_name
    if interview_data.interviewer_id:
        interviewer_user = db.query(User).filter(User.id == interview_data.interviewer_id).first()
        if interviewer_user:
            interviewer_email = interviewer_user.email
            interviewer_profile = db.query(Profile).filter(Profile.user_id == interview_data.interviewer_id).first()
            if interviewer_profile and interviewer_profile.full_name:
                interviewer_name = interviewer_profile.full_name
    
    # Send email invitations
    try:
        email_results = send_interview_invitations(
            student_emails=student_emails,
            student_names=student_names,
            interviewer_email=interviewer_email,
            interviewer_name=interviewer_name,
            interview_title=interview_data.title,
            interview_type=interview_data.interview_type.value,
            scheduled_datetime=interview_data.scheduled_at.isoformat(),
            duration_minutes=interview_data.duration_minutes,
            meeting_link=interview_data.meeting_link,
            venue=interview_data.venue,
            description=interview_data.description
        )
        logger.info(f"Email sending results: {email_results}")
    except Exception as e:
        logger.error(f"Failed to send interview invitation emails: {str(e)}")
        # Don't fail the interview creation if email fails
    
    # Create response with students
    response_dict = {
        **new_interview.__dict__,
        'students': students_info,
        'student_ids': student_ids
    }
    
    from app.schemas.mock_interview import MockInterviewResponse
    return MockInterviewResponse(**response_dict)


@router.get("/my", response_model=List[MockInterviewResponse])
async def get_my_interviews(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's interviews (as student or interviewer)"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    # Get interviews where user is a student (via junction table) or interviewer
    interview_ids_as_student = [
        ist.interview_id for ist in db.query(MockInterviewStudent.interview_id).filter(
            MockInterviewStudent.student_id == current_user.id
        ).all()
    ]
    
    query = db.query(MockInterview).filter(
        or_(
            MockInterview.id.in_(interview_ids_as_student) if interview_ids_as_student else False,
            MockInterview.student_id == current_user.id,  # Backward compatibility
            MockInterview.interviewer_id == current_user.id
        )
    )
    
    if status_filter:
        try:
            status_enum = InterviewStatus(status_filter)
            query = query.filter(MockInterview.status == status_enum)
        except ValueError:
            pass
    
    interviews = query.order_by(MockInterview.scheduled_at.desc()).all()
    
    # Load students for each interview
    result = []
    for interview in interviews:
        interview_students = db.query(MockInterviewStudent).filter(
            MockInterviewStudent.interview_id == interview.id
        ).all()
        
        students_info = []
        student_ids = []
        for ist in interview_students:
            student_user = db.query(User).filter(User.id == ist.student_id).first()
            student_profile = db.query(Profile).filter(Profile.user_id == ist.student_id).first()
            if student_user:
                student_ids.append(student_user.id)
                students_info.append({
                    'id': student_user.id,
                    'email': student_user.email,
                    'full_name': student_profile.full_name if student_profile else None
                })
        
        interview_dict = {
            **interview.__dict__,
            'students': students_info,
            'student_ids': student_ids
        }
        result.append(interview_dict)
    
    from app.schemas.mock_interview import MockInterviewResponse
    return [MockInterviewResponse(**r) for r in result]


@router.get("/scheduled", response_model=List[MockInterviewResponse])
async def get_scheduled_interviews(
    student_id: Optional[int] = None,
    interviewer_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Get scheduled interviews (Admin/Faculty only)"""
    query = db.query(MockInterview)
    
    # Get user's college for filtering
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.ADMIN in role_names:
        admin_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role == RoleEnum.ADMIN
        ).first()
        if admin_role and admin_role.college_id:
            query = query.filter(MockInterview.college_id == admin_role.college_id)
    elif RoleEnum.FACULTY in role_names:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.college_id:
            query = query.filter(MockInterview.college_id == profile.college_id)
    
    if student_id:
        query = query.filter(MockInterview.student_id == student_id)
    
    if interviewer_id:
        query = query.filter(MockInterview.interviewer_id == interviewer_id)
    
    if date_from:
        try:
            date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.filter(MockInterview.scheduled_at >= date_from_obj)
        except:
            pass
    
    if date_to:
        try:
            date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query = query.filter(MockInterview.scheduled_at <= date_to_obj)
        except:
            pass
    
    interviews = query.order_by(MockInterview.scheduled_at.asc()).all()
    
    # Load students for each interview
    result = []
    for interview in interviews:
        interview_students = db.query(MockInterviewStudent).filter(
            MockInterviewStudent.interview_id == interview.id
        ).all()
        
        students_info = []
        student_ids = []
        for ist in interview_students:
            student_user = db.query(User).filter(User.id == ist.student_id).first()
            student_profile = db.query(Profile).filter(Profile.user_id == ist.student_id).first()
            if student_user:
                student_ids.append(student_user.id)
                students_info.append({
                    'id': student_user.id,
                    'email': student_user.email,
                    'full_name': student_profile.full_name if student_profile else None
                })
        
        # Create response dict
        interview_dict = {
            **interview.__dict__,
            'students': students_info,
            'student_ids': student_ids
        }
        result.append(interview_dict)
    
    from app.schemas.mock_interview import MockInterviewResponse
    return [MockInterviewResponse(**r) for r in result]


@router.get("/{interview_id}", response_model=MockInterviewResponse)
async def get_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific interview"""
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Verify user has access
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    
    # Check if user is a student in this interview
    is_student = db.query(MockInterviewStudent).filter(
        MockInterviewStudent.interview_id == interview.id,
        MockInterviewStudent.student_id == current_user.id
    ).first() is not None
    
    if (not is_student and 
        interview.student_id != current_user.id and  # Backward compatibility
        interview.interviewer_id != current_user.id and 
        not is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this interview"
        )
    
    # Load students for response
    interview_students = db.query(MockInterviewStudent).filter(
        MockInterviewStudent.interview_id == interview.id
    ).all()
    
    students_info = []
    student_ids = []
    for ist in interview_students:
        student_user = db.query(User).filter(User.id == ist.student_id).first()
        student_profile = db.query(Profile).filter(Profile.user_id == ist.student_id).first()
        if student_user:
            student_ids.append(student_user.id)
            students_info.append({
                'id': student_user.id,
                'email': student_user.email,
                'full_name': student_profile.full_name if student_profile else None
            })
    
    interview_dict = {
        **interview.__dict__,
        'students': students_info,
        'student_ids': student_ids
    }
    
    from app.schemas.mock_interview import MockInterviewResponse
    return MockInterviewResponse(**interview_dict)


@router.put("/{interview_id}", response_model=MockInterviewResponse)
async def update_interview(
    interview_id: int,
    update_data: MockInterviewUpdate,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Update an interview (Admin/Faculty only)"""
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Verify permissions
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    
    if not is_admin and interview.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update interviews you created"
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(interview, field, value)
    
    db.commit()
    db.refresh(interview)
    
    return interview


@router.put("/{interview_id}/feedback", response_model=MockInterviewResponse)
async def add_feedback(
    interview_id: int,
    feedback_data: MockInterviewFeedback,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Add feedback to an interview (Admin/Faculty/Interviewer only)"""
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Verify user is interviewer or admin
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    
    if not is_admin and interview.interviewer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the interviewer can add feedback"
        )
    
    # Update feedback
    feedback_dict = feedback_data.model_dump(exclude_unset=True)
    for field, value in feedback_dict.items():
        setattr(interview, field, value)
    
    # Update status and timestamps
    if interview.status == InterviewStatus.IN_PROGRESS:
        interview.status = InterviewStatus.COMPLETED
        interview.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(interview)
    
    return interview


@router.put("/{interview_id}/start", response_model=MockInterviewResponse)
async def start_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start an interview"""
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Verify user is participant (check junction table for group discussions)
    is_student = db.query(MockInterviewStudent).filter(
        MockInterviewStudent.interview_id == interview.id,
        MockInterviewStudent.student_id == current_user.id
    ).first() is not None
    
    if (not is_student and 
        interview.student_id != current_user.id and  # Backward compatibility
        interview.interviewer_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this interview"
        )
    
    if interview.status != InterviewStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview can only be started if it's scheduled"
        )
    
    interview.status = InterviewStatus.IN_PROGRESS
    interview.started_at = datetime.utcnow()
    
    db.commit()
    db.refresh(interview)
    
    return interview


@router.put("/{interview_id}/cancel", response_model=MockInterviewResponse)
async def cancel_interview(
    interview_id: int,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Cancel an interview (Admin/Faculty only)"""
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    interview.status = InterviewStatus.CANCELLED
    
    db.commit()
    db.refresh(interview)
    
    return interview


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interview(
    interview_id: int,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Delete an interview (Admin/Faculty only)"""
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found"
        )
    
    # Verify permissions
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    
    if not is_admin and interview.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete interviews you created"
        )
    
    db.delete(interview)
    db.commit()
    
    return None

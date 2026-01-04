"""
Question Bank API endpoints
Allows College Admins to create and manage reusable questions
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.question_bank import QuestionBank
from app.models.profile import Profile
from app.schemas.question_bank import (
    QuestionBankCreate,
    QuestionBankUpdate,
    QuestionBankResponse,
    QuestionBankBulkCreate,
    QuestionBankFilter
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/question-banks", tags=["question-banks"])


def get_content_creator(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user with role information for content creation"""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    user_roles = [role.role.value for role in current_user.roles]
    
    is_super_admin = "super_admin" in user_roles
    is_admin = "admin" in user_roles
    is_hod = "hod" in user_roles
    is_faculty = "faculty" in user_roles
    
    return current_user, {
        "is_super_admin": is_super_admin,
        "is_admin": is_admin,
        "is_hod": is_hod,
        "is_faculty": is_faculty,
        "college_id": profile.college_id if profile else None,
        "department_id": profile.department_id if profile else None,
        "profile": profile
    }


@router.post("", response_model=QuestionBankResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    question_data: QuestionBankCreate,
    current_user_tuple = Depends(get_content_creator),
    db: Session = Depends(get_db)
):
    """Create a question in the question bank
    
    - College Admin: Can create questions for their college
    - HOD: Can create questions for their department
    - Faculty: Can create questions for their department
    """
    current_user, user_info = current_user_tuple
    
    # Validate question based on type
    if question_data.question_type == "MCQ":
        if not question_data.options or len(question_data.options) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MCQ questions must have at least 4 options"
            )
        if question_data.correct_answer not in ["A", "B", "C", "D"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MCQ correct_answer must be A, B, C, or D"
            )
        # Ensure options array matches correct_answer
        option_index = ord(question_data.correct_answer) - ord("A")
        if option_index >= len(question_data.options):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Correct answer '{question_data.correct_answer}' does not match available options"
            )
    elif question_data.question_type == "TRUE_FALSE":
        if question_data.correct_answer not in ["True", "False"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="True/False correct_answer must be 'True' or 'False'"
            )
        # Set default options for True/False
        if not question_data.options:
            question_data.options = ["True", "False"]
    
    # Set ownership based on role
    if user_info["is_super_admin"]:
        # Super admin can create global questions
        college_id = question_data.college_id
        department_id = question_data.department_id
    elif user_info["is_admin"]:
        # College admin creates for their college
        college_id = user_info["college_id"]
        department_id = question_data.department_id  # Can specify department or leave None for college-wide
    elif user_info["is_hod"] or user_info["is_faculty"]:
        # HOD/Faculty creates for their department
        college_id = user_info["college_id"]
        department_id = user_info["department_id"]
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, HODs, and faculty can create questions"
        )
    
    question = QuestionBank(
        question_text=question_data.question_text,
        question_type=question_data.question_type,
        options=question_data.options,
        correct_answer=question_data.correct_answer,
        marks=question_data.marks,
        difficulty=question_data.difficulty,
        topic=question_data.topic,
        subject=question_data.subject,
        negative_marking=question_data.negative_marking,
        created_by=current_user.id,
        college_id=college_id,
        department_id=department_id,
        is_active=question_data.is_active
    )
    
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.post("/bulk", response_model=List[QuestionBankResponse], status_code=status.HTTP_201_CREATED)
async def create_questions_bulk(
    bulk_data: QuestionBankBulkCreate,
    current_user_tuple = Depends(get_content_creator),
    db: Session = Depends(get_db)
):
    """Bulk create questions in the question bank"""
    current_user, user_info = current_user_tuple
    
    # Set ownership based on role
    if user_info["is_admin"]:
        college_id = user_info["college_id"]
    elif user_info["is_hod"] or user_info["is_faculty"]:
        college_id = user_info["college_id"]
        department_id = user_info["department_id"]
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, HODs, and faculty can create questions"
        )
    
    created_questions = []
    errors = []
    
    for idx, question_data in enumerate(bulk_data.questions):
        try:
            # Validate question
            if question_data.question_type == "MCQ":
                if not question_data.options or len(question_data.options) < 4:
                    errors.append(f"Question {idx + 1}: MCQ must have at least 4 options")
                    continue
                if question_data.correct_answer not in ["A", "B", "C", "D"]:
                    errors.append(f"Question {idx + 1}: Correct answer must be A, B, C, or D")
                    continue
            elif question_data.question_type == "TRUE_FALSE":
                if question_data.correct_answer not in ["True", "False"]:
                    errors.append(f"Question {idx + 1}: Correct answer must be 'True' or 'False'")
                    continue
                if not question_data.options:
                    question_data.options = ["True", "False"]
            
            # Set ownership
            if user_info["is_admin"]:
                q_college_id = question_data.college_id or college_id
                q_department_id = question_data.department_id
            else:
                q_college_id = college_id
                q_department_id = department_id
            
            question = QuestionBank(
                question_text=question_data.question_text,
                question_type=question_data.question_type,
                options=question_data.options,
                correct_answer=question_data.correct_answer,
                marks=question_data.marks,
                difficulty=question_data.difficulty,
                topic=question_data.topic,
                subject=question_data.subject,
                negative_marking=question_data.negative_marking,
                created_by=current_user.id,
                college_id=q_college_id,
                department_id=q_department_id,
                is_active=question_data.is_active
            )
            
            db.add(question)
            created_questions.append(question)
        except Exception as e:
            errors.append(f"Question {idx + 1}: {str(e)}")
    
    db.commit()
    
    # Refresh all created questions
    for question in created_questions:
        db.refresh(question)
    
    if errors:
        logger.warning(f"Bulk create completed with {len(errors)} errors: {errors}")
    
    return created_questions


@router.get("", response_model=List[QuestionBankResponse])
async def list_questions(
    question_type: Optional[str] = Query(None, pattern="^(MCQ|TRUE_FALSE)$"),
    difficulty: Optional[str] = Query(None, pattern="^(easy|medium|hard)$"),
    topic: Optional[str] = None,
    subject: Optional[str] = None,
    college_id: Optional[int] = None,
    department_id: Optional[int] = None,
    is_active: Optional[bool] = True,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List questions from question bank with filters"""
    query = db.query(QuestionBank)
    
    # Apply filters
    if question_type:
        query = query.filter(QuestionBank.question_type == question_type)
    if difficulty:
        query = query.filter(QuestionBank.difficulty == difficulty)
    if topic:
        query = query.filter(QuestionBank.topic.ilike(f"%{topic}%"))
    if subject:
        query = query.filter(QuestionBank.subject.ilike(f"%{subject}%"))
    if college_id:
        query = query.filter(QuestionBank.college_id == college_id)
    if department_id:
        query = query.filter(QuestionBank.department_id == department_id)
    if is_active is not None:
        query = query.filter(QuestionBank.is_active == is_active)
    
    # Role-based filtering
    if current_user:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        user_roles = [role.role.value for role in current_user.roles]
        
        if "super_admin" not in user_roles:
            # Non-super admins see only their college's questions
            if profile and profile.college_id:
                query = query.filter(QuestionBank.college_id == profile.college_id)
    
    questions = query.order_by(QuestionBank.created_at.desc()).all()
    return questions


@router.get("/{question_id}", response_model=QuestionBankResponse)
async def get_question(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific question from the question bank"""
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.put("/{question_id}", response_model=QuestionBankResponse)
async def update_question(
    question_id: int,
    question_data: QuestionBankUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a question in the question bank"""
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check permissions
    user_roles = [role.role.value for role in current_user.roles]
    if "super_admin" not in user_roles:
        if question.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update questions you created"
            )
    
    # Update fields
    update_data = question_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(question, field, value)
    
    db.commit()
    db.refresh(question)
    return question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a question from the question bank"""
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check permissions
    user_roles = [role.role.value for role in current_user.roles]
    if "super_admin" not in user_roles:
        if question.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete questions you created"
            )
    
    db.delete(question)
    db.commit()
    return None

"""
Quiz Analytics API endpoints
Provides analytics and reporting for quizzes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.quiz import Quiz, QuizAttempt
from app.models.profile import Profile
from app.models.academic import Department, Section
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quiz-analytics", tags=["quiz-analytics"])


def get_content_creator(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user with role information"""
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


@router.get("/quiz/{quiz_id}")
async def get_quiz_analytics(
    quiz_id: int,
    current_user_tuple = Depends(get_content_creator),
    db: Session = Depends(get_db)
):
    """Get analytics for a specific quiz"""
    current_user, user_info = current_user_tuple
    
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Check permissions
    if not user_info["is_super_admin"]:
        if quiz.created_by != current_user.id:
            # Check if user is admin of the same college
            if not user_info["is_admin"] or quiz.college_id != user_info["college_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view analytics for quizzes you created or quizzes in your college"
                )
    
    # Get all attempts for this quiz
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.is_submitted == True
    ).all()
    
    total_attempts = len(attempts)
    
    if total_attempts == 0:
        return {
            "quiz_id": quiz_id,
            "quiz_title": quiz.title,
            "total_attempts": 0,
            "average_score": 0,
            "pass_percentage": 0,
            "attempts": [],
            "score_distribution": {},
            "top_performers": [],
        }
    
    # Calculate statistics
    total_score = sum(attempt.total_score for attempt in attempts)
    average_score = total_score / total_attempts if total_attempts > 0 else 0
    
    passing_marks = quiz.passing_marks if hasattr(quiz, 'passing_marks') and quiz.passing_marks else (quiz.total_marks * 0.5)
    passed_count = sum(1 for attempt in attempts if attempt.total_score >= passing_marks)
    pass_percentage = (passed_count / total_attempts * 100) if total_attempts > 0 else 0
    
    # Score distribution
    score_ranges = {
        "0-20": 0,
        "21-40": 0,
        "41-60": 0,
        "61-80": 0,
        "81-100": 0,
    }
    
    for attempt in attempts:
        percentage = attempt.percentage
        if percentage <= 20:
            score_ranges["0-20"] += 1
        elif percentage <= 40:
            score_ranges["21-40"] += 1
        elif percentage <= 60:
            score_ranges["41-60"] += 1
        elif percentage <= 80:
            score_ranges["61-80"] += 1
        else:
            score_ranges["81-100"] += 1
    
    # Top performers
    top_attempts = sorted(attempts, key=lambda x: x.total_score, reverse=True)[:10]
    top_performers = []
    for attempt in top_attempts:
        user = db.query(User).filter(User.id == attempt.user_id).first()
        profile = db.query(Profile).filter(Profile.user_id == attempt.user_id).first()
        top_performers.append({
            "user_id": attempt.user_id,
            "name": profile.full_name if profile else user.email,
            "email": user.email,
            "score": attempt.total_score,
            "percentage": attempt.percentage,
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        })
    
    # Attempt details
    attempt_details = []
    for attempt in attempts:
        user = db.query(User).filter(User.id == attempt.user_id).first()
        profile = db.query(Profile).filter(Profile.user_id == attempt.user_id).first()
        attempt_details.append({
            "attempt_id": attempt.id,
            "user_id": attempt.user_id,
            "name": profile.full_name if profile else user.email,
            "email": user.email,
            "score": attempt.total_score,
            "percentage": attempt.percentage,
            "is_passed": attempt.total_score >= passing_marks,
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            "is_auto_submitted": attempt.is_auto_submitted,
        })
    
    return {
        "quiz_id": quiz_id,
        "quiz_title": quiz.title,
        "total_attempts": total_attempts,
        "average_score": round(average_score, 2),
        "average_percentage": round((average_score / quiz.total_marks * 100) if quiz.total_marks > 0 else 0, 2),
        "pass_percentage": round(pass_percentage, 2),
        "passing_marks": passing_marks,
        "passed_count": passed_count,
        "failed_count": total_attempts - passed_count,
        "score_distribution": score_ranges,
        "top_performers": top_performers,
        "attempts": attempt_details,
    }


@router.get("/college")
async def get_college_quiz_analytics(
    current_user_tuple = Depends(get_content_creator),
    db: Session = Depends(get_db)
):
    """Get analytics for all quizzes in college (College Admin)"""
    current_user, user_info = current_user_tuple
    
    if not user_info["is_admin"] and not user_info["is_super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view college-wide analytics"
        )
    
    college_id = user_info["college_id"]
    if not college_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="College ID not found"
        )
    
    # Get all quizzes for this college
    quizzes = db.query(Quiz).filter(Quiz.college_id == college_id).all()
    
    quiz_analytics = []
    total_attempts_all = 0
    total_score_all = 0.0
    total_max_score_all = 0.0
    
    for quiz in quizzes:
        attempts = db.query(QuizAttempt).filter(
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.is_submitted == True
        ).all()
        
        attempt_count = len(attempts)
        total_attempts_all += attempt_count
        
        if attempt_count > 0:
            avg_score = sum(a.total_score for a in attempts) / attempt_count
            passing_marks = quiz.passing_marks if hasattr(quiz, 'passing_marks') and quiz.passing_marks else (quiz.total_marks * 0.5)
            passed = sum(1 for a in attempts if a.total_score >= passing_marks)
            pass_pct = (passed / attempt_count * 100) if attempt_count > 0 else 0
            
            total_score_all += sum(a.total_score for a in attempts)
            total_max_score_all += quiz.total_marks * attempt_count
            
            quiz_analytics.append({
                "quiz_id": quiz.id,
                "quiz_title": quiz.title,
                "total_attempts": attempt_count,
                "average_score": round(avg_score, 2),
                "average_percentage": round((avg_score / quiz.total_marks * 100) if quiz.total_marks > 0 else 0, 2),
                "pass_percentage": round(pass_pct, 2),
            })
        else:
            quiz_analytics.append({
                "quiz_id": quiz.id,
                "quiz_title": quiz.title,
                "total_attempts": 0,
                "average_score": 0,
                "average_percentage": 0,
                "pass_percentage": 0,
            })
    
    overall_avg = (total_score_all / total_max_score_all * 100) if total_max_score_all > 0 else 0
    
    return {
        "college_id": college_id,
        "total_quizzes": len(quizzes),
        "total_attempts": total_attempts_all,
        "overall_average_percentage": round(overall_avg, 2),
        "quizzes": quiz_analytics,
    }


@router.get("/quiz/{quiz_id}/export")
async def export_quiz_results(
    quiz_id: int,
    current_user_tuple = Depends(get_content_creator),
    db: Session = Depends(get_db)
):
    """Export quiz results as CSV data"""
    current_user, user_info = current_user_tuple
    
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Check permissions
    if not user_info["is_super_admin"]:
        if quiz.created_by != current_user.id:
            if not user_info["is_admin"] or quiz.college_id != user_info["college_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized"
                )
    
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.is_submitted == True
    ).all()
    
    # Generate CSV data
    csv_rows = []
    csv_rows.append("Student Name,Email,Score,Max Score,Percentage,Passed,Submitted At,Auto Submitted")
    
    for attempt in attempts:
        user = db.query(User).filter(User.id == attempt.user_id).first()
        profile = db.query(Profile).filter(Profile.user_id == attempt.user_id).first()
        
        passing_marks = quiz.passing_marks if hasattr(quiz, 'passing_marks') and quiz.passing_marks else (quiz.total_marks * 0.5)
        passed = "Yes" if attempt.total_score >= passing_marks else "No"
        
        csv_rows.append(
            f'"{profile.full_name if profile else ""}","{user.email}",'
            f'{attempt.total_score},{attempt.max_score or quiz.total_marks},'
            f'{attempt.percentage}%,{passed},'
            f'"{attempt.submitted_at.isoformat() if attempt.submitted_at else ""}",'
            f'{"Yes" if attempt.is_auto_submitted else "No"}'
        )
    
    return {
        "quiz_id": quiz_id,
        "quiz_title": quiz.title,
        "csv_data": "\n".join(csv_rows),
        "filename": f"quiz_{quiz_id}_results_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv",
    }

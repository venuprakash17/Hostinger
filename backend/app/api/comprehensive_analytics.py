"""Comprehensive Analytics API - Track and retrieve detailed analytics for all features"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, desc, extract
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.user_analytics import (
    UserActivity, UserSession, StudentProgress, FeatureAnalytics, ActivityType
)
from app.models.quiz import CodingProblem, Quiz, QuizAttempt
from app.models.coding_submission import CodingSubmission, CodingActivity
from app.models.company_training import Company, CompanyRole, Round, RoundContent
from app.models.coding_lab import CodingLab, LabSession, LabSubmission
from app.models.job import Job, JobApplication
from app.models.attendance import Attendance

router = APIRouter(prefix="/analytics", tags=["comprehensive-analytics"])


# ==================== Schemas ====================

class ActivityTrackRequest(BaseModel):
    activity_type: str
    activity_category: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    entity_name: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    duration_seconds: Optional[int] = None
    active_time_seconds: Optional[int] = None
    status: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None
    page_url: Optional[str] = None


class SessionStartRequest(BaseModel):
    session_id: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None


class SessionUpdateRequest(BaseModel):
    session_id: str
    active_time_seconds: int
    idle_time_seconds: int
    page_url: Optional[str] = None
    action_count: Optional[int] = None


# ==================== Helper Functions ====================

def get_user_role_info(user: User, db: Session) -> dict:
    """Get user's role information"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
    role_names = [role.role for role in user_roles]
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    
    is_institution_student = RoleEnum.INSTITUTION_STUDENT in role_names
    is_institution_admin = RoleEnum.INSTITUTION_ADMIN in role_names
    
    return {
        "is_super_admin": RoleEnum.SUPER_ADMIN in role_names,
        "is_admin": RoleEnum.ADMIN in role_names,
        "is_hod": RoleEnum.HOD in role_names,
        "is_faculty": RoleEnum.FACULTY in role_names,
        "is_student": RoleEnum.STUDENT in role_names,
        "is_institution_student": is_institution_student,
        "is_institution_admin": is_institution_admin,
        "college_id": profile.college_id if profile else None,
        "institution_id": profile.institution_id if profile else None,
        "department": profile.department if profile else None,
        "section_id": profile.section_id if profile else None,
        "profile": profile
    }


# ==================== Tracking Endpoints ====================

@router.post("/track/activity")
async def track_activity(
    activity: ActivityTrackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Track any user activity - comprehensive tracking"""
    try:
        activity_record = UserActivity(
            user_id=current_user.id,
            activity_type=activity.activity_type,
            activity_category=activity.activity_category,
            entity_type=activity.entity_type,
            entity_id=activity.entity_id,
            entity_name=activity.entity_name,
            activity_metadata=activity.metadata,
            duration_seconds=activity.duration_seconds,
            active_time_seconds=activity.active_time_seconds,
            status=activity.status,
            result=activity.result,
            session_id=activity.session_id,
            page_url=activity.page_url,
            created_at=datetime.utcnow()
        )
        
        db.add(activity_record)
        
        # Update student progress if applicable
        if current_user:
            progress = db.query(StudentProgress).filter(StudentProgress.user_id == current_user.id).first()
            if not progress:
                progress = StudentProgress(user_id=current_user.id)
                db.add(progress)
            
            # Update progress based on activity type
            if activity.activity_type == ActivityType.CODING_PROBLEM_STARTED:
                progress.total_coding_problems_attempted += 1
            elif activity.activity_type == ActivityType.CODE_ACCEPTED:
                progress.total_coding_problems_solved += 1
                progress.total_coding_submissions += 1
            elif activity.activity_type == ActivityType.CODE_SUBMITTED:
                progress.total_coding_submissions += 1
            elif activity.activity_type == ActivityType.TIME_SPENT and activity.active_time_seconds:
                progress.total_coding_time_minutes += (activity.active_time_seconds // 60)
                progress.total_active_minutes += (activity.active_time_seconds // 60)
            elif activity.activity_type == ActivityType.QUIZ_STARTED:
                progress.total_quizzes_attempted += 1
            elif activity.activity_type == ActivityType.QUIZ_COMPLETED:
                progress.total_quizzes_completed += 1
            elif activity.activity_type == ActivityType.LAB_STARTED:
                progress.total_labs_started += 1
            elif activity.activity_type == ActivityType.LAB_SESSION_COMPLETED:
                progress.total_lab_sessions += 1
            elif activity.activity_type == ActivityType.JOB_VIEWED:
                progress.total_jobs_viewed += 1
            elif activity.activity_type == ActivityType.JOB_APPLIED:
                progress.total_jobs_applied += 1
            
            progress.last_activity_at = datetime.utcnow()
            progress.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "success": True,
            "message": "Activity tracked successfully",
            "activity_id": activity_record.id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to track activity: {str(e)}")


@router.post("/track/session/start")
async def start_session(
    session_data: SessionStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new user session"""
    try:
        session = UserSession(
            user_id=current_user.id,
            session_id=session_data.session_id,
            user_agent=session_data.user_agent,
            ip_address=session_data.ip_address,
            started_at=datetime.utcnow(),
            last_activity_at=datetime.utcnow(),
            is_active=True
        )
        
        db.add(session)
        
        # Update progress
        progress = db.query(StudentProgress).filter(StudentProgress.user_id == current_user.id).first()
        if not progress:
            progress = StudentProgress(user_id=current_user.id)
            db.add(progress)
        progress.total_sessions += 1
        
        db.commit()
        
        return {
            "success": True,
            "message": "Session started",
            "session_id": session_data.session_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to start session: {str(e)}")


@router.post("/track/session/update")
async def update_session(
    session_data: SessionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update session activity"""
    try:
        session = db.query(UserSession).filter(
            UserSession.session_id == session_data.session_id,
            UserSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session.active_time_seconds += session_data.active_time_seconds
        session.idle_time_seconds += session_data.idle_time_seconds
        session.total_time_seconds = session.active_time_seconds + session.idle_time_seconds
        session.last_activity_at = datetime.utcnow()
        
        if session_data.action_count:
            session.actions_count += session_data.action_count
        
        if session_data.page_url:
            if not session.pages_visited:
                session.pages_visited = []
            if session_data.page_url not in session.pages_visited:
                session.pages_visited.append(session_data.page_url)
                session.page_views += 1
        
        db.commit()
        
        return {"success": True, "message": "Session updated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update session: {str(e)}")


@router.post("/track/session/end")
async def end_session(
    session_id: str = Query(..., description="Session ID to end"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End a user session"""
    try:
        session = db.query(UserSession).filter(
            UserSession.session_id == session_id,
            UserSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session.ended_at = datetime.utcnow()
        session.is_active = False
        
        db.commit()
        
        return {"success": True, "message": "Session ended"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to end session: {str(e)}")


# ==================== Analytics Retrieval Endpoints ====================

@router.get("/student/my-progress")
async def get_my_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive progress for current student"""
    progress = db.query(StudentProgress).filter(StudentProgress.user_id == current_user.id).first()
    
    if not progress:
        # Create initial progress record
        progress = StudentProgress(user_id=current_user.id)
        db.add(progress)
        db.commit()
        db.refresh(progress)
    
    # Get recent activities
    recent_activities = db.query(UserActivity).filter(
        UserActivity.user_id == current_user.id
    ).order_by(desc(UserActivity.created_at)).limit(20).all()
    
    # Get coding stats - limited for performance
    coding_submissions = db.query(CodingSubmission).filter(
        CodingSubmission.user_id == current_user.id
    ).limit(10000).all()  # Limit for performance
    
    solved_problems = len(set(s.problem_id for s in coding_submissions if s.status == "accepted"))
    total_submissions = len(coding_submissions)
    acceptance_rate = (solved_problems / total_submissions * 100) if total_submissions > 0 else 0
    
    # Get time spent today - limited for performance
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_activities = db.query(UserActivity).filter(
        UserActivity.user_id == current_user.id,
        UserActivity.created_at >= today_start,
        UserActivity.active_time_seconds.isnot(None)
    ).limit(1000).all()  # Limit for performance
    
    today_active_minutes = sum(a.active_time_seconds or 0 for a in today_activities) // 60
    
    # Get weekly activity
    week_start = datetime.utcnow() - timedelta(days=7)
    week_activities = db.query(func.count(UserActivity.id)).filter(
        UserActivity.user_id == current_user.id,
        UserActivity.created_at >= week_start
    ).scalar() or 0
    
    # Get quiz stats
    quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).limit(1000).all()  # Limit for performance
    quiz_scores = [a.total_score for a in quiz_attempts if a.total_score is not None and a.total_score > 0]
    avg_quiz_score = sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0
    
    return {
        "progress": {
            "total_coding_problems_solved": solved_problems,
            "total_coding_submissions": total_submissions,
            "coding_acceptance_rate": round(acceptance_rate, 2),
            "total_quizzes_completed": progress.total_quizzes_completed,
            "average_quiz_score": round(avg_quiz_score, 2),
            "total_labs_completed": progress.total_labs_completed,
            "total_jobs_applied": progress.total_jobs_applied,
            "total_active_minutes": progress.total_active_minutes,
            "current_streak_days": progress.current_streak_days,
            "longest_streak_days": progress.longest_streak_days
        },
        "today": {
            "active_minutes": today_active_minutes,
            "activities_count": len(today_activities)
        },
        "this_week": {
            "activities_count": week_activities
        },
        "recent_activities": [
            {
                "activity_type": a.activity_type,
                "entity_name": a.entity_name,
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in recent_activities
        ]
    }


@router.get("/student/{student_id}/detailed")
async def get_student_detailed_analytics(
    student_id: int,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get extremely detailed analytics for a specific student"""
    role_info = get_user_role_info(current_user, db)
    
    # Permission check
    if not (role_info["is_super_admin"] or role_info["is_admin"] or 
            role_info["is_hod"] or role_info["is_faculty"] or 
            current_user.id == student_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Date filters
    date_filter = None
    if start_date or end_date:
        conditions = []
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                conditions.append(UserActivity.created_at >= start_dt)
            except:
                pass
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                conditions.append(UserActivity.created_at <= end_dt)
            except:
                pass
        if conditions:
            date_filter = and_(*conditions)
    
    # Get all activities
    activities_query = db.query(UserActivity).filter(UserActivity.user_id == student_id)
    if date_filter:
        activities_query = activities_query.filter(date_filter)
    
    activities = activities_query.order_by(desc(UserActivity.created_at)).all()
    
    # Get progress
    progress = db.query(StudentProgress).filter(StudentProgress.user_id == student_id).first()
    
    # Calculate detailed metrics
    total_active_minutes = sum(a.active_time_seconds or 0 for a in activities) // 60
    
    # Activity breakdown by type
    activity_breakdown = {}
    for activity in activities:
        activity_type = activity.activity_type
        if activity_type not in activity_breakdown:
            activity_breakdown[activity_type] = {
                "count": 0,
                "total_time_seconds": 0,
                "success_count": 0
            }
        activity_breakdown[activity_type]["count"] += 1
        if activity.active_time_seconds:
            activity_breakdown[activity_type]["total_time_seconds"] += activity.active_time_seconds
        if activity.status == "success":
            activity_breakdown[activity_type]["success_count"] += 1
    
    # Daily activity timeline
    daily_activity = {}
    for activity in activities:
        date_str = activity.created_at.date().isoformat() if activity.created_at else datetime.utcnow().date().isoformat()
        if date_str not in daily_activity:
            daily_activity[date_str] = {
                "activities": 0,
                "active_minutes": 0,
                "by_type": {}
            }
        daily_activity[date_str]["activities"] += 1
        if activity.active_time_seconds:
            daily_activity[date_str]["active_minutes"] += (activity.active_time_seconds // 60)
        
        activity_type = activity.activity_type
        if activity_type not in daily_activity[date_str]["by_type"]:
            daily_activity[date_str]["by_type"][activity_type] = 0
        daily_activity[date_str]["by_type"][activity_type] += 1
    
    # Coding detailed stats with time tracking
    coding_submissions = db.query(CodingSubmission).filter(CodingSubmission.user_id == student_id).limit(10000).all()  # Limit for performance
    coding_activities = [a for a in activities if a.activity_category == "coding" or a.entity_type == "coding_problem" or a.activity_type in ["coding_problem_viewed", "coding_problem_started", "code_executed", "code_submitted", "code_accepted", "code_failed", "time_spent"]]
    
    # Calculate total coding time in minutes
    total_coding_minutes = sum(a.active_time_seconds or 0 for a in coding_activities) // 60
    
    # Coding time by day
    coding_time_by_day = {}
    for activity in coding_activities:
        if activity.created_at and activity.active_time_seconds:
            date_str = activity.created_at.date().isoformat()
            if date_str not in coding_time_by_day:
                coding_time_by_day[date_str] = 0
            coding_time_by_day[date_str] += (activity.active_time_seconds // 60)
    
    # Coding time by problem
    coding_time_by_problem = {}
    for activity in coding_activities:
        if activity.entity_id and activity.active_time_seconds:
            problem_id = activity.entity_id
            if problem_id not in coding_time_by_problem:
                coding_time_by_problem[problem_id] = 0
            coding_time_by_problem[problem_id] += (activity.active_time_seconds // 60)
    
    # Average coding time per problem
    unique_problems = len(set(a.entity_id for a in coding_activities if a.entity_id))
    avg_coding_time_per_problem = total_coding_minutes / unique_problems if unique_problems > 0 else 0
    
    coding_stats = {
        "total_problems_viewed": len(set(a.entity_id for a in coding_activities if a.entity_id and a.activity_type == ActivityType.CODING_PROBLEM_VIEWED)),
        "total_problems_attempted": len(set(a.entity_id for a in coding_activities if a.entity_id and a.activity_type == ActivityType.CODING_PROBLEM_STARTED)),
        "total_problems_solved": len(set(s.problem_id for s in coding_submissions if s.status == "accepted")),
        "total_submissions": len(coding_submissions),
        "accepted_submissions": len([s for s in coding_submissions if s.status == "accepted"]),
        "total_coding_minutes": total_coding_minutes,
        "average_coding_minutes_per_problem": round(avg_coding_time_per_problem, 2),
        "coding_time_by_day": coding_time_by_day,
        "coding_time_by_problem": {str(k): v for k, v in list(coding_time_by_problem.items())[:20]},  # Top 20 problems
        "average_attempts_per_problem": 0,
        "problems_by_difficulty": {},
        "languages_used": {}
    }
    
    # Calculate average attempts
    problem_attempts = {}
    for sub in coding_submissions:
        if sub.problem_id not in problem_attempts:
            problem_attempts[sub.problem_id] = 0
        problem_attempts[sub.problem_id] += 1
    
    if problem_attempts:
        coding_stats["average_attempts_per_problem"] = sum(problem_attempts.values()) / len(problem_attempts)
    
    # Problems by difficulty
    solved_problem_ids = set(s.problem_id for s in coding_submissions if s.status == "accepted")
    for prob_id in solved_problem_ids:
        problem = db.query(CodingProblem).filter(CodingProblem.id == prob_id).first()
        if problem and problem.difficulty:
            if problem.difficulty not in coding_stats["problems_by_difficulty"]:
                coding_stats["problems_by_difficulty"][problem.difficulty] = 0
            coding_stats["problems_by_difficulty"][problem.difficulty] += 1
    
    # Languages used
    for sub in coding_submissions:
        lang = sub.language
        if lang not in coding_stats["languages_used"]:
            coding_stats["languages_used"][lang] = {"total": 0, "accepted": 0}
        coding_stats["languages_used"][lang]["total"] += 1
        if sub.status == "accepted":
            coding_stats["languages_used"][lang]["accepted"] += 1
    
    # Quiz stats
    quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == student_id).limit(1000).all()  # Limit for performance
    quiz_stats = {
        "total_quizzes_attempted": len(set(a.quiz_id for a in quiz_attempts)),
        "total_quizzes_completed": len([a for a in quiz_attempts if a.completed]),
        "total_questions_answered": sum(len(a.answers or []) for a in quiz_attempts),
        "average_score": sum(a.total_score for a in quiz_attempts if a.total_score is not None and a.total_score > 0) / len([a for a in quiz_attempts if a.total_score is not None and a.total_score > 0]) if quiz_attempts else 0,
        "best_score": max((a.total_score for a in quiz_attempts if a.total_score is not None and a.total_score > 0), default=0),
        "quizzes_by_subject": {}
    }
    
    # Company training stats
    company_training_activities = [a for a in activities if a.activity_category == "company_training"]
    company_stats = {
        "total_trainings_started": len(set(a.entity_id for a in company_training_activities if a.activity_type == ActivityType.COMPANY_TRAINING_STARTED)),
        "total_rounds_completed": len([a for a in company_training_activities if a.activity_type == ActivityType.COMPANY_ROUND_COMPLETED]),
        "total_rounds_passed": len([a for a in company_training_activities if a.status == "success" and a.activity_type == ActivityType.COMPANY_ROUND_COMPLETED])
    }
    
    # Lab stats
    lab_activities = [a for a in activities if a.activity_category == "lab"]
    lab_stats = {
        "total_labs_started": len(set(a.entity_id for a in lab_activities if a.activity_type == ActivityType.LAB_STARTED)),
        "total_sessions": len([a for a in lab_activities if a.activity_type == ActivityType.LAB_SESSION_COMPLETED]),
        "total_time_minutes": sum(a.active_time_seconds or 0 for a in lab_activities) // 60
    }
    
    # Job stats
    job_applications = db.query(JobApplication).filter(JobApplication.user_id == student_id).limit(1000).all()  # Limit for performance
    job_stats = {
        "total_jobs_viewed": progress.total_jobs_viewed if progress else 0,
        "total_jobs_applied": len(job_applications),
        "applications_by_status": {}
    }
    
    for app in job_applications:
        status = app.status or "pending"
        if status not in job_stats["applications_by_status"]:
            job_stats["applications_by_status"][status] = 0
        job_stats["applications_by_status"][status] += 1
    
    # Session stats
    sessions = db.query(UserSession).filter(UserSession.user_id == student_id).limit(1000).all()  # Limit for performance
    session_stats = {
        "total_sessions": len(sessions),
        "total_session_time_minutes": sum(s.total_time_seconds for s in sessions) // 60,
        "average_session_time_minutes": (sum(s.total_time_seconds for s in sessions) // 60) / len(sessions) if sessions else 0,
        "total_active_time_minutes": sum(s.active_time_seconds for s in sessions) // 60
    }
    
    return {
        "student_id": student_id,
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "overview": {
            "total_activities": len(activities),
            "total_active_minutes": total_active_minutes,
            "activity_breakdown": activity_breakdown
        },
        "coding": coding_stats,
        "quizzes": quiz_stats,
        "company_training": company_stats,
        "labs": lab_stats,
        "jobs": job_stats,
        "sessions": session_stats,
        "daily_activity": daily_activity,
        "recent_activities": [
            {
                "id": a.id,
                "activity_type": a.activity_type,
                "entity_type": a.entity_type,
                "entity_name": a.entity_name,
                "status": a.status,
                "duration_seconds": a.duration_seconds,
                "active_time_seconds": a.active_time_seconds,
                "metadata": a.activity_metadata,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in activities[:50]  # Last 50 activities
        ]
    }


@router.get("/feature/{feature_name}")
async def get_feature_analytics(
    feature_name: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get analytics for a specific feature (coding, quizzes, labs, etc.)"""
    role_info = get_user_role_info(current_user, db)
    
    # Build date filter
    date_filter = None
    if start_date or end_date:
        conditions = []
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                conditions.append(UserActivity.created_at >= start_dt)
            except:
                pass
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                conditions.append(UserActivity.created_at <= end_dt)
            except:
                pass
        if conditions:
            date_filter = and_(*conditions)
    
    # Get activities for this feature
    activities_query = db.query(UserActivity).filter(
        or_(
            UserActivity.activity_category == feature_name,
            UserActivity.entity_type == feature_name
        )
    )
    
    if date_filter:
        activities_query = activities_query.filter(date_filter)
    
    # Apply scope filters based on role
    if not role_info["is_super_admin"]:
        if role_info["is_admin"] and role_info["college_id"]:
            # Filter by college
            student_ids = db.query(Profile.user_id).filter(
                Profile.college_id == role_info["college_id"]
            ).subquery()
            activities_query = activities_query.filter(UserActivity.user_id.in_(student_ids))
        elif role_info["is_hod"] and role_info["department"]:
            # Filter by department
            student_ids = db.query(Profile.user_id).filter(
                Profile.college_id == role_info["college_id"],
                Profile.department == role_info["department"]
            ).subquery()
            activities_query = activities_query.filter(UserActivity.user_id.in_(student_ids))
        elif role_info["is_faculty"] and role_info["section_id"]:
            # Filter by section
            student_ids = db.query(Profile.user_id).filter(
                Profile.section_id == role_info["section_id"]
            ).subquery()
            activities_query = activities_query.filter(UserActivity.user_id.in_(student_ids))
        elif role_info["is_student"] or role_info["is_institution_student"]:
            # Only own data
            activities_query = activities_query.filter(UserActivity.user_id == current_user.id)
    
    # Limit for performance - max 10,000 activities per query
    activities = activities_query.limit(10000).all()
    
    # Calculate metrics
    unique_users = len(set(a.user_id for a in activities))
    total_activities = len(activities)
    total_active_minutes = sum(a.active_time_seconds or 0 for a in activities) // 60
    
    # Activity by type
    activity_by_type = {}
    for activity in activities:
        activity_type = activity.activity_type
        if activity_type not in activity_by_type:
            activity_by_type[activity_type] = {
                "count": 0,
                "unique_users": set(),
                "total_time_seconds": 0
            }
        activity_by_type[activity_type]["count"] += 1
        activity_by_type[activity_type]["unique_users"].add(activity.user_id)
        if activity.active_time_seconds:
            activity_by_type[activity_type]["total_time_seconds"] += activity.active_time_seconds
    
    # Convert sets to counts
    for activity_type in activity_by_type:
        activity_by_type[activity_type]["unique_users"] = len(activity_by_type[activity_type]["unique_users"])
    
    # Daily timeline
    daily_timeline = {}
    for activity in activities:
        date_str = activity.created_at.date().isoformat() if activity.created_at else datetime.utcnow().date().isoformat()
        if date_str not in daily_timeline:
            daily_timeline[date_str] = {
                "activities": 0,
                "unique_users": set(),
                "active_minutes": 0
            }
        daily_timeline[date_str]["activities"] += 1
        daily_timeline[date_str]["unique_users"].add(activity.user_id)
        if activity.active_time_seconds:
            daily_timeline[date_str]["active_minutes"] += (activity.active_time_seconds // 60)
    
    # Convert sets to counts
    for date_str in daily_timeline:
        daily_timeline[date_str]["unique_users"] = len(daily_timeline[date_str]["unique_users"])
    
    return {
        "feature_name": feature_name,
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "metrics": {
            "unique_users": unique_users,
            "total_activities": total_activities,
            "total_active_minutes": total_active_minutes,
            "average_activities_per_user": total_activities / unique_users if unique_users > 0 else 0
        },
        "activity_by_type": activity_by_type,
        "daily_timeline": daily_timeline
    }


@router.get("/dashboard/comprehensive")
async def get_comprehensive_dashboard(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive analytics dashboard for all features"""
    role_info = get_user_role_info(current_user, db)
    
    # Build date filter
    date_filter = None
    if start_date or end_date:
        conditions = []
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                conditions.append(UserActivity.created_at >= start_dt)
            except:
                pass
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                conditions.append(UserActivity.created_at <= end_dt)
            except:
                pass
        if conditions:
            date_filter = and_(*conditions)
    
    # Get all activities (with scope filtering)
    activities_query = db.query(UserActivity)
    if date_filter:
        activities_query = activities_query.filter(date_filter)
    
    # Apply scope based on role
    if not role_info["is_super_admin"]:
        if role_info["is_admin"] and role_info["college_id"]:
            student_ids = db.query(Profile.user_id).filter(
                Profile.college_id == role_info["college_id"]
            ).subquery()
            activities_query = activities_query.filter(UserActivity.user_id.in_(student_ids))
        elif role_info["is_hod"] and role_info["department"]:
            student_ids = db.query(Profile.user_id).filter(
                Profile.college_id == role_info["college_id"],
                Profile.department == role_info["department"]
            ).subquery()
            activities_query = activities_query.filter(UserActivity.user_id.in_(student_ids))
        elif role_info["is_faculty"] and role_info["section_id"]:
            student_ids = db.query(Profile.user_id).filter(
                Profile.section_id == role_info["section_id"]
            ).subquery()
            activities_query = activities_query.filter(UserActivity.user_id.in_(student_ids))
        elif role_info["is_student"] or role_info["is_institution_student"]:
            activities_query = activities_query.filter(UserActivity.user_id == current_user.id)
    
    # Limit for performance - max 10,000 activities per query
    activities = activities_query.limit(10000).all()
    
    # Overall metrics
    unique_users = len(set(a.user_id for a in activities))
    total_activities = len(activities)
    total_active_minutes = sum(a.active_time_seconds or 0 for a in activities) // 60
    
    # Feature breakdown
    feature_breakdown = {}
    for activity in activities:
        feature = activity.activity_category or activity.entity_type or "general"
        if feature not in feature_breakdown:
            feature_breakdown[feature] = {
                "activities": 0,
                "unique_users": set(),
                "active_minutes": 0,
                "success_count": 0
            }
        feature_breakdown[feature]["activities"] += 1
        feature_breakdown[feature]["unique_users"].add(activity.user_id)
        if activity.active_time_seconds:
            feature_breakdown[feature]["active_minutes"] += (activity.active_time_seconds // 60)
        if activity.status == "success":
            feature_breakdown[feature]["success_count"] += 1
    
    # Convert sets to counts
    for feature in feature_breakdown:
        feature_breakdown[feature]["unique_users"] = len(feature_breakdown[feature]["unique_users"])
    
    # Get coding-specific stats
    coding_activities = [a for a in activities if a.activity_category == "coding" or a.entity_type == "coding_problem"]
    coding_stats = {
        "total_activities": len(coding_activities),
        "unique_users": len(set(a.user_id for a in coding_activities)),
        "total_active_minutes": sum(a.active_time_seconds or 0 for a in coding_activities) // 60,
        "problems_viewed": len(set(a.entity_id for a in coding_activities if a.entity_id and a.activity_type == ActivityType.CODING_PROBLEM_VIEWED)),
        "problems_solved": len(set(a.entity_id for a in coding_activities if a.status == "success" and a.activity_type == ActivityType.CODE_ACCEPTED))
    }
    
    # Get quiz stats
    quiz_activities = [a for a in activities if a.activity_category == "quiz" or a.entity_type == "quiz"]
    quiz_stats = {
        "total_activities": len(quiz_activities),
        "unique_users": len(set(a.user_id for a in quiz_activities)),
        "quizzes_completed": len([a for a in quiz_activities if a.activity_type == ActivityType.QUIZ_COMPLETED])
    }
    
    # Get company training stats
    company_activities = [a for a in activities if a.activity_category == "company_training"]
    company_stats = {
        "total_activities": len(company_activities),
        "unique_users": len(set(a.user_id for a in company_activities)),
        "rounds_completed": len([a for a in company_activities if a.activity_type == ActivityType.COMPANY_ROUND_COMPLETED])
    }
    
    # Daily activity timeline
    daily_timeline = {}
    for activity in activities:
        date_str = activity.created_at.date().isoformat() if activity.created_at else datetime.utcnow().date().isoformat()
        if date_str not in daily_timeline:
            daily_timeline[date_str] = {
                "activities": 0,
                "unique_users": set(),
                "active_minutes": 0
            }
        daily_timeline[date_str]["activities"] += 1
        daily_timeline[date_str]["unique_users"].add(activity.user_id)
        if activity.active_time_seconds:
            daily_timeline[date_str]["active_minutes"] += (activity.active_time_seconds // 60)
    
    # Convert sets to counts
    for date_str in daily_timeline:
        daily_timeline[date_str]["unique_users"] = len(daily_timeline[date_str]["unique_users"])
    
    timeline_list = [{"date": k, **v} for k, v in sorted(daily_timeline.items())]
    
    return {
        "role": "super_admin" if role_info["is_super_admin"] else "admin" if role_info["is_admin"] else "hod" if role_info["is_hod"] else "faculty" if role_info["is_faculty"] else "student",
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "overview": {
            "unique_users": unique_users,
            "total_activities": total_activities,
            "total_active_minutes": total_active_minutes,
            "average_activities_per_user": total_activities / unique_users if unique_users > 0 else 0
        },
        "features": {
            "coding": coding_stats,
            "quizzes": quiz_stats,
            "company_training": company_stats
        },
        "feature_breakdown": feature_breakdown,
        "daily_timeline": timeline_list[-30:]  # Last 30 days
    }

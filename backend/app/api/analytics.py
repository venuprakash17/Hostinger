"""Analytics API - Role-based analytics for coding problems"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User, UserRole, RoleEnum
from app.models.quiz import CodingProblem
from app.models.coding_submission import CodingSubmission, CodingActivity
from app.models.profile import Profile

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ==================== Schemas ====================

class ProblemAnalytics(BaseModel):
    problem_id: int
    problem_code: Optional[str]
    title: str
    total_attempts: int
    total_submissions: int
    accepted_count: int
    acceptance_rate: float
    average_attempts: float
    languages_used: dict
    difficulty: Optional[str]
    year: int

class StudentAnalytics(BaseModel):
    student_id: int
    student_name: str
    total_problems_solved: int
    total_submissions: int
    acceptance_rate: float
    problems_by_difficulty: dict
    languages_used: dict
    recent_activity: List[dict]

class RoleAnalytics(BaseModel):
    total_problems: int
    total_students: int
    total_submissions: int
    acceptance_rate: float
    problems_by_difficulty: dict
    problems_by_year: dict
    problems_by_language: dict
    top_problems: List[ProblemAnalytics]
    top_students: List[StudentAnalytics]
    activity_timeline: List[dict]
    scope_stats: dict


# ==================== Helper Functions ====================

def get_user_role_info(user: User, db: Session) -> dict:
    """Get user's role information"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
    role_names = [role.role for role in user_roles]
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    
    return {
        "is_super_admin": RoleEnum.SUPER_ADMIN in role_names,
        "is_admin": RoleEnum.ADMIN in role_names,
        "is_hod": RoleEnum.HOD in role_names,
        "is_faculty": RoleEnum.FACULTY in role_names,
        "is_student": RoleEnum.STUDENT in role_names,
        "college_id": profile.college_id if profile else None,
        "department": profile.department if profile else None,
        "section_id": profile.section_id if profile else None,
        "profile": profile
    }


def get_scope_filter(role_info: dict, db: Session) -> dict:
    """Get scope filter based on user role"""
    filters = {}
    
    if role_info["is_super_admin"]:
        # Super Admin sees everything
        pass
    elif role_info["is_admin"]:
        # College Admin sees their college
        if role_info["college_id"]:
            filters["college_id"] = role_info["college_id"]
    elif role_info["is_hod"]:
        # HOD sees their department
        if role_info["college_id"] and role_info["department"]:
            filters["college_id"] = role_info["college_id"]
            filters["department"] = role_info["department"]
    elif role_info["is_faculty"]:
        # Faculty sees their section
        if role_info["section_id"]:
            filters["section_id"] = role_info["section_id"]
    else:
        # Student sees their own data
        filters["user_id"] = role_info.get("user_id")
    
    return filters


# ==================== Analytics Endpoints ====================

@router.get("/coding-problems/overview")
async def get_coding_problems_overview(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overview analytics for coding problems - Role-based"""
    role_info = get_user_role_info(current_user, db)
    scope_filters = get_scope_filter(role_info, db)
    
    # Base query for problems
    problem_query = db.query(CodingProblem)
    
    # Apply scope filters
    if "college_id" in scope_filters:
        problem_query = problem_query.filter(CodingProblem.college_id == scope_filters["college_id"])
    if "department" in scope_filters:
        problem_query = problem_query.filter(CodingProblem.department == scope_filters["department"])
    if "section_id" in scope_filters:
        problem_query = problem_query.filter(CodingProblem.section_id == scope_filters["section_id"])
    
    total_problems = problem_query.count()
    
    # Base query for submissions
    submission_query = db.query(CodingSubmission)
    
    # Apply date filters
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            submission_query = submission_query.filter(CodingSubmission.created_at >= start_dt)
        except:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            submission_query = submission_query.filter(CodingSubmission.created_at <= end_dt)
        except:
            pass
    
    # Scope submissions by problem scope
    if scope_filters:
        problem_ids = [p.id for p in problem_query.all()]
        if problem_ids:
            submission_query = submission_query.filter(CodingSubmission.problem_id.in_(problem_ids))
        else:
            submission_query = submission_query.filter(CodingSubmission.problem_id == -1)  # No matches
    
    total_submissions = submission_query.count()
    accepted_submissions = submission_query.filter(CodingSubmission.status == "accepted").count()
    acceptance_rate = (accepted_submissions / total_submissions * 100) if total_submissions > 0 else 0
    
    # Problems by difficulty
    difficulty_stats = {}
    for difficulty in ["Easy", "Medium", "Hard"]:
        count = problem_query.filter(CodingProblem.difficulty == difficulty).count()
        difficulty_stats[difficulty] = count
    
    # Problems by year
    year_stats = {}
    for year in [1, 2, 3, 4]:
        count = problem_query.filter(CodingProblem.year == year).count()
        year_stats[str(year)] = count
    
    # Top problems by submissions
    top_problems_query = db.query(
        CodingSubmission.problem_id,
        func.count(CodingSubmission.id).label('submission_count'),
        func.sum(case((CodingSubmission.status == "accepted", 1), else_=0)).label('accepted_count')
    )
    
    if scope_filters and "problem_ids" in scope_filters:
        top_problems_query = top_problems_query.filter(
            CodingSubmission.problem_id.in_(scope_filters["problem_ids"])
        )
    
    top_problems_query = top_problems_query.group_by(CodingSubmission.problem_id)\
        .order_by(func.count(CodingSubmission.id).desc())\
        .limit(10)
    
    top_problems_data = top_problems_query.all()
    top_problems = []
    for prob_id, sub_count, acc_count in top_problems_data:
        problem = db.query(CodingProblem).filter(CodingProblem.id == prob_id).first()
        if problem:
            top_problems.append({
                "problem_id": problem.id,
                "problem_code": getattr(problem, 'problem_code', None),
                "title": problem.title,
                "total_submissions": sub_count or 0,
                "accepted_count": acc_count or 0,
                "acceptance_rate": (acc_count / sub_count * 100) if sub_count > 0 else 0,
                "difficulty": problem.difficulty
            })
    
    return {
        "total_problems": total_problems,
        "total_submissions": total_submissions,
        "accepted_submissions": accepted_submissions,
        "acceptance_rate": round(acceptance_rate, 2),
        "problems_by_difficulty": difficulty_stats,
        "problems_by_year": year_stats,
        "top_problems": top_problems
    }


@router.get("/coding-problems/detailed/{problem_id}")
async def get_problem_detailed_analytics(
    problem_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed analytics for a specific problem"""
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Get all submissions for this problem
    submissions = db.query(CodingSubmission).filter(CodingSubmission.problem_id == problem_id).all()
    
    total_submissions = len(submissions)
    accepted_count = sum(1 for s in submissions if s.status == "accepted")
    acceptance_rate = (accepted_count / total_submissions * 100) if total_submissions > 0 else 0
    
    # Language usage
    language_stats = {}
    for submission in submissions:
        lang = submission.language
        if lang not in language_stats:
            language_stats[lang] = {"total": 0, "accepted": 0}
        language_stats[lang]["total"] += 1
        if submission.status == "accepted":
            language_stats[lang]["accepted"] += 1
    
    # Student attempts (unique students)
    unique_students = len(set(s.user_id for s in submissions))
    
    # Average attempts per student
    student_attempts = {}
    for submission in submissions:
        if submission.user_id not in student_attempts:
            student_attempts[submission.user_id] = 0
        student_attempts[submission.user_id] += 1
    
    avg_attempts = sum(student_attempts.values()) / len(student_attempts) if student_attempts else 0
    
    # Timeline (submissions per day)
    timeline = {}
    for submission in submissions:
        date_str = submission.created_at.date().isoformat() if submission.created_at else datetime.utcnow().date().isoformat()
        if date_str not in timeline:
            timeline[date_str] = {"total": 0, "accepted": 0}
        timeline[date_str]["total"] += 1
        if submission.status == "accepted":
            timeline[date_str]["accepted"] += 1
    
    timeline_list = [{"date": k, **v} for k, v in sorted(timeline.items())]
    
    return {
        "problem_id": problem.id,
        "problem_code": getattr(problem, 'problem_code', None),
        "title": problem.title,
        "total_submissions": total_submissions,
        "accepted_count": accepted_count,
        "acceptance_rate": round(acceptance_rate, 2),
        "unique_students": unique_students,
        "average_attempts": round(avg_attempts, 2),
        "language_stats": language_stats,
        "timeline": timeline_list[-30:]  # Last 30 days
    }


@router.get("/students/overview")
async def get_students_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get student analytics overview - Role-based"""
    role_info = get_user_role_info(current_user, db)
    scope_filters = get_scope_filter(role_info, db)
    
    # Get students based on scope
    student_query = db.query(User).join(UserRole).filter(UserRole.role == RoleEnum.STUDENT)
    
    if role_info["is_super_admin"]:
        # All students
        pass
    elif role_info["is_admin"] and scope_filters.get("college_id"):
        # College students
        student_query = student_query.join(Profile).filter(Profile.college_id == scope_filters["college_id"])
    elif role_info["is_hod"] and scope_filters.get("department"):
        # Department students
        student_query = student_query.join(Profile).filter(
            Profile.college_id == scope_filters["college_id"],
            Profile.department == scope_filters["department"]
        )
    elif role_info["is_faculty"] and scope_filters.get("section_id"):
        # Section students
        student_query = student_query.join(Profile).filter(Profile.section_id == scope_filters["section_id"])
    else:
        # Student sees only themselves
        student_query = student_query.filter(User.id == current_user.id)
    
    students = student_query.all()
    student_ids = [s.id for s in students]
    
    # Get submissions for these students
    submissions_query = db.query(CodingSubmission).filter(CodingSubmission.user_id.in_(student_ids))
    total_submissions = submissions_query.count()
    accepted_submissions = submissions_query.filter(CodingSubmission.status == "accepted").count()
    
    # Top students
    top_students_query = db.query(
        CodingSubmission.user_id,
        func.count(CodingSubmission.id).label('total_submissions'),
        func.sum(case((CodingSubmission.status == "accepted", 1), else_=0)).label('solved_count')
    ).filter(CodingSubmission.user_id.in_(student_ids))\
     .group_by(CodingSubmission.user_id)\
     .order_by(func.sum(case((CodingSubmission.status == "accepted", 1), else_=0)).desc())\
     .limit(10)
    
    top_students_data = top_students_query.all()
    top_students = []
    for user_id, total_subs, solved_count in top_students_data:
        user = db.query(User).filter(User.id == user_id).first()
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        if user:
            top_students.append({
                "student_id": user.id,
                "student_name": profile.full_name if profile else user.email,
                "total_submissions": total_subs or 0,
                "problems_solved": solved_count or 0,
                "acceptance_rate": (solved_count / total_subs * 100) if total_subs > 0 else 0
            })
    
    return {
        "total_students": len(students),
        "total_submissions": total_submissions,
        "accepted_submissions": accepted_submissions,
        "acceptance_rate": (accepted_submissions / total_submissions * 100) if total_submissions > 0 else 0,
        "top_students": top_students
    }


@router.get("/students/{student_id}/detailed")
async def get_student_detailed_analytics(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed analytics for a specific student"""
    # Check permissions
    role_info = get_user_role_info(current_user, db)
    
    if not role_info["is_super_admin"] and not role_info["is_admin"] and not role_info["is_hod"] and not role_info["is_faculty"]:
        if current_user.id != student_id:
            raise HTTPException(status_code=403, detail="You can only view your own analytics")
    
    # Get student submissions
    submissions = db.query(CodingSubmission).filter(CodingSubmission.user_id == student_id).all()
    
    total_submissions = len(submissions)
    accepted_count = sum(1 for s in submissions if s.status == "accepted")
    
    # Problems solved (unique)
    solved_problem_ids = set(s.problem_id for s in submissions if s.status == "accepted")
    
    # Problems by difficulty
    difficulty_stats = {}
    for problem_id in solved_problem_ids:
        problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
        if problem and problem.difficulty:
            if problem.difficulty not in difficulty_stats:
                difficulty_stats[problem.difficulty] = 0
            difficulty_stats[problem.difficulty] += 1
    
    # Language usage
    language_stats = {}
    for submission in submissions:
        lang = submission.language
        if lang not in language_stats:
            language_stats[lang] = {"total": 0, "accepted": 0}
        language_stats[lang]["total"] += 1
        if submission.status == "accepted":
            language_stats[lang]["accepted"] += 1
    
    # Recent activity
    recent_submissions = sorted(submissions, key=lambda x: x.created_at or datetime.min, reverse=True)[:10]
    recent_activity = []
    for sub in recent_submissions:
        problem = db.query(CodingProblem).filter(CodingProblem.id == sub.problem_id).first()
        if problem:
            recent_activity.append({
                "problem_id": problem.id,
                "problem_title": problem.title,
                "status": sub.status,
                "language": sub.language,
                "created_at": sub.created_at.isoformat() if sub.created_at else None
            })
    
    return {
        "student_id": student_id,
        "total_problems_solved": len(solved_problem_ids),
        "total_submissions": total_submissions,
        "accepted_count": accepted_count,
        "acceptance_rate": (accepted_count / total_submissions * 100) if total_submissions > 0 else 0,
        "problems_by_difficulty": difficulty_stats,
        "language_stats": language_stats,
        "recent_activity": recent_activity
    }


@router.get("/dashboard")
async def get_analytics_dashboard(
    scope: Optional[str] = Query(None, description="Scope: all, college, department, section"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive analytics dashboard - Role-based with drill-down"""
    role_info = get_user_role_info(current_user, db)
    
    # Get overview stats
    overview = await get_coding_problems_overview(start_date, end_date, current_user, db)
    students_overview = await get_students_overview(current_user, db)
    
    # Activity timeline (last 30 days)
    end_dt = datetime.utcnow()
    start_dt = end_dt - timedelta(days=30)
    
    timeline_query = db.query(
        func.date(CodingSubmission.created_at).label('date'),
        func.count(CodingSubmission.id).label('count')
    ).filter(CodingSubmission.created_at >= start_dt)\
     .group_by(func.date(CodingSubmission.created_at))\
     .order_by(func.date(CodingSubmission.created_at))
    
    timeline_data = timeline_query.all()
    activity_timeline = [{"date": str(date), "count": count} for date, count in timeline_data]
    
    # Scope statistics
    scope_stats = {}
    if role_info["is_super_admin"]:
        # Count by scope type
        scope_stats = {
            "svnapro": db.query(CodingProblem).filter(CodingProblem.scope_type == "svnapro").count(),
            "college": db.query(CodingProblem).filter(CodingProblem.scope_type == "college").count(),
            "department": db.query(CodingProblem).filter(CodingProblem.scope_type == "department").count(),
            "section": db.query(CodingProblem).filter(CodingProblem.scope_type == "section").count()
        }
    
    return {
        "role": "super_admin" if role_info["is_super_admin"] else "admin" if role_info["is_admin"] else "hod" if role_info["is_hod"] else "faculty" if role_info["is_faculty"] else "student",
        "overview": overview,
        "students": students_overview,
        "activity_timeline": activity_timeline,
        "scope_stats": scope_stats,
        "filters_applied": {
            "start_date": start_date,
            "end_date": end_date,
            "scope": scope
        }
    }


class CodingActivityRequest(BaseModel):
    problem_id: int
    problem_code: Optional[str] = None
    time_spent_seconds: int
    session_time_seconds: int
    is_final: bool = False
    action: str = "time_track"  # time_track, session_end, submission_accepted, submission_failed


@router.post("/coding-activity")
async def track_coding_activity(
    activity: CodingActivityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Track coding activity - time spent, sessions, submissions"""
    # Create activity record
    activity_record = CodingActivity(
        user_id=current_user.id,
        problem_id=activity.problem_id,
        problem_code=activity.problem_code,
        time_spent_seconds=activity.time_spent_seconds,
        session_time_seconds=activity.session_time_seconds,
        action=activity.action,
        is_final=activity.is_final,
        created_at=datetime.utcnow()
    )
    
    db.add(activity_record)
    db.commit()
    db.refresh(activity_record)
    
    return {
        "success": True,
        "message": "Activity tracked successfully",
        "activity_id": activity_record.id
    }


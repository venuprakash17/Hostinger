"""Analytics Drill-Down API - Hierarchical analytics navigation for admins"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, desc
from app.models.quiz import CodingProblem
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.api.users import get_current_admin_or_super
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.academic import Department, Section
from app.models.user_analytics import UserActivity, UserSession, StudentProgress
from app.models.quiz import CodingProblem, Quiz, QuizAttempt
from app.models.coding_submission import CodingSubmission
from app.models.company_training import CompanyRole, Round
from app.models.coding_lab import CodingLab, LabSubmission
from app.models.job import JobApplication

router = APIRouter(prefix="/analytics/drilldown", tags=["analytics-drilldown"])


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


def get_student_ids_by_filters(
    db: Session,
    college_id: Optional[int] = None,
    department: Optional[str] = None,
    year: Optional[str] = None,
    section_id: Optional[int] = None,
    section_name: Optional[str] = None
) -> List[int]:
    """Get student IDs based on filters"""
    query = db.query(Profile.user_id).join(UserRole).filter(
        UserRole.role == RoleEnum.STUDENT
    )
    
    if college_id:
        query = query.filter(Profile.college_id == college_id)
    if department:
        query = query.filter(Profile.department == department)
    if year:
        query = query.filter(Profile.present_year == year)
    if section_id:
        query = query.filter(Profile.section_id == section_id)
    if section_name:
        query = query.join(Section).filter(Section.name == section_name)
    
    return [row[0] for row in query.all()]


# ==================== Drill-Down Endpoints ====================

@router.get("/admin/overview")
async def get_admin_overview(
    college_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user_tuple: tuple[User, bool] = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    current_user, _ = current_user_tuple
    """Get admin overview with drill-down options"""
    role_info = get_user_role_info(current_user, db)
    
    # Determine college_id
    target_college_id = college_id or role_info["college_id"]
    if not target_college_id and not role_info["is_super_admin"]:
        raise HTTPException(status_code=403, detail="College ID required")
    
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
    
    # Get all departments in this college
    departments_query = db.query(Profile.department).filter(
        Profile.college_id == target_college_id,
        Profile.department.isnot(None)
    ).distinct()
    departments = [dept[0] for dept in departments_query.all()]
    
    # Get all years
    years_query = db.query(Profile.present_year).filter(
        Profile.college_id == target_college_id,
        Profile.present_year.isnot(None)
    ).distinct()
    years = sorted([year[0] for year in years_query.all() if year[0]], key=lambda x: int(x) if x.isdigit() else 0)
    
    # Get all sections
    sections_query = db.query(Section).join(Profile).filter(
        Profile.college_id == target_college_id
    ).distinct()
    sections = sections_query.all()
    
    # Overall stats
    student_ids = get_student_ids_by_filters(db, college_id=target_college_id)
    
    activities_query = db.query(UserActivity).filter(UserActivity.user_id.in_(student_ids))
    if date_filter:
        activities_query = activities_query.filter(date_filter)
    # Limit activities query for performance (use pagination if needed)
    activities = activities_query.limit(10000).all()  # Reasonable limit for analytics
    
    total_students = len(student_ids)
    total_activities = len(activities)
    total_active_minutes = sum(a.active_time_seconds or 0 for a in activities) // 60
    
    # Department breakdown
    department_stats = {}
    for dept in departments:
        dept_student_ids = get_student_ids_by_filters(db, college_id=target_college_id, department=dept)
        dept_activities = [a for a in activities if a.user_id in dept_student_ids]
        department_stats[dept] = {
            "total_students": len(dept_student_ids),
            "total_activities": len(dept_activities),
            "active_minutes": sum(a.active_time_seconds or 0 for a in dept_activities) // 60
        }
    
    # Year breakdown
    year_stats = {}
    for year in years:
        year_student_ids = get_student_ids_by_filters(db, college_id=target_college_id, year=year)
        year_activities = [a for a in activities if a.user_id in year_student_ids]
        year_stats[year] = {
            "total_students": len(year_student_ids),
            "total_activities": len(year_activities),
            "active_minutes": sum(a.active_time_seconds or 0 for a in year_activities) // 60
        }
    
    # Coding stats with detailed time tracking
    coding_submissions = db.query(CodingSubmission).filter(CodingSubmission.user_id.in_(student_ids)).all()
    
    # Get coding activities for time tracking
    coding_activities_query = db.query(UserActivity).filter(
        UserActivity.user_id.in_(student_ids),
        or_(
            UserActivity.activity_category == "coding",
            UserActivity.entity_type == "coding_problem",
            UserActivity.activity_type.in_(["coding_problem_viewed", "coding_problem_started", "code_executed", "code_submitted", "code_accepted", "code_failed", "time_spent"])
        )
    )
    if date_filter:
        coding_activities_query = coding_activities_query.filter(date_filter)
    # Limit for performance
    coding_activities_list = coding_activities_query.limit(10000).all()
    
    # Calculate total coding time in minutes
    total_coding_minutes = sum(a.active_time_seconds or 0 for a in coding_activities_list) // 60
    
    # Average coding time per student
    unique_coding_students = len(set(a.user_id for a in coding_activities_list))
    avg_coding_minutes_per_student = total_coding_minutes / unique_coding_students if unique_coding_students > 0 else 0
    
    coding_stats = {
        "total_problems_solved": len(set(s.problem_id for s in coding_submissions if s.status == "accepted")),
        "total_submissions": len(coding_submissions),
        "acceptance_rate": (len([s for s in coding_submissions if s.status == "accepted"]) / len(coding_submissions) * 100) if coding_submissions else 0,
        "total_coding_minutes": total_coding_minutes,
        "average_coding_minutes_per_student": round(avg_coding_minutes_per_student, 2),
        "students_coding": unique_coding_students
    }
    
    # Quiz stats
    quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id.in_(student_ids)).limit(10000).all()  # Limit for performance
    quiz_stats = {
        "total_quizzes_completed": len([a for a in quiz_attempts if a.is_submitted]),
        "average_score": sum(a.total_score for a in quiz_attempts if a.total_score is not None and a.total_score > 0) / len([a for a in quiz_attempts if a.total_score is not None and a.total_score > 0]) if quiz_attempts else 0
    }
    
    return {
        "college_id": target_college_id,
        "period": {"start_date": start_date, "end_date": end_date},
        "overview": {
            "total_students": total_students,
            "total_activities": total_activities,
            "total_active_minutes": total_active_minutes
        },
        "departments": {
            "list": departments,
            "stats": department_stats
        },
        "years": {
            "list": years,
            "stats": year_stats
        },
        "sections": [
            {
                "id": s.id,
                "name": s.name,
                "department": s.department.name if s.department else "Unknown",
                "year": s.year if s.year else None
            }
            for s in sections
        ],
        "coding": coding_stats,
        "quizzes": quiz_stats
    }


@router.get("/admin/department/{department}")
async def get_department_drilldown(
    department: str,
    college_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user_tuple: tuple[User, bool] = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    current_user, _ = current_user_tuple
    """Drill down into a specific department"""
    role_info = get_user_role_info(current_user, db)
    target_college_id = college_id or role_info["college_id"]
    
    if not target_college_id and not role_info["is_super_admin"]:
        raise HTTPException(status_code=403, detail="College ID required")
    
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
    
    # Get students in this department
    student_ids = get_student_ids_by_filters(db, college_id=target_college_id, department=department)
    
    # Get activities
    activities_query = db.query(UserActivity).filter(UserActivity.user_id.in_(student_ids))
    if date_filter:
        activities_query = activities_query.filter(date_filter)
    # Limit activities query for performance (use pagination if needed)
    activities = activities_query.limit(10000).all()  # Reasonable limit for analytics
    
    # Get years in this department
    years_query = db.query(Profile.present_year).filter(
        Profile.college_id == target_college_id,
        Profile.department == department,
        Profile.present_year.isnot(None)
    ).distinct()
    years = sorted([year[0] for year in years_query.all() if year[0]], key=lambda x: int(x) if x.isdigit() else 0)
    
    # Get sections in this department
    # First get department_id from Department model
    dept_model = db.query(Department).filter(
        Department.college_id == target_college_id,
        Department.name == department
    ).first()
    
    if dept_model:
        sections_query = db.query(Section).filter(
            Section.college_id == target_college_id,
            Section.department_id == dept_model.id
        ).distinct()
    else:
        # Fallback to string matching
        sections_query = db.query(Section).join(Profile).filter(
            Profile.college_id == target_college_id,
            Profile.department == department
        ).distinct()
    sections = sections_query.all()
    
    # Year breakdown
    year_stats = {}
    for year in years:
        year_student_ids = get_student_ids_by_filters(
            db, college_id=target_college_id, department=department, year=year
        )
        year_activities = [a for a in activities if a.user_id in year_student_ids]
        year_stats[year] = {
            "total_students": len(year_student_ids),
            "total_activities": len(year_activities),
            "active_minutes": sum(a.active_time_seconds or 0 for a in year_activities) // 60
        }
    
    # Section breakdown
    section_stats = {}
    for section in sections:
        section_student_ids = get_student_ids_by_filters(
            db, college_id=target_college_id, department=department, section_id=section.id
        )
        section_activities = [a for a in activities if a.user_id in section_student_ids]
        section_stats[section.name] = {
            "id": section.id,
            "year": section.year if section.year else None,
            "department": section.department.name if section.department else department,
            "total_students": len(section_student_ids),
            "total_activities": len(section_activities),
            "active_minutes": sum(a.active_time_seconds or 0 for a in section_activities) // 60
        }
    
    # Coding stats with detailed time tracking
    coding_submissions = db.query(CodingSubmission).filter(CodingSubmission.user_id.in_(student_ids)).all()
    
    # Get coding activities for time tracking
    coding_activities_query = db.query(UserActivity).filter(
        UserActivity.user_id.in_(student_ids),
        or_(
            UserActivity.activity_category == "coding",
            UserActivity.entity_type == "coding_problem",
            UserActivity.activity_type.in_(["coding_problem_viewed", "coding_problem_started", "code_executed", "code_submitted", "code_accepted", "code_failed", "time_spent"])
        )
    )
    if date_filter:
        coding_activities_query = coding_activities_query.filter(date_filter)
    # Limit for performance
    coding_activities_list = coding_activities_query.limit(10000).all()
    
    # Calculate total coding time in minutes
    total_coding_minutes = sum(a.active_time_seconds or 0 for a in coding_activities_list) // 60
    
    # Average coding time per student
    unique_coding_students = len(set(a.user_id for a in coding_activities_list))
    avg_coding_minutes_per_student = total_coding_minutes / unique_coding_students if unique_coding_students > 0 else 0
    
    coding_stats = {
        "total_problems_solved": len(set(s.problem_id for s in coding_submissions if s.status == "accepted")),
        "total_submissions": len(coding_submissions),
        "acceptance_rate": (len([s for s in coding_submissions if s.status == "accepted"]) / len(coding_submissions) * 100) if coding_submissions else 0,
        "total_coding_minutes": total_coding_minutes,
        "average_coding_minutes_per_student": round(avg_coding_minutes_per_student, 2),
        "students_coding": unique_coding_students
    }
    
    return {
        "department": department,
        "college_id": target_college_id,
        "period": {"start_date": start_date, "end_date": end_date},
        "overview": {
            "total_students": len(student_ids),
            "total_activities": len(activities),
            "total_active_minutes": sum(a.active_time_seconds or 0 for a in activities) // 60
        },
        "years": {
            "list": years,
            "stats": year_stats
        },
        "sections": {
            "list": [{"id": s.id, "name": s.name, "year": s.year} for s in sections],
            "stats": section_stats
        },
        "coding": coding_stats
    }


@router.get("/admin/year/{year}")
async def get_year_drilldown(
    year: str,
    department: Optional[str] = Query(None),
    college_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user_tuple: tuple[User, bool] = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    current_user, _ = current_user_tuple
    """Drill down into a specific year"""
    role_info = get_user_role_info(current_user, db)
    target_college_id = college_id or role_info["college_id"]
    
    if not target_college_id and not role_info["is_super_admin"]:
        raise HTTPException(status_code=403, detail="College ID required")
    
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
    
    # Build filters
    filters = {"college_id": target_college_id, "year": year}
    if department:
        filters["department"] = department
    
    # Get students
    student_ids = get_student_ids_by_filters(db, **filters)
    
    # Get activities
    activities_query = db.query(UserActivity).filter(UserActivity.user_id.in_(student_ids))
    if date_filter:
        activities_query = activities_query.filter(date_filter)
    # Limit activities query for performance (use pagination if needed)
    activities = activities_query.limit(10000).all()  # Reasonable limit for analytics
    
    # Get sections for this year
    sections_query = db.query(Section).join(Profile).filter(
        Profile.college_id == target_college_id,
        Profile.present_year == year
    )
    if department:
        sections_query = sections_query.filter(Profile.department == department)
    sections = sections_query.distinct().all()
    
    # Section breakdown
    section_stats = {}
    for section in sections:
        section_student_ids = get_student_ids_by_filters(
            db, college_id=target_college_id, year=year, section_id=section.id
        )
        section_activities = [a for a in activities if a.user_id in section_student_ids]
        section_stats[section.name] = {
            "id": section.id,
            "department": section.department.name if section.department else (department or "Unknown"),
            "year": section.year if section.year else None,
            "total_students": len(section_student_ids),
            "total_activities": len(section_activities),
            "active_minutes": sum(a.active_time_seconds or 0 for a in section_activities) // 60
        }
    
    # Student breakdown (top 20 by activity)
    student_activities = {}
    for activity in activities:
        if activity.user_id not in student_activities:
            student_activities[activity.user_id] = {
                "activities": 0,
                "active_minutes": 0
            }
        student_activities[activity.user_id]["activities"] += 1
        if activity.active_time_seconds:
            student_activities[activity.user_id]["active_minutes"] += (activity.active_time_seconds // 60)
    
    # Get student details
    top_students = sorted(
        student_activities.items(),
        key=lambda x: x[1]["activities"],
        reverse=True
    )[:20]
    
    student_list = []
    for user_id, stats in top_students:
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        if profile and user:
            student_list.append({
                "user_id": user_id,
                "name": profile.full_name or user.email,
                "email": user.email,
                "section": profile.section,
                "department": profile.department,
                "activities": stats["activities"],
                "active_minutes": stats["active_minutes"]
            })
    
    # Coding stats with detailed time tracking
    coding_submissions = db.query(CodingSubmission).filter(CodingSubmission.user_id.in_(student_ids)).all()
    
    # Get coding activities for time tracking
    coding_activities_query = db.query(UserActivity).filter(
        UserActivity.user_id.in_(student_ids),
        or_(
            UserActivity.activity_category == "coding",
            UserActivity.entity_type == "coding_problem",
            UserActivity.activity_type.in_(["coding_problem_viewed", "coding_problem_started", "code_executed", "code_submitted", "code_accepted", "code_failed", "time_spent"])
        )
    )
    if date_filter:
        coding_activities_query = coding_activities_query.filter(date_filter)
    # Limit for performance
    coding_activities_list = coding_activities_query.limit(10000).all()
    
    # Calculate total coding time in minutes
    total_coding_minutes = sum(a.active_time_seconds or 0 for a in coding_activities_list) // 60
    
    # Add coding minutes to top students
    for student in student_list:
        student_coding_activities = [a for a in coding_activities_list if a.user_id == student["user_id"]]
        student["coding_minutes"] = sum(a.active_time_seconds or 0 for a in student_coding_activities) // 60
    
    coding_stats = {
        "total_problems_solved": len(set(s.problem_id for s in coding_submissions if s.status == "accepted")),
        "total_submissions": len(coding_submissions),
        "acceptance_rate": (len([s for s in coding_submissions if s.status == "accepted"]) / len(coding_submissions) * 100) if coding_submissions else 0,
        "total_coding_minutes": total_coding_minutes,
        "average_coding_minutes_per_student": round(total_coding_minutes / len(student_ids), 2) if student_ids else 0
    }
    
    return {
        "year": year,
        "department": department,
        "college_id": target_college_id,
        "period": {"start_date": start_date, "end_date": end_date},
        "overview": {
            "total_students": len(student_ids),
            "total_activities": len(activities),
            "total_active_minutes": sum(a.active_time_seconds or 0 for a in activities) // 60
        },
        "sections": {
            "list": [{"id": s.id, "name": s.name, "department": s.department} for s in sections],
            "stats": section_stats
        },
        "top_students": student_list,
        "coding": coding_stats
    }


@router.get("/admin/section/{section_id}")
async def get_section_drilldown(
    section_id: int,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user_tuple: tuple[User, bool] = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    current_user, _ = current_user_tuple
    """Drill down into a specific section"""
    role_info = get_user_role_info(current_user, db)
    
    # Get section
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    
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
    
    # Get students in this section
    student_ids = get_student_ids_by_filters(db, section_id=section_id)
    
    # Get activities
    activities_query = db.query(UserActivity).filter(UserActivity.user_id.in_(student_ids))
    if date_filter:
        activities_query = activities_query.filter(date_filter)
    # Limit activities query for performance (use pagination if needed)
    activities = activities_query.limit(10000).all()  # Reasonable limit for analytics
    
    # Student breakdown
    student_activities = {}
    for activity in activities:
        if activity.user_id not in student_activities:
            student_activities[activity.user_id] = {
                "activities": 0,
                "active_minutes": 0,
                "by_type": {}
            }
        student_activities[activity.user_id]["activities"] += 1
        if activity.active_time_seconds:
            student_activities[activity.user_id]["active_minutes"] += (activity.active_time_seconds // 60)
        
        activity_type = activity.activity_type
        if activity_type not in student_activities[activity.user_id]["by_type"]:
            student_activities[activity.user_id]["by_type"][activity_type] = 0
        student_activities[activity.user_id]["by_type"][activity_type] += 1
    
    # Get student details
    students_list = []
    for user_id, stats in student_activities.items():
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        if profile and user:
            # Get coding stats for this student
            coding_submissions = db.query(CodingSubmission).filter(
                CodingSubmission.user_id == user_id
            ).all()
            solved = len(set(s.problem_id for s in coding_submissions if s.status == "accepted"))
            
            # Get coding time for this student
            student_coding_activities = db.query(UserActivity).filter(
                UserActivity.user_id == user_id,
                or_(
                    UserActivity.activity_category == "coding",
                    UserActivity.entity_type == "coding_problem",
                    UserActivity.activity_type.in_(["coding_problem_viewed", "coding_problem_started", "code_executed", "code_submitted", "code_accepted", "code_failed", "time_spent"])
                )
            )
            if date_filter:
                student_coding_activities = student_coding_activities.filter(date_filter)
            student_coding_activities_list = student_coding_activities.all()
            coding_minutes = sum(a.active_time_seconds or 0 for a in student_coding_activities_list) // 60
            
            students_list.append({
                "user_id": user_id,
                "name": profile.full_name or user.email,
                "email": user.email,
                "roll_number": profile.roll_number,
                "activities": stats["activities"],
                "active_minutes": stats["active_minutes"],
                "activity_breakdown": stats["by_type"],
                "coding_problems_solved": solved,
                "total_submissions": len(coding_submissions),
                "coding_minutes": coding_minutes
            })
    
    # Sort by activities and limit for performance
    students_list.sort(key=lambda x: x["activities"], reverse=True)
    students_list = students_list[:100]  # Limit to top 100 students for performance
    
    # Coding stats with detailed time tracking
    coding_submissions = db.query(CodingSubmission).filter(CodingSubmission.user_id.in_(student_ids)).all()
    
    # Get coding activities for time tracking
    coding_activities_query = db.query(UserActivity).filter(
        UserActivity.user_id.in_(student_ids),
        or_(
            UserActivity.activity_category == "coding",
            UserActivity.entity_type == "coding_problem",
            UserActivity.activity_type.in_(["coding_problem_viewed", "coding_problem_started", "code_executed", "code_submitted", "code_accepted", "code_failed", "time_spent"])
        )
    )
    if date_filter:
        coding_activities_query = coding_activities_query.filter(date_filter)
    # Limit for performance
    coding_activities_list = coding_activities_query.limit(10000).all()
    
    # Calculate total coding time in minutes
    total_coding_minutes = sum(a.active_time_seconds or 0 for a in coding_activities_list) // 60
    
    coding_stats = {
        "total_problems_solved": len(set(s.problem_id for s in coding_submissions if s.status == "accepted")),
        "total_submissions": len(coding_submissions),
        "acceptance_rate": (len([s for s in coding_submissions if s.status == "accepted"]) / len(coding_submissions) * 100) if coding_submissions else 0,
        "total_coding_minutes": total_coding_minutes,
        "average_coding_minutes_per_student": round(total_coding_minutes / len(student_ids), 2) if student_ids else 0
    }
    
    return {
        "section": {
            "id": section.id,
            "name": section.name,
            "department": section.department.name if section.department else (profile.department if profile else "Unknown"),
            "year": section.year if section.year else None
        },
        "period": {"start_date": start_date, "end_date": end_date},
        "overview": {
            "total_students": len(student_ids),
            "total_activities": len(activities),
            "total_active_minutes": sum(a.active_time_seconds or 0 for a in activities) // 60
        },
        "students": students_list,
        "coding": coding_stats
    }


@router.get("/admin/student/{student_id}")
async def get_student_drilldown(
    student_id: int,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user_tuple: tuple[User, bool] = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    current_user, _ = current_user_tuple
    """Get detailed analytics for a specific student (admin view)"""
    role_info = get_user_role_info(current_user, db)
    
    # Get student profile
    profile = db.query(Profile).filter(Profile.user_id == student_id).first()
    user = db.query(User).filter(User.id == student_id).first()
    
    if not profile or not user:
        raise HTTPException(status_code=404, detail="Student not found")
    
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
    
    # Calculate metrics
    total_active_minutes = sum(a.active_time_seconds or 0 for a in activities) // 60
    
    # Activity breakdown
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
    
    # Daily activity
    daily_activity = {}
    for activity in activities:
        date_str = activity.created_at.date().isoformat() if activity.created_at else datetime.utcnow().date().isoformat()
        if date_str not in daily_activity:
            daily_activity[date_str] = {
                "activities": 0,
                "active_minutes": 0
            }
        daily_activity[date_str]["activities"] += 1
        if activity.active_time_seconds:
            daily_activity[date_str]["active_minutes"] += (activity.active_time_seconds // 60)
    
    # Coding stats with detailed time tracking - limited for performance
    coding_submissions = db.query(CodingSubmission).filter(CodingSubmission.user_id == student_id).limit(10000).all()  # Limit for performance
    
    # Get all coding activities
    coding_activities = [a for a in activities if a.activity_category == "coding" or a.entity_type == "coding_problem" or a.activity_type in ["coding_problem_viewed", "coding_problem_started", "code_executed", "code_submitted", "code_accepted", "code_failed", "time_spent"]]
    
    # Calculate total coding time
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
                coding_time_by_problem[problem_id] = {
                    "minutes": 0,
                    "problem_name": activity.entity_name or f"Problem {problem_id}"
                }
            coding_time_by_problem[problem_id]["minutes"] += (activity.active_time_seconds // 60)
    
    # Get problem names for better display
    for problem_id_str, data in coding_time_by_problem.items():
        try:
            problem_id = int(problem_id_str)
            problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
            if problem:
                coding_time_by_problem[problem_id_str]["problem_name"] = problem.title
        except:
            pass
    
    # Average coding time per problem
    unique_problems = len(set(a.entity_id for a in coding_activities if a.entity_id))
    avg_coding_time_per_problem = total_coding_minutes / unique_problems if unique_problems > 0 else 0
    
    # Coding sessions (continuous coding periods)
    coding_sessions = []
    if coding_activities:
        # Group activities by date and calculate sessions
        activities_by_date = {}
        for activity in coding_activities:
            if activity.created_at:
                date_str = activity.created_at.date().isoformat()
                if date_str not in activities_by_date:
                    activities_by_date[date_str] = []
                activities_by_date[date_str].append(activity)
        
        for date_str, day_activities in activities_by_date.items():
            day_minutes = sum(a.active_time_seconds or 0 for a in day_activities) // 60
            coding_sessions.append({
                "date": date_str,
                "minutes": day_minutes,
                "activities": len(day_activities)
            })
    
    coding_stats = {
        "total_problems_viewed": len(set(a.entity_id for a in coding_activities if a.entity_id and a.activity_type == "coding_problem_viewed")),
        "total_problems_attempted": len(set(a.entity_id for a in coding_activities if a.entity_id and a.activity_type == "coding_problem_started")),
        "total_problems_solved": len(set(s.problem_id for s in coding_submissions if s.status == "accepted")),
        "total_submissions": len(coding_submissions),
        "acceptance_rate": (len([s for s in coding_submissions if s.status == "accepted"]) / len(coding_submissions) * 100) if coding_submissions else 0,
        "total_coding_minutes": total_coding_minutes,
        "average_coding_minutes_per_problem": round(avg_coding_time_per_problem, 2),
        "coding_time_by_day": coding_time_by_day,
        "coding_time_by_problem": {str(k): v for k, v in list(coding_time_by_problem.items())[:30]},  # Top 30 problems
        "coding_sessions": sorted(coding_sessions, key=lambda x: x["date"], reverse=True)[:30]  # Last 30 days
    }
    
    # Quiz stats
    quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == student_id).all()
    quiz_stats = {
        "total_quizzes_attempted": len(set(a.quiz_id for a in quiz_attempts)),
        "total_quizzes_completed": len([a for a in quiz_attempts if a.is_submitted]),
        "average_score": sum(a.total_score for a in quiz_attempts if a.total_score is not None and a.total_score > 0) / len([a for a in quiz_attempts if a.total_score is not None and a.total_score > 0]) if quiz_attempts else 0
    }
    
    return {
        "student": {
            "id": student_id,
            "name": profile.full_name or user.email,
            "email": user.email,
            "roll_number": profile.roll_number,
            "department": profile.department,
            "section": profile.section,
            "year": profile.present_year
        },
        "period": {"start_date": start_date, "end_date": end_date},
        "overview": {
            "total_activities": len(activities),
            "total_active_minutes": total_active_minutes,
            "activity_breakdown": activity_breakdown
        },
        "daily_activity": daily_activity,
        "coding": coding_stats,
        "quizzes": quiz_stats,
        "recent_activities": [
            {
                "id": a.id,
                "activity_type": a.activity_type,
                "entity_name": a.entity_name,
                "status": a.status,
                "active_time_seconds": a.active_time_seconds,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in activities[:50]
        ]
    }


"""Resume Analytics API - Track and retrieve resume analytics with role-based access"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.api.users import get_current_admin_or_super
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.resume_analytics import ResumeAnalytics, StudentResumeProgress

router = APIRouter(prefix="/resume/analytics", tags=["resume-analytics"])


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


def get_student_ids_by_scope(role_info: dict, db: Session) -> List[int]:
    """Get student IDs based on user's role and scope"""
    student_query = db.query(User.id).join(UserRole).filter(UserRole.role == RoleEnum.STUDENT)
    
    if role_info["is_super_admin"]:
        # All students
        pass
    elif role_info["is_admin"] and role_info["college_id"]:
        # College students
        student_query = student_query.join(Profile).filter(Profile.college_id == role_info["college_id"])
    elif role_info["is_hod"] and role_info["college_id"] and role_info["department"]:
        # Department students
        student_query = student_query.join(Profile).filter(
            Profile.college_id == role_info["college_id"],
            Profile.department == role_info["department"]
        )
    elif role_info["is_faculty"] and role_info["section_id"]:
        # Section students
        student_query = student_query.join(Profile).filter(Profile.section_id == role_info["section_id"])
    else:
        # Student sees only themselves
        return []
    
    return [row[0] for row in student_query.all()]


# ==================== Schemas ====================

class ResumeAnalyticsTrackRequest(BaseModel):
    """Request to track resume analytics event"""
    activity_type: str  # ats_check, cover_letter, role_optimization, pdf_generation, text_enhancement
    ats_score: Optional[float] = None
    previous_ats_score: Optional[float] = None
    target_role: Optional[str] = None
    company_name: Optional[str] = None
    job_description_provided: bool = False
    duration_seconds: Optional[int] = None
    tokens_used: Optional[int] = None
    estimated_cost: Optional[float] = None
    recommendations: Optional[List[str]] = None
    missing_keywords: Optional[List[str]] = None
    strengths: Optional[List[str]] = None
    improvements: Optional[List[str]] = None
    status: str = "success"
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ResumeAnalyticsResponse(BaseModel):
    """Resume analytics response"""
    id: int
    user_id: int
    activity_type: str
    ats_score: Optional[float]
    previous_ats_score: Optional[float]
    score_improvement: Optional[float]
    target_role: Optional[str]
    company_name: Optional[str]
    duration_seconds: Optional[int]
    tokens_used: Optional[int]
    estimated_cost: Optional[float]
    recommendations: Optional[List[str]]
    missing_keywords: Optional[List[str]]
    strengths: Optional[List[str]]
    improvements: Optional[List[str]]
    status: str
    created_at: datetime


class StudentResumeSummary(BaseModel):
    """Summary of student resume progress"""
    user_id: int
    full_name: Optional[str]
    email: Optional[str]
    college_id: Optional[int]
    department: Optional[str]
    section: Optional[str]
    profile_completeness: float
    current_ats_score: Optional[float]
    best_ats_score: Optional[float]
    average_ats_score: float
    total_ats_checks: int
    total_resumes_generated: int
    total_cover_letters_generated: int
    total_role_optimizations: int
    last_ats_check_at: Optional[datetime]
    last_resume_generated_at: Optional[datetime]
    needs_optimization: bool  # True if ATS score < 70 or completeness < 100


class ResumeAnalyticsOverview(BaseModel):
    """Overview of resume analytics"""
    total_students: int
    students_with_resumes: int
    average_ats_score: float
    average_completeness: float
    total_resumes_generated: int
    total_cover_letters: int
    total_optimizations: int
    total_tokens_used: int
    total_cost: float
    students_needing_optimization: int
    top_students: List[StudentResumeSummary]
    students_by_department: Dict[str, int]
    ats_score_distribution: Dict[str, int]  # score ranges: 0-50, 51-70, 71-85, 86-100


# ==================== Tracking Endpoints ====================

@router.post("/track")
async def track_resume_analytics(
    request: ResumeAnalyticsTrackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Track a resume analytics event"""
    try:
        # Calculate score improvement if both scores provided
        score_improvement = None
        if request.ats_score is not None and request.previous_ats_score is not None:
            if request.previous_ats_score > 0:
                score_improvement = ((request.ats_score - request.previous_ats_score) / request.previous_ats_score) * 100
            else:
                score_improvement = 100.0 if request.ats_score > 0 else 0.0
        
        # Create analytics record
        analytics = ResumeAnalytics(
            user_id=current_user.id,
            activity_type=request.activity_type,
            ats_score=request.ats_score,
            previous_ats_score=request.previous_ats_score,
            score_improvement=score_improvement,
            target_role=request.target_role,
            company_name=request.company_name,
            job_description_provided="true" if request.job_description_provided else "false",
            duration_seconds=request.duration_seconds,
            tokens_used=request.tokens_used,
            estimated_cost=request.estimated_cost,
            recommendations=request.recommendations,
            missing_keywords=request.missing_keywords,
            strengths=request.strengths,
            improvements=request.improvements,
            status=request.status,
            error_message=request.error_message,
            extra_data=request.metadata
        )
        
        db.add(analytics)
        
        # Update or create student progress
        progress = db.query(StudentResumeProgress).filter(
            StudentResumeProgress.user_id == current_user.id
        ).first()
        
        if not progress:
            progress = StudentResumeProgress(user_id=current_user.id)
            db.add(progress)
        
        # Update progress based on activity type
        if request.activity_type == "ats_check" and request.ats_score is not None:
            progress.total_ats_checks += 1
            progress.current_ats_score = request.ats_score
            progress.last_ats_check_at = datetime.utcnow()
            
            if progress.best_ats_score is None or request.ats_score > progress.best_ats_score:
                progress.best_ats_score = request.ats_score
            
            # Update average
            if progress.total_ats_checks > 0:
                progress.average_ats_score = (
                    (progress.average_ats_score * (progress.total_ats_checks - 1) + request.ats_score) 
                    / progress.total_ats_checks
                )
        
        elif request.activity_type == "pdf_generation":
            progress.total_resumes_generated += 1
            progress.last_resume_generated_at = datetime.utcnow()
        
        elif request.activity_type == "cover_letter":
            progress.total_cover_letters_generated += 1
            progress.last_cover_letter_at = datetime.utcnow()
        
        elif request.activity_type == "role_optimization":
            progress.total_role_optimizations += 1
            progress.last_optimization_at = datetime.utcnow()
        
        elif request.activity_type == "text_enhancement":
            progress.total_text_enhancements += 1
        
        # Update AI usage
        if request.tokens_used:
            progress.total_tokens_used += request.tokens_used
        if request.estimated_cost:
            progress.total_estimated_cost += request.estimated_cost
        
        # Update profile completeness from metadata (stored in extra_data)
        if request.metadata and "completeness" in request.metadata:
            progress.profile_completeness = request.metadata["completeness"]
        if request.metadata and "sections_completed" in request.metadata:
            progress.sections_completed = request.metadata["sections_completed"]
        
        db.commit()
        db.refresh(analytics)
        
        return {"id": analytics.id, "status": "tracked"}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error tracking analytics: {str(e)}")


# ==================== Retrieval Endpoints ====================

@router.get("/overview", response_model=ResumeAnalyticsOverview)
async def get_resume_analytics_overview(
    college_id: Optional[int] = Query(None),
    department: Optional[str] = Query(None),
    section_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overview of resume analytics - Role-based access"""
    role_info = get_user_role_info(current_user, db)
    
    # Get student IDs based on scope
    student_ids = get_student_ids_by_scope(role_info, db)
    
    # If student, only see themselves
    if role_info["is_student"] and not (role_info["is_admin"] or role_info["is_hod"] or role_info["is_faculty"]):
        student_ids = [current_user.id]
    
    # Apply filters
    progress_query = db.query(StudentResumeProgress)
    if student_ids:
        progress_query = progress_query.filter(StudentResumeProgress.user_id.in_(student_ids))
    
    # Additional filters
    if college_id:
        student_ids_with_college = db.query(Profile.user_id).filter(
            Profile.college_id == college_id
        ).subquery()
        progress_query = progress_query.filter(StudentResumeProgress.user_id.in_(student_ids_with_college))
    
    if department:
        student_ids_with_dept = db.query(Profile.user_id).filter(
            Profile.department == department
        ).subquery()
        progress_query = progress_query.filter(StudentResumeProgress.user_id.in_(student_ids_with_dept))
    
    if section_id:
        student_ids_with_section = db.query(Profile.user_id).filter(
            Profile.section_id == section_id
        ).subquery()
        progress_query = progress_query.filter(StudentResumeProgress.user_id.in_(student_ids_with_section))
    
    all_progress = progress_query.all()
    
    # Calculate overview metrics
    total_students = len(all_progress)
    students_with_resumes = len([p for p in all_progress if p.total_resumes_generated > 0])
    
    ats_scores = [p.current_ats_score for p in all_progress if p.current_ats_score is not None]
    average_ats_score = sum(ats_scores) / len(ats_scores) if ats_scores else 0.0
    
    completeness_scores = [p.profile_completeness for p in all_progress]
    average_completeness = sum(completeness_scores) / len(completeness_scores) if completeness_scores else 0.0
    
    total_resumes = sum(p.total_resumes_generated for p in all_progress)
    total_cover_letters = sum(p.total_cover_letters_generated for p in all_progress)
    total_optimizations = sum(p.total_role_optimizations for p in all_progress)
    total_tokens = sum(p.total_tokens_used for p in all_progress)
    total_cost = sum(p.total_estimated_cost for p in all_progress)
    
    students_needing_optimization = len([
        p for p in all_progress 
        if (p.current_ats_score is not None and p.current_ats_score < 70) or p.profile_completeness < 100
    ])
    
    # Get top students (by ATS score)
    top_students_data = []
    for progress in sorted(all_progress, key=lambda p: p.best_ats_score or 0, reverse=True)[:10]:
        profile = db.query(Profile).filter(Profile.user_id == progress.user_id).first()
        user = db.query(User).filter(User.id == progress.user_id).first()
        
        top_students_data.append(StudentResumeSummary(
            user_id=progress.user_id,
            full_name=profile.full_name if profile else None,
            email=user.email if user else None,
            college_id=profile.college_id if profile else None,
            department=profile.department if profile else None,
            section=profile.section if profile else None,
            profile_completeness=progress.profile_completeness,
            current_ats_score=progress.current_ats_score,
            best_ats_score=progress.best_ats_score,
            average_ats_score=progress.average_ats_score,
            total_ats_checks=progress.total_ats_checks,
            total_resumes_generated=progress.total_resumes_generated,
            total_cover_letters_generated=progress.total_cover_letters_generated,
            total_role_optimizations=progress.total_role_optimizations,
            last_ats_check_at=progress.last_ats_check_at,
            last_resume_generated_at=progress.last_resume_generated_at,
            needs_optimization=(progress.current_ats_score is not None and progress.current_ats_score < 70) or progress.profile_completeness < 100
        ))
    
    # Students by department
    students_by_department: Dict[str, int] = {}
    for progress in all_progress:
        profile = db.query(Profile).filter(Profile.user_id == progress.user_id).first()
        if profile and profile.department:
            students_by_department[profile.department] = students_by_department.get(profile.department, 0) + 1
    
    # ATS score distribution
    ats_distribution = {"0-50": 0, "51-70": 0, "71-85": 0, "86-100": 0}
    for progress in all_progress:
        if progress.current_ats_score is not None:
            score = progress.current_ats_score
            if score <= 50:
                ats_distribution["0-50"] += 1
            elif score <= 70:
                ats_distribution["51-70"] += 1
            elif score <= 85:
                ats_distribution["71-85"] += 1
            else:
                ats_distribution["86-100"] += 1
    
    return ResumeAnalyticsOverview(
        total_students=total_students,
        students_with_resumes=students_with_resumes,
        average_ats_score=average_ats_score,
        average_completeness=average_completeness,
        total_resumes_generated=total_resumes,
        total_cover_letters=total_cover_letters,
        total_optimizations=total_optimizations,
        total_tokens_used=total_tokens,
        total_cost=total_cost,
        students_needing_optimization=students_needing_optimization,
        top_students=top_students_data,
        students_by_department=students_by_department,
        ats_score_distribution=ats_distribution
    )


@router.get("/students", response_model=List[StudentResumeSummary])
async def get_students_resume_analytics(
    college_id: Optional[int] = Query(None),
    department: Optional[str] = Query(None),
    section_id: Optional[int] = Query(None),
    needs_optimization: Optional[bool] = Query(None, description="Filter students needing optimization"),
    min_ats_score: Optional[float] = Query(None, description="Minimum ATS score"),
    max_ats_score: Optional[float] = Query(None, description="Maximum ATS score"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get resume analytics for all students in scope - Role-based"""
    role_info = get_user_role_info(current_user, db)
    
    # Get student IDs based on scope
    student_ids = get_student_ids_by_scope(role_info, db)
    
    if role_info["is_student"] and not (role_info["is_admin"] or role_info["is_hod"] or role_info["is_faculty"]):
        student_ids = [current_user.id]
    
    # Build query
    progress_query = db.query(StudentResumeProgress)
    if student_ids:
        progress_query = progress_query.filter(StudentResumeProgress.user_id.in_(student_ids))
    
    # Apply filters
    if college_id:
        student_ids_with_college = db.query(Profile.user_id).filter(
            Profile.college_id == college_id
        ).subquery()
        progress_query = progress_query.filter(StudentResumeProgress.user_id.in_(student_ids_with_college))
    
    if department:
        student_ids_with_dept = db.query(Profile.user_id).filter(
            Profile.department == department
        ).subquery()
        progress_query = progress_query.filter(StudentResumeProgress.user_id.in_(student_ids_with_dept))
    
    if section_id:
        student_ids_with_section = db.query(Profile.user_id).filter(
            Profile.section_id == section_id
        ).subquery()
        progress_query = progress_query.filter(StudentResumeProgress.user_id.in_(student_ids_with_section))
    
    all_progress = progress_query.all()
    
    # Build response
    students_data = []
    for progress in all_progress:
        profile = db.query(Profile).filter(Profile.user_id == progress.user_id).first()
        user = db.query(User).filter(User.id == progress.user_id).first()
        
        needs_opt = (progress.current_ats_score is not None and progress.current_ats_score < 70) or progress.profile_completeness < 100
        
        # Apply filters
        if needs_optimization is not None and needs_opt != needs_optimization:
            continue
        
        if min_ats_score is not None and (progress.current_ats_score is None or progress.current_ats_score < min_ats_score):
            continue
        
        if max_ats_score is not None and (progress.current_ats_score is not None and progress.current_ats_score > max_ats_score):
            continue
        
        students_data.append(StudentResumeSummary(
            user_id=progress.user_id,
            full_name=profile.full_name if profile else None,
            email=user.email if user else None,
            college_id=profile.college_id if profile else None,
            department=profile.department if profile else None,
            section=profile.section if profile else None,
            profile_completeness=progress.profile_completeness,
            current_ats_score=progress.current_ats_score,
            best_ats_score=progress.best_ats_score,
            average_ats_score=progress.average_ats_score,
            total_ats_checks=progress.total_ats_checks,
            total_resumes_generated=progress.total_resumes_generated,
            total_cover_letters_generated=progress.total_cover_letters_generated,
            total_role_optimizations=progress.total_role_optimizations,
            last_ats_check_at=progress.last_ats_check_at,
            last_resume_generated_at=progress.last_resume_generated_at,
            needs_optimization=needs_opt
        ))
    
    return students_data


@router.get("/students/{student_id}/detailed")
async def get_student_resume_analytics_detailed(
    student_id: int,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed resume analytics for a specific student"""
    role_info = get_user_role_info(current_user, db)
    
    # Permission check
    if not (role_info["is_super_admin"] or role_info["is_admin"] or 
            role_info["is_hod"] or role_info["is_faculty"] or 
            current_user.id == student_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get progress
    progress = db.query(StudentResumeProgress).filter(
        StudentResumeProgress.user_id == student_id
    ).first()
    
    if not progress:
        raise HTTPException(status_code=404, detail="Student resume progress not found")
    
    # Get analytics history
    analytics_query = db.query(ResumeAnalytics).filter(
        ResumeAnalytics.user_id == student_id
    )
    
    # Date filters
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            analytics_query = analytics_query.filter(ResumeAnalytics.created_at >= start_dt)
        except:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            analytics_query = analytics_query.filter(ResumeAnalytics.created_at <= end_dt)
        except:
            pass
    
    analytics_history = analytics_query.order_by(desc(ResumeAnalytics.created_at)).limit(100).all()
    
    # Get profile
    profile = db.query(Profile).filter(Profile.user_id == student_id).first()
    user = db.query(User).filter(User.id == student_id).first()
    
    # Activity breakdown
    activity_breakdown = {}
    for activity in analytics_history:
        activity_type = activity.activity_type
        if activity_type not in activity_breakdown:
            activity_breakdown[activity_type] = {
                "count": 0,
                "success_count": 0,
                "total_tokens": 0,
                "total_cost": 0.0,
                "average_duration": 0.0
            }
        
        activity_breakdown[activity_type]["count"] += 1
        if activity.status == "success":
            activity_breakdown[activity_type]["success_count"] += 1
        if activity.tokens_used:
            activity_breakdown[activity_type]["total_tokens"] += activity.tokens_used
        if activity.estimated_cost:
            activity_breakdown[activity_type]["total_cost"] += activity.estimated_cost
    
    # Calculate averages
    for activity_type, stats in activity_breakdown.items():
        durations = [a.duration_seconds for a in analytics_history 
                    if a.activity_type == activity_type and a.duration_seconds]
        if durations:
            stats["average_duration"] = sum(durations) / len(durations)
    
    return {
        "student": {
            "user_id": student_id,
            "full_name": profile.full_name if profile else None,
            "email": user.email if user else None,
            "college_id": profile.college_id if profile else None,
            "department": profile.department if profile else None,
            "section": profile.section if profile else None,
        },
        "progress": {
            "profile_completeness": progress.profile_completeness,
            "current_ats_score": progress.current_ats_score,
            "best_ats_score": progress.best_ats_score,
            "average_ats_score": progress.average_ats_score,
            "total_ats_checks": progress.total_ats_checks,
            "total_resumes_generated": progress.total_resumes_generated,
            "total_cover_letters_generated": progress.total_cover_letters_generated,
            "total_role_optimizations": progress.total_role_optimizations,
            "total_text_enhancements": progress.total_text_enhancements,
            "total_tokens_used": progress.total_tokens_used,
            "total_estimated_cost": progress.total_estimated_cost,
            "last_ats_check_at": progress.last_ats_check_at,
            "last_resume_generated_at": progress.last_resume_generated_at,
            "last_cover_letter_at": progress.last_cover_letter_at,
            "last_optimization_at": progress.last_optimization_at,
        },
        "activity_breakdown": activity_breakdown,
        "recent_activities": [
            {
                "id": a.id,
                "activity_type": a.activity_type,
                "ats_score": a.ats_score,
                "score_improvement": a.score_improvement,
                "target_role": a.target_role,
                "status": a.status,
                "created_at": a.created_at,
            }
            for a in analytics_history[:20]
        ],
        "recommendations": _generate_recommendations(progress, analytics_history)
    }


def _generate_recommendations(progress: StudentResumeProgress, history: List[ResumeAnalytics]) -> List[str]:
    """Generate recommendations for student"""
    recommendations = []
    
    if progress.profile_completeness < 100:
        recommendations.append(f"Complete your profile ({progress.profile_completeness}% complete). Add missing required sections.")
    
    if progress.current_ats_score is not None:
        if progress.current_ats_score < 70:
            recommendations.append(f"Your ATS score is {progress.current_ats_score:.1f}/100. Focus on improving keywords and resume structure.")
        elif progress.current_ats_score < 85:
            recommendations.append(f"Your ATS score is {progress.current_ats_score:.1f}/100. Consider optimizing for specific roles to reach 85+.")
    
    if progress.total_ats_checks == 0:
        recommendations.append("Run an ATS check to see how your resume performs.")
    
    if progress.total_resumes_generated == 0:
        recommendations.append("Generate your first resume PDF to get started.")
    
    if progress.total_role_optimizations == 0:
        recommendations.append("Try role-based optimization to tailor your resume for specific job applications.")
    
    # Check recent improvements
    recent_ats_checks = [a for a in history if a.activity_type == "ats_check" and a.ats_score is not None][:5]
    if len(recent_ats_checks) >= 2:
        scores = [a.ats_score for a in recent_ats_checks]
        if scores[-1] <= scores[0]:
            recommendations.append("Your ATS score hasn't improved recently. Review and implement previous recommendations.")
    
    return recommendations


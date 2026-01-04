"""Job Analytics API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional, List, Dict
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.job import Job, JobApplication
from app.models.job_round import JobRound, JobApplicationRound
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.academic import Department
from app.api.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/jobs", tags=["job-analytics"])


@router.get("/analytics")
async def get_job_analytics(
    job_id: Optional[int] = Query(None),
    college_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    year: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get comprehensive job analytics (College Admin and HOD only)"""
    try:
        user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
        role_names = [role.role for role in user_roles]
        
        # Determine college_id if not provided
        if not college_id:
            if RoleEnum.SUPER_ADMIN not in role_names:
                admin_role = db.query(UserRole).filter(
                    UserRole.user_id == current_user.id,
                    UserRole.role.in_([RoleEnum.ADMIN, RoleEnum.HOD])
                ).first()
                if admin_role and admin_role.college_id:
                    college_id = admin_role.college_id
        
        # Build query
        query = db.query(Job).filter(Job.is_active == True)
        
        if college_id:
            query = query.filter(Job.college_id == college_id)
        
        if job_id:
            query = query.filter(Job.id == job_id)
        
        jobs = query.all()
    except Exception as e:
        # Return empty structure on any error
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_job_analytics: {str(e)}", exc_info=True)
        return {
            "total_jobs": 0,
            "total_applications": 0,
            "selected_count": 0,
            "overall_selection_rate": 0,
            "jobs": [],
            "round_wise_stats": [],
            "year_wise_stats": [],
            "branch_wise_stats": []
        }
    
    if not jobs:
        return {
            "total_jobs": 0,
            "total_applications": 0,
            "selected_count": 0,
            "overall_selection_rate": 0,
            "jobs": [],
            "round_wise_stats": [],
            "year_wise_stats": [],
            "branch_wise_stats": []
        }
    
    # Get all job IDs
    job_ids = [job.id for job in jobs]
    
    # Total applications
    total_applications = db.query(JobApplication).filter(
        JobApplication.job_id.in_(job_ids)
    ).count()
    
    # Round-wise statistics
    round_stats = []
    for job in jobs:
        rounds = db.query(JobRound).filter(
            JobRound.job_id == job.id,
            JobRound.is_active == True
        ).order_by(JobRound.order).all()
        
        for round_obj in rounds:
            round_statuses = db.query(JobApplicationRound).filter(
                JobApplicationRound.round_id == round_obj.id
            ).all()
            
            qualified = sum(1 for s in round_statuses if s.status == "QUALIFIED")
            rejected = sum(1 for s in round_statuses if s.status == "REJECTED")
            absent = sum(1 for s in round_statuses if s.status == "ABSENT")
            pending = sum(1 for s in round_statuses if s.status == "PENDING")
            total = len(round_statuses)
            
            pass_rate = (qualified / total * 100) if total > 0 else 0
            
            round_stats.append({
                "job_id": job.id,
                "job_title": f"{job.company} - {job.role}",
                "round_id": round_obj.id,
                "round_name": round_obj.name,
                "round_order": round_obj.order,
                "total_students": total,
                "qualified": qualified,
                "rejected": rejected,
                "absent": absent,
                "pending": pending,
                "pass_rate": round(pass_rate, 2)
            })
    
    # Year-wise statistics
    year_stats = []
    applications = db.query(JobApplication).filter(
        JobApplication.job_id.in_(job_ids)
    ).all()
    
    year_counts = {}
    for app in applications:
        profile = db.query(Profile).filter(Profile.user_id == app.user_id).first()
        if profile and profile.present_year:
            year = profile.present_year
            if year not in year_counts:
                year_counts[year] = {"total": 0, "selected": 0}
            year_counts[year]["total"] += 1
            if app.status == "Selected":
                year_counts[year]["selected"] += 1
    
    for year, counts in year_counts.items():
        selection_rate = (counts["selected"] / counts["total"] * 100) if counts["total"] > 0 else 0
        year_stats.append({
            "year": year,
            "total_applications": counts["total"],
            "selected": counts["selected"],
            "selection_rate": round(selection_rate, 2)
        })
    
    # Branch-wise statistics
    branch_stats = []
    branch_counts = {}
    for app in applications:
        profile = db.query(Profile).filter(Profile.user_id == app.user_id).first()
        if profile:
            dept_name = profile.department
            dept_code = None
            if profile.department_id:
                dept = db.query(Department).filter(Department.id == profile.department_id).first()
                if dept:
                    dept_code = dept.code
                    dept_name = dept.name
            
            branch_key = dept_code or dept_name or "Unknown"
            if branch_key not in branch_counts:
                branch_counts[branch_key] = {"total": 0, "selected": 0}
            branch_counts[branch_key]["total"] += 1
            if app.status == "Selected":
                branch_counts[branch_key]["selected"] += 1
    
    for branch, counts in branch_counts.items():
        selection_rate = (counts["selected"] / counts["total"] * 100) if counts["total"] > 0 else 0
        branch_stats.append({
            "branch": branch,
            "total_applications": counts["total"],
            "selected": counts["selected"],
            "selection_rate": round(selection_rate, 2)
        })
    
    # Overall selection rate
    selected_count = db.query(JobApplication).filter(
        JobApplication.job_id.in_(job_ids),
        JobApplication.status == "Selected"
    ).count()
    
    overall_selection_rate = (selected_count / total_applications * 100) if total_applications > 0 else 0
    
    # Job-wise summary
    job_summaries = []
    for job in jobs:
        job_apps = db.query(JobApplication).filter(JobApplication.job_id == job.id).all()
        job_selected = sum(1 for app in job_apps if app.status == "Selected")
        job_selection_rate = (job_selected / len(job_apps) * 100) if job_apps else 0
        
        job_summaries.append({
            "job_id": job.id,
            "company": job.company,
            "role": job.role,
            "total_applications": len(job_apps),
            "selected": job_selected,
            "selection_rate": round(job_selection_rate, 2),
            "company_logo": job.company_logo
        })
    
    return {
        "total_jobs": len(jobs),
        "total_applications": total_applications,
        "selected_count": selected_count,
        "overall_selection_rate": round(overall_selection_rate, 2),
        "jobs": job_summaries,
        "round_wise_stats": round_stats,
        "year_wise_stats": year_stats,
        "branch_wise_stats": branch_stats
    }


@router.get("/student-status")
async def get_student_job_status(
    student_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get student's job application status across all jobs"""
    # If student_id provided, verify access
    target_student_id = student_id if student_id else current_user.id
    
    if student_id and student_id != current_user.id:
        # Check if user is admin/HOD viewing student
        user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
        role_names = [role.role for role in user_roles]
        if RoleEnum.ADMIN not in role_names and RoleEnum.HOD not in role_names and RoleEnum.SUPER_ADMIN not in role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own job status"
            )
    
    # Get all applications for this student
    # Only show college-managed jobs (where college_id is not null)
    applications = db.query(JobApplication).join(Job).filter(
        JobApplication.user_id == target_student_id,
        Job.college_id.isnot(None)  # Only college-managed jobs
    ).all()
    
    result = []
    for app in applications:
        job = db.query(Job).filter(Job.id == app.job_id).first()
        if not job:
            continue
        
        # Ensure Round 0 exists for this job
        round_0 = db.query(JobRound).filter(
            JobRound.job_id == job.id,
            JobRound.order == 0
        ).first()
        
        if not round_0:
            # Create Round 0 if it doesn't exist
            round_0 = JobRound(
                job_id=job.id,
                name="Applied",
                order=0,
                description="Default round for tracking all students who applied for this job",
                is_active=True
            )
            db.add(round_0)
            db.commit()
            db.refresh(round_0)
        
        # Get all rounds for this job (show ALL rounds)
        job_rounds = db.query(JobRound).filter(
            JobRound.job_id == job.id,
            JobRound.is_active == True
        ).order_by(JobRound.order).all()
        
        # Get all round statuses for this student's application
        student_round_statuses = db.query(JobApplicationRound).filter(
            JobApplicationRound.job_application_id == app.id
        ).all()
        
        # Ensure student has an entry in Round 0 if they don't have any round entries
        if not student_round_statuses:
            # Create Round 0 entry for this application
            round_0_status = JobApplicationRound(
                job_application_id=app.id,
                round_id=round_0.id,
                status="PENDING",
                updated_by=None  # System-created
            )
            db.add(round_0_status)
            db.commit()
            db.refresh(round_0_status)
            student_round_statuses = [round_0_status]
        
        # Create a map of round_id -> round_status for quick lookup
        round_status_map = {rs.round_id: rs for rs in student_round_statuses}
        
        # Find the highest round order where student has an entry
        max_round_order = -1
        if student_round_statuses:
            round_ids = [rs.round_id for rs in student_round_statuses]
            reached_rounds = db.query(JobRound).filter(
                JobRound.id.in_(round_ids)
            ).all()
            if reached_rounds:
                max_round_order = max(r.order for r in reached_rounds)
        
        rounds = []
        for round_obj in job_rounds:
            round_status = round_status_map.get(round_obj.id)
            
            # Determine display status based on progression:
            # Priority order:
            # 1. REJECTED: If status is "REJECTED" or remarks contain comma-separated rejection tags
            # 2. CLEARED: Student was promoted from this round (has entry in a later round)
            # 3. IN_PROGRESS: Student is currently in this round (has entry, no entry in next round)
            # 4. PENDING: Student hasn't reached this round yet
            display_status = "PENDING"
            rejection_reasons = []
            
            if round_status:
                # Check for rejection first (status or remarks)
                is_rejected = False
                if round_status.status and round_status.status.upper() == "REJECTED":
                    is_rejected = True
                    if round_status.remarks:
                        rejection_reasons.append(round_status.remarks)
                
                # Check remarks for comma-separated rejection tags
                if round_status.remarks:
                    # Look for rejection indicators in remarks (comma-separated)
                    remarks_lower = round_status.remarks.lower()
                    # Common rejection keywords
                    rejection_keywords = ["rejected", "reject", "failed", "fail", "not selected", "not qualified"]
                    if any(keyword in remarks_lower for keyword in rejection_keywords):
                        is_rejected = True
                        # Extract rejection reasons (comma-separated)
                        reasons = [r.strip() for r in round_status.remarks.split(',') if r.strip()]
                        rejection_reasons.extend(reasons)
                
                if is_rejected:
                    display_status = "REJECTED"
                else:
                    # Check if there's a next round
                    next_round = db.query(JobRound).filter(
                        JobRound.job_id == job.id,
                        JobRound.order == round_obj.order + 1,
                        JobRound.is_active == True
                    ).first()
                    
                    if next_round:
                        # Check if student has entry in next round
                        next_round_status = db.query(JobApplicationRound).filter(
                            JobApplicationRound.job_application_id == app.id,
                            JobApplicationRound.round_id == next_round.id
                        ).first()
                        
                        if next_round_status:
                            # Student has entry in next round → this round is CLEARED
                            display_status = "CLEARED"
                        else:
                            # Student has entry in this round but not in next round
                            # If this is the "Selected" round, mark as CLEARED (job cracked)
                            if round_obj.name.lower() == "selected":
                                display_status = "CLEARED"
                            else:
                                display_status = "IN_PROGRESS"
                    else:
                        # This is the last round
                        # If it's the "Selected" round, show as CLEARED (job cracked)
                        if round_obj.name.lower() == "selected":
                            display_status = "CLEARED"
                        else:
                            # Other last rounds → IN_PROGRESS
                            display_status = "IN_PROGRESS"
            elif round_obj.order == 0:
                # Round 0 - always show as PENDING if no entry (shouldn't happen after auto-create)
                display_status = "PENDING"
            else:
                # No entry in this round
                if round_obj.order <= max_round_order:
                    # Student reached this round but no entry (shouldn't happen normally)
                    # Check if they have entry in a later round
                    later_rounds = [r for r in job_rounds if r.order > round_obj.order and r.order <= max_round_order]
                    if later_rounds:
                        # Student has entry in later round → this round is CLEARED
                        display_status = "CLEARED"
                    else:
                        display_status = "PENDING"
                else:
                    # Student hasn't reached this round yet
                    display_status = "PENDING"
            
            rounds.append({
                "round_id": round_obj.id,
                "round_name": round_obj.name,
                "round_order": round_obj.order,
                "status": display_status,
                "original_status": round_status.status if round_status else None,
                "remarks": round_status.remarks if round_status else None,
                "rejection_reasons": rejection_reasons if rejection_reasons else None,
                "updated_at": round_status.updated_at.isoformat() if round_status and round_status.updated_at else None
            })
        
        # Always add to result if student has an application
        result.append({
            "job_id": job.id,
            "company": job.company,
            "role": job.role,
            "company_logo": job.company_logo,
            "application_status": app.status,
            "current_round": app.current_round,
            "applied_at": app.applied_at.isoformat() if app.applied_at else None,
            "rounds": rounds
        })
    
    return {
        "student_id": target_student_id,
        "total_applications": len(result),
        "applications": result
    }

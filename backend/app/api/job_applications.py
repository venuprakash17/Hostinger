"""Job Application API endpoints for students"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.job import Job, JobApplication
from app.models.job_round import JobRound, JobApplicationRound
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.schemas.job import JobApplicationResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/job-applications", tags=["job-applications"])


@router.get("/my", response_model=List[JobApplicationResponse])
async def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's job applications"""
    applications = db.query(JobApplication).filter(
        JobApplication.user_id == current_user.id
    ).all()
    
    return applications

"""Proctoring API Endpoints - Detailed violation tracking and reporting"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.auth import get_current_user, get_current_faculty, get_current_admin, get_current_super_admin
from app.models.user import User
from app.models.proctoring import ProctoringViolation, ProctoringSession, ViolationType, ViolationSeverity
from app.models.coding_lab import CodingLab
from pydantic import BaseModel
from typing import Dict, Any

# Inline schemas
class ViolationCreate(BaseModel):
    lab_id: int
    violation_type: str
    severity: str = "low"
    details: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    time_spent_seconds: Optional[int] = None
    problem_id: Optional[int] = None
    submission_id: Optional[int] = None
    timestamp: Optional[datetime] = None

class ViolationResponse(BaseModel):
    id: int
    lab_id: int
    user_id: int
    session_id: Optional[int] = None
    violation_type: str
    severity: str
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None
    time_spent_seconds: Optional[int] = None
    
    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    lab_id: int

class SessionResponse(BaseModel):
    id: int
    lab_id: int
    user_id: int
    started_at: datetime
    total_violations: int = 0
    tab_switches: int = 0
    fullscreen_exits: int = 0
    is_active: bool = True
    
    class Config:
        from_attributes = True

class ViolationSummaryResponse(BaseModel):
    total_violations: int
    total_sessions: int
    active_sessions: int
    by_type: Dict[str, int]
    by_severity: Dict[str, int]
    by_user: Dict[int, int]

router = APIRouter(prefix="/proctoring", tags=["Proctoring"])


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_proctoring_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update a proctoring session"""
    # Check if lab exists and is proctored
    lab = db.query(CodingLab).filter(CodingLab.id == session_data.lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    if not lab.is_proctored:
        raise HTTPException(status_code=400, detail="Lab is not proctored")
    
    # Check if session already exists
    existing_session = db.query(ProctoringSession).filter(
        ProctoringSession.lab_id == session_data.lab_id,
        ProctoringSession.user_id == current_user.id,
        ProctoringSession.is_active == True
    ).first()
    
    if existing_session:
        # Update existing session
        existing_session.last_activity = datetime.utcnow()
        existing_session.is_active = True
        db.commit()
        db.refresh(existing_session)
        return SessionResponse.model_validate(existing_session)
    
    # Create new session
    session = ProctoringSession(
        lab_id=session_data.lab_id,
        user_id=current_user.id,
        started_at=datetime.utcnow(),
        is_active=True,
        last_activity=datetime.utcnow()
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return SessionResponse.model_validate(session)


@router.post("/violations", response_model=ViolationResponse, status_code=status.HTTP_201_CREATED)
async def record_violation(
    violation_data: ViolationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record a proctoring violation"""
    # Verify lab exists and is proctored
    lab = db.query(CodingLab).filter(CodingLab.id == violation_data.lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    if not lab.is_proctored:
        raise HTTPException(status_code=400, detail="Lab is not proctored")
    
    # Get or create active session
    session = db.query(ProctoringSession).filter(
        ProctoringSession.lab_id == violation_data.lab_id,
        ProctoringSession.user_id == current_user.id,
        ProctoringSession.is_active == True
    ).first()
    
    if not session:
        # Create session if doesn't exist
        session = ProctoringSession(
            lab_id=violation_data.lab_id,
            user_id=current_user.id,
            started_at=datetime.utcnow(),
            is_active=True,
            last_activity=datetime.utcnow()
        )
        db.add(session)
        db.flush()
    
    # Create violation record
    violation = ProctoringViolation(
        lab_id=violation_data.lab_id,
        user_id=current_user.id,
        session_id=session.id,
        submission_id=violation_data.submission_id,
        violation_type=ViolationType(violation_data.violation_type),
        severity=ViolationSeverity(violation_data.severity),
        details=violation_data.details,
        description=violation_data.description,
        time_spent_seconds=violation_data.time_spent_seconds,
        problem_id=violation_data.problem_id,
        timestamp=violation_data.timestamp or datetime.utcnow()
    )
    
    db.add(violation)
    
    # Update session violation counts
    session.total_violations += 1
    if violation.violation_type == ViolationType.TAB_SWITCH:
        session.tab_switches += 1
    elif violation.violation_type == ViolationType.FULLSCREEN_EXIT:
        session.fullscreen_exits += 1
    elif violation.violation_type == ViolationType.WINDOW_BLUR:
        session.window_blurs += 1
    elif violation.violation_type == ViolationType.COPY_PASTE:
        session.copy_paste_events += 1
    elif violation.violation_type == ViolationType.DEVTOOLS:
        session.devtools_opens += 1
    
    # Update violation summary
    violations = db.query(ProctoringViolation).filter(
        ProctoringViolation.session_id == session.id
    ).all()
    
    summary = {
        'by_type': {},
        'by_severity': {}
    }
    for v in violations:
        summary['by_type'][v.violation_type.value] = summary['by_type'].get(v.violation_type.value, 0) + 1
        summary['by_severity'][v.severity.value] = summary['by_severity'].get(v.severity.value, 0) + 1
    
    session.violation_summary = summary
    session.last_activity = datetime.utcnow()
    
    db.commit()
    db.refresh(violation)
    
    return ViolationResponse.model_validate(violation)


@router.get("/sessions/{lab_id}", response_model=List[SessionResponse])
async def get_lab_sessions(
    lab_id: int,
    active_only: bool = Query(False, description="Filter active sessions only"),
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Get all proctoring sessions for a lab (Faculty/Admin only)"""
    query = db.query(ProctoringSession).filter(ProctoringSession.lab_id == lab_id)
    
    if active_only:
        query = query.filter(ProctoringSession.is_active == True)
    
    sessions = query.order_by(desc(ProctoringSession.started_at)).all()
    
    return [SessionResponse.model_validate(s) for s in sessions]


@router.get("/violations/{lab_id}", response_model=List[ViolationResponse])
async def get_lab_violations(
    lab_id: int,
    user_id: Optional[int] = Query(None, description="Filter by user"),
    violation_type: Optional[str] = Query(None, description="Filter by violation type"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(100, le=1000),
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Get violations for a lab (Faculty/Admin only)"""
    query = db.query(ProctoringViolation).filter(ProctoringViolation.lab_id == lab_id)
    
    if user_id:
        query = query.filter(ProctoringViolation.user_id == user_id)
    
    if violation_type:
        try:
            query = query.filter(ProctoringViolation.violation_type == ViolationType(violation_type))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid violation type: {violation_type}")
    
    if severity:
        try:
            query = query.filter(ProctoringViolation.severity == ViolationSeverity(severity))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid severity: {severity}")
    
    violations = query.order_by(desc(ProctoringViolation.timestamp)).limit(limit).all()
    
    return [ViolationResponse.model_validate(v) for v in violations]


@router.get("/summary/{lab_id}", response_model=ViolationSummaryResponse)
async def get_violation_summary(
    lab_id: int,
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Get violation summary for a lab"""
    violations = db.query(ProctoringViolation).filter(
        ProctoringViolation.lab_id == lab_id
    ).all()
    
    sessions = db.query(ProctoringSession).filter(
        ProctoringSession.lab_id == lab_id
    ).all()
    
    summary = {
        'total_violations': len(violations),
        'total_sessions': len(sessions),
        'active_sessions': len([s for s in sessions if s.is_active]),
        'by_type': {},
        'by_severity': {},
        'by_user': {}
    }
    
    for violation in violations:
        # By type
        v_type = violation.violation_type.value
        summary['by_type'][v_type] = summary['by_type'].get(v_type, 0) + 1
        
        # By severity
        v_severity = violation.severity.value
        summary['by_severity'][v_severity] = summary['by_severity'].get(v_severity, 0) + 1
        
        # By user
        user_id = violation.user_id
        if user_id not in summary['by_user']:
            summary['by_user'][user_id] = 0
        summary['by_user'][user_id] += 1
    
    return ViolationSummaryResponse(**summary)


@router.put("/sessions/{session_id}/end", response_model=SessionResponse)
async def end_proctoring_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End a proctoring session"""
    session = db.query(ProctoringSession).filter(
        ProctoringSession.id == session_id,
        ProctoringSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.ended_at = datetime.utcnow()
    session.is_active = False
    
    if session.started_at:
        total_time = (session.ended_at - session.started_at).total_seconds()
        session.total_time_seconds = int(total_time)
    
    db.commit()
    db.refresh(session)
    
    return SessionResponse.model_validate(session)


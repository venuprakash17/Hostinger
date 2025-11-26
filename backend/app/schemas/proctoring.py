"""Proctoring Schemas"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.proctoring import ViolationType, ViolationSeverity


class ViolationCreate(BaseModel):
    lab_id: int
    violation_type: str = Field(..., description="Type of violation")
    severity: str = Field(default="low", description="Severity level")
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
    session_id: Optional[int]
    submission_id: Optional[int]
    violation_type: str
    severity: str
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    time_spent_seconds: Optional[int] = None
    problem_id: Optional[int] = None
    is_reviewed: bool = False
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    lab_id: int


class SessionResponse(BaseModel):
    id: int
    lab_id: int
    user_id: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    total_time_seconds: int = 0
    total_violations: int = 0
    tab_switches: int = 0
    fullscreen_exits: int = 0
    window_blurs: int = 0
    copy_paste_events: int = 0
    devtools_opens: int = 0
    is_active: bool = True
    last_activity: datetime
    violation_summary: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


class ViolationSummaryResponse(BaseModel):
    total_violations: int
    total_sessions: int
    active_sessions: int
    by_type: Dict[str, int]
    by_severity: Dict[str, int]
    by_user: Dict[int, int]


"""Database models"""
from app.models.user import User, UserRole
from app.models.profile import Profile
from app.models.college import College
from app.models.institution import Institution
from app.models.notification import Notification
from app.models.user_notification import UserNotification
from app.models.job import Job, JobApplication
from app.models.audit_log import AuditLog
from app.models.quiz import Quiz, CodingProblem, QuizAttempt
from app.models.coding_submission import CodingSubmission
from app.models.user_saved_code import UserSavedCode
from app.models.training_session import TrainingSession
from app.models.attendance import Attendance
from app.models.academic import (
    AcademicYear,
    Department,
    Semester,
    Subject,
    SubjectAssignment,
    FacultySectionAssignment,
    Period,
    Section,
    AcademicYearMigration,
    ArchivedSubjectAssignment,
    ArchivedFacultySectionAssignment
)
from app.models.job_aggregation import JobAggregation
from app.models.mock_interview import MockInterview
from app.models.year_promotion import YearPromotion
from app.models.hall_ticket import HallTicket
from app.models.announcement import Announcement, UserAnnouncement
from app.models.coding_lab import (
    CodingLab,
    LabSession,
    LabFacultyAssignment,
    LabProblem,
    TestCase,
    LabSubmission,
    ExecutionResult,
    PlagiarismReport,
    LabAnalytics,
    ExecutionLog
)
from app.models.lab_attendance import LabAttendance
from app.models.intelligent_lab import (
    LabSessionEnhanced,
    SessionMaterial,
    LabTest,
    TestQuestion,
    TestAttempt,
    TestAnswer,
    StudentSessionProgress,
    StudentLabProgress,
    CodePlayback,
    LabLeaderboard,
    LabStudentAssignment
)
from app.models.company_training import (
    Company,
    CompanyRole,
    PracticeSection,
    Round,
    RoundContent,
    RoundType
)
from app.models.user_analytics import (
    UserActivity,
    UserSession,
    StudentProgress,
    FeatureAnalytics,
    ActivityType
)
from app.models.resume_analytics import (
    ResumeAnalytics,
    StudentResumeProgress
)

__all__ = [
    "User",
    "UserRole",
    "Profile",
    "College",
    "Institution",
    "UserActivity",
    "UserSession",
    "StudentProgress",
    "FeatureAnalytics",
    "ActivityType",
    "Institution",
    "Notification",
    "UserNotification",
    "Job",
    "JobApplication",
    "AuditLog",
    "Quiz",
    "CodingProblem",
    "QuizAttempt",
    "UserSavedCode",
    "CodingSubmission",
    "TrainingSession",
    "Attendance",
    "AcademicYear",
    "Department",
    "Semester",
    "Subject",
    "SubjectAssignment",
    "FacultySectionAssignment",
    "Period",
    "Section",
    "AcademicYearMigration",
    "ArchivedSubjectAssignment",
    "ArchivedFacultySectionAssignment",
    "JobAggregation",
    "MockInterview",
    "YearPromotion",
    "HallTicket",
    "Announcement",
    "UserAnnouncement",
    "CodingLab",
    "LabSession",
    "LabFacultyAssignment",
    "LabProblem",
    "TestCase",
    "LabSubmission",
    "ExecutionResult",
    "PlagiarismReport",
    "LabAnalytics",
    "ExecutionLog",
    "LabAttendance",
    "LabSessionEnhanced",
    "SessionMaterial",
    "LabTest",
    "TestQuestion",
    "TestAttempt",
    "TestAnswer",
    "StudentSessionProgress",
    "StudentLabProgress",
    "CodePlayback",
    "LabLeaderboard",
    "LabStudentAssignment",
    "Company",
    "CompanyRole",
    "PracticeSection",
    "Round",
    "RoundContent",
    "RoundType",
    "ResumeAnalytics",
    "StudentResumeProgress",
]


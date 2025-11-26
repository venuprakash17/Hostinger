"""Coding Labs Module - Database Models"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class LabMode(str, enum.Enum):
    """Lab execution mode"""
    PRACTICE = "practice"  # Learning mode with hints
    ASSIGNMENT = "assignment"  # Regular assignment
    EXAM = "exam"  # Proctored exam mode


class LabDifficulty(str, enum.Enum):
    """Problem difficulty level"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"


class SubmissionStatus(str, enum.Enum):
    """Submission evaluation status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPILED = "compiled"
    ACCEPTED = "accepted"
    WRONG_ANSWER = "wrong_answer"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded"
    MEMORY_LIMIT_EXCEEDED = "memory_limit_exceeded"
    RUNTIME_ERROR = "runtime_error"
    COMPILATION_ERROR = "compilation_error"
    INTERNAL_ERROR = "internal_error"


class TestCaseType(str, enum.Enum):
    """Test case visibility"""
    PUBLIC = "public"  # Visible to students
    HIDDEN = "hidden"  # Only for evaluation


class CodingLab(Base):
    """Main coding lab/assignment model - Created by HOD only"""
    __tablename__ = "coding_labs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    
    # Lab metadata
    mode = Column(Enum(LabMode), default=LabMode.PRACTICE, nullable=False)
    difficulty = Column(Enum(LabDifficulty), default=LabDifficulty.MEDIUM, nullable=False)
    topic = Column(String(100), nullable=True, index=True)  # e.g., "loops", "OOP", "DSA"
    
    # HOD ownership (HOD creates labs)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False, index=True)  # HOD user_id
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Academic linkage - Integrated College Management System
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)  # Link to Subject
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)  # Link to Department
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True, index=True)  # Link to Section
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True, index=True)  # Link to Semester
    
    # Backward compatibility - keep string fields for existing data
    department = Column(String(100), nullable=True, index=True)
    section = Column(String(100), nullable=True, index=True)
    semester = Column(String(50), nullable=True, index=True)  # e.g., "Semester 1", "Fall 2024"
    
    # Academic metadata
    batch = Column(String(50), nullable=True, index=True)  # e.g., "2024-2025"
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True, index=True)
    year = Column(String(20), nullable=True, index=True)  # e.g., "1st", "2nd", "3rd", "4th", "5th"
    
    # Programming languages allowed
    allowed_languages = Column(JSON, nullable=False, default=["python", "java", "c", "cpp", "javascript"])
    
    # Lab versioning
    version = Column(String(20), default="1.0", nullable=False)
    parent_lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="SET NULL"), nullable=True)  # For cloning
    is_clone = Column(Boolean, default=False, nullable=False)
    
    # Lab settings (HOD controls)
    is_published = Column(Boolean, default=False, nullable=False)  # HOD publishes
    is_active = Column(Boolean, default=True, nullable=False)
    allow_hints = Column(Boolean, default=True, nullable=False)
    allow_multiple_attempts = Column(Boolean, default=True, nullable=False)
    max_attempts = Column(Integer, default=10, nullable=True)  # None = unlimited
    
    # Approval workflow
    requires_approval = Column(Boolean, default=True, nullable=False)  # Faculty content needs HOD approval
    is_approved = Column(Boolean, default=False, nullable=False)  # HOD approval status
    
    # Exam mode settings
    is_proctored = Column(Boolean, default=False, nullable=False)
    enforce_fullscreen = Column(Boolean, default=False, nullable=False)
    detect_tab_switch = Column(Boolean, default=False, nullable=False)
    camera_proctoring = Column(Boolean, default=False, nullable=False)
    time_limit_minutes = Column(Integer, nullable=True)  # None = no limit
    
    # Scoring
    total_points = Column(Float, default=100.0, nullable=False)
    passing_score = Column(Float, default=60.0, nullable=False)
    
    # Timestamps
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    college = relationship("College", back_populates="coding_labs")
    subject = relationship("Subject", backref="coding_labs")
    department_rel = relationship("Department", backref="coding_labs")
    section_rel = relationship("Section", backref="coding_labs")
    semester_rel = relationship("Semester", backref="coding_labs")
    sessions = relationship("LabSession", back_populates="lab", cascade="all, delete-orphan", order_by="LabSession.order_index")
    submissions = relationship("LabSubmission", back_populates="lab", cascade="all, delete-orphan")
    analytics = relationship("LabAnalytics", back_populates="lab", uselist=False, cascade="all, delete-orphan")
    faculty_assignments = relationship("LabFacultyAssignment", back_populates="lab", cascade="all, delete-orphan")
    lab_attendance = relationship("LabAttendance", back_populates="lab", cascade="all, delete-orphan")


class LabSession(Base):
    """Session within a lab (like CodeTantra structure)"""
    __tablename__ = "lab_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Session details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    
    # Session metadata
    order_index = Column(Integer, default=0, nullable=False)  # For ordering sessions
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Session settings
    allow_hints = Column(Boolean, default=True, nullable=False)  # Override lab-level hints
    time_limit_minutes = Column(Integer, nullable=True)  # Session-specific time limit
    
    # Scoring
    total_points = Column(Float, default=0.0, nullable=False)  # Sum of problem points
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lab = relationship("CodingLab", back_populates="sessions")
    problems = relationship("LabProblem", back_populates="session", cascade="all, delete-orphan", order_by="LabProblem.order_index")


class LabFacultyAssignment(Base):
    """Faculty assignments to labs (HOD assigns faculty)"""
    __tablename__ = "lab_faculty_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Assignment details
    assigned_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # HOD who assigned
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Permissions
    can_add_problems = Column(Boolean, default=True, nullable=False)
    can_add_sessions = Column(Boolean, default=True, nullable=False)
    can_monitor = Column(Boolean, default=True, nullable=False)
    can_grade = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    lab = relationship("CodingLab", back_populates="faculty_assignments")
    faculty = relationship("User", foreign_keys=[faculty_id])
    assigner = relationship("User", foreign_keys=[assigned_by])


class LabProblem(Base):
    """Individual problem within a lab session (Faculty creates, HOD approves)"""
    __tablename__ = "lab_problems"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("lab_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Problem details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    problem_statement = Column(Text, nullable=False)
    
    # Code templates
    starter_code = Column(Text, nullable=True)  # Initial code for students
    solution_code = Column(Text, nullable=True)  # Reference solution (hidden)
    
    # Language support
    allowed_languages = Column(JSON, nullable=False, default=["python", "java", "c", "cpp", "javascript"])
    default_language = Column(String(20), default="python", nullable=False)
    
    # Constraints
    time_limit_seconds = Column(Integer, default=5, nullable=False)
    memory_limit_mb = Column(Integer, default=256, nullable=False)
    
    # Hints and help
    hints = Column(JSON, nullable=True)  # Array of hint strings
    explanation = Column(Text, nullable=True)  # Solution explanation
    
    # Scoring
    points = Column(Float, default=100.0, nullable=False)
    order_index = Column(Integer, default=0, nullable=False)  # For ordering problems
    
    # Faculty ownership and approval
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)  # Faculty who created
    is_approved = Column(Boolean, default=False, nullable=False)  # HOD approval
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # HOD who approved
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)  # If rejected by HOD
    
    # Problem type
    problem_type = Column(String(50), default="practice", nullable=False)  # practice, assignment, exam
    
    # Deadlines (for assignments/exams)
    deadline = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lab = relationship("CodingLab")
    session = relationship("LabSession", back_populates="problems")
    creator_user = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])
    test_cases = relationship("TestCase", back_populates="problem", cascade="all, delete-orphan")
    submissions = relationship("LabSubmission", back_populates="problem", cascade="all, delete-orphan")


class TestCase(Base):
    """Test cases for problems"""
    __tablename__ = "test_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("lab_problems.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Test case details
    name = Column(String(255), nullable=False)
    type = Column(Enum(TestCaseType), default=TestCaseType.HIDDEN, nullable=False)
    
    # Input/Output
    input_data = Column(Text, nullable=False)  # JSON string or plain text
    expected_output = Column(Text, nullable=False)
    
    # Evaluation settings
    is_sample = Column(Boolean, default=False, nullable=False)  # Sample test case
    points = Column(Float, default=10.0, nullable=False)  # Points for passing this test
    
    # Execution settings
    time_limit_seconds = Column(Integer, nullable=True)  # Override problem time limit
    memory_limit_mb = Column(Integer, nullable=True)  # Override problem memory limit
    
    # Order
    order_index = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    problem = relationship("LabProblem", back_populates="test_cases")
    execution_results = relationship("ExecutionResult", back_populates="test_case", cascade="all, delete-orphan")


class LabSubmission(Base):
    """Student submission for a lab problem"""
    __tablename__ = "lab_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(Integer, ForeignKey("lab_problems.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Submission details
    code = Column(Text, nullable=False)
    language = Column(String(20), nullable=False)
    
    # Evaluation
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.PENDING, nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    max_score = Column(Float, nullable=True)
    
    # Execution metrics
    execution_time_ms = Column(Integer, nullable=True)
    memory_used_mb = Column(Float, nullable=True)
    test_cases_passed = Column(Integer, default=0, nullable=False)
    test_cases_total = Column(Integer, default=0, nullable=False)
    
    # Error information
    error_message = Column(Text, nullable=True)
    compile_output = Column(Text, nullable=True)
    runtime_output = Column(Text, nullable=True)
    
    # Proctoring data
    is_proctored = Column(Boolean, default=False, nullable=False)
    tab_switches = Column(Integer, default=0, nullable=False)
    fullscreen_exits = Column(Integer, default=0, nullable=False)
    suspicious_activities = Column(JSON, nullable=True)  # Array of activity logs
    
    # Attempt tracking
    attempt_number = Column(Integer, default=1, nullable=False)
    is_final_submission = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    evaluated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    lab = relationship("CodingLab", back_populates="submissions")
    problem = relationship("LabProblem", back_populates="submissions")
    user = relationship("User")
    execution_results = relationship("ExecutionResult", back_populates="submission", cascade="all, delete-orphan")
    plagiarism_report = relationship("PlagiarismReport", back_populates="submission", uselist=False, cascade="all, delete-orphan")


class ExecutionResult(Base):
    """Individual test case execution result"""
    __tablename__ = "execution_results"
    
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("lab_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Result
    passed = Column(Boolean, default=False, nullable=False)
    status = Column(Enum(SubmissionStatus), nullable=False)
    
    # Outputs
    actual_output = Column(Text, nullable=True)
    expected_output = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Metrics
    execution_time_ms = Column(Integer, nullable=True)
    memory_used_mb = Column(Float, nullable=True)
    
    # Points
    points_earned = Column(Float, default=0.0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    submission = relationship("LabSubmission", back_populates="execution_results")
    test_case = relationship("TestCase", back_populates="execution_results")


class PlagiarismReport(Base):
    """Plagiarism detection report for a submission"""
    __tablename__ = "plagiarism_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("lab_submissions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Similarity scores
    overall_similarity = Column(Float, default=0.0, nullable=False)  # 0-100
    
    # Comparison results
    similar_submissions = Column(JSON, nullable=True)  # Array of {submission_id, similarity, user_id}
    github_matches = Column(JSON, nullable=True)  # Array of {url, similarity}
    stackoverflow_matches = Column(JSON, nullable=True)  # Array of {url, similarity}
    
    # Analysis
    normalized_code = Column(Text, nullable=True)  # Normalized code for comparison
    code_fingerprint = Column(String(255), nullable=True, index=True)  # Hash for quick lookup
    
    # Status
    is_analyzed = Column(Boolean, default=False, nullable=False)
    analyzed_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    submission = relationship("LabSubmission", back_populates="plagiarism_report")


class LabAnalytics(Base):
    """Analytics and statistics for a lab"""
    __tablename__ = "lab_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Participation stats
    total_students = Column(Integer, default=0, nullable=False)
    students_attempted = Column(Integer, default=0, nullable=False)
    students_completed = Column(Integer, default=0, nullable=False)
    students_passed = Column(Integer, default=0, nullable=False)
    
    # Submission stats
    total_submissions = Column(Integer, default=0, nullable=False)
    average_attempts = Column(Float, default=0.0, nullable=False)
    average_score = Column(Float, default=0.0, nullable=False)
    average_time_spent_minutes = Column(Float, default=0.0, nullable=False)
    
    # Score distribution
    score_distribution = Column(JSON, nullable=True)  # {0-20: count, 21-40: count, ...}
    
    # Problem-wise stats
    problem_stats = Column(JSON, nullable=True)  # Array of problem-level stats
    
    # Difficulty analysis
    difficulty_heatmap = Column(JSON, nullable=True)
    
    # Last updated
    last_calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lab = relationship("CodingLab", back_populates="analytics")


class ExecutionLog(Base):
    """Logs for code execution (for debugging and monitoring)"""
    __tablename__ = "execution_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("lab_submissions.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Execution details
    language = Column(String(20), nullable=False)
    code_snippet = Column(Text, nullable=True)  # First 500 chars
    
    # Result
    status = Column(Enum(SubmissionStatus), nullable=False)
    execution_time_ms = Column(Integer, nullable=True)
    memory_used_mb = Column(Float, nullable=True)
    
    # Docker info
    container_id = Column(String(255), nullable=True)
    worker_id = Column(String(100), nullable=True)
    
    # Error details
    error_message = Column(Text, nullable=True)
    stack_trace = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


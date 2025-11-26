"""Intelligent Lab Module - Enhanced Models for CodeTantra-like System"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, Enum, JSON, Date, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base
from app.models.coding_lab import LabMode  # Import LabMode for session mode


class MaterialType(str, enum.Enum):
    """Session material types"""
    PDF = "pdf"
    SLIDE = "slide"
    CODE_FILE = "code_file"
    NOTE = "note"
    VIDEO_LINK = "video_link"
    DOCUMENT = "document"


class TestType(str, enum.Enum):
    """Lab test types"""
    QUIZ = "quiz"  # MCQ questions
    CODING_TEST = "coding_test"  # Coding problems only
    MIXED = "mixed"  # Both MCQ and coding


class QuestionType(str, enum.Enum):
    """Question types for lab tests"""
    MCQ = "mcq"
    MULTIPLE_SELECT = "multiple_select"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    CODING = "coding"


class LabSessionEnhanced(Base):
    """Enhanced Lab Session with daily class structure"""
    __tablename__ = "lab_sessions_enhanced"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Daily session details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    
    # Date and time for daily sessions
    session_date = Column(Date, nullable=False, index=True)
    session_time = Column(Time, nullable=True)  # Optional time
    duration_minutes = Column(Integer, nullable=True)  # Session duration
    
    # Session metadata
    order_index = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)  # Mark session as completed
    
    # Session mode (Practice/Assignment/Exam) - Controls feature enablement
    mode = Column(Enum(LabMode), default=LabMode.PRACTICE, nullable=False)
    
    # Session settings (auto-configured based on mode)
    allow_hints = Column(Boolean, default=True, nullable=False)
    allow_multiple_attempts = Column(Boolean, default=True, nullable=False)
    max_attempts = Column(Integer, nullable=True)  # None = unlimited
    time_limit_minutes = Column(Integer, nullable=True)
    
    # Proctoring settings (available for all modes, auto-enabled for Exam mode)
    is_proctored = Column(Boolean, default=False, nullable=False)
    enforce_fullscreen = Column(Boolean, default=False, nullable=False)
    detect_tab_switch = Column(Boolean, default=False, nullable=False)
    camera_proctoring = Column(Boolean, default=False, nullable=False)  # Camera monitoring
    
    # Scoring
    total_points = Column(Float, default=0.0, nullable=False)
    passing_score = Column(Float, default=60.0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    lab = relationship("CodingLab", backref="enhanced_sessions")
    materials = relationship("SessionMaterial", back_populates="session", cascade="all, delete-orphan")
    # Note: LabProblem links to lab_sessions (old), not lab_sessions_enhanced
    # Problems are linked via lab_id, not session_id
    student_progress = relationship("StudentSessionProgress", back_populates="session", cascade="all, delete-orphan")


class SessionMaterial(Base):
    """Materials attached to daily sessions (PDFs, Slides, Videos, etc.)"""
    __tablename__ = "session_materials"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lab_sessions_enhanced.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Material details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    material_type = Column(Enum(MaterialType), nullable=False)
    
    # File or link
    file_path = Column(String(500), nullable=True)  # For uploaded files
    file_url = Column(String(1000), nullable=True)  # For external links (YouTube, Vimeo, etc.)
    file_size = Column(Integer, nullable=True)  # File size in bytes
    
    # Display order
    order_index = Column(Integer, default=0, nullable=False)
    is_required = Column(Boolean, default=False, nullable=False)  # Required reading/viewing
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("LabSessionEnhanced", back_populates="materials")


class LabTest(Base):
    """Lab Tests/Quizzes/Exams within a lab"""
    __tablename__ = "lab_tests"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("lab_sessions_enhanced.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Test details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    test_type = Column(Enum(TestType), default=TestType.MIXED, nullable=False)
    
    # Timing
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=True)  # Auto-calculated if not set
    auto_lock = Column(Boolean, default=True, nullable=False)  # Auto lock after time expires
    
    # Settings
    allow_backtracking = Column(Boolean, default=True, nullable=False)  # Can go back to previous questions
    shuffle_questions = Column(Boolean, default=False, nullable=False)
    show_results_immediately = Column(Boolean, default=False, nullable=False)
    
    # Scoring
    total_points = Column(Float, default=100.0, nullable=False)
    passing_score = Column(Float, default=60.0, nullable=False)
    
    # Proctoring
    is_proctored = Column(Boolean, default=False, nullable=False)
    require_fullscreen = Column(Boolean, default=False, nullable=False)
    detect_tab_switch = Column(Boolean, default=False, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lab = relationship("CodingLab", backref="lab_tests")
    questions = relationship("TestQuestion", back_populates="test", cascade="all, delete-orphan", order_by="TestQuestion.order_index")
    student_attempts = relationship("TestAttempt", back_populates="test", cascade="all, delete-orphan")


class TestQuestion(Base):
    """Questions in a lab test"""
    __tablename__ = "test_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("lab_tests.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Question details
    question_type = Column(Enum(QuestionType), nullable=False)
    question_text = Column(Text, nullable=False)
    question_image_url = Column(String(1000), nullable=True)  # For image-based questions
    
    # For MCQ/Multiple Select
    options = Column(JSON, nullable=True)  # Array of {text: str, is_correct: bool}
    correct_answer = Column(Text, nullable=True)  # For short answer, true/false, coding
    
    # For coding questions
    problem_id = Column(Integer, ForeignKey("lab_problems.id", ondelete="SET NULL"), nullable=True)  # Link to existing problem
    
    # Scoring
    points = Column(Float, default=10.0, nullable=False)
    negative_marking = Column(Float, default=0.0, nullable=False)  # Points deducted for wrong answer
    
    # Order
    order_index = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    test = relationship("LabTest", back_populates="questions")
    problem = relationship("LabProblem", backref="test_questions")
    answers = relationship("TestAnswer", back_populates="question", cascade="all, delete-orphan")


class TestAttempt(Base):
    """Student attempt for a lab test"""
    __tablename__ = "test_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("lab_tests.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Attempt details
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    auto_submitted_at = Column(DateTime(timezone=True), nullable=True)  # If auto-locked
    
    # Status
    is_submitted = Column(Boolean, default=False, nullable=False)
    is_auto_submitted = Column(Boolean, default=False, nullable=False)
    is_graded = Column(Boolean, default=False, nullable=False)
    
    # Scoring
    total_score = Column(Float, default=0.0, nullable=False)
    max_score = Column(Float, nullable=True)
    percentage = Column(Float, default=0.0, nullable=False)
    is_passed = Column(Boolean, default=False, nullable=False)
    
    # Proctoring data
    tab_switches = Column(Integer, default=0, nullable=False)
    fullscreen_exits = Column(Integer, default=0, nullable=False)
    suspicious_activities = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    graded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    test = relationship("LabTest", back_populates="student_attempts")
    user = relationship("User", backref="test_attempts")
    answers = relationship("TestAnswer", back_populates="attempt", cascade="all, delete-orphan")


class TestAnswer(Base):
    """Student answers for test questions"""
    __tablename__ = "test_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("test_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("test_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Answer content
    answer_text = Column(Text, nullable=True)  # For short answer, coding
    selected_options = Column(JSON, nullable=True)  # For MCQ/Multiple select - array of option indices
    code = Column(Text, nullable=True)  # For coding questions
    language = Column(String(20), nullable=True)  # For coding questions
    
    # Evaluation
    is_correct = Column(Boolean, nullable=True)  # Null if not graded yet
    points_earned = Column(Float, default=0.0, nullable=False)
    max_points = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)  # Auto-generated or manual feedback
    
    # Timestamps
    answered_at = Column(DateTime(timezone=True), server_default=func.now())
    graded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    attempt = relationship("TestAttempt", back_populates="answers")
    question = relationship("TestQuestion", back_populates="answers")


class StudentSessionProgress(Base):
    """Track student progress through daily sessions"""
    __tablename__ = "student_session_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lab_sessions_enhanced.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Progress tracking
    materials_viewed = Column(JSON, nullable=True)  # Array of material IDs viewed
    materials_completed = Column(JSON, nullable=True)  # Array of required material IDs completed
    
    # Exercise progress
    exercises_attempted = Column(Integer, default=0, nullable=False)
    exercises_completed = Column(Integer, default=0, nullable=False)
    exercises_passed = Column(Integer, default=0, nullable=False)
    
    # Scoring
    total_score = Column(Float, default=0.0, nullable=False)
    max_score = Column(Float, default=0.0, nullable=False)
    
    # Time tracking
    time_spent_minutes = Column(Float, default=0.0, nullable=False)
    first_accessed_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    is_completed = Column(Boolean, default=False, nullable=False)
    completion_percentage = Column(Float, default=0.0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    session = relationship("LabSessionEnhanced", back_populates="student_progress")
    user = relationship("User", backref="session_progress")


class StudentLabProgress(Base):
    """Overall student progress for a lab"""
    __tablename__ = "student_lab_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Overall progress
    sessions_completed = Column(Integer, default=0, nullable=False)
    sessions_total = Column(Integer, default=0, nullable=False)
    completion_percentage = Column(Float, default=0.0, nullable=False)
    
    # Exercise stats
    total_exercises = Column(Integer, default=0, nullable=False)
    exercises_attempted = Column(Integer, default=0, nullable=False)
    exercises_completed = Column(Integer, default=0, nullable=False)
    exercises_passed = Column(Integer, default=0, nullable=False)
    
    # Test stats
    tests_attempted = Column(Integer, default=0, nullable=False)
    tests_passed = Column(Integer, default=0, nullable=False)
    average_test_score = Column(Float, default=0.0, nullable=False)
    
    # Overall scoring
    total_score = Column(Float, default=0.0, nullable=False)
    max_score = Column(Float, default=0.0, nullable=False)
    overall_percentage = Column(Float, default=0.0, nullable=False)
    
    # Time tracking
    total_time_spent_minutes = Column(Float, default=0.0, nullable=False)
    
    # Status
    is_completed = Column(Boolean, default=False, nullable=False)
    current_session_id = Column(Integer, ForeignKey("lab_sessions_enhanced.id", ondelete="SET NULL"), nullable=True)
    
    # Timestamps
    first_accessed_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lab = relationship("CodingLab", backref="student_progress")
    user = relationship("User", backref="lab_progress")
    current_session = relationship("LabSessionEnhanced", foreign_keys=[current_session_id])


class CodePlayback(Base):
    """Live code playback - track how student typed code"""
    __tablename__ = "code_playback"
    
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("lab_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Playback data
    keystrokes = Column(JSON, nullable=False)  # Array of {timestamp, key, action}
    code_snapshots = Column(JSON, nullable=True)  # Array of code states at intervals
    time_intervals = Column(JSON, nullable=True)  # Time between keystrokes
    
    # Analysis
    typing_speed_wpm = Column(Float, nullable=True)
    pause_duration_seconds = Column(Float, nullable=True)
    backspace_count = Column(Integer, default=0, nullable=False)
    copy_paste_detected = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    submission = relationship("LabSubmission", backref="playback")


class LabLeaderboard(Base):
    """Leaderboard for lab performance"""
    __tablename__ = "lab_leaderboard"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Leaderboard data (cached for performance)
    rankings = Column(JSON, nullable=False)  # Array of {user_id, rank, score, completion_percentage}
    
    # Stats
    total_participants = Column(Integer, default=0, nullable=False)
    average_score = Column(Float, default=0.0, nullable=False)
    top_score = Column(Float, default=0.0, nullable=False)
    
    # Timestamps
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    lab = relationship("CodingLab", backref="leaderboard")


class LabStudentAssignment(Base):
    """Explicit assignment of students to labs (Admin/HOD assigns students)"""
    __tablename__ = "lab_student_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Assignment details
    assigned_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # Admin/HOD who assigned
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Optional: Assignment metadata
    enrollment_date = Column(Date, nullable=True)  # When student should start
    completion_deadline = Column(Date, nullable=True)  # Optional deadline
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lab = relationship("CodingLab", backref="student_assignments")
    student = relationship("User", foreign_keys=[student_id])
    assigner = relationship("User", foreign_keys=[assigned_by])
    
    # Unique constraint: one assignment per student per lab
    __table_args__ = (
        {'extend_existing': True},
    )


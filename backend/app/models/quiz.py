"""Quiz and coding problem models with scope-based visibility"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Quiz(Base):
    """Quiz model with scope-based visibility"""
    __tablename__ = "quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(100), nullable=True)
    duration_minutes = Column(Integer, default=30, nullable=False)
    total_marks = Column(Integer, default=100, nullable=False)
    questions = Column(JSON, nullable=False, default=[])  # List of question objects
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)  # Optional expiry date
    # Scope fields for role-based visibility
    scope_type = Column(String(20), default="svnapro", nullable=False)  # "svnapro", "college", "department", "section"
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    department = Column(String(100), nullable=True)  # Department name
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True, index=True)
    year = Column(String(20), nullable=True)  # e.g., "1st", "2nd", "3rd", "4th"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Advanced features
    # NOTE: code_snippet column removed - database doesn't have it
    # code_snippet = Column(Text, nullable=True)  # REMOVED
    question_timers = Column(JSON, nullable=True)  # {"0": 60, "1": 90} - question index to seconds
    # NOTE: per_question_timer_enabled column removed - database doesn't have it
    # per_question_timer_enabled = Column(Boolean, default=False, nullable=False)  # REMOVED
    
    # Enhanced Quiz Features
    assigned_branches = Column(JSON, nullable=True)  # Array of department/branch IDs for bulk assignment
    assigned_sections = Column(JSON, nullable=True)  # Array of section IDs for bulk assignment
    allow_negative_marking = Column(Boolean, default=False, nullable=False)  # Enable negative marking
    shuffle_questions = Column(Boolean, default=False, nullable=False)  # Randomize question order
    shuffle_options = Column(Boolean, default=False, nullable=False)  # Randomize option order
    status = Column(String(20), default="draft", nullable=False)  # "draft", "published", "archived"
    passing_marks = Column(Integer, nullable=True)  # Minimum marks to pass
    question_bank_ids = Column(JSON, nullable=True)  # Array of question bank IDs to use
    use_random_questions = Column(Boolean, default=False, nullable=False)  # Use random questions from bank
    random_question_count = Column(Integer, nullable=True)  # Number of random questions to select
    
    # Relationships
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizAttempt(Base):
    """Student attempt for a quiz"""
    __tablename__ = "quiz_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Attempt details
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    auto_submitted_at = Column(DateTime(timezone=True), nullable=True)  # If auto-locked due to timer
    
    # Status
    is_submitted = Column(Boolean, default=False, nullable=False)
    is_auto_submitted = Column(Boolean, default=False, nullable=False)
    is_graded = Column(Boolean, default=False, nullable=False)
    
    # Scoring
    total_score = Column(Float, default=0.0, nullable=False)
    max_score = Column(Float, nullable=True)
    percentage = Column(Float, default=0.0, nullable=False)
    
    # Answers stored as JSON for simplicity
    answers = Column(JSON, nullable=True, default=[])  # Array of {question_index, answer, question_type, etc.}
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    graded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    quiz = relationship("Quiz", back_populates="attempts")
    user = relationship("User", backref="quiz_attempts")


class CodingProblem(Base):
    """Coding problem model - Super Admin only, year-based visibility"""
    __tablename__ = "coding_problems"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    input_format = Column(Text, nullable=True)
    output_format = Column(Text, nullable=True)
    constraints = Column(Text, nullable=True)
    sample_input = Column(Text, nullable=True)
    sample_output = Column(Text, nullable=True)
    difficulty = Column(String(20), nullable=True)  # Easy, Medium, Hard
    tags = Column(JSON, nullable=True, default=[])  # List of tags
    
    # Year-based visibility (1, 2, 3, 4) - kept for backward compatibility
    year = Column(Integer, nullable=True, index=True)  # 1, 2, 3, or 4 (deprecated, use year_str)
    year_str = Column(String(20), nullable=True)  # Year as string (e.g., "1st", "2nd", "3rd", "4th")
    
    # Language Restrictions
    allowed_languages = Column(JSON, nullable=False, default=["python", "c", "cpp", "java", "javascript"])  # All supported languages
    restricted_languages = Column(JSON, nullable=True, default=[])  # Languages that MUST be used (empty = any allowed)
    recommended_languages = Column(JSON, nullable=True, default=[])  # Recommended but optional languages
    
    # Boilerplate Templates Per Language
    starter_code_python = Column(Text, nullable=True)
    starter_code_c = Column(Text, nullable=True)
    starter_code_cpp = Column(Text, nullable=True)
    starter_code_java = Column(Text, nullable=True)
    starter_code_javascript = Column(Text, nullable=True)
    
    # Execution Control
    time_limit = Column(Integer, default=5, nullable=False)  # seconds
    memory_limit = Column(Integer, default=256, nullable=False)  # MB
    
    # Test Cases (stored as JSON array)
    test_cases = Column(JSON, nullable=True, default=[])  # Array of {stdin, expected_output, is_public}
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)  # Optional expiry date
    
    # Scope fields for visibility control
    scope_type = Column(String(20), default="svnapro", nullable=False)  # "svnapro", "college", "department", "section"
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    department = Column(String(100), nullable=True)  # Department name
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True, index=True)
    # NOTE: section column removed - database doesn't have it, use section_id instead
    # section = Column(String(100), nullable=True)  # Section name (for filtering) - REMOVED
    # NOTE: academic_year_id column removed - database doesn't have it
    # academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True, index=True)  # REMOVED
    
    # Analytics tracking - unique identifier for analytics
    problem_code = Column(String(100), nullable=True, unique=True, index=True)  # Unique code for analytics tracking
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


"""Company Training models for placement preparation"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class RoundType(str, enum.Enum):
    """Types of rounds in company training"""
    QUIZ = "quiz"
    CODING = "coding"
    GROUP_DISCUSSION = "gd"
    INTERVIEW = "interview"


class Company(Base):
    """Company model for placement training"""
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    logo_url = Column(String(500), nullable=True)  # URL to company logo
    description = Column(Text, nullable=True)
    website = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    roles = relationship("CompanyRole", back_populates="company", cascade="all, delete-orphan")


class CompanyRole(Base):
    """Role at a company (e.g., System Engineer at Infosys)"""
    __tablename__ = "company_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    role_name = Column(String(255), nullable=False)  # e.g., "System Engineer", "Software Engineer"
    description = Column(Text, nullable=True)
    difficulty = Column(String(20), nullable=True)  # easy, medium, hard
    scope_type = Column(String(20), default="svnapro", nullable=False)  # svnapro, college, department, section
    
    # Targeting
    target_departments = Column(JSON, nullable=True)  # Array of department names
    target_years = Column(JSON, nullable=True)  # Array of years
    target_sections = Column(JSON, nullable=True)  # Array of section names
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="roles")
    practice_sections = relationship("PracticeSection", back_populates="role", cascade="all, delete-orphan")


class PracticeSection(Base):
    """Practice section for a role (e.g., "Practice Set 1", "Practice Set 2")"""
    __tablename__ = "practice_sections"
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("company_roles.id", ondelete="CASCADE"), nullable=False, index=True)
    section_name = Column(String(255), nullable=False)  # e.g., "Practice Set 1", "Mock Test 1"
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)  # For ordering sections
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    role = relationship("CompanyRole", back_populates="practice_sections")
    rounds = relationship("Round", back_populates="practice_section", cascade="all, delete-orphan", order_by="Round.order_index")


class Round(Base):
    """Round in a practice section (Quiz, Coding, GD, Interview)"""
    __tablename__ = "rounds"
    
    id = Column(Integer, primary_key=True, index=True)
    practice_section_id = Column(Integer, ForeignKey("practice_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    round_type = Column(SQLEnum(RoundType), nullable=False, index=True)
    round_name = Column(String(255), nullable=False)  # e.g., "Aptitude Test", "Technical Round"
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)  # For ordering rounds
    is_active = Column(Boolean, default=True, nullable=False)
    
    # For quiz rounds - link to existing quiz
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # For coding rounds - link to existing coding problem
    coding_problem_id = Column(Integer, ForeignKey("coding_problems.id", ondelete="SET NULL"), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    practice_section = relationship("PracticeSection", back_populates="rounds")
    quiz = relationship("Quiz", foreign_keys=[quiz_id])
    coding_problem = relationship("CodingProblem", foreign_keys=[coding_problem_id])
    contents = relationship("RoundContent", back_populates="round", cascade="all, delete-orphan")


class RoundContent(Base):
    """Content for rounds (questions, answers, topics, best points, etc.)"""
    __tablename__ = "round_contents"
    
    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("rounds.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # For GD rounds
    gd_topic = Column(String(500), nullable=True)  # GD topic/question
    gd_description = Column(Text, nullable=True)  # Description of the GD topic
    key_points = Column(JSON, nullable=True)  # Array of key points to discuss
    best_points = Column(JSON, nullable=True)  # Array of best points/answers
    dos_and_donts = Column(JSON, nullable=True)  # {dos: [...], donts: [...]}
    
    # For Interview rounds
    question = Column(Text, nullable=True)  # Interview question
    expected_answer = Column(Text, nullable=True)  # Expected/best answer
    question_type = Column(String(50), nullable=True)  # e.g., "technical", "hr", "tell_me_about_yourself", "behavioral"
    tips = Column(JSON, nullable=True)  # Array of tips for answering
    
    # For Quiz rounds - can store additional quiz questions if needed
    quiz_question = Column(Text, nullable=True)
    quiz_options = Column(JSON, nullable=True)  # Array of options
    correct_answer = Column(String(10), nullable=True)  # Option index or answer
    
    # Advanced Quiz features
    quiz_question_type = Column(String(50), nullable=True)  # mcq, fill_blank, true_false
    quiz_timer_seconds = Column(Integer, nullable=True)  # Timer for this question in seconds
    quiz_marks = Column(Integer, default=1, nullable=False)  # Marks for this question
    quiz_option_a = Column(Text, nullable=True)  # Option A for MCQ
    quiz_option_b = Column(Text, nullable=True)  # Option B for MCQ
    quiz_option_c = Column(Text, nullable=True)  # Option C for MCQ
    quiz_option_d = Column(Text, nullable=True)  # Option D for MCQ
    quiz_correct_answer_text = Column(Text, nullable=True)  # For fill_blank questions
    quiz_is_true = Column(Boolean, nullable=True)  # For true_false questions (True/False)
    
    # For Coding rounds - can store additional coding problems if needed
    coding_title = Column(String(255), nullable=True)
    coding_description = Column(Text, nullable=True)
    coding_difficulty = Column(String(20), nullable=True)
    coding_input_format = Column(Text, nullable=True)
    coding_output_format = Column(Text, nullable=True)
    coding_constraints = Column(Text, nullable=True)
    coding_sample_input = Column(Text, nullable=True)
    coding_sample_output = Column(Text, nullable=True)
    coding_test_cases = Column(JSON, nullable=True)  # Array of {stdin, expected_output, is_public}
    coding_starter_code_python = Column(Text, nullable=True)
    coding_starter_code_c = Column(Text, nullable=True)
    coding_starter_code_cpp = Column(Text, nullable=True)
    coding_starter_code_java = Column(Text, nullable=True)
    coding_starter_code_javascript = Column(Text, nullable=True)
    coding_time_limit = Column(Integer, nullable=True)
    coding_memory_limit = Column(Integer, nullable=True)
    
    # Advanced Coding exam features
    coding_exam_timer_enabled = Column(Boolean, default=False, nullable=False)  # Enable exam timer
    coding_exam_duration_minutes = Column(Integer, nullable=True)  # Exam duration in minutes
    
    order_index = Column(Integer, default=0, nullable=False)  # For ordering content items
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    round = relationship("Round", back_populates="contents")


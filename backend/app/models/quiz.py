"""Quiz and coding problem models with scope-based visibility"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, JSON
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
    
    # Year-based visibility (1, 2, 3, 4)
    year = Column(Integer, nullable=False, index=True)  # 1, 2, 3, or 4
    
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
    
    # Analytics tracking - unique identifier for analytics
    problem_code = Column(String(100), nullable=True, unique=True, index=True)  # Unique code for analytics tracking
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


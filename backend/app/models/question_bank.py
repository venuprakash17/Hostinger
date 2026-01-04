"""Question Bank Model - Reusable question repository"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class QuestionBank(Base):
    """Question Bank - Central repository for reusable questions"""
    __tablename__ = "question_banks"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Question details
    question_text = Column(Text, nullable=False)
    question_type = Column(String(20), nullable=False)  # "MCQ", "TRUE_FALSE"
    
    # MCQ options (stored as JSON array)
    options = Column(JSON, nullable=True)  # ["Option A", "Option B", "Option C", "Option D"]
    
    # Correct answer
    correct_answer = Column(String(10), nullable=False)  # For MCQ: "A", "B", "C", "D" | For True/False: "True" or "False"
    
    # Question metadata
    marks = Column(Integer, default=1, nullable=False)
    difficulty = Column(String(20), nullable=True)  # "easy", "medium", "hard"
    topic = Column(String(100), nullable=True)  # Subject/topic
    subject = Column(String(100), nullable=True)  # Subject name
    
    # Negative marking (optional)
    negative_marking = Column(Float, default=0.0, nullable=False)  # Points deducted for wrong answer
    
    # Ownership and scope
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    college = relationship("College", foreign_keys=[college_id])
    department = relationship("Department", foreign_keys=[department_id])

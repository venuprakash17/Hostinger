"""Hall Ticket model"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class HallTicket(Base):
    """Hall Ticket model for exams"""
    __tablename__ = "hall_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Exam Information
    exam_id = Column(Integer, nullable=False, index=True)  # ID of quiz/coding problem/exam
    exam_type = Column(String(50), nullable=False)  # "quiz", "coding", "mock_test", "placement"
    exam_title = Column(String(255), nullable=False)
    
    # Student Information
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Exam Details
    exam_date = Column(DateTime(timezone=True), nullable=False)
    exam_time = Column(String(50), nullable=True)  # e.g., "10:00 AM - 12:00 PM"
    duration_minutes = Column(Integer, nullable=True)
    
    # Venue Information
    venue = Column(String(255), nullable=True)
    room_number = Column(String(50), nullable=True)
    seat_number = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    
    # Instructions
    instructions = Column(JSON, nullable=True)  # Array of instruction strings
    
    # Status
    is_generated = Column(Boolean, default=False, nullable=False)
    generated_at = Column(DateTime(timezone=True), nullable=True)
    generated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # PDF Storage
    pdf_url = Column(String(500), nullable=True)  # Path to generated PDF
    
    # College
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    generator = relationship("User", foreign_keys=[generated_by])
    college = relationship("College", foreign_keys=[college_id])


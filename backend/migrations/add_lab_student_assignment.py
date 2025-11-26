"""
Migration: Add LabStudentAssignment table
Run this script to create the lab_student_assignments table
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Boolean, Date, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from app.core.database import Base
from app.config import get_settings

settings = get_settings()

# Create engine
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# Define the table (matching the model)
class LabStudentAssignment(Base):
    """Explicit assignment of students to labs"""
    __tablename__ = "lab_student_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_id = Column(Integer, ForeignKey("coding_labs.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    assigned_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True, nullable=False)
    
    enrollment_date = Column(Date, nullable=True)
    completion_deadline = Column(Date, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

def run_migration():
    """Create the lab_student_assignments table"""
    print("Creating lab_student_assignments table...")
    Base.metadata.create_all(bind=engine, tables=[LabStudentAssignment.__table__])
    print("✅ Migration complete! lab_student_assignments table created.")

if __name__ == "__main__":
    run_migration()


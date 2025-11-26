"""Migration script to create coding labs tables"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import Base, engine
from app.models.coding_lab import (
    CodingLab,
    LabProblem,
    TestCase,
    LabSubmission,
    ExecutionResult,
    PlagiarismReport,
    LabAnalytics,
    ExecutionLog
)

def create_tables():
    """Create all coding labs tables"""
    print("Creating coding labs tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Coding labs tables created successfully!")

if __name__ == "__main__":
    create_tables()


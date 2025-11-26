"""Migration script to add lab_sessions table and update lab_problems"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import Base, engine
from app.models.coding_lab import (
    CodingLab,
    LabSession,
    LabProblem,
    TestCase,
    LabSubmission,
    ExecutionResult,
    PlagiarismReport,
    LabAnalytics,
    ExecutionLog
)

def upgrade():
    """Create lab_sessions table and update lab_problems"""
    print("Creating lab_sessions table...")
    
    # Create the new table
    LabSession.__table__.create(bind=engine, checkfirst=True)
    
    # Update lab_problems table to add session_id column
    # Note: This is a simplified migration - in production, use Alembic
    print("Updating lab_problems table...")
    print("⚠️  Note: You may need to manually add session_id column if it doesn't exist")
    print("   ALTER TABLE lab_problems ADD COLUMN session_id INTEGER REFERENCES lab_sessions(id) ON DELETE CASCADE;")
    
    print("✅ Migration complete!")
    print("\n⚠️  IMPORTANT: Run this SQL manually if needed:")
    print("   ALTER TABLE lab_problems ADD COLUMN session_id INTEGER REFERENCES lab_sessions(id) ON DELETE CASCADE;")
    print("   UPDATE lab_problems SET session_id = (SELECT id FROM lab_sessions WHERE lab_id = lab_problems.lab_id LIMIT 1) WHERE session_id IS NULL;")
    print("   ALTER TABLE lab_problems ALTER COLUMN session_id SET NOT NULL;")

def downgrade():
    """Remove lab_sessions table"""
    print("Dropping lab_sessions table...")
    LabSession.__table__.drop(bind=engine, checkfirst=True)
    print("✅ Downgrade complete!")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "downgrade":
        downgrade()
    else:
        upgrade()


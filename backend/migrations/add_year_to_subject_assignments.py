"""Add year column to subject_assignments table"""
import os
import sys
from sqlalchemy import create_engine, text, inspect

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings

def column_exists(inspector, table_name: str, column_name: str) -> bool:
    """Check if column exists in table"""
    if table_name not in inspector.get_table_names():
        return False
    columns = inspector.get_columns(table_name)
    return any(col["name"] == column_name for col in columns)

def run_migration():
    """Add year column to subject_assignments table"""
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    
    with engine.begin() as conn:
        # Check if column already exists
        if column_exists(inspector, "subject_assignments", "year"):
            print("✅ Column 'year' already exists in subject_assignments table")
            return
        
        # Add year column
        conn.execute(text("ALTER TABLE subject_assignments ADD COLUMN year VARCHAR(20)"))
        print("✅ Successfully added 'year' column to subject_assignments table")

if __name__ == "__main__":
    run_migration()


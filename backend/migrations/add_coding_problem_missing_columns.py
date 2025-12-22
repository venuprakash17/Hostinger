"""
Migration: Add missing columns to coding_problems table

This migration adds:
1. year_str column
2. section column (if not exists)
3. academic_year_id column (if not exists)
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from app.core.database import engine
from app.config import get_settings

settings = get_settings()
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
is_postgresql = "postgresql" in settings.DATABASE_URL.lower() or "postgres" in settings.DATABASE_URL.lower()


def upgrade():
    """Run migration"""
    with engine.connect() as conn:
        inspector = inspect(engine)
        
        if 'coding_problems' not in inspector.get_table_names():
            print("⚠️  coding_problems table does not exist. Skipping migration.")
            return
        
        columns = [col['name'] for col in inspector.get_columns('coding_problems')]
        
        # Add year_str column
        if 'year_str' not in columns:
            try:
                conn.execute(text("""
                    ALTER TABLE coding_problems 
                    ADD COLUMN year_str VARCHAR(20)
                """))
                conn.commit()
                print("✅ Added year_str column to coding_problems")
            except Exception as e:
                print(f"⚠️  Error adding year_str column: {e}")
        else:
            print("ℹ️  year_str column already exists")
        
        # Add section column
        if 'section' not in columns:
            try:
                conn.execute(text("""
                    ALTER TABLE coding_problems 
                    ADD COLUMN section VARCHAR(100)
                """))
                conn.commit()
                print("✅ Added section column to coding_problems")
            except Exception as e:
                print(f"⚠️  Error adding section column: {e}")
        else:
            print("ℹ️  section column already exists")
        
        # Add academic_year_id column
        if 'academic_year_id' not in columns:
            try:
                if is_sqlite:
                    conn.execute(text("""
                        ALTER TABLE coding_problems 
                        ADD COLUMN academic_year_id INTEGER REFERENCES academic_years(id)
                    """))
                else:
                    conn.execute(text("""
                        ALTER TABLE coding_problems 
                        ADD COLUMN academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL
                    """))
                conn.commit()
                
                # Create index
                try:
                    conn.execute(text("""
                        CREATE INDEX IF NOT EXISTS idx_coding_problems_academic_year 
                        ON coding_problems(academic_year_id)
                    """))
                    conn.commit()
                except Exception as e:
                    print(f"⚠️  Error creating index: {e}")
                
                print("✅ Added academic_year_id column to coding_problems")
            except Exception as e:
                print(f"⚠️  Error adding academic_year_id column: {e}")
        else:
            print("ℹ️  academic_year_id column already exists")
        
        print("✅ Migration completed successfully")


if __name__ == "__main__":
    upgrade()



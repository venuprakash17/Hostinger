"""Migration: Add advanced features to quizzes table
- per_question_timer: JSON field to store timer per question
- code_snippet: Text field for code display
- question_timers: JSON field for individual question timers
"""
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, text
from app.core.config import settings

def upgrade():
    """Add advanced features columns to quizzes table"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Add code_snippet column
        try:
            conn.execute(text("""
                ALTER TABLE quizzes 
                ADD COLUMN IF NOT EXISTS code_snippet TEXT;
            """))
            print("✅ Added code_snippet column")
        except Exception as e:
            print(f"⚠️  code_snippet column may already exist: {e}")
        
        # Add question_timers JSON column (stores timer per question)
        try:
            conn.execute(text("""
                ALTER TABLE quizzes 
                ADD COLUMN IF NOT EXISTS question_timers JSON;
            """))
            print("✅ Added question_timers column")
        except Exception as e:
            print(f"⚠️  question_timers column may already exist: {e}")
        
        # Add per_question_timer_enabled boolean
        try:
            conn.execute(text("""
                ALTER TABLE quizzes 
                ADD COLUMN IF NOT EXISTS per_question_timer_enabled BOOLEAN DEFAULT FALSE;
            """))
            print("✅ Added per_question_timer_enabled column")
        except Exception as e:
            print(f"⚠️  per_question_timer_enabled column may already exist: {e}")
        
        conn.commit()
        print("✅ Migration completed successfully!")

if __name__ == "__main__":
    upgrade()


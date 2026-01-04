"""
Migration: Add missing columns to round_contents table
Adds advanced quiz and coding features columns that exist in the model but not in the database
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings


def upgrade():
    """Add missing columns to round_contents table"""
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        inspector = inspect(engine)
        table_exists = inspector.has_table("round_contents")
        
        if not table_exists:
            print("❌ 'round_contents' table does not exist. Please run create_company_training_tables.py first.")
            return
        
        # Get existing columns
        columns = [col['name'] for col in inspector.get_columns("round_contents")]
        print(f"📋 Existing columns in round_contents: {columns}")
        
        # Columns to add (from the model but missing in migration)
        columns_to_add = [
            ("quiz_question_type", "VARCHAR(50)"),
            ("quiz_timer_seconds", "INTEGER"),
            ("quiz_marks", "INTEGER NOT NULL DEFAULT 1"),
            ("quiz_option_a", "TEXT"),
            ("quiz_option_b", "TEXT"),
            ("quiz_option_c", "TEXT"),
            ("quiz_option_d", "TEXT"),
            ("quiz_correct_answer_text", "TEXT"),
            ("quiz_is_true", "BOOLEAN"),
            ("coding_exam_timer_enabled", "BOOLEAN NOT NULL DEFAULT 0"),
            ("coding_exam_duration_minutes", "INTEGER"),
        ]
        
        added_count = 0
        for col_name, col_type in columns_to_add:
            if col_name not in columns:
                try:
                    conn.execute(text(f"ALTER TABLE round_contents ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"✅ Added column: {col_name}")
                    added_count += 1
                except Exception as e:
                    print(f"⚠️  Error adding column {col_name}: {e}")
            else:
                print(f"ℹ️  Column {col_name} already exists")
        
        print(f"\n✅ Migration completed! Added {added_count} new column(s).")


if __name__ == "__main__":
    upgrade()


"""Migration: Add advanced quiz and coding features to round_contents table
- Quiz features: question_type (mcq/fill_blank/true_false), timer_seconds, marks, option_a/b/c/d, correct_answer_text, is_true
- Coding features: exam_timer_enabled, exam_duration_minutes
"""
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

def table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()

def upgrade():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    with engine.begin() as conn:
        if table_exists(inspector, "round_contents"):
            # Advanced Quiz fields
            quiz_fields = [
                ("quiz_question_type", "VARCHAR(50)"),  # mcq, fill_blank, true_false
                ("quiz_timer_seconds", "INTEGER"),  # Timer for this question
                ("quiz_marks", "INTEGER DEFAULT 1"),  # Marks for this question
                ("quiz_option_a", "TEXT"),  # Option A for MCQ
                ("quiz_option_b", "TEXT"),  # Option B for MCQ
                ("quiz_option_c", "TEXT"),  # Option C for MCQ
                ("quiz_option_d", "TEXT"),  # Option D for MCQ
                ("quiz_correct_answer_text", "TEXT"),  # For fill_blank questions
                ("quiz_is_true", "BOOLEAN"),  # For true_false questions
            ]
            
            # Advanced Coding fields
            coding_fields = [
                ("coding_exam_timer_enabled", "BOOLEAN DEFAULT FALSE"),  # Enable exam timer
                ("coding_exam_duration_minutes", "INTEGER"),  # Exam duration in minutes
            ]
            
            all_fields = quiz_fields + coding_fields
            
            for col_name, col_type in all_fields:
                if not column_exists(inspector, "round_contents", col_name):
                    try:
                        conn.execute(text(f"ALTER TABLE round_contents ADD COLUMN {col_name} {col_type}"))
                        print(f"✅ Added '{col_name}' column to 'round_contents' table")
                    except Exception as e:
                        print(f"⚠️  Error adding '{col_name}': {e}")
                else:
                    print(f"ℹ️ '{col_name}' column already exists in 'round_contents' table")
        else:
            print("⚠️ 'round_contents' table does not exist. Skipping column addition.")

if __name__ == "__main__":
    upgrade()

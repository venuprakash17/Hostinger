"""Migration: Add additional coding problem fields to round_contents table"""
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

def upgrade():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    with engine.begin() as conn:
        if table_exists(inspector, "round_contents"):
            new_columns = [
                ("coding_input_format", "TEXT"),
                ("coding_output_format", "TEXT"),
                ("coding_constraints", "TEXT"),
                ("coding_sample_input", "TEXT"),
                ("coding_sample_output", "TEXT"),
                ("coding_test_cases", "TEXT"),  # JSON stored as TEXT in SQLite
                ("coding_starter_code_python", "TEXT"),
                ("coding_starter_code_c", "TEXT"),
                ("coding_starter_code_cpp", "TEXT"),
                ("coding_starter_code_java", "TEXT"),
                ("coding_starter_code_javascript", "TEXT"),
                ("coding_time_limit", "INTEGER"),
                ("coding_memory_limit", "INTEGER"),
            ]
            
            for col_name, col_type in new_columns:
                if not column_exists(inspector, "round_contents", col_name):
                    conn.execute(text(f"ALTER TABLE round_contents ADD COLUMN {col_name} {col_type}"))
                    print(f"✅ Added '{col_name}' column to 'round_contents' table")
                else:
                    print(f"ℹ️ '{col_name}' column already exists in 'round_contents' table")
        else:
            print("⚠️ 'round_contents' table does not exist. Skipping column addition.")

def table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()

if __name__ == "__main__":
    upgrade()


#!/usr/bin/env python3
"""
Migration script to add new fields to coding_problems table
and create user_saved_code table

Usage:
    python backend/migrations/migrate_coding_problems.py
"""
import sys
import os
from sqlalchemy import text, inspect

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, SessionLocal

def column_exists(conn, table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table"""
    inspector = inspect(engine)
    columns = inspector.get_columns(table_name)
    return any(col["name"] == column_name for col in columns)

def table_exists(conn, table_name: str) -> bool:
    """Check if a table exists"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def upgrade():
    """Run migration"""
    db = SessionLocal()
    try:
        conn = db.connection()
        
        print("🔄 Starting coding problems migration...")
        
        # Add new columns to coding_problems table
        new_columns = [
            ("input_format", "TEXT"),
            ("output_format", "TEXT"),
            ("year", "INTEGER DEFAULT 1"),
            ("allowed_languages", "TEXT DEFAULT '[\"python\",\"c\",\"cpp\",\"java\",\"javascript\"]'"),
            ("restricted_languages", "TEXT DEFAULT '[]'"),
            ("recommended_languages", "TEXT DEFAULT '[]'"),
            ("starter_code_python", "TEXT"),
            ("starter_code_c", "TEXT"),
            ("starter_code_cpp", "TEXT"),
            ("starter_code_java", "TEXT"),
            ("starter_code_javascript", "TEXT"),
            ("time_limit", "INTEGER DEFAULT 5"),
            ("memory_limit", "INTEGER DEFAULT 256"),
        ]
        
        for col_name, col_type in new_columns:
            if not column_exists(conn, "coding_problems", col_name):
                try:
                    conn.execute(text(f"ALTER TABLE coding_problems ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"✅ Added column: {col_name}")
                except Exception as e:
                    if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                        print(f"ℹ️  Column {col_name} already exists")
                    else:
                        print(f"⚠️  Error adding {col_name}: {e}")
            else:
                print(f"ℹ️  Column {col_name} already exists")
        
        # Create user_saved_code table
        if not table_exists(conn, "user_saved_code"):
            try:
                conn.execute(text("""
                    CREATE TABLE user_saved_code (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        problem_id INTEGER NOT NULL,
                        language VARCHAR(20) NOT NULL,
                        code TEXT NOT NULL DEFAULT '',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE,
                        UNIQUE(user_id, problem_id, language)
                    )
                """))
                conn.commit()
                print("✅ Created user_saved_code table")
            except Exception as e:
                print(f"⚠️  Error creating user_saved_code table: {e}")
        else:
            print("ℹ️  user_saved_code table already exists")
        
        # Create indexes
        indexes = [
            ("idx_user_saved_code_user_id", "user_saved_code", "user_id"),
            ("idx_user_saved_code_problem_id", "user_saved_code", "problem_id"),
            ("idx_coding_problems_year", "coding_problems", "year"),
        ]
        
        for idx_name, table_name, column_name in indexes:
            try:
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name}({column_name})"))
                conn.commit()
                print(f"✅ Created index: {idx_name}")
            except Exception as e:
                print(f"⚠️  Error creating index {idx_name}: {e}")
        
        # Update existing data
        try:
            conn.execute(text("UPDATE coding_problems SET year = 1 WHERE year IS NULL"))
            conn.execute(text("UPDATE coding_problems SET allowed_languages = '[\"python\",\"c\",\"cpp\",\"java\",\"javascript\"]' WHERE allowed_languages IS NULL"))
            conn.commit()
            print("✅ Updated existing problems")
        except Exception as e:
            print(f"⚠️  Error updating existing data: {e}")
        
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    upgrade()


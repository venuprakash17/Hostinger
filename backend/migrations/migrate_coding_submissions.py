#!/usr/bin/env python3
"""
Migration script to create coding_submissions table

Usage:
    python backend/migrations/migrate_coding_submissions.py
"""
import sys
import os
from sqlalchemy import text, inspect

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, SessionLocal

def table_exists(conn, table_name: str) -> bool:
    """Check if a table exists"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def upgrade():
    """Run migration"""
    db = SessionLocal()
    try:
        conn = db.connection()
        
        print("🔄 Starting coding submissions migration...")
        
        # Create coding_submissions table
        if not table_exists(conn, "coding_submissions"):
            try:
                conn.execute(text("""
                    CREATE TABLE coding_submissions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        problem_id INTEGER NOT NULL,
                        language VARCHAR(20) NOT NULL,
                        code TEXT NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'pending',
                        passed_tests INTEGER DEFAULT 0 NOT NULL,
                        total_tests INTEGER DEFAULT 0 NOT NULL,
                        execution_time REAL,
                        memory_used REAL,
                        test_results TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE
                    )
                """))
                conn.commit()
                print("✅ Created coding_submissions table")
            except Exception as e:
                print(f"⚠️  Error creating coding_submissions table: {e}")
        else:
            print("ℹ️  coding_submissions table already exists")
        
        # Create indexes
        indexes = [
            ("idx_coding_submissions_user_id", "coding_submissions", "user_id"),
            ("idx_coding_submissions_problem_id", "coding_submissions", "problem_id"),
            ("idx_coding_submissions_status", "coding_submissions", "status"),
        ]
        
        for idx_name, table_name, column_name in indexes:
            try:
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name}({column_name})"))
                conn.commit()
                print(f"✅ Created index: {idx_name}")
            except Exception as e:
                print(f"⚠️  Error creating index {idx_name}: {e}")
        
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    upgrade()


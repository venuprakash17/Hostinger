#!/usr/bin/env python3
"""Migration: Add problem_code column to coding_problems table"""

import sqlite3
import sys
import os
import hashlib
import time

# Find database file
possible_paths = [
    "./elevate_edu.db",
    "./backend/elevate_edu.db",
    "./backend/app/core/database.db",
    os.path.join(os.path.dirname(__file__), "..", "elevate_edu.db"),
    os.path.join(os.path.dirname(__file__), "..", "..", "elevate_edu.db"),
]

db_path = None
for path in possible_paths:
    abs_path = os.path.abspath(path)
    if os.path.exists(abs_path):
        db_path = abs_path
        break

if not db_path:
    print("❌ Could not find database file. Tried:")
    for path in possible_paths:
        print(f"   - {os.path.abspath(path)}")
    sys.exit(1)

print(f"📁 Using database: {db_path}")

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='coding_problems'")
        if not cursor.fetchone():
            print("⚠️  Table 'coding_problems' does not exist. Creating it...")
            # Table will be created by SQLAlchemy when models are loaded
            print("ℹ️  Please restart the backend server to create the table, then run this migration again.")
            conn.close()
            return
        
        # Check if column exists
        cursor.execute("PRAGMA table_info(coding_problems)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "problem_code" not in columns:
            print("Adding problem_code column...")
            # Add column
            cursor.execute("""
                ALTER TABLE coding_problems 
                ADD COLUMN problem_code VARCHAR(100)
            """)
            print("✅ Added problem_code column")
            
            # Create index
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_coding_problems_problem_code 
                ON coding_problems(problem_code)
            """)
            print("✅ Created index on problem_code")
        else:
            print("ℹ️  problem_code column already exists")
        
        # Generate problem_code for existing problems
        cursor.execute("""
            SELECT id, title, description FROM coding_problems 
            WHERE problem_code IS NULL OR problem_code = ''
        """)
        
        problems = cursor.fetchall()
        updated_count = 0
        
        for problem_id, title, description in problems:
            title_str = title or ""
            desc_str = description or ""
            problem_code = f"CP_{hashlib.md5(f'{title_str}_{desc_str}_{problem_id}_{time.time()}'.encode()).hexdigest()[:12].upper()}"
            
            cursor.execute("""
                UPDATE coding_problems 
                SET problem_code = ? 
                WHERE id = ?
            """, (problem_code, problem_id))
            
            updated_count += 1
        
        if updated_count > 0:
            conn.commit()
            print(f"✅ Generated problem_code for {updated_count} existing problems")
        else:
            print("ℹ️  All problems already have problem_code")
        
        # Create unique index (may fail if duplicates exist, that's okay)
        try:
            cursor.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_coding_problems_problem_code_unique 
                ON coding_problems(problem_code)
            """)
            conn.commit()
            print("✅ Created unique constraint on problem_code")
        except sqlite3.OperationalError as e:
            if "duplicate" in str(e).lower() or "UNIQUE" in str(e):
                print("⚠️  Warning: Some duplicate problem_codes exist. This is okay for now.")
            else:
                raise
        
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

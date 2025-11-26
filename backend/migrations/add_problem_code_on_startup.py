#!/usr/bin/env python3
"""Add problem_code column on backend startup - run this after backend starts"""

import sqlite3
import os
import sys

# Try to find database file
db_paths = [
    "./elevate_edu.db",
    "./backend/elevate_edu.db",
    os.path.join(os.path.dirname(__file__), "..", "elevate_edu.db"),
]

db_path = None
for path in db_paths:
    abs_path = os.path.abspath(path)
    if os.path.exists(abs_path):
        db_path = abs_path
        break

if not db_path:
    print("⚠️  Database file not found. The table will be created automatically when you create your first problem.")
    sys.exit(0)

print(f"📁 Using database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='coding_problems'")
    if not cursor.fetchone():
        print("ℹ️  Table 'coding_problems' does not exist yet.")
        print("ℹ️  It will be created automatically with all columns including problem_code when you create your first problem.")
        conn.close()
        sys.exit(0)
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(coding_problems)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if "problem_code" not in columns:
        print("Adding problem_code column...")
        cursor.execute("""
            ALTER TABLE coding_problems 
            ADD COLUMN problem_code VARCHAR(100)
        """)
        conn.commit()
        print("✅ Added problem_code column")
        
        # Create index
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_coding_problems_problem_code 
            ON coding_problems(problem_code)
        """)
        conn.commit()
        print("✅ Created index on problem_code")
        
        # Generate codes for existing problems
        import hashlib
        import time
        
        cursor.execute("""
            SELECT id, title, description FROM coding_problems 
            WHERE problem_code IS NULL OR problem_code = ''
        """)
        
        problems = cursor.fetchall()
        for problem_id, title, description in problems:
            title_str = title or ""
            desc_str = description or ""
            problem_code = f"CP_{hashlib.md5(f'{title_str}_{desc_str}_{problem_id}_{time.time()}'.encode()).hexdigest()[:12].upper()}"
            
            cursor.execute("""
                UPDATE coding_problems 
                SET problem_code = ? 
                WHERE id = ?
            """, (problem_code, problem_id))
        
        if problems:
            conn.commit()
            print(f"✅ Generated problem_code for {len(problems)} existing problems")
        
        print("✅ Migration completed successfully!")
    else:
        print("✅ problem_code column already exists")
        
        # Check for missing codes
        cursor.execute("""
            SELECT COUNT(*) FROM coding_problems 
            WHERE problem_code IS NULL OR problem_code = ''
        """)
        count = cursor.scalar()
        if count > 0:
            print(f"ℹ️  {count} problems are missing problem_code - they will get codes automatically")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    conn.rollback()
finally:
    conn.close()


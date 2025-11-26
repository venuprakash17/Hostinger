#!/usr/bin/env python3
"""Migration: Add problem_code to existing coding problems for analytics tracking"""

import sqlite3
import sys
import os
import hashlib
import time

# Get database path
db_path = os.path.join(os.path.dirname(__file__), "..", "app", "core", "database.db")

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if problem_code column exists
        cursor.execute("PRAGMA table_info(coding_problems)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "problem_code" not in columns:
            # Add problem_code column
            cursor.execute("""
                ALTER TABLE coding_problems 
                ADD COLUMN problem_code VARCHAR(100)
            """)
            print("✅ Added problem_code column")
            
            # Create index for faster lookups
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_coding_problems_problem_code 
                ON coding_problems(problem_code)
            """)
            print("✅ Created index on problem_code")
        else:
            print("ℹ️  problem_code column already exists")
        
        # Generate problem_code for existing problems that don't have one
        cursor.execute("""
            SELECT id, title, description FROM coding_problems 
            WHERE problem_code IS NULL OR problem_code = ''
        """)
        
        problems = cursor.fetchall()
        updated_count = 0
        
        for problem_id, title, description in problems:
            # Generate unique code
            title_str = title or ""
            desc_str = description or ""
            code_base = f"{title_str}_{desc_str}".lower().replace(" ", "_")[:50]
            problem_code = f"CP_{hashlib.md5(f'{title_str}_{desc_str}_{problem_id}_{time.time()}'.encode()).hexdigest()[:12].upper()}"
            
            # Update the problem
            cursor.execute("""
                UPDATE coding_problems 
                SET problem_code = ? 
                WHERE id = ?
            """, (problem_code, problem_id))
            
            updated_count += 1
        
        if updated_count > 0:
            print(f"✅ Generated problem_code for {updated_count} existing problems")
        
        # Make problem_code unique (if not already)
        try:
            cursor.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_coding_problems_problem_code_unique 
                ON coding_problems(problem_code)
            """)
            print("✅ Created unique constraint on problem_code")
        except sqlite3.OperationalError as e:
            if "duplicate" in str(e).lower():
                print("⚠️  Warning: Some duplicate problem_codes exist. Cleaning up...")
                # Remove duplicates by keeping the first one
                cursor.execute("""
                    UPDATE coding_problems 
                    SET problem_code = NULL 
                    WHERE id NOT IN (
                        SELECT MIN(id) 
                        FROM coding_problems 
                        GROUP BY problem_code
                    ) AND problem_code IS NOT NULL
                """)
                # Regenerate for NULL ones
                cursor.execute("""
                    SELECT id, title, description FROM coding_problems 
                    WHERE problem_code IS NULL OR problem_code = ''
                """)
                problems = cursor.fetchall()
                for problem_id, title, description in problems:
                    title_str = title or ""
                    desc_str = description or ""
                    problem_code = f"CP_{hashlib.md5(f'{title_str}_{desc_str}_{problem_id}_{time.time()}'.encode()).hexdigest()[:12].upper()}"
                    cursor.execute("UPDATE coding_problems SET problem_code = ? WHERE id = ?", (problem_code, problem_id))
                print("✅ Cleaned up and regenerated problem_codes")
            else:
                raise
        
        conn.commit()
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


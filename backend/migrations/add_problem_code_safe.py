#!/usr/bin/env python3
"""Safe migration: Add problem_code column using SQLAlchemy"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Set environment to avoid validation errors
os.environ.setdefault('PYTHONPATH', os.path.join(os.path.dirname(__file__), '..'))

try:
    from sqlalchemy import text, inspect
    from app.core.database import engine
    
    def migrate():
        """Add problem_code column safely"""
        inspector = inspect(engine)
        
        # Check if table exists
        if 'coding_problems' not in inspector.get_table_names():
            print("⚠️  Table 'coding_problems' does not exist yet.")
            print("ℹ️  The table will be created automatically when you create your first problem.")
            print("ℹ️  The problem_code column will be included automatically.")
            return
        
        # Check if column exists
        columns = [col['name'] for col in inspector.get_columns('coding_problems')]
        
        if 'problem_code' not in columns:
            print("Adding problem_code column...")
            with engine.connect() as conn:
                conn.execute(text("""
                    ALTER TABLE coding_problems 
                    ADD COLUMN problem_code VARCHAR(100)
                """))
                conn.commit()
                print("✅ Added problem_code column")
                
                # Create index
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_coding_problems_problem_code 
                    ON coding_problems(problem_code)
                """))
                conn.commit()
                print("✅ Created index on problem_code")
                
                # Generate codes for existing problems
                result = conn.execute(text("""
                    SELECT id, title, description FROM coding_problems 
                    WHERE problem_code IS NULL OR problem_code = ''
                """))
                
                problems = result.fetchall()
                import hashlib
                import time
                
                for problem_id, title, description in problems:
                    title_str = title or ""
                    desc_str = description or ""
                    problem_code = f"CP_{hashlib.md5(f'{title_str}_{desc_str}_{problem_id}_{time.time()}'.encode()).hexdigest()[:12].upper()}"
                    
                    conn.execute(text("""
                        UPDATE coding_problems 
                        SET problem_code = :code 
                        WHERE id = :id
                    """), {"code": problem_code, "id": problem_id})
                
                if problems:
                    conn.commit()
                    print(f"✅ Generated problem_code for {len(problems)} existing problems")
                
                # Create unique index
                try:
                    conn.execute(text("""
                        CREATE UNIQUE INDEX IF NOT EXISTS idx_coding_problems_problem_code_unique 
                        ON coding_problems(problem_code)
                    """))
                    conn.commit()
                    print("✅ Created unique constraint on problem_code")
                except Exception as e:
                    if "duplicate" not in str(e).lower() and "UNIQUE" not in str(e):
                        print(f"⚠️  Could not create unique index: {e}")
            
            print("✅ Migration completed successfully!")
        else:
            print("ℹ️  problem_code column already exists")
            
            # Check if any problems are missing codes
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM coding_problems 
                    WHERE problem_code IS NULL OR problem_code = ''
                """))
                count = result.scalar()
                if count > 0:
                    print(f"ℹ️  {count} problems are missing problem_code")
                    print("   They will get codes automatically when updated or you can run this script again")
    
    if __name__ == "__main__":
        migrate()
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    # Fallback to direct SQLite approach
    print("\n🔄 Trying direct SQLite approach...")
    
    import sqlite3
    import hashlib
    import time
    
    db_paths = [
        "./elevate_edu.db",
        "./backend/elevate_edu.db",
    ]
    
    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = os.path.abspath(path)
            break
    
    if db_path:
        print(f"📁 Using database: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='coding_problems'")
            if cursor.fetchone():
                cursor.execute("PRAGMA table_info(coding_problems)")
                columns = [row[1] for row in cursor.fetchall()]
                
                if "problem_code" not in columns:
                    cursor.execute("ALTER TABLE coding_problems ADD COLUMN problem_code VARCHAR(100)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_coding_problems_problem_code ON coding_problems(problem_code)")
                    conn.commit()
                    print("✅ Added problem_code column via direct SQL")
                else:
                    print("ℹ️  problem_code column already exists")
            else:
                print("⚠️  Table does not exist - will be created by SQLAlchemy")
        except Exception as e2:
            print(f"❌ Direct SQLite approach also failed: {e2}")
        finally:
            conn.close()
    else:
        print("❌ Could not find database file")


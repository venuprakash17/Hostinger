"""Migration: Add eligible_years column to jobs table"""
import sqlite3
import os
import sys

def get_db_path():
    """Get database path"""
    # Try to get from environment or use default
    db_path = os.environ.get('DATABASE_URL', '').replace('sqlite:///', '')
    if not db_path or not os.path.exists(db_path):
        # Try common locations
        possible_paths = [
            'elevate_edu.db',
            'backend/elevate_edu.db',
            '../elevate_edu.db',
            os.path.join(os.path.dirname(__file__), '..', 'elevate_edu.db')
        ]
        for path in possible_paths:
            if os.path.exists(path):
                return path
        # Default to current directory
        return 'elevate_edu.db'
    return db_path

def upgrade():
    """Add eligible_years column to jobs table"""
    db_path = get_db_path()
    print(f"Connecting to database: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"Database {db_path} does not exist. Skipping migration.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(jobs)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'eligible_years' in columns:
            print("✅ Column 'eligible_years' already exists in jobs table")
            return
        
        # Add the column
        print("Adding eligible_years column to jobs table...")
        cursor.execute("""
            ALTER TABLE jobs 
            ADD COLUMN eligible_years TEXT NULL
        """)
        
        conn.commit()
        print("✅ Successfully added eligible_years column to jobs table")
        
    except sqlite3.Error as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade()

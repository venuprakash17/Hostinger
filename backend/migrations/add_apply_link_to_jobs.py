"""
Migration: Add apply_link column to jobs table
Run this script to add the missing apply_link column
"""

import sqlite3
import os
from pathlib import Path

def get_db_path():
    """Get the database path"""
    # Try to find the database file
    backend_dir = Path(__file__).parent.parent
    db_path = backend_dir / "elevate_edu.db"
    
    if not db_path.exists():
        # Try alternative locations
        alt_paths = [
            backend_dir / "backend" / "elevate_edu.db",
            Path.cwd() / "elevate_edu.db",
        ]
        for path in alt_paths:
            if path.exists():
                return str(path)
        raise FileNotFoundError(f"Database not found. Tried: {db_path}")
    
    return str(db_path)

def upgrade():
    """Add apply_link column to jobs table"""
    db_path = get_db_path()
    print(f"Connecting to database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(jobs)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'apply_link' in columns:
            print("✅ Column 'apply_link' already exists in jobs table")
            return
        
        # Add the column
        print("Adding apply_link column to jobs table...")
        cursor.execute("""
            ALTER TABLE jobs 
            ADD COLUMN apply_link VARCHAR(500) NULL
        """)
        
        conn.commit()
        print("✅ Successfully added apply_link column to jobs table")
        
    except sqlite3.Error as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade()


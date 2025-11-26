#!/usr/bin/env python3
"""Migration: Add scope fields to coding_problems table"""

import sqlite3
import sys
import os

# Get database path
db_path = os.path.join(os.path.dirname(__file__), "..", "app", "core", "database.db")

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(coding_problems)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add scope_type column if it doesn't exist
        if "scope_type" not in columns:
            cursor.execute("""
                ALTER TABLE coding_problems 
                ADD COLUMN scope_type VARCHAR(20) DEFAULT 'svnapro' NOT NULL
            """)
            print("✅ Added scope_type column")
        else:
            print("ℹ️  scope_type column already exists")
        
        # Add college_id column if it doesn't exist
        if "college_id" not in columns:
            cursor.execute("""
                ALTER TABLE coding_problems 
                ADD COLUMN college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_coding_problems_college_id ON coding_problems(college_id)")
            print("✅ Added college_id column")
        else:
            print("ℹ️  college_id column already exists")
        
        # Add department column if it doesn't exist
        if "department" not in columns:
            cursor.execute("""
                ALTER TABLE coding_problems 
                ADD COLUMN department VARCHAR(100)
            """)
            print("✅ Added department column")
        else:
            print("ℹ️  department column already exists")
        
        # Add section_id column if it doesn't exist
        if "section_id" not in columns:
            cursor.execute("""
                ALTER TABLE coding_problems 
                ADD COLUMN section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_coding_problems_section_id ON coding_problems(section_id)")
            print("✅ Added section_id column")
        else:
            print("ℹ️  section_id column already exists")
        
        # Update existing problems to have scope_type = 'svnapro'
        cursor.execute("""
            UPDATE coding_problems 
            SET scope_type = 'svnapro' 
            WHERE scope_type IS NULL OR scope_type = ''
        """)
        
        conn.commit()
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()


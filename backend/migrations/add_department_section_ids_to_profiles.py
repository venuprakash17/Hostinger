#!/usr/bin/env python3
"""Migration: Add department_id and section_id to profiles table

This migration adds foreign key columns to link profiles directly to departments and sections,
enabling better faculty utilization tracking and subject-section assignments.
"""
import os
import sys
import sqlite3
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def upgrade(connection):
    """Add department_id and section_id columns to profiles table"""
    try:
        # Check if department_id column already exists
        cursor = connection.cursor()
        cursor.execute("PRAGMA table_info(profiles)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'department_id' not in columns:
            # Add department_id column
            cursor.execute("""
                ALTER TABLE profiles 
                ADD COLUMN department_id INTEGER 
                REFERENCES departments(id) ON DELETE SET NULL
            """)
            print("✅ Added department_id column to profiles table")
        else:
            print("ℹ️  department_id column already exists")
        
        if 'section_id' not in columns:
            # Add section_id column
            cursor.execute("""
                ALTER TABLE profiles 
                ADD COLUMN section_id INTEGER 
                REFERENCES sections(id) ON DELETE SET NULL
            """)
            print("✅ Added section_id column to profiles table")
        else:
            print("ℹ️  section_id column already exists")
        
        # Create indexes for better query performance
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_profiles_department_id ON profiles(department_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_profiles_section_id ON profiles(section_id)")
            print("✅ Created indexes on department_id and section_id")
        except Exception as e:
            print(f"⚠️  Note: Index creation skipped: {e}")
        
        connection.commit()
        print("✅ Migration completed successfully")
        
    except Exception as e:
        print(f"⚠️  Error during migration: {e}")
        connection.rollback()
        raise

def main():
    """Run migration"""
    # Get database path
    db_path = backend_dir / "elevate_edu.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        sys.exit(1)
    
    print(f"📦 Running migration on database: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    
    try:
        upgrade(conn)
    finally:
        conn.close()

if __name__ == "__main__":
    main()


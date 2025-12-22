#!/usr/bin/env python3
"""
Migration script to add institution_id column to profiles table
Run this on the server to fix the database schema
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, Base
from sqlalchemy import text

def add_institution_id_column():
    """Add institution_id column to profiles table if it doesn't exist"""
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='profiles' AND column_name='institution_id'
        """))
        
        if result.fetchone():
            print("✅ Column 'institution_id' already exists in profiles table")
            return
        
        # Add the column
        try:
            conn.execute(text("""
                ALTER TABLE profiles 
                ADD COLUMN institution_id INTEGER,
                ADD CONSTRAINT fk_profiles_institution 
                FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
            """))
            conn.commit()
            print("✅ Successfully added 'institution_id' column to profiles table")
        except Exception as e:
            print(f"❌ Error adding column: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    print("🔧 Adding institution_id column to profiles table...")
    add_institution_id_column()
    print("✅ Migration complete!")


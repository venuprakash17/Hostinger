"""
Migration script to add handled_years and handled_sections fields to profiles table
Run this once to update the database schema
"""
import sqlite3
import os

def migrate():
    db_path = "elevate_edu.db"
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(profiles)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'handled_years' not in columns:
            print("Adding handled_years column...")
            cursor.execute("ALTER TABLE profiles ADD COLUMN handled_years VARCHAR(255)")
        
        if 'handled_sections' not in columns:
            print("Adding handled_sections column...")
            cursor.execute("ALTER TABLE profiles ADD COLUMN handled_sections VARCHAR(255)")
        
        conn.commit()
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()


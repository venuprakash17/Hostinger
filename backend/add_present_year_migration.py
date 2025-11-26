"""Migration script to add present_year column to profiles table"""
import sqlite3
import os

def migrate():
    db_path = "elevate_edu.db"
    
    if not os.path.exists(db_path):
        print(f"Database {db_path} does not exist. Creating new database...")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(profiles)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "present_year" in columns:
            print("Column 'present_year' already exists. No migration needed.")
        else:
            # Add present_year column
            cursor.execute("ALTER TABLE profiles ADD COLUMN present_year VARCHAR(20)")
            conn.commit()
            print("✅ Successfully added 'present_year' column to profiles table")
            
            # Update existing students to have a default year (1st) if they don't have one
            cursor.execute("""
                UPDATE profiles 
                SET present_year = '1st' 
                WHERE present_year IS NULL 
                AND user_id IN (
                    SELECT ur.user_id 
                    FROM user_roles ur 
                    WHERE ur.role = 'student'
                )
            """)
            conn.commit()
            print("✅ Updated existing students with default year '1st'")
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()


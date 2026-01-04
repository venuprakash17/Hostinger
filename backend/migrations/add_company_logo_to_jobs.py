"""Migration: Add company_logo column to jobs table"""
import sqlite3
import os

def get_db_path():
    """Get database path"""
    db_path = os.environ.get('DATABASE_URL', '').replace('sqlite:///', '')
    if not db_path or not os.path.exists(db_path):
        possible_paths = [
            'elevate_edu.db',
            'backend/elevate_edu.db',
            '../elevate_edu.db',
            os.path.join(os.path.dirname(__file__), '..', 'elevate_edu.db')
        ]
        for path in possible_paths:
            if os.path.exists(path):
                return path
        return 'elevate_edu.db'
    return db_path

def upgrade():
    """Add company_logo column to jobs table"""
    db_path = get_db_path()
    print(f"Connecting to database: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"Database {db_path} does not exist. Skipping migration.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("PRAGMA table_info(jobs)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'company_logo' in columns:
            print("✅ Column 'company_logo' already exists in jobs table")
            return
        
        print("Adding company_logo column to jobs table...")
        cursor.execute("""
            ALTER TABLE jobs 
            ADD COLUMN company_logo TEXT NULL
        """)
        
        conn.commit()
        print("✅ Successfully added company_logo column to jobs table")
        
    except sqlite3.Error as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade()

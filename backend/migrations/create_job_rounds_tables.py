"""Migration: Create job_rounds and job_application_rounds tables"""
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
    """Create job_rounds and job_application_rounds tables"""
    db_path = get_db_path()
    print(f"Connecting to database: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"Database {db_path} does not exist. Skipping migration.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if tables already exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='job_rounds'")
        if cursor.fetchone():
            print("✅ Table 'job_rounds' already exists")
        else:
            print("Creating job_rounds table...")
            cursor.execute("""
                CREATE TABLE job_rounds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id INTEGER NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    "order" INTEGER NOT NULL,
                    description VARCHAR(500),
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP,
                    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
                )
            """)
            cursor.execute("CREATE INDEX idx_job_rounds_job_id ON job_rounds(job_id)")
            print("✅ Successfully created job_rounds table")
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='job_application_rounds'")
        if cursor.fetchone():
            print("✅ Table 'job_application_rounds' already exists")
        else:
            print("Creating job_application_rounds table...")
            cursor.execute("""
                CREATE TABLE job_application_rounds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_application_id INTEGER NOT NULL,
                    round_id INTEGER NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
                    remarks VARCHAR(1000),
                    updated_by INTEGER,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (job_application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
                    FOREIGN KEY (round_id) REFERENCES job_rounds(id) ON DELETE CASCADE,
                    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
                )
            """)
            cursor.execute("CREATE INDEX idx_job_application_rounds_application_id ON job_application_rounds(job_application_id)")
            cursor.execute("CREATE INDEX idx_job_application_rounds_round_id ON job_application_rounds(round_id)")
            print("✅ Successfully created job_application_rounds table")
        
        conn.commit()
        
    except sqlite3.Error as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade()

"""
Migration: Add Subject, Department, Section, Semester linkage to Coding Labs
Creates foreign key relationships for integrated College Management System
"""

from sqlalchemy import text
from app.core.database import engine


def upgrade():
    """Add foreign key columns and indexes to coding_labs table"""
    with engine.connect() as conn:
        # Check if columns exist and add them if they don't
        from sqlalchemy import inspect
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('coding_labs')]
        
        # Add subject_id column
        if 'subject_id' not in columns:
            conn.execute(text("ALTER TABLE coding_labs ADD COLUMN subject_id INTEGER"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_coding_labs_subject_id ON coding_labs(subject_id)"))
        
        # Add department_id column
        if 'department_id' not in columns:
            conn.execute(text("ALTER TABLE coding_labs ADD COLUMN department_id INTEGER"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_coding_labs_department_id ON coding_labs(department_id)"))
        
        # Add section_id column
        if 'section_id' not in columns:
            conn.execute(text("ALTER TABLE coding_labs ADD COLUMN section_id INTEGER"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_coding_labs_section_id ON coding_labs(section_id)"))
        
        # Add semester_id column
        if 'semester_id' not in columns:
            conn.execute(text("ALTER TABLE coding_labs ADD COLUMN semester_id INTEGER"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_coding_labs_semester_id ON coding_labs(semester_id)"))
        
        # Add year column
        if 'year' not in columns:
            conn.execute(text("ALTER TABLE coding_labs ADD COLUMN year VARCHAR(20)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_coding_labs_year ON coding_labs(year)"))
        
        # Create lab_attendance table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lab_attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lab_id INTEGER NOT NULL,
                faculty_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'present' NOT NULL,
                notes TEXT,
                session_number INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP,
                FOREIGN KEY (lab_id) REFERENCES coding_labs(id) ON DELETE CASCADE,
                FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(lab_id, student_id, date)
            )
        """))
        
        # Create indexes for lab_attendance
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lab_attendance_lab_id ON lab_attendance(lab_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lab_attendance_faculty_id ON lab_attendance(faculty_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lab_attendance_student_id ON lab_attendance(student_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lab_attendance_date ON lab_attendance(date)"))
        
        conn.commit()
        print("✅ Migration completed successfully")


if __name__ == "__main__":
    print("🚀 Running migration: Add Lab-Subject-Department linkage...")
    upgrade()
    print("✅ Migration complete!")


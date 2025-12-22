"""
Migration: Add Academic Year Migration tables and fields

This migration adds:
1. academic_year_migrations table
2. archived_subject_assignments table
3. archived_faculty_section_assignments table
4. academic_year_id column to coding_problems table

Run this from the backend directory:
    cd backend
    source venv/bin/activate  # or activate your virtual environment
    python migrations/add_academic_year_migration_tables.py
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from app.core.database import engine
from app.config import get_settings

settings = get_settings()
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
is_postgresql = "postgresql" in settings.DATABASE_URL.lower() or "postgres" in settings.DATABASE_URL.lower()


def upgrade():
    """Run migration"""
    with engine.connect() as conn:
        # Determine database type
        inspector = inspect(engine)
        db_type = "sqlite" if is_sqlite else "postgresql" if is_postgresql else "unknown"
        
        # SQL syntax differences
        if is_sqlite:
            # SQLite syntax
            id_type = "INTEGER PRIMARY KEY AUTOINCREMENT"
            timestamp_type = "TIMESTAMP"
            boolean_type = "BOOLEAN"
            json_type = "TEXT"  # SQLite stores JSON as TEXT
            default_now = "DEFAULT CURRENT_TIMESTAMP"
            create_index_if_not_exists = "CREATE INDEX IF NOT EXISTS"
        else:
            # PostgreSQL syntax
            id_type = "SERIAL PRIMARY KEY"
            timestamp_type = "TIMESTAMP WITH TIME ZONE"
            boolean_type = "BOOLEAN"
            json_type = "JSONB"
            default_now = "DEFAULT NOW()"
            create_index_if_not_exists = "CREATE INDEX IF NOT EXISTS"
        # Create academic_year_migrations table
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS academic_year_migrations (
                id {id_type},
                from_academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
                to_academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
                college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
                migration_type VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                students_promoted INTEGER DEFAULT 0,
                sections_archived INTEGER DEFAULT 0,
                subjects_archived INTEGER DEFAULT 0,
                assignments_cleared INTEGER DEFAULT 0,
                initiated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                started_at {timestamp_type},
                completed_at {timestamp_type},
                notes TEXT,
                can_rollback {boolean_type} DEFAULT TRUE,
                rollback_data {json_type},
                created_at {timestamp_type} {default_now},
                updated_at {timestamp_type}
            )
        """))
        
        # Create indexes for academic_year_migrations
        conn.execute(text(f"""
            {create_index_if_not_exists} idx_academic_year_migrations_from_year 
            ON academic_year_migrations(from_academic_year_id)
        """))
        conn.execute(text(f"""
            {create_index_if_not_exists} idx_academic_year_migrations_to_year 
            ON academic_year_migrations(to_academic_year_id)
        """))
        conn.execute(text(f"""
            {create_index_if_not_exists} idx_academic_year_migrations_college 
            ON academic_year_migrations(college_id)
        """))
        conn.execute(text(f"""
            {create_index_if_not_exists} idx_academic_year_migrations_status 
            ON academic_year_migrations(status)
        """))
        
        # Create archived_subject_assignments table
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS archived_subject_assignments (
                id {id_type},
                original_id INTEGER NOT NULL,
                faculty_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
                semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL,
                section VARCHAR(50),
                section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
                assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
                migration_id INTEGER REFERENCES academic_year_migrations(id) ON DELETE SET NULL,
                archived_at {timestamp_type} {default_now}
            )
        """))
        
        # Create indexes for archived_subject_assignments
        conn.execute(text(f"""
            {create_index_if_not_exists} idx_archived_subject_assignments_faculty 
            ON archived_subject_assignments(faculty_id)
        """))
        conn.execute(text(f"""
            {create_index_if_not_exists} idx_archived_subject_assignments_subject 
            ON archived_subject_assignments(subject_id)
        """))
        conn.execute(text(f"""
            {create_index_if_not_exists} idx_archived_subject_assignments_academic_year 
            ON archived_subject_assignments(academic_year_id)
        """))
        conn.execute(text(f"""
            {create_index_if_not_exists} idx_archived_subject_assignments_migration 
            ON archived_subject_assignments(migration_id)
        """))
        
        # Create archived_faculty_section_assignments table
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS archived_faculty_section_assignments (
                id {id_type},
                original_id INTEGER NOT NULL,
                faculty_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
                assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
                migration_id INTEGER REFERENCES academic_year_migrations(id) ON DELETE SET NULL,
                archived_at {timestamp_type} {default_now}
            )
        """))
        
        # Create indexes for archived_faculty_section_assignments
        conn.execute(text(f"""
            {create_index_if_not_exists} idx_archived_faculty_section_assignments_faculty 
            ON archived_faculty_section_assignments(faculty_id)
        """))
        conn.execute(text(f"""
            {create_index_if_not_exists} idx_archived_faculty_section_assignments_section 
            ON archived_faculty_section_assignments(section_id)
        """))
        conn.execute(text(f"""
            {create_index_if_not_exists} idx_archived_faculty_section_assignments_academic_year 
            ON archived_faculty_section_assignments(academic_year_id)
        """))
        conn.execute(text(f"""
            {create_index_if_not_exists} idx_archived_faculty_section_assignments_migration 
            ON archived_faculty_section_assignments(migration_id)
        """))
        
        # Add academic_year_id to coding_problems table
        try:
            # Check if column already exists
            if is_sqlite:
                # SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
                # Check if column exists first
                inspector = inspect(engine)
                if 'coding_problems' in inspector.get_table_names():
                    columns = [col['name'] for col in inspector.get_columns('coding_problems')]
                    if 'academic_year_id' not in columns:
                        conn.execute(text("""
                            ALTER TABLE coding_problems 
                            ADD COLUMN academic_year_id INTEGER REFERENCES academic_years(id)
                        """))
            else:
                conn.execute(text("""
                    ALTER TABLE coding_problems 
                    ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL
                """))
            
            conn.execute(text(f"""
                {create_index_if_not_exists} idx_coding_problems_academic_year 
                ON coding_problems(academic_year_id)
            """))
        except Exception as e:
            print(f"Note: academic_year_id column may already exist: {e}")
        
        conn.commit()
        print("✅ Migration completed successfully")


def downgrade():
    """Rollback migration"""
    with engine.connect() as conn:
        # Remove academic_year_id from coding_problems
        try:
            conn.execute(text("""
                DROP INDEX IF EXISTS idx_coding_problems_academic_year
            """))
            conn.execute(text("""
                ALTER TABLE coding_problems 
                DROP COLUMN IF EXISTS academic_year_id
            """))
        except Exception as e:
            print(f"Note: {e}")
        
        # Drop archived tables
        conn.execute(text("DROP TABLE IF EXISTS archived_faculty_section_assignments CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS archived_subject_assignments CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS academic_year_migrations CASCADE"))
        
        conn.commit()
        print("✅ Rollback completed successfully")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "downgrade":
        downgrade()
    else:
        upgrade()


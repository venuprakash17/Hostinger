"""Migration: Add group_discussion interview type and support for multiple students"""
from sqlalchemy import create_engine, text, inspect
from app.core.database import get_settings

def table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()

def upgrade():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    
    with engine.connect() as connection:
        print("Adding group_discussion interview type and multiple students support...")
        
        # 1. Update interview_type CHECK constraint to include 'group_discussion'
        if table_exists(inspector, "mock_interviews"):
            print("Updating mock_interviews table...")
            try:
                # For PostgreSQL, drop and recreate the constraint
                # For SQLite, this will be handled by the model (SQLite doesn't enforce CHECK constraints strictly)
                connection.execute(text("""
                    ALTER TABLE mock_interviews 
                    DROP CONSTRAINT IF EXISTS mock_interviews_interview_type_check
                """))
                connection.execute(text("""
                    ALTER TABLE mock_interviews 
                    ADD CONSTRAINT mock_interviews_interview_type_check 
                    CHECK (interview_type IN ('technical', 'hr', 'managerial', 'mock', 'behavioral', 'group_discussion'))
                """))
                print("  ✅ Updated interview_type constraint")
            except Exception as e:
                # SQLite doesn't support ALTER CONSTRAINT, so we'll skip this
                # The enum in Python will handle validation
                print(f"  ⚠️  Could not update constraint (SQLite doesn't support): {e}")
        
        # 2. Create mock_interview_students junction table for many-to-many relationship
        if not table_exists(inspector, "mock_interview_students"):
            print("Creating mock_interview_students table...")
            connection.execute(text("""
                CREATE TABLE mock_interview_students (
                    id SERIAL PRIMARY KEY,
                    interview_id INTEGER NOT NULL REFERENCES mock_interviews(id) ON DELETE CASCADE,
                    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(interview_id, student_id)
                )
            """))
            connection.execute(text("""
                CREATE INDEX idx_mock_interview_students_interview_id ON mock_interview_students(interview_id)
            """))
            connection.execute(text("""
                CREATE INDEX idx_mock_interview_students_student_id ON mock_interview_students(student_id)
            """))
            print("  ✅ Created mock_interview_students table")
        
        # 3. Migrate existing single student_id data to the junction table
        print("Migrating existing student data...")
        try:
            connection.execute(text("""
                INSERT INTO mock_interview_students (interview_id, student_id)
                SELECT id, student_id FROM mock_interviews
                WHERE NOT EXISTS (
                    SELECT 1 FROM mock_interview_students 
                    WHERE mock_interview_students.interview_id = mock_interviews.id
                )
            """))
            print("  ✅ Migrated existing student data")
        except Exception as e:
            print(f"  ⚠️  Migration note: {e}")
        
        # 4. Make student_id nullable in mock_interviews (optional for backward compatibility)
        # We'll keep it for backward compatibility but use the junction table for multiple students
        try:
            connection.execute(text("""
                ALTER TABLE mock_interviews 
                ALTER COLUMN student_id DROP NOT NULL
            """))
            print("  ✅ Made student_id nullable (for backward compatibility)")
        except Exception as e:
            print(f"  ⚠️  Could not make student_id nullable: {e}")
        
        connection.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    upgrade()

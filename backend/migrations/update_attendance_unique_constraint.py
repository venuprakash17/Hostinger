"""
Migration: Update attendance unique constraint to include period_number.
Run this script once to upgrade existing databases.
"""
import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import inspect, text
from sqlalchemy import create_engine

from app.config import get_settings


def constraint_exists(inspector, table_name: str, constraint_name: str) -> bool:
    constraints = inspector.get_unique_constraints(table_name)
    return any(constraint["name"] == constraint_name for constraint in constraints)


def upgrade():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    with engine.begin() as conn:
        # Check if old constraint exists
        if constraint_exists(inspector, "attendance", "unique_student_subject_date"):
            # Drop old constraint
            conn.execute(
                text("DROP INDEX IF EXISTS unique_student_subject_date")
            )
            print("✅ Dropped old unique constraint")
        
        # Check if new constraint exists
        if not constraint_exists(inspector, "attendance", "unique_student_subject_date_period"):
            # Create new constraint with period_number
            # Note: SQLite handles NULL values uniquely, so we need to handle this carefully
            # For SQLite, we'll create a unique index that handles NULL period_number
            try:
                conn.execute(
                    text("""
                    CREATE UNIQUE INDEX IF NOT EXISTS unique_student_subject_date_period 
                    ON attendance(student_id, subject_id, date, 
                        CASE WHEN period_number IS NULL THEN -1 ELSE period_number END)
                    """)
                )
                print("✅ Created new unique constraint with period_number")
            except Exception as e:
                # If the above fails, try a simpler approach
                print(f"Warning: Could not create index with CASE statement: {e}")
                try:
                    # For SQLite, we can create a unique index that allows multiple NULLs
                    # by using COALESCE or a trigger, but for simplicity, let's just
                    # create the index and handle NULLs in the application
                    conn.execute(
                        text("""
                        CREATE UNIQUE INDEX IF NOT EXISTS unique_student_subject_date_period 
                        ON attendance(student_id, COALESCE(subject_id, 0), date, COALESCE(period_number, -1))
                        """)
                    )
                    print("✅ Created new unique constraint with period_number (using COALESCE)")
                except Exception as e2:
                    print(f"Warning: Could not create index: {e2}")
                    # For some databases, we might need to handle this differently
                    # Let's try without the CASE/COALESCE
                    conn.execute(
                        text("""
                        CREATE UNIQUE INDEX IF NOT EXISTS unique_student_subject_date_period 
                        ON attendance(student_id, subject_id, date, period_number)
                        """)
                    )
                    print("✅ Created new unique constraint with period_number (direct)")
        else:
            print("✅ Unique constraint already exists")


if __name__ == "__main__":
    upgrade()


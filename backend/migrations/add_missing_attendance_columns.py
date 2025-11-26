"""
Migration: Add missing columns to attendance table.
This adds: subject_id, semester_id, period_number, department_id, approval fields, notes, and fixes section_id.
Run this script once to upgrade existing databases.
"""
import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import inspect, text, create_engine
from app.config import get_settings


def column_exists(inspector, table_name: str, column_name: str) -> bool:
    columns = inspector.get_columns(table_name)
    return any(col["name"] == column_name for col in columns)


def upgrade():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    with engine.begin() as conn:
        # Check if section_id exists and is VARCHAR (old format)
        columns = inspector.get_columns("attendance")
        section_id_exists = any(col["name"] == "section_id" for col in columns)
        section_id_type = None
        if section_id_exists:
            section_id_col = next(col for col in columns if col["name"] == "section_id")
            section_id_type = str(section_id_col["type"])
            print(f"Found section_id column with type: {section_id_type}")
        
        # Add subject_id if it doesn't exist
        if not column_exists(inspector, "attendance", "subject_id"):
            conn.execute(text("ALTER TABLE attendance ADD COLUMN subject_id INTEGER"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_attendance_subject_id ON attendance(subject_id)"))
            print("✅ Added subject_id column")
        else:
            print("✅ subject_id column already exists")
        
        # Add semester_id if it doesn't exist
        if not column_exists(inspector, "attendance", "semester_id"):
            conn.execute(text("ALTER TABLE attendance ADD COLUMN semester_id INTEGER"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_attendance_semester_id ON attendance(semester_id)"))
            print("✅ Added semester_id column")
        else:
            print("✅ semester_id column already exists")
        
        # Add period_number if it doesn't exist
        if not column_exists(inspector, "attendance", "period_number"):
            conn.execute(text("ALTER TABLE attendance ADD COLUMN period_number INTEGER"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_attendance_period_number ON attendance(period_number)"))
            print("✅ Added period_number column")
        else:
            print("✅ period_number column already exists")
        
        # Fix section_id if it's VARCHAR (convert to INTEGER)
        if section_id_exists and "VARCHAR" in section_id_type:
            print("⚠️  section_id is VARCHAR, converting to INTEGER...")
            # First, create a temporary column
            conn.execute(text("ALTER TABLE attendance ADD COLUMN section_id_new INTEGER"))
            
            # Try to convert existing section_id values (section names) to section IDs
            # This is a best-effort conversion - we'll try to match section names to IDs
            try:
                # Get all unique section names
                result = conn.execute(text("SELECT DISTINCT section_id FROM attendance WHERE section_id IS NOT NULL"))
                section_names = [row[0] for row in result]
                
                # For each section name, try to find the corresponding section ID
                for section_name in section_names:
                    # Try to find section by name (this requires the sections table to exist)
                    try:
                        section_result = conn.execute(
                            text("SELECT id FROM sections WHERE name = :name LIMIT 1"),
                            {"name": section_name}
                        )
                        section_row = section_result.fetchone()
                        if section_row:
                            section_id = section_row[0]
                            # Update attendance records with this section ID
                            conn.execute(
                                text("UPDATE attendance SET section_id_new = :section_id WHERE section_id = :name"),
                                {"section_id": section_id, "name": section_name}
                            )
                            print(f"  Converted section '{section_name}' to ID {section_id}")
                    except Exception as e:
                        print(f"  Warning: Could not convert section '{section_name}': {e}")
                        # Leave as NULL
                
                # Drop old column and rename new one
                conn.execute(text("ALTER TABLE attendance DROP COLUMN section_id"))
                conn.execute(text("ALTER TABLE attendance RENAME COLUMN section_id_new TO section_id"))
                print("✅ Converted section_id from VARCHAR to INTEGER")
            except Exception as e:
                print(f"⚠️  Error converting section_id: {e}")
                # If conversion fails, just drop the new column and keep the old one
                try:
                    conn.execute(text("ALTER TABLE attendance DROP COLUMN section_id_new"))
                except:
                    pass
        elif not section_id_exists:
            # Add section_id as INTEGER if it doesn't exist at all
            conn.execute(text("ALTER TABLE attendance ADD COLUMN section_id INTEGER"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_attendance_section_id ON attendance(section_id)"))
            print("✅ Added section_id column")
        else:
            print("✅ section_id column already exists as INTEGER")
        
        # Add department_id if it doesn't exist
        if not column_exists(inspector, "attendance", "department_id"):
            conn.execute(text("ALTER TABLE attendance ADD COLUMN department_id INTEGER"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_attendance_department_id ON attendance(department_id)"))
            print("✅ Added department_id column")
        else:
            print("✅ department_id column already exists")
        
        # Add approval_status if it doesn't exist
        if not column_exists(inspector, "attendance", "approval_status"):
            conn.execute(text("ALTER TABLE attendance ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending'"))
            print("✅ Added approval_status column")
        else:
            print("✅ approval_status column already exists")
        
        # Add approved_by if it doesn't exist
        if not column_exists(inspector, "attendance", "approved_by"):
            conn.execute(text("ALTER TABLE attendance ADD COLUMN approved_by INTEGER"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_attendance_approved_by ON attendance(approved_by)"))
            print("✅ Added approved_by column")
        else:
            print("✅ approved_by column already exists")
        
        # Add approval_notes if it doesn't exist
        if not column_exists(inspector, "attendance", "approval_notes"):
            conn.execute(text("ALTER TABLE attendance ADD COLUMN approval_notes TEXT"))
            print("✅ Added approval_notes column")
        else:
            print("✅ approval_notes column already exists")
        
        # Add approval_date if it doesn't exist
        if not column_exists(inspector, "attendance", "approval_date"):
            conn.execute(text("ALTER TABLE attendance ADD COLUMN approval_date DATETIME"))
            print("✅ Added approval_date column")
        else:
            print("✅ approval_date column already exists")
        
        # Add notes if it doesn't exist
        if not column_exists(inspector, "attendance", "notes"):
            conn.execute(text("ALTER TABLE attendance ADD COLUMN notes TEXT"))
            print("✅ Added notes column")
        else:
            print("✅ notes column already exists")
        
        # Also ensure section column exists (for backward compatibility)
        if not column_exists(inspector, "attendance", "section"):
            conn.execute(text("ALTER TABLE attendance ADD COLUMN section VARCHAR(100)"))
            print("✅ Added section column (for backward compatibility)")
        else:
            print("✅ section column already exists")
        
        print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    upgrade()


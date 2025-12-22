"""Migration: Add display_name, year_str, is_auto_generated to sections table and create faculty_section_assignments table"""
from sqlalchemy import create_engine, text, inspect
from app.core.config import get_settings


def table_exists(inspector, table_name: str) -> bool:
    """Check if table exists"""
    return table_name in inspector.get_table_names()


def column_exists(inspector, table_name: str, column_name: str) -> bool:
    """Check if column exists in table"""
    if not table_exists(inspector, table_name):
        return False
    
    columns = inspector.get_columns(table_name)
    return any(col["name"] == column_name for col in columns)


def upgrade():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    with engine.begin() as conn:
        # Add new columns to sections table
        if table_exists(inspector, "sections"):
            # Add display_name column
            if not column_exists(inspector, "sections", "display_name"):
                conn.execute(text("ALTER TABLE sections ADD COLUMN display_name VARCHAR(100)"))
                print("✅ Added display_name column to sections table")
            
            # Add year_str column
            if not column_exists(inspector, "sections", "year_str"):
                conn.execute(text("ALTER TABLE sections ADD COLUMN year_str VARCHAR(20)"))
                print("✅ Added year_str column to sections table")
            
            # Add is_auto_generated column
            if not column_exists(inspector, "sections", "is_auto_generated"):
                conn.execute(text("ALTER TABLE sections ADD COLUMN is_auto_generated BOOLEAN DEFAULT 0"))
                print("✅ Added is_auto_generated column to sections table")
            
            # Update existing sections to generate display_name if not set
            # SQLite doesn't support UPDATE with subquery in SET, so we'll do it in Python
            sections_result = conn.execute(text("SELECT id, department_id, year, name FROM sections WHERE display_name IS NULL OR display_name = ''")).fetchall()
            for section_row in sections_result:
                section_id, dept_id, year, name = section_row
                dept_result = conn.execute(text("SELECT code, name FROM departments WHERE id = :dept_id"), {"dept_id": dept_id}).fetchone()
                if dept_result:
                    dept_code = dept_result[0] or dept_result[1][:3].upper()
                    year_str = {1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th'}.get(year, str(year) if year else '')
                    display_name = f"{dept_code.lower()}-{year_str} - {name}" if year_str else f"{dept_code.lower()} - {name}"
                    conn.execute(text("UPDATE sections SET display_name = :display_name WHERE id = :section_id"), 
                               {"display_name": display_name, "section_id": section_id})
            print("✅ Updated existing sections with display_name")
            
            # Update year_str for existing sections
            conn.execute(text("""
                UPDATE sections 
                SET year_str = CASE year
                    WHEN 1 THEN '1st'
                    WHEN 2 THEN '2nd'
                    WHEN 3 THEN '3rd'
                    WHEN 4 THEN '4th'
                    WHEN 5 THEN '5th'
                    ELSE CAST(year AS TEXT)
                END
                WHERE year_str IS NULL AND year IS NOT NULL
            """))
            print("✅ Updated existing sections with year_str")
        
        # Create faculty_section_assignments table
        if not table_exists(inspector, "faculty_section_assignments"):
            conn.execute(text("""
                CREATE TABLE faculty_section_assignments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    faculty_id INTEGER NOT NULL,
                    section_id INTEGER NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    assigned_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    FOREIGN KEY(faculty_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE CASCADE,
                    FOREIGN KEY(assigned_by) REFERENCES users(id) ON DELETE SET NULL,
                    UNIQUE(faculty_id, section_id)
                )
            """))
            conn.execute(text("CREATE INDEX ix_faculty_section_assignments_faculty_id ON faculty_section_assignments (faculty_id)"))
            conn.execute(text("CREATE INDEX ix_faculty_section_assignments_section_id ON faculty_section_assignments (section_id)"))
            print("✅ Created faculty_section_assignments table")
        else:
            print("⚠️  faculty_section_assignments table already exists")

    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    upgrade()


"""
Migration: add sections table and link subject assignments to sections.
Run this script once to upgrade existing databases.
"""
from sqlalchemy import inspect, text, Integer, String, Boolean
from sqlalchemy import create_engine

from app.config import get_settings


def table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def column_exists(inspector, table_name: str, column_name: str) -> bool:
    if not table_exists(inspector, table_name):
        return False
    columns = inspector.get_columns(table_name)
    return any(col["name"] == column_name for col in columns)


def upgrade():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    with engine.begin() as conn:
        # Create sections table if it does not exist
        if not table_exists(inspector, "sections"):
            conn.execute(
                text(
                    """
                    CREATE TABLE sections (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name VARCHAR(50) NOT NULL,
                        college_id INTEGER NOT NULL,
                        department_id INTEGER NOT NULL,
                        semester_id INTEGER,
                        year INTEGER,
                        is_active BOOLEAN NOT NULL DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME,
                        FOREIGN KEY(college_id) REFERENCES colleges(id) ON DELETE CASCADE,
                        FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE CASCADE,
                        FOREIGN KEY(semester_id) REFERENCES semesters(id) ON DELETE SET NULL
                    )
                    """
                )
            )
            conn.execute(text("CREATE INDEX ix_sections_id ON sections (id)"))
            conn.execute(text("CREATE INDEX ix_sections_college_id ON sections (college_id)"))
            conn.execute(text("CREATE INDEX ix_sections_department_id ON sections (department_id)"))
            conn.execute(text("CREATE INDEX ix_sections_semester_id ON sections (semester_id)"))

        # Add section_id column to subject_assignments
        if not column_exists(inspector, "subject_assignments", "section_id"):
            conn.execute(
                text(
                    """
                    ALTER TABLE subject_assignments
                    ADD COLUMN section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL
                    """
                )
            )
            conn.execute(text("CREATE INDEX ix_subject_assignments_section_id ON subject_assignments (section_id)"))


if __name__ == "__main__":
    upgrade()



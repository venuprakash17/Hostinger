"""
Migration: add section_id column to attendance table.
Run this script once to upgrade existing databases.
"""
import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import inspect, text
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
        # Add section_id column to attendance table if it does not exist
        if not column_exists(inspector, "attendance", "section_id"):
            conn.execute(
                text(
                    """
                    ALTER TABLE attendance
                    ADD COLUMN section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL
                    """
                )
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_attendance_section_id ON attendance (section_id)"))

        print("✅ Migration completed: Added section_id to attendance table")


if __name__ == "__main__":
    upgrade()


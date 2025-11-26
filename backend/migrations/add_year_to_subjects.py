"""
Migration: add year column to subjects table.
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
        # Add year column to subjects table if it does not exist
        if not column_exists(inspector, "subjects", "year"):
            conn.execute(
                text(
                    """
                    ALTER TABLE subjects
                    ADD COLUMN year VARCHAR(20)
                    """
                )
            )
            print("✅ Migration completed: Added year column to subjects table")
        else:
            print("✅ Year column already exists in subjects table")


if __name__ == "__main__":
    upgrade()


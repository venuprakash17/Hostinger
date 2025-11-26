"""
Migration: add number_of_years and vertical columns to departments table.
Run this script once to upgrade existing databases.
"""
from sqlalchemy import MetaData, Table, Column, Integer, String, inspect, text
from sqlalchemy import create_engine

from app.config import get_settings


def column_exists(inspector, table_name: str, column_name: str) -> bool:
    columns = inspector.get_columns(table_name)
    return any(col["name"] == column_name for col in columns)


def upgrade():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    with engine.begin() as conn:
        if not column_exists(inspector, "departments", "number_of_years"):
            conn.execute(
                text("ALTER TABLE departments ADD COLUMN number_of_years INTEGER")
            )
        if not column_exists(inspector, "departments", "vertical"):
            conn.execute(
                text("ALTER TABLE departments ADD COLUMN vertical VARCHAR(100)")
            )


if __name__ == "__main__":
    upgrade()


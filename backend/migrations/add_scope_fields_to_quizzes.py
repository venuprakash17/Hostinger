"""
Migration: Add scope fields and expiry_date to quizzes and coding_problems tables.
Run this script once to upgrade existing databases.
"""
import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import inspect, text, Column, String, Integer, DateTime, ForeignKey
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
    
    with engine.connect() as conn:
        # Check database type
        is_sqlite = 'sqlite' in settings.DATABASE_URL.lower()
        
        # Migrate quizzes table
        if table_exists(inspector, "quizzes"):
            print("Migrating quizzes table...")
            
            # Add expiry_date
            if not column_exists(inspector, "quizzes", "expiry_date"):
                if is_sqlite:
                    conn.execute(text("ALTER TABLE quizzes ADD COLUMN expiry_date DATETIME"))
                else:
                    conn.execute(text("ALTER TABLE quizzes ADD COLUMN expiry_date TIMESTAMP WITH TIME ZONE"))
                conn.commit()
                print("  ✅ Added expiry_date to quizzes")
            
            # Add scope_type
            if not column_exists(inspector, "quizzes", "scope_type"):
                conn.execute(text("ALTER TABLE quizzes ADD COLUMN scope_type VARCHAR(20) DEFAULT 'svnapro'"))
                conn.commit()
                print("  ✅ Added scope_type to quizzes")
            
            # Add college_id
            if not column_exists(inspector, "quizzes", "college_id"):
                if is_sqlite:
                    conn.execute(text("ALTER TABLE quizzes ADD COLUMN college_id INTEGER"))
                else:
                    conn.execute(text("ALTER TABLE quizzes ADD COLUMN college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE"))
                # Add index
                try:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_quizzes_college_id ON quizzes(college_id)"))
                except:
                    pass
                conn.commit()
                print("  ✅ Added college_id to quizzes")
            
            # Add department
            if not column_exists(inspector, "quizzes", "department"):
                conn.execute(text("ALTER TABLE quizzes ADD COLUMN department VARCHAR(100)"))
                conn.commit()
                print("  ✅ Added department to quizzes")
            
            # Add section_id
            if not column_exists(inspector, "quizzes", "section_id"):
                if is_sqlite:
                    conn.execute(text("ALTER TABLE quizzes ADD COLUMN section_id INTEGER"))
                else:
                    conn.execute(text("ALTER TABLE quizzes ADD COLUMN section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL"))
                # Add index
                try:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_quizzes_section_id ON quizzes(section_id)"))
                except:
                    pass
                conn.commit()
                print("  ✅ Added section_id to quizzes")
            
            # Add year
            if not column_exists(inspector, "quizzes", "year"):
                conn.execute(text("ALTER TABLE quizzes ADD COLUMN year VARCHAR(20)"))
                conn.commit()
                print("  ✅ Added year to quizzes")
        
        # Migrate coding_problems table
        if table_exists(inspector, "coding_problems"):
            print("Migrating coding_problems table...")
            
            # Add expiry_date
            if not column_exists(inspector, "coding_problems", "expiry_date"):
                if is_sqlite:
                    conn.execute(text("ALTER TABLE coding_problems ADD COLUMN expiry_date DATETIME"))
                else:
                    conn.execute(text("ALTER TABLE coding_problems ADD COLUMN expiry_date TIMESTAMP WITH TIME ZONE"))
                conn.commit()
                print("  ✅ Added expiry_date to coding_problems")
            
            # Add scope_type
            if not column_exists(inspector, "coding_problems", "scope_type"):
                conn.execute(text("ALTER TABLE coding_problems ADD COLUMN scope_type VARCHAR(20) DEFAULT 'svnapro'"))
                conn.commit()
                print("  ✅ Added scope_type to coding_problems")
            
            # Add college_id
            if not column_exists(inspector, "coding_problems", "college_id"):
                if is_sqlite:
                    conn.execute(text("ALTER TABLE coding_problems ADD COLUMN college_id INTEGER"))
                else:
                    conn.execute(text("ALTER TABLE coding_problems ADD COLUMN college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE"))
                # Add index
                try:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_coding_problems_college_id ON coding_problems(college_id)"))
                except:
                    pass
                conn.commit()
                print("  ✅ Added college_id to coding_problems")
            
            # Add department
            if not column_exists(inspector, "coding_problems", "department"):
                conn.execute(text("ALTER TABLE coding_problems ADD COLUMN department VARCHAR(100)"))
                conn.commit()
                print("  ✅ Added department to coding_problems")
            
            # Add section_id
            if not column_exists(inspector, "coding_problems", "section_id"):
                if is_sqlite:
                    conn.execute(text("ALTER TABLE coding_problems ADD COLUMN section_id INTEGER"))
                else:
                    conn.execute(text("ALTER TABLE coding_problems ADD COLUMN section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL"))
                # Add index
                try:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_coding_problems_section_id ON coding_problems(section_id)"))
                except:
                    pass
                conn.commit()
                print("  ✅ Added section_id to coding_problems")
            
            # Add year
            if not column_exists(inspector, "coding_problems", "year"):
                conn.execute(text("ALTER TABLE coding_problems ADD COLUMN year VARCHAR(20)"))
                conn.commit()
                print("  ✅ Added year to coding_problems")
        
        print("\n✅ Migration completed successfully!")
        conn.commit()


if __name__ == "__main__":
    upgrade()


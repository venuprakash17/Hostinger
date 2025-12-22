"""Migration: Create company training tables"""
import os
import sys
from sqlalchemy import create_engine, text, inspect

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings


def table_exists(inspector, table_name: str) -> bool:
    """Check if table exists"""
    return table_name in inspector.get_table_names()


def upgrade():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    with engine.begin() as conn:
        # Create companies table
        if not table_exists(inspector, "companies"):
            conn.execute(text("""
                CREATE TABLE companies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    logo_url VARCHAR(500),
                    description TEXT,
                    website VARCHAR(255),
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME
                )
            """))
            conn.execute(text("CREATE INDEX ix_companies_name ON companies(name)"))
            print("✅ Created 'companies' table")
        else:
            print("ℹ️ 'companies' table already exists")

        # Create company_roles table
        if not table_exists(inspector, "company_roles"):
            conn.execute(text("""
                CREATE TABLE company_roles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_id INTEGER NOT NULL,
                    role_name VARCHAR(255) NOT NULL,
                    description TEXT,
                    difficulty VARCHAR(20),
                    scope_type VARCHAR(20) NOT NULL DEFAULT 'svnapro',
                    target_departments TEXT,
                    target_years TEXT,
                    target_sections TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                )
            """))
            conn.execute(text("CREATE INDEX ix_company_roles_company_id ON company_roles(company_id)"))
            conn.execute(text("CREATE INDEX ix_company_roles_created_by ON company_roles(created_by)"))
            print("✅ Created 'company_roles' table")
        else:
            print("ℹ️ 'company_roles' table already exists")

        # Create practice_sections table
        if not table_exists(inspector, "practice_sections"):
            conn.execute(text("""
                CREATE TABLE practice_sections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    role_id INTEGER NOT NULL,
                    section_name VARCHAR(255) NOT NULL,
                    description TEXT,
                    order_index INTEGER NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    FOREIGN KEY (role_id) REFERENCES company_roles(id) ON DELETE CASCADE
                )
            """))
            conn.execute(text("CREATE INDEX ix_practice_sections_role_id ON practice_sections(role_id)"))
            print("✅ Created 'practice_sections' table")
        else:
            print("ℹ️ 'practice_sections' table already exists")

        # Create rounds table
        if not table_exists(inspector, "rounds"):
            conn.execute(text("""
                CREATE TABLE rounds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    practice_section_id INTEGER NOT NULL,
                    round_type VARCHAR(20) NOT NULL,
                    round_name VARCHAR(255) NOT NULL,
                    description TEXT,
                    order_index INTEGER NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    quiz_id INTEGER,
                    coding_problem_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    FOREIGN KEY (practice_section_id) REFERENCES practice_sections(id) ON DELETE CASCADE,
                    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL,
                    FOREIGN KEY (coding_problem_id) REFERENCES coding_problems(id) ON DELETE SET NULL
                )
            """))
            conn.execute(text("CREATE INDEX ix_rounds_practice_section_id ON rounds(practice_section_id)"))
            conn.execute(text("CREATE INDEX ix_rounds_round_type ON rounds(round_type)"))
            conn.execute(text("CREATE INDEX ix_rounds_quiz_id ON rounds(quiz_id)"))
            conn.execute(text("CREATE INDEX ix_rounds_coding_problem_id ON rounds(coding_problem_id)"))
            print("✅ Created 'rounds' table")
        else:
            print("ℹ️ 'rounds' table already exists")

        # Create round_contents table
        if not table_exists(inspector, "round_contents"):
            conn.execute(text("""
                CREATE TABLE round_contents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    round_id INTEGER NOT NULL,
                    gd_topic VARCHAR(500),
                    gd_description TEXT,
                    key_points TEXT,
                    best_points TEXT,
                    dos_and_donts TEXT,
                    question TEXT,
                    expected_answer TEXT,
                    question_type VARCHAR(50),
                    tips TEXT,
                    quiz_question TEXT,
                    quiz_options TEXT,
                    correct_answer VARCHAR(10),
                    coding_title VARCHAR(255),
                    coding_description TEXT,
                    coding_difficulty VARCHAR(20),
                    order_index INTEGER NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
                )
            """))
            conn.execute(text("CREATE INDEX ix_round_contents_round_id ON round_contents(round_id)"))
            print("✅ Created 'round_contents' table")
        else:
            print("ℹ️ 'round_contents' table already exists")

    print("\n✅ Company training tables migration completed!")


if __name__ == "__main__":
    upgrade()


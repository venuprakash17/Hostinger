"""Migration to create quiz_attempts table"""
import os
import sys
from sqlalchemy import create_engine, text, inspect

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings

def table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()

def upgrade():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    with engine.begin() as conn:
        if not table_exists(inspector, "quiz_attempts"):
            conn.execute(text("""
                CREATE TABLE quiz_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    quiz_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    submitted_at TIMESTAMP,
                    auto_submitted_at TIMESTAMP,
                    is_submitted BOOLEAN NOT NULL DEFAULT 0,
                    is_auto_submitted BOOLEAN NOT NULL DEFAULT 0,
                    is_graded BOOLEAN NOT NULL DEFAULT 0,
                    total_score REAL NOT NULL DEFAULT 0.0,
                    max_score REAL,
                    percentage REAL NOT NULL DEFAULT 0.0,
                    answers JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    graded_at TIMESTAMP,
                    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """))
            conn.execute(text("CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id)"))
            conn.execute(text("CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id)"))
            print("✅ Created 'quiz_attempts' table")
        else:
            print("ℹ️ 'quiz_attempts' table already exists")

        # Add missing columns to quizzes table if they don't exist
        if table_exists(inspector, "quizzes"):
            columns = {col["name"]: col for col in inspector.get_columns("quizzes")}
            
            if "code_snippet" not in columns:
                conn.execute(text("ALTER TABLE quizzes ADD COLUMN code_snippet TEXT"))
                print("✅ Added 'code_snippet' column to 'quizzes' table")
            
            if "question_timers" not in columns:
                conn.execute(text("ALTER TABLE quizzes ADD COLUMN question_timers JSON"))
                print("✅ Added 'question_timers' column to 'quizzes' table")
            
            if "per_question_timer_enabled" not in columns:
                conn.execute(text("ALTER TABLE quizzes ADD COLUMN per_question_timer_enabled BOOLEAN NOT NULL DEFAULT 0"))
                print("✅ Added 'per_question_timer_enabled' column to 'quizzes' table")

if __name__ == "__main__":
    upgrade()


"""
Migration: Add Question Bank and Enhance Quiz Model
- Creates question_banks table
- Adds new fields to quizzes table for enhanced quiz features
"""

from sqlalchemy import text
from app.core.database import engine


def upgrade():
    """Add Question Bank table and enhance Quiz model"""
    with engine.connect() as conn:
        # Create question_banks table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS question_banks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_text TEXT NOT NULL,
                question_type VARCHAR(20) NOT NULL,
                options JSON,
                correct_answer VARCHAR(10) NOT NULL,
                marks INTEGER DEFAULT 1 NOT NULL,
                difficulty VARCHAR(20),
                topic VARCHAR(100),
                subject VARCHAR(100),
                negative_marking REAL DEFAULT 0.0 NOT NULL,
                created_by INTEGER,
                college_id INTEGER,
                department_id INTEGER,
                is_active BOOLEAN DEFAULT 1 NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
            )
        """))
        
        # Add indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_question_banks_college_id ON question_banks(college_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_question_banks_department_id ON question_banks(department_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_question_banks_question_type ON question_banks(question_type)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_question_banks_subject ON question_banks(subject)"))
        
        # Enhance quizzes table with new fields
        # Check if columns exist before adding
        try:
            conn.execute(text("ALTER TABLE quizzes ADD COLUMN assigned_branches JSON"))
        except Exception:
            pass  # Column already exists
        
        try:
            conn.execute(text("ALTER TABLE quizzes ADD COLUMN assigned_sections JSON"))
        except Exception:
            pass  # Column already exists
        
        try:
            conn.execute(text("ALTER TABLE quizzes ADD COLUMN allow_negative_marking BOOLEAN DEFAULT 0"))
        except Exception:
            pass  # Column already exists
        
        try:
            conn.execute(text("ALTER TABLE quizzes ADD COLUMN shuffle_questions BOOLEAN DEFAULT 0"))
        except Exception:
            pass  # Column already exists
        
        try:
            conn.execute(text("ALTER TABLE quizzes ADD COLUMN shuffle_options BOOLEAN DEFAULT 0"))
        except Exception:
            pass  # Column already exists
        
        try:
            conn.execute(text("ALTER TABLE quizzes ADD COLUMN status VARCHAR(20) DEFAULT 'draft'"))
        except Exception:
            pass  # Column already exists
        
        try:
            conn.execute(text("ALTER TABLE quizzes ADD COLUMN passing_marks INTEGER"))
        except Exception:
            pass  # Column already exists
        
        try:
            conn.execute(text("ALTER TABLE quizzes ADD COLUMN question_bank_ids JSON"))
        except Exception:
            pass  # Column already exists
        
        try:
            conn.execute(text("ALTER TABLE quizzes ADD COLUMN use_random_questions BOOLEAN DEFAULT 0"))
        except Exception:
            pass  # Column already exists
        
        try:
            conn.execute(text("ALTER TABLE quizzes ADD COLUMN random_question_count INTEGER"))
        except Exception:
            pass  # Column already exists
        
        conn.commit()
        print("✅ Migration completed: Question Bank and Quiz enhancements added")


def downgrade():
    """Remove Question Bank table and new quiz fields"""
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS question_banks"))
        
        # Note: SQLite doesn't support DROP COLUMN easily, so we'll leave the columns
        # They can be removed manually if needed
        
        conn.commit()
        print("✅ Migration rolled back: Question Bank removed")


if __name__ == "__main__":
    upgrade()

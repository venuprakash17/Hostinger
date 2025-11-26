"""
Create Proctoring Tables Migration
Creates tables for detailed proctoring violation tracking
"""

import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text, create_engine
from app.core.database import engine


def upgrade():
    """Create proctoring tables"""
    with engine.connect() as conn:
        # Create proctoring_sessions table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS proctoring_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lab_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                ended_at TIMESTAMP,
                total_time_seconds INTEGER DEFAULT 0 NOT NULL,
                total_violations INTEGER DEFAULT 0 NOT NULL,
                tab_switches INTEGER DEFAULT 0 NOT NULL,
                fullscreen_exits INTEGER DEFAULT 0 NOT NULL,
                window_blurs INTEGER DEFAULT 0 NOT NULL,
                copy_paste_events INTEGER DEFAULT 0 NOT NULL,
                devtools_opens INTEGER DEFAULT 0 NOT NULL,
                is_active BOOLEAN DEFAULT 1 NOT NULL,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                violation_summary JSON,
                FOREIGN KEY (lab_id) REFERENCES coding_labs(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        
        # Create proctoring_violations table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS proctoring_violations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lab_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                session_id INTEGER,
                submission_id INTEGER,
                violation_type VARCHAR(50) NOT NULL,
                severity VARCHAR(20) DEFAULT 'low' NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                details JSON,
                description TEXT,
                time_spent_seconds INTEGER,
                problem_id INTEGER,
                is_reviewed BOOLEAN DEFAULT 0 NOT NULL,
                reviewed_by INTEGER,
                reviewed_at TIMESTAMP,
                review_notes TEXT,
                FOREIGN KEY (lab_id) REFERENCES coding_labs(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (session_id) REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (submission_id) REFERENCES lab_submissions(id) ON DELETE SET NULL,
                FOREIGN KEY (problem_id) REFERENCES lab_problems(id) ON DELETE SET NULL,
                FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
            )
        """))
        
        # Create indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_lab_user ON proctoring_sessions(lab_id, user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_active ON proctoring_sessions(is_active)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_proctoring_violations_lab_user ON proctoring_violations(lab_id, user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_proctoring_violations_type ON proctoring_violations(violation_type)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_proctoring_violations_severity ON proctoring_violations(severity)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_proctoring_violations_timestamp ON proctoring_violations(timestamp)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_proctoring_violations_session ON proctoring_violations(session_id)"))
        
        conn.commit()
        print("✅ Created proctoring tables and indexes")


if __name__ == "__main__":
    print("🚀 Creating proctoring tables...")
    upgrade()
    print("✅ Migration complete!")


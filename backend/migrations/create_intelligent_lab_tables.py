"""
Migration: Create Intelligent Lab Module Tables
Run this migration to add CodeTantra-like features to the lab system
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, create_engine
from app.config import get_settings

def create_intelligent_lab_tables():
    """Create all tables for intelligent lab module"""
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Create lab_sessions_enhanced table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lab_sessions_enhanced (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lab_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                instructions TEXT,
                session_date DATE NOT NULL,
                session_time TIME,
                duration_minutes INTEGER,
                order_index INTEGER DEFAULT 0 NOT NULL,
                is_active BOOLEAN DEFAULT 1 NOT NULL,
                is_completed BOOLEAN DEFAULT 0 NOT NULL,
                allow_hints BOOLEAN DEFAULT 1 NOT NULL,
                time_limit_minutes INTEGER,
                total_points REAL DEFAULT 0.0 NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                completed_at DATETIME,
                FOREIGN KEY (lab_id) REFERENCES coding_labs(id) ON DELETE CASCADE
            )
        """))
        
        # Create session_materials table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS session_materials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                material_type VARCHAR(50) NOT NULL,
                file_path VARCHAR(500),
                file_url VARCHAR(1000),
                file_size INTEGER,
                order_index INTEGER DEFAULT 0 NOT NULL,
                is_required BOOLEAN DEFAULT 0 NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES lab_sessions_enhanced(id) ON DELETE CASCADE
            )
        """))
        
        # Create lab_tests table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lab_tests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lab_id INTEGER NOT NULL,
                session_id INTEGER,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                test_type VARCHAR(50) DEFAULT 'mixed' NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME NOT NULL,
                duration_minutes INTEGER,
                auto_lock BOOLEAN DEFAULT 1 NOT NULL,
                allow_backtracking BOOLEAN DEFAULT 1 NOT NULL,
                shuffle_questions BOOLEAN DEFAULT 0 NOT NULL,
                show_results_immediately BOOLEAN DEFAULT 0 NOT NULL,
                total_points REAL DEFAULT 100.0 NOT NULL,
                passing_score REAL DEFAULT 60.0 NOT NULL,
                is_proctored BOOLEAN DEFAULT 0 NOT NULL,
                require_fullscreen BOOLEAN DEFAULT 0 NOT NULL,
                detect_tab_switch BOOLEAN DEFAULT 0 NOT NULL,
                is_active BOOLEAN DEFAULT 1 NOT NULL,
                is_published BOOLEAN DEFAULT 0 NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (lab_id) REFERENCES coding_labs(id) ON DELETE CASCADE,
                FOREIGN KEY (session_id) REFERENCES lab_sessions_enhanced(id) ON DELETE SET NULL
            )
        """))
        
        # Create test_questions table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS test_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                test_id INTEGER NOT NULL,
                question_type VARCHAR(50) NOT NULL,
                question_text TEXT NOT NULL,
                question_image_url VARCHAR(1000),
                options TEXT,  -- JSON string
                correct_answer TEXT,
                problem_id INTEGER,
                points REAL DEFAULT 10.0 NOT NULL,
                negative_marking REAL DEFAULT 0.0 NOT NULL,
                order_index INTEGER DEFAULT 0 NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (test_id) REFERENCES lab_tests(id) ON DELETE CASCADE,
                FOREIGN KEY (problem_id) REFERENCES lab_problems(id) ON DELETE SET NULL
            )
        """))
        
        # Create test_attempts table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS test_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                test_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                submitted_at DATETIME,
                auto_submitted_at DATETIME,
                is_submitted BOOLEAN DEFAULT 0 NOT NULL,
                is_auto_submitted BOOLEAN DEFAULT 0 NOT NULL,
                is_graded BOOLEAN DEFAULT 0 NOT NULL,
                total_score REAL DEFAULT 0.0 NOT NULL,
                max_score REAL,
                percentage REAL DEFAULT 0.0 NOT NULL,
                is_passed BOOLEAN DEFAULT 0 NOT NULL,
                tab_switches INTEGER DEFAULT 0 NOT NULL,
                fullscreen_exits INTEGER DEFAULT 0 NOT NULL,
                suspicious_activities TEXT,  -- JSON string
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                graded_at DATETIME,
                FOREIGN KEY (test_id) REFERENCES lab_tests(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        
        # Create test_answers table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS test_answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                attempt_id INTEGER NOT NULL,
                question_id INTEGER NOT NULL,
                answer_text TEXT,
                selected_options TEXT,  -- JSON string
                code TEXT,
                language VARCHAR(20),
                is_correct BOOLEAN,
                points_earned REAL DEFAULT 0.0 NOT NULL,
                max_points REAL,
                feedback TEXT,
                answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                graded_at DATETIME,
                FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES test_questions(id) ON DELETE CASCADE
            )
        """))
        
        # Create student_session_progress table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS student_session_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                materials_viewed TEXT,  -- JSON string
                materials_completed TEXT,  -- JSON string
                exercises_attempted INTEGER DEFAULT 0 NOT NULL,
                exercises_completed INTEGER DEFAULT 0 NOT NULL,
                exercises_passed INTEGER DEFAULT 0 NOT NULL,
                total_score REAL DEFAULT 0.0 NOT NULL,
                max_score REAL DEFAULT 0.0 NOT NULL,
                time_spent_minutes REAL DEFAULT 0.0 NOT NULL,
                first_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_accessed_at DATETIME,
                completed_at DATETIME,
                is_completed BOOLEAN DEFAULT 0 NOT NULL,
                completion_percentage REAL DEFAULT 0.0 NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (session_id) REFERENCES lab_sessions_enhanced(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        
        # Create student_lab_progress table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS student_lab_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lab_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                sessions_completed INTEGER DEFAULT 0 NOT NULL,
                sessions_total INTEGER DEFAULT 0 NOT NULL,
                completion_percentage REAL DEFAULT 0.0 NOT NULL,
                total_exercises INTEGER DEFAULT 0 NOT NULL,
                exercises_attempted INTEGER DEFAULT 0 NOT NULL,
                exercises_completed INTEGER DEFAULT 0 NOT NULL,
                exercises_passed INTEGER DEFAULT 0 NOT NULL,
                tests_attempted INTEGER DEFAULT 0 NOT NULL,
                tests_passed INTEGER DEFAULT 0 NOT NULL,
                average_test_score REAL DEFAULT 0.0 NOT NULL,
                total_score REAL DEFAULT 0.0 NOT NULL,
                max_score REAL DEFAULT 0.0 NOT NULL,
                overall_percentage REAL DEFAULT 0.0 NOT NULL,
                total_time_spent_minutes REAL DEFAULT 0.0 NOT NULL,
                is_completed BOOLEAN DEFAULT 0 NOT NULL,
                current_session_id INTEGER,
                first_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_accessed_at DATETIME,
                completed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (lab_id) REFERENCES coding_labs(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (current_session_id) REFERENCES lab_sessions_enhanced(id) ON DELETE SET NULL
            )
        """))
        
        # Create code_playback table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS code_playback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                submission_id INTEGER NOT NULL,
                keystrokes TEXT NOT NULL,  -- JSON string
                code_snapshots TEXT,  -- JSON string
                time_intervals TEXT,  -- JSON string
                typing_speed_wpm REAL,
                pause_duration_seconds REAL,
                backspace_count INTEGER DEFAULT 0 NOT NULL,
                copy_paste_detected BOOLEAN DEFAULT 0 NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (submission_id) REFERENCES lab_submissions(id) ON DELETE CASCADE
            )
        """))
        
        # Create lab_leaderboard table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lab_leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lab_id INTEGER NOT NULL,
                rankings TEXT NOT NULL,  -- JSON string
                total_participants INTEGER DEFAULT 0 NOT NULL,
                average_score REAL DEFAULT 0.0 NOT NULL,
                top_score REAL DEFAULT 0.0 NOT NULL,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (lab_id) REFERENCES coding_labs(id) ON DELETE CASCADE
            )
        """))
        
        # Create indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lab_sessions_enhanced_lab_id ON lab_sessions_enhanced(lab_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lab_sessions_enhanced_date ON lab_sessions_enhanced(session_date)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_session_materials_session_id ON session_materials(session_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lab_tests_lab_id ON lab_tests(lab_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lab_tests_start_time ON lab_tests(start_time)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_test_attempts_test_user ON test_attempts(test_id, user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_student_session_progress_session_user ON student_session_progress(session_id, user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_student_lab_progress_lab_user ON student_lab_progress(lab_id, user_id)"))
        
        conn.commit()
        print("✅ Intelligent Lab Module tables created successfully!")

if __name__ == "__main__":
    create_intelligent_lab_tables()


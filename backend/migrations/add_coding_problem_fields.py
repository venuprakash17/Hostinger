"""
Migration script to add new fields to coding_problems table
and create user_saved_code table

Run with: python -m alembic upgrade head
Or manually with SQLite: sqlite3 elevate_edu.db < migration.sql
"""

# This is a reference migration script
# For SQLite, you can run these SQL commands directly:

MIGRATION_SQL = """
-- Add new columns to coding_problems table
ALTER TABLE coding_problems ADD COLUMN input_format TEXT;
ALTER TABLE coding_problems ADD COLUMN output_format TEXT;
ALTER TABLE coding_problems ADD COLUMN year INTEGER DEFAULT 1;
ALTER TABLE coding_problems ADD COLUMN allowed_languages TEXT DEFAULT '["python","c","cpp","java","javascript"]';
ALTER TABLE coding_problems ADD COLUMN restricted_languages TEXT DEFAULT '[]';
ALTER TABLE coding_problems ADD COLUMN recommended_languages TEXT DEFAULT '[]';
ALTER TABLE coding_problems ADD COLUMN starter_code_python TEXT;
ALTER TABLE coding_problems ADD COLUMN starter_code_c TEXT;
ALTER TABLE coding_problems ADD COLUMN starter_code_cpp TEXT;
ALTER TABLE coding_problems ADD COLUMN starter_code_java TEXT;
ALTER TABLE coding_problems ADD COLUMN starter_code_javascript TEXT;
ALTER TABLE coding_problems ADD COLUMN time_limit INTEGER DEFAULT 5;
ALTER TABLE coding_problems ADD COLUMN memory_limit INTEGER DEFAULT 256;

-- Create user_saved_code table
CREATE TABLE IF NOT EXISTS user_saved_code (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    language VARCHAR(20) NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE,
    UNIQUE(user_id, problem_id, language)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_saved_code_user_id ON user_saved_code(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_code_problem_id ON user_saved_code(problem_id);
CREATE INDEX IF NOT EXISTS idx_coding_problems_year ON coding_problems(year);

-- Update existing problems: set year to 1 if null
UPDATE coding_problems SET year = 1 WHERE year IS NULL;

-- Update existing problems: set allowed_languages if null
UPDATE coding_problems SET allowed_languages = '["python","c","cpp","java","javascript"]' WHERE allowed_languages IS NULL;
"""

if __name__ == "__main__":
    print("Migration SQL:")
    print(MIGRATION_SQL)
    print("\nTo apply this migration:")
    print("1. For SQLite: sqlite3 elevate_edu.db")
    print("2. Copy and paste the SQL commands above")
    print("3. Or use Alembic if configured")


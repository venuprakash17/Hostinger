"""
Database Migration Script for Coding Labs
Adds missing columns to coding_labs table to match the model definition.
This script is safe to run multiple times (idempotent).
"""

import sqlite3
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import engine, Base
from sqlalchemy import text, inspect


def get_db_path():
    """Get the SQLite database path"""
    # Check common locations
    db_paths = [
        "elevate_edu.db",
        "backend/elevate_edu.db",
        "../elevate_edu.db",
    ]
    
    for path in db_paths:
        if os.path.exists(path):
            return path
    
    # If not found, check from database URL
    db_url = str(engine.url)
    if db_url.startswith("sqlite:///"):
        return db_url.replace("sqlite:///", "")
    
    return None


def check_column_exists(conn, table_name, column_name):
    """Check if a column exists in a table"""
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns


def migrate_coding_labs():
    """Add missing columns to coding_labs table"""
    
    db_path = get_db_path()
    if not db_path:
        print("❌ Could not find database file")
        print("   Please ensure elevate_edu.db exists in the backend directory")
        return False
    
    print(f"📁 Database: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='coding_labs'")
        if not cursor.fetchone():
            print("⚠️  coding_labs table does not exist. Creating it...")
            # Create table using SQLAlchemy
            Base.metadata.create_all(bind=engine, tables=[Base.metadata.tables['coding_labs']])
            print("✅ Created coding_labs table")
            return True
        
        print("✅ Found coding_labs table")
        
        # Columns to add (column_name, sqlite_type, default_value, nullable)
        columns_to_add = [
            ("semester", "VARCHAR(50)", "NULL", True),
            ("batch", "VARCHAR(50)", "NULL", True),
            ("academic_year_id", "INTEGER", "NULL", True),
            ("allowed_languages", "JSON", "'[\"python\", \"java\", \"c\", \"cpp\", \"javascript\"]'", False),
            ("version", "VARCHAR(20)", "'1.0'", False),
            ("parent_lab_id", "INTEGER", "NULL", True),
            ("is_clone", "BOOLEAN", "0", False),
            ("requires_approval", "BOOLEAN", "1", False),
            ("is_approved", "BOOLEAN", "0", False),
            ("is_proctored", "BOOLEAN", "0", False),
            ("enforce_fullscreen", "BOOLEAN", "0", False),
            ("detect_tab_switch", "BOOLEAN", "0", False),
            ("camera_proctoring", "BOOLEAN", "0", False),
            ("time_limit_minutes", "INTEGER", "NULL", True),
            ("total_points", "REAL", "100.0", False),
            ("passing_score", "REAL", "60.0", False),
            ("start_date", "DATETIME", "NULL", True),
            ("end_date", "DATETIME", "NULL", True),
            ("updated_at", "DATETIME", "NULL", True),
        ]
        
        added_count = 0
        skipped_count = 0
        
        for column_name, column_type, default_value, nullable in columns_to_add:
            if check_column_exists(conn, "coding_labs", column_name):
                print(f"⏭️  Column '{column_name}' already exists")
                skipped_count += 1
                continue
            
            # Build ALTER TABLE statement
            nullable_clause = "" if not nullable else ""
            default_clause = f" DEFAULT {default_value}" if default_value != "NULL" else ""
            
            alter_sql = f"ALTER TABLE coding_labs ADD COLUMN {column_name} {column_type}{default_clause}"
            
            try:
                cursor.execute(alter_sql)
                print(f"✅ Added column '{column_name}'")
                added_count += 1
            except sqlite3.OperationalError as e:
                print(f"❌ Failed to add column '{column_name}': {e}")
                # Continue with other columns
        
        # Add foreign key constraints if needed (SQLite has limited ALTER TABLE support)
        # We'll add indexes for foreign keys
        indexes_to_add = [
            ("idx_coding_labs_academic_year_id", "academic_year_id"),
            ("idx_coding_labs_parent_lab_id", "parent_lab_id"),
            ("idx_coding_labs_semester", "semester"),
            ("idx_coding_labs_batch", "batch"),
        ]
        
        for index_name, column_name in indexes_to_add:
            if check_column_exists(conn, "coding_labs", column_name):
                # Check if index exists
                cursor.execute(f"SELECT name FROM sqlite_master WHERE type='index' AND name='{index_name}'")
                if not cursor.fetchone():
                    try:
                        cursor.execute(f"CREATE INDEX IF NOT EXISTS {index_name} ON coding_labs({column_name})")
                        print(f"✅ Created index '{index_name}'")
                    except sqlite3.OperationalError as e:
                        print(f"⚠️  Could not create index '{index_name}': {e}")
        
        # Commit changes
        conn.commit()
        
        print(f"\n🎉 Migration complete!")
        print(f"   ✅ Added: {added_count} columns")
        print(f"   ⏭️  Skipped: {skipped_count} columns (already exist)")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()


def verify_migration():
    """Verify that all required columns exist"""
    db_path = get_db_path()
    if not db_path:
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("PRAGMA table_info(coding_labs)")
        columns = {row[1]: row for row in cursor.fetchall()}
        
        required_columns = [
            "semester", "batch", "academic_year_id", "allowed_languages",
            "version", "parent_lab_id", "is_clone", "requires_approval",
            "is_approved", "is_proctored", "enforce_fullscreen",
            "detect_tab_switch", "camera_proctoring", "time_limit_minutes",
            "total_points", "passing_score", "start_date", "end_date", "updated_at"
        ]
        
        missing = [col for col in required_columns if col not in columns]
        
        if missing:
            print(f"⚠️  Missing columns: {', '.join(missing)}")
            return False
        else:
            print("✅ All required columns exist")
            return True
    finally:
        conn.close()


if __name__ == "__main__":
    print("🚀 Starting Coding Labs Database Migration\n")
    
    success = migrate_coding_labs()
    
    if success:
        print("\n🔍 Verifying migration...")
        verify_migration()
        print("\n✅ Migration completed successfully!")
        print("\n💡 Next steps:")
        print("   1. Restart the backend server")
        print("   2. Test the coding labs endpoints")
    else:
        print("\n❌ Migration failed. Please check the errors above.")
        sys.exit(1)


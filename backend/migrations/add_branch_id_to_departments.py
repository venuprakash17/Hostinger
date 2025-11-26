#!/usr/bin/env python3
"""
Migration script to add branch_id column to departments table.

Usage:
    python backend/migrations/add_branch_id_to_departments.py
"""

import sys
import os
from sqlalchemy import text

def upgrade(connection):
    try:
        # Check if branch_id column already exists by querying pragma_table_info
        # SQLite doesn't support direct queries on pragma_table_info, so we'll try to add it
        # and catch the error if it already exists
        
        # First, try to add the column
        try:
            connection.execute(text("""
                ALTER TABLE departments 
                ADD COLUMN branch_id VARCHAR(50)
            """))
            connection.commit()
            print("✅ Added branch_id column to departments table")
            
            # Create unique index on branch_id
            try:
                connection.execute(text("""
                    CREATE UNIQUE INDEX IF NOT EXISTS ix_departments_branch_id 
                    ON departments(branch_id)
                """))
                connection.commit()
                print("✅ Created unique index on branch_id")
            except Exception as e:
                print(f"⚠️  Note: Index creation skipped: {e}")
                
        except Exception as add_error:
            # Check if error is because column already exists
            error_msg = str(add_error).lower()
            if 'duplicate column' in error_msg or 'already exists' in error_msg:
                print("ℹ️  branch_id column already exists")
            else:
                # Try alternative approach - check if column exists first
                try:
                    # Try to select the column to see if it exists
                    test_result = connection.execute(text("SELECT branch_id FROM departments LIMIT 1"))
                    print("ℹ️  branch_id column already exists")
                except:
                    # Column doesn't exist, but ALTER failed for another reason
                    print(f"⚠️  Error adding branch_id column: {add_error}")
                    raise
            
    except Exception as e:
        print(f"⚠️  Error adding branch_id column: {e}")
        connection.rollback()
        raise

def downgrade(connection):
    try:
        print("⚠️  SQLite doesn't support DROP COLUMN. Skipping downgrade.")
        print("   To remove this column, recreate the table without it.")
    except Exception as e:
        print(f"⚠️  Error removing branch_id column: {e}")
        connection.rollback()
        raise

if __name__ == "__main__":
    from sqlalchemy import create_engine
    from dotenv import load_dotenv
    
    load_dotenv()
    
    # Find database file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    root_dir = os.path.dirname(backend_dir)
    
    backend_db = os.path.join(backend_dir, "elevate_edu.db")
    root_db = os.path.join(root_dir, "elevate_edu.db")
    
    if os.path.exists(backend_db):
        db_path = backend_db
    elif os.path.exists(root_db):
        db_path = root_db
    else:
        db_path = backend_db
    
    database_url = os.getenv("DATABASE_URL", f"sqlite:///{db_path}")
    
    engine = create_engine(database_url)
    with engine.connect() as conn:
        upgrade(conn)
        print("✅ Migration complete!")


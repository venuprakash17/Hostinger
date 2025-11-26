"""
Migration: Add camera_proctoring field to lab_sessions_enhanced table

This migration adds the camera_proctoring column to support camera-based proctoring
at the session level.
"""

from sqlalchemy import text

def upgrade(connection):
    """Add camera_proctoring column to lab_sessions_enhanced table"""
    try:
        # Check if column already exists
        result = connection.execute(text("""
            SELECT COUNT(*) 
            FROM pragma_table_info('lab_sessions_enhanced') 
            WHERE name = 'camera_proctoring'
        """))
        
        if result.scalar() == 0:
            # Add camera_proctoring column
            connection.execute(text("""
                ALTER TABLE lab_sessions_enhanced 
                ADD COLUMN camera_proctoring BOOLEAN DEFAULT 0 NOT NULL
            """))
            connection.commit()
            print("✅ Added camera_proctoring column to lab_sessions_enhanced")
        else:
            print("ℹ️  camera_proctoring column already exists")
    except Exception as e:
        print(f"⚠️  Error adding camera_proctoring column: {e}")
        connection.rollback()
        raise

def downgrade(connection):
    """Remove camera_proctoring column from lab_sessions_enhanced table"""
    try:
        # SQLite doesn't support DROP COLUMN directly, so we'll skip this
        # In production, you'd need to recreate the table
        print("⚠️  SQLite doesn't support DROP COLUMN. Skipping downgrade.")
        print("   To remove this column, recreate the table without it.")
    except Exception as e:
        print(f"⚠️  Error removing camera_proctoring column: {e}")
        connection.rollback()
        raise

if __name__ == "__main__":
    from sqlalchemy import create_engine
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    database_url = os.getenv("DATABASE_URL", "sqlite:///./elevate_edu.db")
    
    engine = create_engine(database_url)
    with engine.connect() as conn:
        upgrade(conn)
        print("✅ Migration complete!")


"""
Migration: Add staff_id field to profiles table

This migration adds the staff_id column to support staff ID-based user creation
where staff can use their staff ID as their login identifier.
"""

from sqlalchemy import text

def upgrade(connection):
    """Add staff_id column to profiles table"""
    try:
        # Check if column already exists
        result = connection.execute(text("""
            SELECT COUNT(*) 
            FROM pragma_table_info('profiles') 
            WHERE name = 'staff_id'
        """))
        
        if result.scalar() == 0:
            # Add staff_id column
            connection.execute(text("""
                ALTER TABLE profiles 
                ADD COLUMN staff_id VARCHAR(50) NULL
            """))
            
            # Create index on staff_id for faster lookups
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_profiles_staff_id 
                ON profiles(staff_id)
            """))
            
            connection.commit()
            print("✅ Added staff_id column to profiles table")
        else:
            print("ℹ️  staff_id column already exists")
    except Exception as e:
        print(f"⚠️  Error adding staff_id column: {e}")
        connection.rollback()
        raise

def downgrade(connection):
    """Remove staff_id column from profiles table"""
    try:
        # SQLite doesn't support DROP COLUMN directly, so we'll skip this
        # In production, you'd need to recreate the table
        print("⚠️  SQLite doesn't support DROP COLUMN. Skipping downgrade.")
        print("   To remove this column, recreate the table without it.")
    except Exception as e:
        print(f"⚠️  Error removing staff_id column: {e}")
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


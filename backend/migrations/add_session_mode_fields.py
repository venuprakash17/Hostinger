"""
Migration: Add Mode and Proctoring Fields to Lab Sessions Enhanced
Run this script to add mode-based customization to sessions
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, create_engine
from app.config import get_settings

def add_session_mode_fields():
    """Add mode and proctoring fields to lab_sessions_enhanced table"""
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if columns already exist
        result = conn.execute(text("PRAGMA table_info(lab_sessions_enhanced)"))
        existing_columns = [row[1] for row in result]
        
        # Add mode column
        if 'mode' not in existing_columns:
            print("Adding 'mode' column...")
            conn.execute(text("""
                ALTER TABLE lab_sessions_enhanced 
                ADD COLUMN mode VARCHAR(20) DEFAULT 'practice'
            """))
            conn.commit()
            print("✅ Added 'mode' column")
        else:
            print("⚠️  'mode' column already exists")
        
        # Add allow_multiple_attempts column
        if 'allow_multiple_attempts' not in existing_columns:
            print("Adding 'allow_multiple_attempts' column...")
            conn.execute(text("""
                ALTER TABLE lab_sessions_enhanced 
                ADD COLUMN allow_multiple_attempts BOOLEAN DEFAULT 1
            """))
            conn.commit()
            print("✅ Added 'allow_multiple_attempts' column")
        else:
            print("⚠️  'allow_multiple_attempts' column already exists")
        
        # Add max_attempts column
        if 'max_attempts' not in existing_columns:
            print("Adding 'max_attempts' column...")
            conn.execute(text("""
                ALTER TABLE lab_sessions_enhanced 
                ADD COLUMN max_attempts INTEGER
            """))
            conn.commit()
            print("✅ Added 'max_attempts' column")
        else:
            print("⚠️  'max_attempts' column already exists")
        
        # Add is_proctored column
        if 'is_proctored' not in existing_columns:
            print("Adding 'is_proctored' column...")
            conn.execute(text("""
                ALTER TABLE lab_sessions_enhanced 
                ADD COLUMN is_proctored BOOLEAN DEFAULT 0
            """))
            conn.commit()
            print("✅ Added 'is_proctored' column")
        else:
            print("⚠️  'is_proctored' column already exists")
        
        # Add enforce_fullscreen column
        if 'enforce_fullscreen' not in existing_columns:
            print("Adding 'enforce_fullscreen' column...")
            conn.execute(text("""
                ALTER TABLE lab_sessions_enhanced 
                ADD COLUMN enforce_fullscreen BOOLEAN DEFAULT 0
            """))
            conn.commit()
            print("✅ Added 'enforce_fullscreen' column")
        else:
            print("⚠️  'enforce_fullscreen' column already exists")
        
        # Add detect_tab_switch column
        if 'detect_tab_switch' not in existing_columns:
            print("Adding 'detect_tab_switch' column...")
            conn.execute(text("""
                ALTER TABLE lab_sessions_enhanced 
                ADD COLUMN detect_tab_switch BOOLEAN DEFAULT 0
            """))
            conn.commit()
            print("✅ Added 'detect_tab_switch' column")
        else:
            print("⚠️  'detect_tab_switch' column already exists")
        
        # Add passing_score column
        if 'passing_score' not in existing_columns:
            print("Adding 'passing_score' column...")
            conn.execute(text("""
                ALTER TABLE lab_sessions_enhanced 
                ADD COLUMN passing_score REAL DEFAULT 60.0
            """))
            conn.commit()
            print("✅ Added 'passing_score' column")
        else:
            print("⚠️  'passing_score' column already exists")
        
        print("\n✅ Migration complete! All session mode fields added.")

if __name__ == "__main__":
    add_session_mode_fields()


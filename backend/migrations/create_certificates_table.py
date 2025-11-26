"""Migration: Create certificates table"""
import sys
import os
from sqlalchemy import inspect, text
from sqlalchemy import create_engine
from app.config import get_settings

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()

def upgrade():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    
    with engine.connect() as connection:
        print("Creating certificates table...")
        
        if not table_exists(inspector, "certificates"):
            connection.execute(text("""
                CREATE TABLE certificates (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    certificate_type VARCHAR(20) NOT NULL CHECK (certificate_type IN ('10th', 'intermediate', 'college', 'other')),
                    certificate_name VARCHAR(255) NOT NULL,
                    issuing_authority VARCHAR(255),
                    issue_date TIMESTAMP WITH TIME ZONE,
                    file_url VARCHAR(500) NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    file_size INTEGER,
                    mime_type VARCHAR(100),
                    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    reviewed_at TIMESTAMP WITH TIME ZONE,
                    review_notes TEXT,
                    description TEXT,
                    grade_percentage VARCHAR(50),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE
                )
            """))
            print("  ✅ Created certificates table")
            
            # Create indexes
            connection.execute(text("CREATE INDEX idx_certificates_user_id ON certificates(user_id)"))
            connection.execute(text("CREATE INDEX idx_certificates_status ON certificates(status)"))
            connection.execute(text("CREATE INDEX idx_certificates_type ON certificates(certificate_type)"))
            print("  ✅ Created indexes")
        else:
            print("  ⚠️  Table certificates already exists")
        
        connection.commit()
    
    print("\n✅ Migration completed successfully!\n")

if __name__ == "__main__":
    upgrade()


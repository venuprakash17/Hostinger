"""Migration: Create job_aggregations table"""
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
        print("Creating job_aggregations table...")
        
        if not table_exists(inspector, "job_aggregations"):
            connection.execute(text("""
                CREATE TABLE job_aggregations (
                    id SERIAL PRIMARY KEY,
                    source VARCHAR(50) NOT NULL,
                    external_id VARCHAR(255),
                    source_url VARCHAR(500),
                    title VARCHAR(255) NOT NULL,
                    company VARCHAR(255) NOT NULL,
                    role VARCHAR(255) NOT NULL,
                    description TEXT,
                    location VARCHAR(255),
                    ctc VARCHAR(100),
                    job_type VARCHAR(50),
                    experience_required VARCHAR(100),
                    skills_required JSON,
                    qualifications TEXT,
                    posted_date TIMESTAMP WITH TIME ZONE,
                    expiry_date TIMESTAMP WITH TIME ZONE,
                    is_active BOOLEAN DEFAULT true NOT NULL,
                    is_imported BOOLEAN DEFAULT false NOT NULL,
                    college_id INTEGER REFERENCES colleges(id) ON DELETE SET NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE,
                    last_synced_at TIMESTAMP WITH TIME ZONE
                )
            """))
            print("  ✅ Created job_aggregations table")
            
            # Create indexes
            connection.execute(text("CREATE INDEX idx_job_aggregations_source ON job_aggregations(source)"))
            connection.execute(text("CREATE INDEX idx_job_aggregations_external_id ON job_aggregations(external_id)"))
            connection.execute(text("CREATE INDEX idx_job_aggregations_college_id ON job_aggregations(college_id)"))
            connection.execute(text("CREATE INDEX idx_job_aggregations_is_active ON job_aggregations(is_active)"))
            print("  ✅ Created indexes")
        else:
            print("  ⚠️  Table job_aggregations already exists")
        
        connection.commit()
    
    print("\n✅ Migration completed successfully!\n")

if __name__ == "__main__":
    upgrade()


"""Migration: Create mock_interviews table"""
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
        print("Creating mock_interviews table...")
        
        if not table_exists(inspector, "mock_interviews"):
            connection.execute(text("""
                CREATE TABLE mock_interviews (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    interview_type VARCHAR(50) NOT NULL DEFAULT 'mock' CHECK (interview_type IN ('technical', 'hr', 'managerial', 'mock', 'behavioral')),
                    description TEXT,
                    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    interviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    interviewer_name VARCHAR(255),
                    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    duration_minutes INTEGER DEFAULT 60 NOT NULL,
                    meeting_link VARCHAR(500),
                    venue VARCHAR(255),
                    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
                    feedback TEXT,
                    rating INTEGER,
                    strengths JSON,
                    areas_for_improvement JSON,
                    technical_score INTEGER,
                    communication_score INTEGER,
                    problem_solving_score INTEGER,
                    recording_url VARCHAR(500),
                    notes TEXT,
                    college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE,
                    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    started_at TIMESTAMP WITH TIME ZONE,
                    completed_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE
                )
            """))
            print("  ✅ Created mock_interviews table")
            
            # Create indexes
            connection.execute(text("CREATE INDEX idx_mock_interviews_student_id ON mock_interviews(student_id)"))
            connection.execute(text("CREATE INDEX idx_mock_interviews_interviewer_id ON mock_interviews(interviewer_id)"))
            connection.execute(text("CREATE INDEX idx_mock_interviews_college_id ON mock_interviews(college_id)"))
            connection.execute(text("CREATE INDEX idx_mock_interviews_status ON mock_interviews(status)"))
            connection.execute(text("CREATE INDEX idx_mock_interviews_scheduled_at ON mock_interviews(scheduled_at)"))
            print("  ✅ Created indexes")
        else:
            print("  ⚠️  Table mock_interviews already exists")
        
        connection.commit()
    
    print("\n✅ Migration completed successfully!\n")

if __name__ == "__main__":
    upgrade()


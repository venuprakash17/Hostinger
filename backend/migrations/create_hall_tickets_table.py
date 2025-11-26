"""Migration: Create hall_tickets table"""
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
        print("Creating hall_tickets table...")
        
        if not table_exists(inspector, "hall_tickets"):
            connection.execute(text("""
                CREATE TABLE hall_tickets (
                    id SERIAL PRIMARY KEY,
                    exam_id INTEGER NOT NULL,
                    exam_type VARCHAR(50) NOT NULL CHECK (exam_type IN ('quiz', 'coding', 'mock_test', 'placement')),
                    exam_title VARCHAR(255) NOT NULL,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    exam_date TIMESTAMP WITH TIME ZONE NOT NULL,
                    exam_time VARCHAR(50),
                    duration_minutes INTEGER,
                    venue VARCHAR(255),
                    room_number VARCHAR(50),
                    seat_number VARCHAR(50),
                    address TEXT,
                    instructions JSON,
                    is_generated BOOLEAN DEFAULT false NOT NULL,
                    generated_at TIMESTAMP WITH TIME ZONE,
                    generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    pdf_url VARCHAR(500),
                    college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE
                )
            """))
            print("  ✅ Created hall_tickets table")
            
            # Create indexes
            connection.execute(text("CREATE INDEX idx_hall_tickets_exam_id ON hall_tickets(exam_id)"))
            connection.execute(text("CREATE INDEX idx_hall_tickets_user_id ON hall_tickets(user_id)"))
            connection.execute(text("CREATE INDEX idx_hall_tickets_college_id ON hall_tickets(college_id)"))
            connection.execute(text("CREATE INDEX idx_hall_tickets_exam_date ON hall_tickets(exam_date)"))
            print("  ✅ Created indexes")
        else:
            print("  ⚠️  Table hall_tickets already exists")
        
        connection.commit()
    
    print("\n✅ Migration completed successfully!\n")

if __name__ == "__main__":
    upgrade()


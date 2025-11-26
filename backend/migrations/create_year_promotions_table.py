"""Migration: Create year_promotions table"""
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
        print("Creating year_promotions table...")
        
        if not table_exists(inspector, "year_promotions"):
            connection.execute(text("""
                CREATE TABLE year_promotions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    from_year VARCHAR(20) NOT NULL,
                    to_year VARCHAR(20) NOT NULL,
                    fee_paid BOOLEAN DEFAULT false NOT NULL,
                    fee_amount NUMERIC(10, 2),
                    payment_date TIMESTAMP WITH TIME ZONE,
                    payment_reference VARCHAR(255),
                    payment_proof_url VARCHAR(500),
                    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
                    promoted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    promoted_at TIMESTAMP WITH TIME ZONE,
                    rejection_reason TEXT,
                    notes TEXT,
                    college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE
                )
            """))
            print("  ✅ Created year_promotions table")
            
            # Create indexes
            connection.execute(text("CREATE INDEX idx_year_promotions_user_id ON year_promotions(user_id)"))
            connection.execute(text("CREATE INDEX idx_year_promotions_status ON year_promotions(status)"))
            connection.execute(text("CREATE INDEX idx_year_promotions_college_id ON year_promotions(college_id)"))
            print("  ✅ Created indexes")
        else:
            print("  ⚠️  Table year_promotions already exists")
        
        connection.commit()
    
    print("\n✅ Migration completed successfully!\n")

if __name__ == "__main__":
    upgrade()


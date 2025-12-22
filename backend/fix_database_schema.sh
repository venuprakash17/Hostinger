#!/bin/bash
# Script to fix database schema on server

echo "🔧 Fixing database schema on server..."
echo ""

ssh root@72.60.101.14 << 'ENDSSH'
cd /root/elevate-edu

echo "1️⃣ Copying migration script to backend..."
# The script should already be in backend/ after deployment

echo "2️⃣ Running migration to add institution_id column..."
docker exec elevate_edu_api python -c "
import sys
sys.path.insert(0, '/app')
from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    # Check if column exists
    result = conn.execute(text(\"\"\"
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='profiles' AND column_name='institution_id'
    \"\"\"))
    
    if result.fetchone():
        print('✅ Column institution_id already exists')
    else:
        # Add the column
        conn.execute(text(\"\"\"
            ALTER TABLE profiles 
            ADD COLUMN institution_id INTEGER
        \"\"\"))
        conn.commit()
        
        # Add foreign key constraint
        conn.execute(text(\"\"\"
            ALTER TABLE profiles 
            ADD CONSTRAINT fk_profiles_institution 
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
        \"\"\"))
        conn.commit()
        print('✅ Successfully added institution_id column')
"

echo ""
echo "3️⃣ Restarting backend..."
docker-compose restart backend

echo ""
echo "✅ Database schema fix complete!"

ENDSSH


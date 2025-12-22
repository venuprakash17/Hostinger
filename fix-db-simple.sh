#!/bin/bash
# Simple fix for missing institution_id column

echo "🔧 Adding institution_id column to profiles table..."

ssh root@72.60.101.14 'docker exec -i elevate_edu_api python << PYTHON
from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    # Check if column exists (with proper quotes)
    result = conn.execute(text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '\''profiles'\'' AND column_name = '\''institution_id'\''
    """))
    
    if result.fetchone():
        print("✅ Column institution_id already exists")
    else:
        # Add the column
        conn.execute(text("ALTER TABLE profiles ADD COLUMN institution_id INTEGER"))
        conn.commit()
        print("✅ Successfully added institution_id column")
PYTHON
'

echo ""
echo "🔄 Restarting backend..."
ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose restart backend'

echo ""
echo "✅ Done! Try logging in again."


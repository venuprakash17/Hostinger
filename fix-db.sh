#!/bin/bash
# Simple script to add missing institution_id column

echo "🔧 Adding institution_id column to profiles table..."
ssh root@72.60.101.14 'docker exec elevate_edu_api python -c "
from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    # Check if column exists
    result = conn.execute(text(\"SELECT column_name FROM information_schema.columns WHERE table_name=\x27profiles\x27 AND column_name=\x27institution_id\x27\"))
    if result.fetchone():
        print(\"✅ Column already exists\")
    else:
        conn.execute(text(\"ALTER TABLE profiles ADD COLUMN institution_id INTEGER\"))
        conn.commit()
        print(\"✅ Added institution_id column\")
"'

echo ""
echo "🔄 Restarting backend..."
ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose restart backend'

echo ""
echo "✅ Done! Try logging in again."

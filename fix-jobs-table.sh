#!/bin/bash
# Fix jobs table - add missing apply_link column

echo "🔧 Adding apply_link column to jobs table..."
echo ""

ssh root@72.60.101.14 'docker exec -i elevate_edu_db psql -U elevate_user -d elevate_edu -c "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS apply_link VARCHAR(500);"'

echo ""
echo "🔄 Restarting backend..."
ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose restart backend'

echo ""
echo "⏳ Waiting 15 seconds for backend to start..."
sleep 15

echo ""
echo "✅ Done! Test the endpoint:"
echo "curl \"http://72.60.101.14:8000/api/v1/jobs?limit=5&is_active=true\""


#!/bin/bash
# Diagnose the 500 error

echo "🔍 Step 1: Check if latest code is deployed..."
ssh root@72.60.101.14 "grep -c 'logger.info.*list_problems called' /root/elevate-edu/backend/app/api/coding_problems.py" || echo "❌ Latest code NOT deployed"

echo ""
echo "🔍 Step 2: Check backend container status..."
ssh root@72.60.101.14 "cd /root/elevate-edu && docker-compose ps backend"

echo ""
echo "🔍 Step 3: Test endpoint directly (this will show errors)..."
echo "Make a request to trigger the error, then check logs below:"
echo ""
echo "Run this in another terminal:"
echo "  curl -H 'Authorization: Bearer YOUR_TOKEN' 'http://72.60.101.14:8000/api/v1/coding-problems?is_active=true'"
echo ""
echo "Then check logs with:"
echo "  ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose logs backend --tail=50'"


#!/bin/bash
# Verify deployment and check for errors

echo "🔍 Step 1: Checking if latest code is deployed..."
echo ""

# Check if the file has our latest fixes
ssh root@72.60.101.14 "grep -n 'logger = logging.getLogger' /root/elevate-edu/backend/app/api/coding_problems.py | head -1"

echo ""
echo "🔍 Step 2: Testing endpoint and watching logs..."
echo ""

# Start watching logs in background
ssh root@72.60.101.14 "cd /root/elevate-edu && docker-compose logs -f --tail=0 backend" &
LOGS_PID=$!

sleep 2

echo "🧪 Making test request..."
echo ""

# Make a test request (this will show errors in logs)
curl -s -X GET "http://72.60.101.14:8000/api/v1/coding-problems?is_active=true" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  | head -20

echo ""
echo "⏳ Waiting 5 seconds for logs..."
sleep 5

# Kill the log watcher
kill $LOGS_PID 2>/dev/null

echo ""
echo "✅ Check complete. If you see errors above, they'll be in the logs."


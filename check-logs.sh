#!/bin/bash
# Check backend logs in real-time and test the endpoint

echo "🔍 Checking backend logs in real-time..."
echo "Press Ctrl+C to stop"
echo ""
ssh root@72.60.101.14 "cd /root/elevate-edu && docker-compose logs -f backend" &
LOGS_PID=$!

sleep 2

echo ""
echo "🧪 Testing the endpoint..."
curl -X GET "http://72.60.101.14:8000/api/v1/coding-problems?is_active=true" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -v 2>&1 | head -50

echo ""
echo "Press Ctrl+C to stop log monitoring"
wait $LOGS_PID


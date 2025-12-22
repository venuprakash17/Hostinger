#!/bin/bash
# Quick command to restart backend on server

echo "🔧 Restarting backend services on server..."
ssh root@72.60.101.14 "cd /root/elevate-edu && docker-compose down && docker-compose up -d --build && sleep 15 && docker-compose ps && echo '' && echo 'Testing backend...' && curl -s http://localhost:8000/api/v1/health || echo 'Backend not responding'"
echo ""
echo "✅ Done! Check if backend is running above."

#!/bin/bash

# Script to check and start backend services on the server

echo "🔍 Checking backend status on server..."
echo ""

# Check if services are running
ssh root@72.60.101.14 << 'ENDSSH'
cd /root/elevate-edu

echo "📊 Docker Compose Status:"
docker-compose ps

echo ""
echo "📋 Container Logs (Backend):"
docker-compose logs --tail=50 backend

echo ""
echo "🌐 Testing Backend Connection:"
curl -s http://localhost:8000/api/v1/health || echo "❌ Backend not responding on port 8000"

echo ""
echo "🔧 Restarting services..."
docker-compose down
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "📊 Final Status:"
docker-compose ps

echo ""
echo "🌐 Testing Backend Again:"
curl -s http://localhost:8000/api/v1/health || echo "❌ Still not responding"

ENDSSH

echo ""
echo "✅ Check complete!"


#!/bin/bash

# Quick fix script to restart backend on server

echo "🔧 Fixing backend on server..."
echo ""

ssh root@72.60.101.14 << 'ENDSSH'
cd /root/elevate-edu

echo "1️⃣ Stopping all services..."
docker-compose down

echo ""
echo "2️⃣ Rebuilding and starting services..."
docker-compose up -d --build

echo ""
echo "3️⃣ Waiting for services to be ready..."
sleep 15

echo ""
echo "4️⃣ Checking service status..."
docker-compose ps

echo ""
echo "5️⃣ Checking backend logs..."
docker-compose logs --tail=20 backend

echo ""
echo "6️⃣ Testing backend health..."
curl -v http://localhost:8000/api/v1/health 2>&1 | head -20

ENDSSH

echo ""
echo "✅ Backend fix complete!"
echo "🌐 Test at: http://72.60.101.14:8000/api/v1/health"


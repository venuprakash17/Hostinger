#!/bin/bash

# Quick Start Script for Local Development
# Starts all services matching VPS production environment

echo "🚀 Starting Local Development Environment (VPS Production Match)..."
echo "===================================================================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Running setup first..."
    ./setup-local-env.sh
    exit 0
fi

# Start Docker services
echo "📦 Starting Docker services..."
docker-compose -f docker-compose.local.yml up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check health
echo "🏥 Checking backend health..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "000")

if [ "$HEALTH" = "200" ]; then
    echo "✅ Backend is ready!"
else
    echo "⚠️  Backend might still be starting (status: $HEALTH)"
    echo "   Check logs: docker-compose -f docker-compose.local.yml logs backend"
fi

echo ""
echo "📋 Services (Matching VPS Production):"
echo "   - PostgreSQL: localhost:5432"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/api/docs"
echo "   - Frontend (Nginx): http://localhost:8080 (if dist folder exists)"
echo ""
echo "📝 Next Steps:"
echo "   - Build frontend: npm run build (for Nginx on port 8080)"
echo "   - Or dev server: npm run dev (for development on port 5173)"
echo ""


#!/bin/bash

# Setup Local Development Environment (Matches VPS Production)
# This script sets up your local environment to match the VPS Hostinger setup

set -e

echo "🚀 Setting up Local Development Environment (VPS Production Match)"
echo "================================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if Docker is installed
echo -e "${YELLOW}📦 Step 1: Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"

# Step 2: Create root .env file (for Docker Compose)
echo -e "${YELLOW}📝 Step 2: Setting up environment variables...${NC}"
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env
        echo -e "${GREEN}✅ Created .env from template${NC}"
    else
        # Create .env manually matching VPS setup
        cat > .env << EOF
# PostgreSQL Database Password (for Docker Compose)
POSTGRES_PASSWORD=dev_password_123

# Backend Secret Key
SECRET_KEY=dev-secret-key-change-in-production

# CORS Origins (comma-separated, no spaces)
BACKEND_CORS_ORIGINS=http://localhost:8080,http://localhost:5173,http://127.0.0.1:8080,http://127.0.0.1:5173

# Frontend API Base URL
VITE_API_BASE_URL=http://localhost:8000/api/v1
EOF
        echo -e "${GREEN}✅ Created .env${NC}"
    fi
    
    # Generate a secure secret key
    if command -v openssl &> /dev/null; then
        SECRET_KEY=$(openssl rand -hex 32)
        # Update SECRET_KEY in .env file (works on both macOS and Linux)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/SECRET_KEY=.*/SECRET_KEY=${SECRET_KEY}/" .env
        else
            # Linux
            sed -i "s/SECRET_KEY=.*/SECRET_KEY=${SECRET_KEY}/" .env
        fi
        echo -e "${GREEN}✅ Generated secure SECRET_KEY${NC}"
    else
        echo -e "${YELLOW}⚠️  openssl not found - using default SECRET_KEY (change in production!)${NC}"
    fi
else
    echo -e "${BLUE}ℹ️  .env already exists - skipping${NC}"
fi

# Step 4: Build Docker images
echo -e "${YELLOW}🔨 Step 4: Building Docker images...${NC}"
docker-compose -f docker-compose.local.yml build

# Step 5: Start services
echo -e "${YELLOW}🚀 Step 5: Starting services...${NC}"
docker-compose -f docker-compose.local.yml up -d

# Step 6: Wait for services to be ready
echo -e "${YELLOW}⏳ Step 6: Waiting for services to be ready (15 seconds)...${NC}"
sleep 15

# Step 7: Health check
echo -e "${YELLOW}🏥 Step 7: Running health check...${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Backend is healthy!${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check returned: $HEALTH_CHECK${NC}"
    echo -e "${YELLOW}   This might be normal if the server is still starting up${NC}"
    echo -e "${YELLOW}   Check logs: docker-compose -f docker-compose.local.yml logs backend${NC}"
fi

echo ""
echo -e "${GREEN}=================================="
echo -e "✅ Local Environment Setup Complete!"
echo -e "==================================${NC}"
echo ""
echo -e "${BLUE}📋 Services (Matching VPS Production):${NC}"
echo "   - PostgreSQL: localhost:5432"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/api/docs"
echo "   - Frontend (Nginx): http://localhost:8080 (if dist folder exists)"
echo ""
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo "   Start services:    docker-compose -f docker-compose.local.yml up -d"
echo "   Stop services:     docker-compose -f docker-compose.local.yml down"
echo "   View logs:         docker-compose -f docker-compose.local.yml logs -f"
echo "   Restart backend:   docker-compose -f docker-compose.local.yml restart backend"
echo "   Restart nginx:     docker-compose -f docker-compose.local.yml restart nginx"
echo "   Access database:   docker exec -it elevate_edu_db_local psql -U elevate_user -d elevate_edu"
echo ""
echo -e "${BLUE}🔧 Next Steps:${NC}"
echo "   1. Create super admin: docker exec -it elevate_edu_api_local python scripts/reset_and_create_super_admin.py"
echo "   2. Build frontend:    npm run build (to create dist folder for Nginx)"
echo "   3. Or run dev server: npm run dev (for development with hot-reload)"
echo "   4. Test the app:       http://localhost:5173 (dev) or http://localhost:8080 (production-like)"
echo ""
echo -e "${GREEN}✅ Your local environment now matches your VPS Hostinger setup!${NC}"
echo ""


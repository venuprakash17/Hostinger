#!/bin/bash

# Production Deployment Script
# This script builds and deploys both frontend and backend to the VPS server

set -e  # Exit on any error

echo "🚀 Starting Production Deployment..."
echo "=================================="

# Configuration
SERVER="root@72.60.101.14"
SERVER_PATH="/root/elevate-edu"
API_URL="http://72.60.101.14:8000/api/v1"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build Frontend
echo -e "${YELLOW}📦 Step 1: Building frontend with production API URL...${NC}"
export VITE_API_BASE_URL=$API_URL
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend build successful${NC}"

# Step 2: Deploy Frontend
echo -e "${YELLOW}📤 Step 2: Deploying frontend to server...${NC}"
scp -r dist/* $SERVER:$SERVER_PATH/dist/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend deployed${NC}"

# Step 3: Deploy Backend
echo -e "${YELLOW}📤 Step 3: Deploying backend to server...${NC}"
scp -r backend/* $SERVER:$SERVER_PATH/backend/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend deployed${NC}"

# Step 4: Restart Services
echo -e "${YELLOW}🔄 Step 4: Restarting Docker containers on server...${NC}"
ssh $SERVER "cd $SERVER_PATH && docker-compose up -d --build"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker restart failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker containers restarted${NC}"

# Step 5: Wait for services to be ready
echo -e "${YELLOW}⏳ Step 5: Waiting for services to be ready...${NC}"
sleep 10

# Step 6: Health Check
echo -e "${YELLOW}🏥 Step 6: Running health check...${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://72.60.101.14:8000/health || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check returned: $HEALTH_CHECK${NC}"
    echo -e "${YELLOW}   This might be normal if the server is still starting up${NC}"
fi

echo ""
echo -e "${GREEN}=================================="
echo -e "✅ Deployment Complete!"
echo -e "==================================${NC}"
echo ""
echo "🌐 Frontend: http://72.60.101.14"
echo "🔧 Backend API: http://72.60.101.14:8000/api/v1"
echo "📚 API Docs: http://72.60.101.14:8000/api/docs"
echo ""
echo "📝 Next Steps:"
echo "   1. Check Docker logs: ssh $SERVER 'cd $SERVER_PATH && docker-compose logs -f'"
echo "   2. Test the application in your browser"
echo "   3. Monitor for any errors in the browser console"
echo ""


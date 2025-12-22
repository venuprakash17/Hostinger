#!/bin/bash

# Complete Deployment and Monitoring Script
# This script deploys updates and then monitors logs

set -e  # Exit on any error

echo "🚀 Starting Deployment and Monitoring..."
echo "=================================="

# Configuration
SERVER="root@72.60.101.14"
SERVER_PATH="/root/elevate-edu"
API_URL="http://72.60.101.14:8000/api/v1"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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
echo -e "${YELLOW}⏳ Step 5: Waiting for services to be ready (10 seconds)...${NC}"
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
echo -e "${BLUE}📊 Now monitoring logs...${NC}"
echo -e "${BLUE}Press Ctrl+C to stop monitoring${NC}"
echo ""
echo -e "${YELLOW}To view logs manually, run:${NC}"
echo -e "  ssh $SERVER 'cd $SERVER_PATH && docker-compose logs -f backend | grep \"\[LOG\]\"'"
echo ""
echo ""

# Step 7: Monitor Logs
echo -e "${BLUE}=== Starting Log Monitor ===${NC}"
ssh $SERVER "cd $SERVER_PATH && docker-compose logs -f --tail=50 backend | grep --line-buffered '\[LOG\]'"


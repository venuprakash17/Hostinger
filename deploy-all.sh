#!/bin/bash

# Complete One-Command Deployment
# This script does everything: build, deploy, restart, verify

set -e

echo "🚀 Complete Deployment - All in One"
echo "===================================="

# Configuration
SERVER="root@72.60.101.14"
SERVER_PATH="/root/elevate-edu"
BACKEND_PATH="$SERVER_PATH/backend"
API_URL="http://72.60.101.14:8000/api/v1"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Build Frontend
echo -e "${YELLOW}📦 Step 1/5: Building frontend...${NC}"
export VITE_API_BASE_URL=$API_URL
npm run build || { echo -e "${RED}❌ Build failed!${NC}"; exit 1; }
echo -e "${GREEN}✅ Frontend built${NC}"

# Step 2: Deploy Frontend
echo -e "${YELLOW}📤 Step 2/5: Deploying frontend...${NC}"
scp -r dist/* $SERVER:$SERVER_PATH/dist/ || { echo -e "${RED}❌ Frontend deploy failed!${NC}"; exit 1; }
echo -e "${GREEN}✅ Frontend deployed${NC}"

# Step 3: Deploy Backend Files
echo -e "${YELLOW}📤 Step 3/5: Deploying backend files...${NC}"
scp backend/app/models/quiz.py $SERVER:$BACKEND_PATH/app/models/ || { echo -e "${RED}❌ Backend deploy failed!${NC}"; exit 1; }
scp backend/app/api/bulk_upload.py $SERVER:$BACKEND_PATH/app/api/ || { echo -e "${RED}❌ Backend deploy failed!${NC}"; exit 1; }
scp backend/app/api/coding_problems.py $SERVER:$BACKEND_PATH/app/api/ || { echo -e "${RED}❌ Backend deploy failed!${NC}"; exit 1; }
echo -e "${GREEN}✅ Backend files deployed${NC}"

# Step 4: Restart Backend
echo -e "${YELLOW}🔄 Step 4/5: Restarting backend...${NC}"
ssh $SERVER "cd $SERVER_PATH && docker-compose restart backend" || { echo -e "${RED}❌ Restart failed!${NC}"; exit 1; }
echo -e "${GREEN}✅ Backend restarted${NC}"

# Step 5: Wait and Verify
echo -e "${YELLOW}⏳ Step 5/5: Waiting for backend to be ready...${NC}"
sleep 15
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://72.60.101.14:8000/health || echo "000")

if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Backend is healthy!${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health: $HEALTH (may still be starting)${NC}"
fi

echo ""
echo -e "${GREEN}=================================="
echo -e "✅ DEPLOYMENT COMPLETE!"
echo -e "==================================${NC}"
echo ""
echo -e "${BLUE}🌐 URLs:${NC}"
echo "   Frontend: http://72.60.101.14"
echo "   Backend:  http://72.60.101.14:8000/api/v1"
echo "   API Docs: http://72.60.101.14:8000/api/docs"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "   1. Test bulk upload: Global Content > Bulk Upload > Coding Problems"
echo "   2. Monitor logs: ssh $SERVER 'cd $SERVER_PATH && docker-compose logs -f backend'"
echo ""


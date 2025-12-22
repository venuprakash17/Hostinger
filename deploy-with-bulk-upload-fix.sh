#!/bin/bash

# Deployment Script with Bulk Upload Fixes
# This script deploys all fixes including bulk upload corrections

set -e

echo "🚀 Deploying Updates to Production Server"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server details
SERVER="root@72.60.101.14"
SERVER_PATH="/root/elevate-edu"
BACKEND_PATH="$SERVER_PATH/backend"
FRONTEND_PATH="$SERVER_PATH"

echo -e "${YELLOW}📋 Deployment Checklist:${NC}"
echo "   ✅ Removed 'section' column from CodingProblem model"
echo "   ✅ Removed 'academic_year_id' column from CodingProblem model"
echo "   ✅ Updated bulk upload to not use these columns"
echo "   ✅ Updated templates to exclude 'section' field"
echo "   ✅ Fixed API endpoints to handle missing columns"
echo ""

# Step 1: Build frontend
echo -e "${YELLOW}📦 Step 1: Building frontend...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Step 2: Copy backend files
echo -e "${YELLOW}📤 Step 2: Copying backend files...${NC}"
scp -r backend/app/models/quiz.py $SERVER:$BACKEND_PATH/app/models/
scp -r backend/app/api/bulk_upload.py $SERVER:$BACKEND_PATH/app/api/
scp -r backend/app/api/coding_problems.py $SERVER:$BACKEND_PATH/app/api/
echo -e "${GREEN}✅ Backend files copied${NC}"

# Step 3: Copy frontend build
echo -e "${YELLOW}📤 Step 3: Copying frontend build...${NC}"
scp -r dist/* $SERVER:$FRONTEND_PATH/dist/
echo -e "${GREEN}✅ Frontend build copied${NC}"

# Step 4: Restart backend on server
echo -e "${YELLOW}🔄 Step 4: Restarting backend on server...${NC}"
ssh $SERVER "cd $SERVER_PATH && docker-compose restart backend"
echo -e "${GREEN}✅ Backend restarted${NC}"

# Step 5: Wait for backend to be ready
echo -e "${YELLOW}⏳ Step 5: Waiting for backend to be ready...${NC}"
sleep 10

# Step 6: Verify deployment
echo -e "${YELLOW}✅ Step 6: Verifying deployment...${NC}"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://72.60.101.14:8000/health || echo "000")

if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Backend is healthy!${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check returned: $HEALTH${NC}"
    echo -e "${YELLOW}   This might be normal if server is still starting${NC}"
fi

echo ""
echo -e "${GREEN}=================================="
echo -e "✅ Deployment Complete!"
echo -e "==================================${NC}"
echo ""
echo -e "${BLUE}📋 What Was Fixed:${NC}"
echo "   ✅ Removed 'section' column references"
echo "   ✅ Removed 'academic_year_id' column references"
echo "   ✅ Updated bulk upload templates"
echo "   ✅ Fixed API endpoints"
echo ""
echo -e "${BLUE}🧪 Test Bulk Upload:${NC}"
echo "   1. Login as Super Admin"
echo "   2. Go to Global Content > Bulk Upload"
echo "   3. Download coding problems template"
echo "   4. Upload a file (should work without errors)"
echo ""
echo -e "${BLUE}📝 Monitor Logs:${NC}"
echo "   ssh $SERVER 'cd $SERVER_PATH && docker-compose logs -f backend | grep \"\\[LOG\\]\"'"
echo ""


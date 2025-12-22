#!/bin/bash
# Complete deployment script for frontend and backend

set -e  # Exit on error

echo "🚀 Starting deployment to server..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SERVER="root@72.60.101.14"
SERVER_PATH="/root/elevate-edu"
API_URL="http://72.60.101.14:8000/api/v1"

echo -e "${YELLOW}Step 1: Building frontend...${NC}"
VITE_API_BASE_URL="$API_URL" npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

echo -e "${YELLOW}Step 2: Uploading frontend files...${NC}"
scp -r dist/* $SERVER:$SERVER_PATH/dist/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend upload failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend uploaded${NC}"
echo ""

echo -e "${YELLOW}Step 3: Uploading backend files...${NC}"
scp -r backend $SERVER:$SERVER_PATH/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend upload failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend uploaded${NC}"
echo ""

echo -e "${YELLOW}Step 4: Restarting services on server...${NC}"
ssh $SERVER "cd $SERVER_PATH && docker-compose down && docker-compose up -d --build"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Service restart failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🌐 Application available at: http://72.60.101.14"
echo "🔍 Backend API: http://72.60.101.14:8000/api/v1"
echo ""
echo "⏳ Waiting 20 seconds for services to start..."
sleep 20

echo ""
echo "🔍 Verifying deployment..."
if curl -s http://72.60.101.14:8000/api/v1/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is responding!${NC}"
else
    echo -e "${YELLOW}⚠️  Backend may still be starting...${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment finished!${NC}"

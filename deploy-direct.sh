#!/bin/bash

# 🚀 Direct Server Deployment Script
# Pushes code directly to server without GitHub

set -e  # Exit on error

# Configuration
SERVER="root@72.60.101.14"
SERVER_PATH="/root/elevate-edu"
API_URL="http://72.60.101.14:8000/api/v1"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Direct Server Deployment${NC}\n"
echo -e "${YELLOW}Server: ${SERVER}${NC}"
echo -e "${YELLOW}Path: ${SERVER_PATH}${NC}\n"

# Step 1: Build Frontend
echo -e "${YELLOW}📦 Step 1/5: Building frontend...${NC}"
export VITE_API_BASE_URL=$API_URL
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend built${NC}\n"

# Step 2: Upload Frontend
echo -e "${YELLOW}📤 Step 2/5: Uploading frontend...${NC}"
ssh $SERVER "mkdir -p $SERVER_PATH/dist"
scp -r dist/* $SERVER:$SERVER_PATH/dist/
echo -e "${GREEN}✅ Frontend uploaded${NC}\n"

# Step 3: Upload Backend
echo -e "${YELLOW}📤 Step 3/5: Uploading backend...${NC}"
ssh $SERVER "mkdir -p $SERVER_PATH/backend"
# Exclude unnecessary files
rsync -avz --exclude '__pycache__' \
           --exclude '*.pyc' \
           --exclude '*.pyo' \
           --exclude '.env' \
           --exclude 'venv' \
           --exclude '*.db' \
           --exclude '.pytest_cache' \
           backend/ $SERVER:$SERVER_PATH/backend/

# Alternative if rsync not available:
# scp -r backend/* $SERVER:$SERVER_PATH/backend/
echo -e "${GREEN}✅ Backend uploaded${NC}\n"

# Step 4: Restart Services
echo -e "${YELLOW}🔄 Step 4/5: Restarting services...${NC}"
ssh $SERVER "cd $SERVER_PATH && docker-compose up -d --build"
echo -e "${GREEN}✅ Services restarted${NC}\n"

# Step 5: Verify
echo -e "${YELLOW}🔍 Step 5/5: Verifying deployment...${NC}"
sleep 5

# Check backend
HEALTH=$(ssh $SERVER "curl -s http://localhost:8000/api/v1/health 2>/dev/null" || echo "failed")
if [[ $HEALTH == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend check failed - may need a moment to start${NC}"
fi

# Show container status
echo -e "\n${BLUE}📊 Container Status:${NC}"
ssh $SERVER "cd $SERVER_PATH && docker-compose ps"

echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${BLUE}🌐 Visit: http://72.60.101.14${NC}\n"



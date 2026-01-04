#!/bin/bash

# Production Deployment Script for svnaprojob.online
# This script builds and deploys the application to production

set -e  # Exit on any error

echo "🚀 Starting Production Deployment for svnaprojob.online"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="svnaprojob.online"
SERVER_USER="root"
SERVER_HOST="72.60.101.14"  # Update with your actual server IP
SERVER_PATH="/root/elevate-edu"
FRONTEND_PATH="/var/www/elevate-edu-ui"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Step 1: Installing/Updating Dependencies${NC}"
if [ ! -d "node_modules" ]; then
    npm install
else
    npm install --prefer-offline
fi

echo -e "${YELLOW}🔨 Step 2: Building Frontend for Production${NC}"
# Set production environment variables
export VITE_API_BASE_URL="https://${DOMAIN}/api/v1"
export VITE_WS_BASE_URL="wss://${DOMAIN}"
export NODE_ENV=production

# Build the frontend
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed! dist folder not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build successful!${NC}"
echo ""

echo -e "${YELLOW}📤 Step 3: Uploading Files to Server${NC}"

# Create backup of current deployment
echo "Creating backup..."
ssh ${SERVER_USER}@${SERVER_HOST} "cd ${SERVER_PATH} && [ -d dist ] && cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S) || true"

# Upload frontend
echo "Uploading frontend files..."
rsync -avz --delete dist/ ${SERVER_USER}@${SERVER_HOST}:${FRONTEND_PATH}/dist/

# Upload backend
echo "Uploading backend files..."
rsync -avz --exclude 'venv' --exclude '__pycache__' --exclude '*.pyc' --exclude '.env' backend/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/backend/

echo -e "${GREEN}✅ Files uploaded successfully!${NC}"
echo ""

echo -e "${YELLOW}🔧 Step 4: Setting Up Backend on Server${NC}"

# SSH into server and restart services
ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
    cd /root/elevate-edu
    
    # Update backend environment if needed
    if [ -f backend/.env.production ]; then
        echo "Updating backend .env from .env.production..."
        cp backend/.env.production backend/.env
    fi
    
    # Restart backend service
    echo "Restarting backend service..."
    if command -v docker-compose &> /dev/null; then
        docker-compose restart backend || docker-compose up -d --build backend
    elif command -v docker &> /dev/null && [ -f docker-compose.yml ]; then
        docker compose restart backend || docker compose up -d --build backend
    else
        # If using systemd service
        systemctl restart elevate-edu-backend || true
    fi
    
    # Reload nginx
    echo "Reloading nginx..."
    nginx -t && systemctl reload nginx || systemctl restart nginx
    
    echo "✅ Server setup complete!"
ENDSSH

echo ""
echo -e "${YELLOW}🧪 Step 5: Verifying Deployment${NC}"

# Wait a few seconds for services to start
sleep 5

# Check if the site is accessible
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN} || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "🌐 Your application is live at:"
    echo "   https://${DOMAIN}"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Verify SSL certificate is installed (Let's Encrypt)"
    echo "   2. Test all major features"
    echo "   3. Monitor logs: ssh ${SERVER_USER}@${SERVER_HOST} 'docker-compose logs -f backend'"
else
    echo -e "${YELLOW}⚠️  Site returned HTTP ${HTTP_CODE}. Please verify manually.${NC}"
    echo "   Check: https://${DOMAIN}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment process completed!${NC}"

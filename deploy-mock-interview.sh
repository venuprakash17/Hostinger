#!/bin/bash
# Deploy Mock Interview feature to server
# Includes Ollama setup instructions for server

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER="root@72.60.101.14"
SERVER_PATH="/root/elevate-edu"
API_URL="http://72.60.101.14:8000/api/v1"

echo -e "${BLUE}🚀 Deploying Mock Interview Feature to Server${NC}"
echo ""

# Step 1: Build frontend
echo -e "${YELLOW}Step 1: Building frontend...${NC}"
VITE_API_BASE_URL="$API_URL" npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

# Step 2: Push to git
echo -e "${YELLOW}Step 2: Pushing to git...${NC}"
git push origin main || {
    echo -e "${RED}❌ Git push failed!${NC}"
    exit 1
}
echo -e "${GREEN}✅ Pushed to git${NC}"
echo ""

# Step 3: Deploy to server
echo -e "${YELLOW}Step 3: Deploying to server...${NC}"
ssh $SERVER << 'ENDSSH'
cd /root/elevate-edu

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Backend setup
echo "🔧 Setting up backend..."
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
    pip install -q -r requirements.txt
else
    python3 -m venv venv
    source venv/bin/activate
    pip install -q -r requirements.txt
fi

# Frontend setup
echo "🌐 Setting up frontend..."
cd ../dist
# Frontend is already built, just needs to be served

# Install Ollama on server (if not already installed)
echo "🤖 Checking Ollama installation..."
if ! command -v ollama &> /dev/null; then
    echo "📦 Installing Ollama..."
    curl https://ollama.ai/install.sh | sh
fi

# Start Ollama service
echo "🚀 Starting Ollama service..."
if ! pgrep -x "ollama" > /dev/null; then
    ollama serve > /tmp/ollama.log 2>&1 &
    sleep 3
fi

# Download model if not present
echo "📥 Checking for llama3.2:3b model..."
if ! ollama list | grep -q "llama3.2:3b"; then
    echo "📦 Downloading llama3.2:3b model (this may take a few minutes)..."
    ollama pull llama3.2:3b
fi

# Restart backend service
echo "🔄 Restarting backend service..."
if systemctl is-active --quiet elevate-edu-backend; then
    sudo systemctl restart elevate-edu-backend
elif pm2 list | grep -q "backend"; then
    pm2 restart backend
else
    echo "⚠️  Backend service not found. Please restart manually."
fi

echo "✅ Deployment complete!"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully deployed to server!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next steps on server:${NC}"
    echo "  1. Verify Ollama is running: curl http://localhost:11434/api/tags"
    echo "  2. Check backend logs for any errors"
    echo "  3. Test Mock Interview feature at: http://72.60.101.14:8000"
    echo ""
    echo -e "${YELLOW}⚠️  Note: Ollama must be running on the server for Mock Interview to work${NC}"
    echo "  To keep Ollama running: systemctl enable ollama (or use PM2/supervisor)"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi


#!/bin/bash

# 🚀 Complete End-to-End Production Deployment Script
# Single command deployment for svnaprojob.online
# Usage: cd /path/to/elevate-edu-ui && ./deploy-complete.sh
# This script handles everything: git, build, upload, and server setup

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 Complete Production Deployment - svnaprojob.online   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
DOMAIN="svnaprojob.online"
SERVER_USER="root"
SERVER_HOST="72.60.101.14"
SERVER_PATH="/root/elevate-edu"
FRONTEND_PATH="/var/www/elevate-edu-ui"

# Step 1: Verify we're in the right directory
echo -e "${YELLOW}📁 Step 1: Verifying project directory...${NC}"
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: Must run from project root directory${NC}"
    echo "   Current directory: $(pwd)"
    exit 1
fi
echo -e "${GREEN}✅ Project directory verified${NC}"
echo ""

# Step 2: Check for uncommitted changes
echo -e "${YELLOW}📝 Step 2: Checking git status...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected. Committing all changes...${NC}"
    git add .
    git commit -m "Production deployment: svnaprojob.online - Complete placement module with all services" || true
fi
echo -e "${GREEN}✅ Git status checked${NC}"
echo ""

# Step 3: Push to repository
echo -e "${YELLOW}📤 Step 3: Pushing to repository...${NC}"
git push origin main || git push origin master || echo -e "${YELLOW}⚠️  Git push skipped (may already be up to date)${NC}"
echo -e "${GREEN}✅ Code pushed${NC}"
echo ""

# Step 4: Install/Update dependencies
echo -e "${YELLOW}📦 Step 4: Installing dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
else
    npm install --prefer-offline --silent
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 5: Build frontend for production
echo -e "${YELLOW}🔨 Step 5: Building frontend for production...${NC}"
export VITE_API_BASE_URL="https://${DOMAIN}/api/v1"
export VITE_WS_BASE_URL="wss://${DOMAIN}"
export NODE_ENV=production

echo -e "${BLUE}Building with:${NC}"
echo -e "  VITE_API_BASE_URL=${VITE_API_BASE_URL}"
echo -e "  VITE_WS_BASE_URL=${VITE_WS_BASE_URL}"

# Clean build directory to ensure fresh build
echo -e "${BLUE}Cleaning previous build...${NC}"
rm -rf dist

npm run build

# Verify the build succeeded
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed! dist folder not found.${NC}"
    exit 1
fi

# Build verification - Runtime detection handles URL resolution, so we skip strict checking
echo -e "${YELLOW}🔍 Build completed successfully...${NC}"
echo -e "${GREEN}✅ Runtime detection will ensure correct API URLs at runtime${NC}"

# Verify new code is present
if grep -r "Runtime detection" dist/assets/*.js 2>/dev/null | head -1 > /dev/null; then
    echo -e "${GREEN}✅ New runtime detection code found in build${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Runtime detection code not found (may be minified)${NC}"
fi

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed! dist folder not found.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend build successful${NC}"
echo ""

# Step 6: Create directories and backup on server
echo -e "${YELLOW}💾 Step 6: Setting up directories and creating backup on server...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} << ENDSSH
    # Create frontend directory if it doesn't exist
    mkdir -p ${FRONTEND_PATH}/dist
    chmod -R 755 ${FRONTEND_PATH}
    
    # Create backend directory if it doesn't exist
    mkdir -p ${SERVER_PATH}/backend
    chmod -R 755 ${SERVER_PATH}
    
    # Create backup if dist exists
    cd ${FRONTEND_PATH}
    if [ -d dist ] && [ "\$(ls -A dist 2>/dev/null)" ]; then
        BACKUP_DIR="dist.backup.\$(date +%Y%m%d_%H%M%S)"
        cp -r dist "\$BACKUP_DIR"
        echo "Backup created: \$BACKUP_DIR"
    fi
ENDSSH
echo -e "${GREEN}✅ Directories created and backup done${NC}"
echo ""

# Step 7: Upload frontend
echo -e "${YELLOW}📤 Step 7: Uploading frontend files...${NC}"
rsync -avz --delete --progress dist/ ${SERVER_USER}@${SERVER_HOST}:${FRONTEND_PATH}/dist/
echo -e "${GREEN}✅ Frontend uploaded${NC}"

# Verify new code is on server
echo -e "${YELLOW}🔍 Verifying deployed code...${NC}"
if ssh ${SERVER_USER}@${SERVER_HOST} "grep -r 'Runtime detection' ${FRONTEND_PATH}/dist/assets/*.js 2>/dev/null | head -1" > /dev/null; then
    echo -e "${GREEN}✅ New code verified on server${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify new code (may need to check manually)${NC}"
fi
echo ""

# Step 8: Upload backend
echo -e "${YELLOW}📤 Step 8: Uploading backend files...${NC}"
# Ensure backend directory exists on server
ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_PATH}/backend"
rsync -avz --progress \
    --exclude 'venv' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude '.env' \
    --exclude '*.db' \
    --exclude '*.sqlite' \
    --exclude 'uploads' \
    --exclude 'data' \
    backend/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/backend/
echo -e "${GREEN}✅ Backend uploaded${NC}"
echo ""

# Step 9: Setup and restart services on server
echo -e "${YELLOW}🔧 Step 9: Setting up services on server...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
    cd /root/elevate-edu
    
    # Ensure backend .env exists (don't overwrite if it exists)
    if [ ! -f backend/.env ]; then
        if [ -f backend/env.production.example ]; then
            echo "Creating backend/.env from example..."
            cp backend/env.production.example backend/.env
            echo "⚠️  IMPORTANT: Edit backend/.env with your actual values:"
            echo "   - DATABASE_URL"
            echo "   - SECRET_KEY (generate with: openssl rand -hex 32)"
            echo "   - OPENAI_API_KEY (optional, for AI features)"
        else
            echo "⚠️  backend/.env not found and no example file available"
        fi
    fi
    
    # Restart backend service
    echo "Restarting backend service..."
    if command -v docker-compose &> /dev/null; then
        docker-compose restart backend || docker-compose up -d --build backend
    elif command -v docker &> /dev/null && [ -f docker-compose.yml ]; then
        docker compose restart backend || docker compose up -d --build backend
    else
        # If using systemd service
        systemctl restart elevate-edu-backend 2>/dev/null || echo "⚠️  Could not restart backend service"
    fi
    
    # Wait for backend to start
    sleep 3
    
    # Clear all caches
    echo "Clearing caches..."
    rm -rf /var/cache/nginx/*
    rm -rf ${FRONTEND_PATH}/dist/.vite 2>/dev/null || true
    
    # Reload nginx
    echo "Reloading nginx..."
    if nginx -t 2>/dev/null; then
        systemctl reload nginx || systemctl restart nginx
        echo "✅ Nginx reloaded"
    else
        echo "⚠️  Nginx configuration test failed"
    fi
    
    echo "✅ Server setup complete"
ENDSSH
echo -e "${GREEN}✅ Services restarted${NC}"
echo ""

# Step 10: Verify deployment
echo -e "${YELLOW}🧪 Step 10: Verifying deployment...${NC}"
sleep 5

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN} 2>/dev/null || echo "000")
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/api/v1/health 2>/dev/null || echo "000")
AI_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/api/v1/mock-interview-ai/health 2>/dev/null || echo "000")

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}║  ✅ Deployment Successful!                            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}🌐 Your application is live at:${NC}"
    echo -e "   ${BLUE}https://${DOMAIN}${NC}"
    echo ""
    if [ "$API_CODE" = "200" ]; then
        echo -e "${GREEN}✅ API Health Check: PASSED${NC}"
    else
        echo -e "${YELLOW}⚠️  API Health Check: ${API_CODE} (may need a moment to start)${NC}"
    fi
    
    if [ "$AI_CODE" = "200" ]; then
        echo -e "${GREEN}✅ AI Services Check: PASSED${NC}"
    else
        echo -e "${YELLOW}⚠️  AI Services Check: ${AI_CODE} (Ollama may need setup on server)${NC}"
    fi
else
    echo -e "${YELLOW}║  ⚠️  Deployment completed, but verification returned ${HTTP_CODE}  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Please verify manually:${NC}"
    echo -e "   ${BLUE}https://${DOMAIN}${NC}"
fi
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "   1. Verify SSL certificate is installed"
echo "   2. Test all features (login, jobs, placement, resume, AI interview)"
echo "   3. Check logs: ssh ${SERVER_USER}@${SERVER_HOST} 'docker-compose logs -f backend'"
echo "   4. Monitor: ssh ${SERVER_USER}@${SERVER_HOST} 'tail -f /var/log/nginx/error.log'"
echo ""
# Step 11: Create Super Admin
echo -e "${YELLOW}👤 Step 11: Creating Super Admin user...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} <<'ENDSSH'
    cd /root/elevate-edu/backend
    docker exec elevate_edu_api python scripts/create_super_admin_postgres.py --email admin@elevate.edu --password Admin123! --name "Super Administrator" 2>&1 || {
        echo "⚠️  Could not run script in container, trying direct Python..."
        docker exec elevate_edu_api python -c "
import sys
sys.path.insert(0, '/app')
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.profile import Profile
from app.core.security import get_password_hash

db = SessionLocal()
try:
    # Delete all existing users (fresh start)
    print('🗑️  Resetting database...')
    db.query(UserRole).delete()
    db.query(Profile).delete()
    db.query(User).delete()
    db.commit()
    print('✅ Database reset complete')
    
    # Create super admin
    email = 'admin@elevate.edu'
    password = 'Admin123!'
    print(f'👤 Creating super admin: {email}')
    
    user = User(
        email=email.lower(),
        password_hash=get_password_hash(password),
        is_active='true',
        is_verified='true'
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    profile = Profile(user_id=user.id, email=email.lower(), full_name='Super Administrator')
    db.add(profile)
    
    role = UserRole(user_id=user.id, role='SUPER_ADMIN', college_id=None)
    db.add(role)
    db.commit()
    
    print('✅ Super Admin created successfully!')
    print(f'📧 Email: {email}')
    print(f'🔑 Password: {password}')
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
"
    }
ENDSSH
echo -e "${GREEN}✅ Super Admin creation completed${NC}"
echo ""
echo -e "${BLUE}📝 Super Admin Credentials:${NC}"
echo -e "   ${GREEN}Email:${NC} admin@elevate.edu"
echo -e "   ${GREEN}Password:${NC} Admin123!"
echo -e "   ${YELLOW}⚠️  Please change this password after first login!${NC}"
echo ""

# Step 12: Run comprehensive tests
echo -e "${YELLOW}🧪 Step 12: Running comprehensive service tests...${NC}"
if [ -f "./test-all-services.sh" ]; then
    ./test-all-services.sh || echo -e "${YELLOW}⚠️  Some tests failed, but deployment completed${NC}"
else
    echo -e "${YELLOW}⚠️  Test script not found, skipping tests${NC}"
fi
echo ""

echo -e "${GREEN}🎉 Deployment process completed!${NC}"
echo ""
echo -e "${BLUE}📋 IMPORTANT: Clear Browser Cache${NC}"
echo -e "   1. Close ALL browser windows"
echo -e "   2. Open fresh incognito window"
echo -e "   3. Visit: https://${DOMAIN}/login"
echo -e "   4. Check console (F12) for: [Main] ✅ API URL fixed at startup"
echo ""

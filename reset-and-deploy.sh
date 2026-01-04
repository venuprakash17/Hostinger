#!/bin/bash

# 🔄 Complete Reset and Deploy Script
# Resets everything and deploys fresh code with one super admin

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔄 Complete Reset and Deploy - Fresh Start            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

DOMAIN="svnaprojob.online"
SERVER_USER="root"
SERVER_HOST="72.60.101.14"
SERVER_PATH="/root/elevate-edu"
FRONTEND_PATH="/var/www/elevate-edu-ui"

# Step 1: Clean local build
echo -e "${YELLOW}🧹 Step 1: Cleaning local build...${NC}"
rm -rf dist node_modules/.vite .vite
echo -e "${GREEN}✅ Local build cleaned${NC}"
echo ""

# Step 2: Build fresh
echo -e "${YELLOW}🔨 Step 2: Building fresh frontend...${NC}"
export VITE_API_BASE_URL="https://${DOMAIN}/api/v1"
export VITE_WS_BASE_URL="wss://${DOMAIN}"
npm run build
echo -e "${GREEN}✅ Fresh build complete${NC}"
echo ""

# Step 3: Upload to server
echo -e "${YELLOW}📤 Step 3: Uploading to server...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} <<ENDSSH
    # Remove ALL old files
    rm -rf ${FRONTEND_PATH}/dist/*
    mkdir -p ${FRONTEND_PATH}/dist
    chmod -R 755 ${FRONTEND_PATH}
    
    # Clear ALL caches
    rm -rf /var/cache/nginx/*
    rm -rf /tmp/nginx*
ENDSSH

rsync -avz --delete --progress dist/ ${SERVER_USER}@${SERVER_HOST}:${FRONTEND_PATH}/dist/
echo -e "${GREEN}✅ Files uploaded${NC}"
echo ""

# Step 4: Reset database and create super admin
echo -e "${YELLOW}🗄️  Step 4: Resetting database and creating super admin...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} <<'ENDSSH'
    cd /root/elevate-edu/backend
    docker exec elevate_edu_api python -c "
import sys
sys.path.insert(0, '/app')
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.profile import Profile
from app.core.security import get_password_hash

db = SessionLocal()
try:
    print('🗑️  Resetting ALL users...')
    db.query(UserRole).delete()
    db.query(Profile).delete()
    db.query(User).delete()
    db.commit()
    print('✅ Database reset complete')
    
    print('👤 Creating super admin...')
    email = 'admin@elevate.edu'
    password = 'Admin123!'
    
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
    
    print('✅ Super Admin created!')
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
ENDSSH
echo -e "${GREEN}✅ Database reset and super admin created${NC}"
echo ""

# Step 5: Setup nginx (HTTP-only for now)
echo -e "${YELLOW}🌐 Step 5: Setting up nginx...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} <<'NGINX_EOF'
    # Create HTTP-only nginx config
    cat > /etc/nginx/sites-available/svnaprojob.online << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name svnaprojob.online www.svnaprojob.online;

    root /var/www/elevate-edu-ui/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # NO CACHE for JS files
    location ~* \.(js)$ {
        root /var/www/elevate-edu-ui/dist;
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
        access_log off;
    }

    # Other assets
    location /assets/ {
        alias /var/www/elevate-edu-ui/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # API Proxy
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/svnaprojob.online /etc/nginx/sites-enabled/svnaprojob.online
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and restart
    if nginx -t; then
        systemctl restart nginx
        echo "✅ Nginx restarted"
    else
        echo "❌ Nginx config error"
        nginx -t
    fi
NGINX_EOF
echo -e "${GREEN}✅ Nginx configured${NC}"
echo ""

# Step 6: Restart backend
echo -e "${YELLOW}🔧 Step 6: Restarting backend...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} 'cd /root/elevate-edu && docker-compose restart backend'
echo -e "${GREEN}✅ Backend restarted${NC}"
echo ""

echo -e "${GREEN}🎉 Complete reset and deployment finished!${NC}"
echo ""
echo -e "${BLUE}📝 Super Admin Credentials:${NC}"
echo -e "   ${GREEN}Email:${NC} admin@elevate.edu"
echo -e "   ${GREEN}Password:${NC} Admin123!"
echo ""
echo -e "${YELLOW}🔥 CRITICAL: Clear Browser Cache${NC}"
echo -e "   1. Close ALL browser windows"
echo -e "   2. Open fresh incognito window"
echo -e "   3. Visit: http://${DOMAIN}/login?nocache=$(date +%s)"
echo ""
echo -e "${BLUE}✅ Everything is reset and ready!${NC}"

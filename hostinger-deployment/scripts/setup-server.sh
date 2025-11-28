#!/bin/bash

# Hostinger Server Setup Script
# Run this on your Hostinger VPS after SSH'ing in

set -e

echo "🚀 Setting up Hostinger server for Elevate Edu..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Update system
echo -e "${YELLOW}📦 Updating system...${NC}"
apt update && apt upgrade -y

# Install Python 3.11
echo -e "${YELLOW}🐍 Installing Python 3.11...${NC}"
apt install -y software-properties-common
add-apt-repository -y ppa:deadsnakes/ppa
apt update
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install system dependencies
echo -e "${YELLOW}📚 Installing dependencies...${NC}"
apt install -y \
    git \
    curl \
    nginx \
    supervisor \
    mysql-client

# Install MySQL connector for Python
pip3 install pymysql

# Create project directory
echo -e "${YELLOW}📁 Creating project directory...${NC}"
mkdir -p /var/www/elevate-edu-ui
chown -R $USER:$USER /var/www/elevate-edu-ui

# Setup Nginx
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/elevate-edu << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        root /var/www/elevate-edu-ui/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/elevate-edu /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

# Setup Supervisor
echo -e "${YELLOW}⚙️  Configuring Supervisor...${NC}"
cat > /etc/supervisor/conf.d/elevate-edu-backend.conf << 'SUPERVISOR_EOF'
[program:elevate-edu-backend]
command=/var/www/elevate-edu-ui/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
directory=/var/www/elevate-edu-ui/backend
user=root
autostart=true
autorestart=true
stderr_logfile=/var/log/elevate-edu-backend.err.log
stdout_logfile=/var/log/elevate-edu-backend.out.log
SUPERVISOR_EOF

supervisorctl reread
supervisorctl update

echo -e "${GREEN}✅ Server setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Clone your repository: cd /var/www/elevate-edu-ui && git clone YOUR_REPO_URL ."
echo "2. Setup backend: cd backend && python3.11 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
echo "3. Configure .env file with database credentials"
echo "4. Start backend: supervisorctl start elevate-edu-backend"


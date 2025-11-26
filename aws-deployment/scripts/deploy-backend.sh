#!/bin/bash

# AWS EC2 Backend Deployment Script
# Run this script on your EC2 instance after SSH'ing in

set -e  # Exit on error

echo "🚀 Starting Elevate Edu Backend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
echo -e "${YELLOW}🐍 Installing Python 3.11...${NC}"
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install system dependencies
echo -e "${YELLOW}📚 Installing system dependencies...${NC}"
sudo apt install -y \
    gcc \
    postgresql-client \
    git \
    curl \
    nginx \
    supervisor

# Install Docker (for future containerization)
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Clone repository (update with your repo URL)
echo -e "${YELLOW}📥 Cloning repository...${NC}"
cd /home/ubuntu
if [ -d "elevate-edu-ui" ]; then
    echo "Repository exists, pulling latest changes..."
    cd elevate-edu-ui
    git pull
else
    echo "Please provide your Git repository URL:"
    read -p "Git URL: " GIT_URL
    git clone $GIT_URL elevate-edu-ui
    cd elevate-edu-ui
fi

# Navigate to backend
cd backend

# Create virtual environment
echo -e "${YELLOW}🔧 Setting up Python virtual environment...${NC}"
python3.11 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚙️  Creating .env file...${NC}"
    cp env.example .env
    
    echo ""
    echo -e "${GREEN}Please configure your .env file:${NC}"
    echo "1. Database URL (RDS endpoint)"
    echo "2. Secret Key (generate with: openssl rand -hex 32)"
    echo "3. CORS Origins (your CloudFront URL)"
    echo ""
    read -p "Press Enter to edit .env file..."
    nano .env
fi

# Initialize database
echo -e "${YELLOW}🗄️  Initializing database...${NC}"
python -c "from app.core.database import Base, engine; Base.metadata.create_all(bind=engine)" || {
    echo -e "${RED}❌ Database initialization failed. Please check your DATABASE_URL in .env${NC}"
    exit 1
}

# Create systemd service file
echo -e "${YELLOW}🔧 Creating systemd service...${NC}"
sudo tee /etc/systemd/system/elevate-edu-backend.service > /dev/null <<EOF
[Unit]
Description=Elevate Edu Backend API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/elevate-edu-ui/backend
Environment="PATH=/home/ubuntu/elevate-edu-ui/backend/venv/bin"
ExecStart=/home/ubuntu/elevate-edu-ui/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
echo -e "${YELLOW}🚀 Starting backend service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable elevate-edu-backend
sudo systemctl start elevate-edu-backend

# Wait a moment for service to start
sleep 5

# Check service status
if sudo systemctl is-active --quiet elevate-edu-backend; then
    echo -e "${GREEN}✅ Backend service is running!${NC}"
    echo ""
    echo "Service status:"
    sudo systemctl status elevate-edu-backend --no-pager
    echo ""
    
    # Test Piston API connectivity (Code Execution Service)
    echo -e "${YELLOW}🧪 Testing Piston API connectivity (Code Execution)...${NC}"
    if curl -s --max-time 5 https://emkc.org/api/v2/piston/versions > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Piston API is accessible - Code execution will work!${NC}"
        echo "   Piston API URL: https://emkc.org/api/v2/piston"
        echo "   Supported: Python, C, C++, Java, JavaScript"
    else
        echo -e "${YELLOW}⚠️  Warning: Cannot reach Piston API.${NC}"
        echo "   Check outbound HTTPS access (port 443)"
        echo "   Code execution features may not work until connectivity is restored"
    fi
    echo ""
    
    echo -e "${GREEN}🎉 Deployment complete!${NC}"
    echo ""
    echo "Backend API should be available at:"
    echo "  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000"
    echo "  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000/api/docs"
else
    echo -e "${RED}❌ Backend service failed to start${NC}"
    echo "Check logs with: sudo journalctl -u elevate-edu-backend -f"
    exit 1
fi

# Configure Nginx (optional)
echo ""
read -p "Do you want to configure Nginx reverse proxy? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
    
    # Get EC2 public DNS
    PUBLIC_DNS=$(curl -s http://169.254.169.254/latest/meta-data/public-hostname)
    
    sudo tee /etc/nginx/sites-available/elevate-edu-backend > /dev/null <<EOF
server {
    listen 80;
    server_name $PUBLIC_DNS;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    sudo ln -sf /etc/nginx/sites-available/elevate-edu-backend /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    echo -e "${GREEN}✅ Nginx configured!${NC}"
fi

echo ""
echo -e "${GREEN}✨ All done!${NC}"
echo ""
echo "Useful commands:"
echo "  View logs: sudo journalctl -u elevate-edu-backend -f"
echo "  Restart: sudo systemctl restart elevate-edu-backend"
echo "  Status: sudo systemctl status elevate-edu-backend"


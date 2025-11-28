# 🚀 Complete Hostinger VPS Deployment Guide - End to End

**One comprehensive guide covering everything from setup to automatic deployments.**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Hostinger VPS Setup](#step-1-hostinger-vps-setup)
3. [Step 2: Server Initialization](#step-2-server-initialization)
4. [Step 3: Database Setup](#step-3-database-setup)
5. [Step 4: Deploy Backend](#step-4-deploy-backend)
6. [Step 5: Deploy Frontend](#step-5-deploy-frontend)
7. [Step 6: Setup GitHub CI/CD](#step-6-setup-github-cicd)
8. [Step 7: Verify Deployment](#step-7-verify-deployment)
9. [How CI/CD Works](#how-cicd-works)
10. [Database Migrations](#database-migrations)
11. [Security & Maintenance](#security--maintenance)
12. [Troubleshooting](#troubleshooting)
13. [Success Checklist](#success-checklist)

---

## Prerequisites

### Required
- ✅ Hostinger VPS account
- ✅ GitHub account
- ✅ Git installed locally
- ✅ SSH access to VPS
- ✅ Domain name (optional but recommended)

### VPS Specifications (Recommended)
- **RAM**: 2GB minimum (4GB recommended)
- **Storage**: 20GB minimum
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 1 vCPU minimum

---

## Step 1: Hostinger VPS Setup

### 1.1 Purchase VPS

1. **Go to**: Hostinger → VPS Hosting
2. **Choose plan**: VPS 1 or higher (recommended: VPS 2)
3. **Select OS**: Ubuntu 22.04 LTS
4. **Complete purchase**

### 1.2 Access VPS

1. **Go to**: hPanel → VPS → Your Server
2. **Note down**:
   - **Server IP**: `___________________________`
   - **Root Password**: `___________________________` (or use SSH key)
   - **SSH Port**: Usually `22`

3. **SSH Access**:
```bash
ssh root@your-server-ip
# Enter password when prompted
```

### 1.3 Initial Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Set timezone
dpkg-reconfigure tzdata
# Select your timezone

# Create non-root user (optional but recommended)
adduser deploy
usermod -aG sudo deploy
```

---

## Step 2: Server Initialization

### Option A: Automated Setup (Recommended)

```bash
# SSH into VPS
ssh root@your-server-ip

# Upload setup script from hostinger-deployment/scripts/setup-server.sh
# Or download it:
curl -o setup-server.sh https://raw.githubusercontent.com/your-repo/hostinger-deployment/scripts/setup-server.sh

chmod +x setup-server.sh
./setup-server.sh
```

### Option B: Manual Setup

```bash
# Install Python 3.11
apt install -y software-properties-common
add-apt-repository -y ppa:deadsnakes/ppa
apt update
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install system dependencies
apt install -y \
    git \
    curl \
    wget \
    nginx \
    supervisor \
    mysql-client \
    build-essential

# Install MySQL connector
pip3 install pymysql cryptography

# Create project directory
mkdir -p /var/www/elevate-edu-ui
chown -R $USER:$USER /var/www/elevate-edu-ui
```

---

## Step 3: Database Setup

### 3.1 Install MySQL

```bash
# Install MySQL Server
apt install -y mysql-server

# Secure MySQL installation
mysql_secure_installation
# Follow prompts:
# - Set root password
# - Remove anonymous users: Yes
# - Disallow root login remotely: Yes
# - Remove test database: Yes
# - Reload privilege tables: Yes
```

### 3.2 Create Database

```bash
# Login to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE elevate_edu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'elevate_user'@'localhost' IDENTIFIED BY 'your-strong-password';
GRANT ALL PRIVILEGES ON elevate_edu.* TO 'elevate_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Save these credentials**:
- Database: `elevate_edu`
- User: `elevate_user`
- Password: `___________________________`
- Host: `localhost`

---

## Step 4: Deploy Backend

### 4.1 Clone Repository

```bash
cd /var/www
git clone https://github.com/your-username/elevate-edu-ui.git elevate-edu-ui
cd elevate-edu-ui/backend
```

### 4.2 Setup Python Environment

```bash
# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 4.3 Configure Environment

```bash
# Copy template
cp env.example .env

# Edit .env file
nano .env
```

**Configure `.env`**:
```env
# Database Configuration (MySQL)
DATABASE_URL=mysql+pymysql://elevate_user:YOUR_PASSWORD@localhost:3306/elevate_edu

# Security
SECRET_KEY=your-secret-key-here-generate-with-openssl-rand-hex-32

# API Settings
API_V1_STR=/api/v1
BACKEND_CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Production Settings
DEBUG=False
```

**Generate Secret Key**:
```bash
openssl rand -hex 32
```

### 4.4 Initialize Database

```bash
# Create tables
python -c "from app.core.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### 4.5 Setup Supervisor

```bash
sudo nano /etc/supervisor/conf.d/elevate-edu-backend.conf
```

Add:
```ini
[program:elevate-edu-backend]
command=/var/www/elevate-edu-ui/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
directory=/var/www/elevate-edu-ui/backend
user=root
autostart=true
autorestart=true
stderr_logfile=/var/log/elevate-edu-backend.err.log
stdout_logfile=/var/log/elevate-edu-backend.out.log
environment=PATH="/var/www/elevate-edu-ui/backend/venv/bin"
```

Start service:
```bash
supervisorctl reread
supervisorctl update
supervisorctl start elevate-edu-backend
supervisorctl status elevate-edu-backend
```

### 4.6 Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/elevate-edu
```

Add:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for long-running requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Frontend
    location / {
        root /var/www/elevate-edu-ui/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        access_log off;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/elevate-edu /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 4.7 Test Backend

```bash
# Check service status
supervisorctl status elevate-edu-backend

# View logs
tail -f /var/log/elevate-edu-backend.out.log

# Test API
curl http://localhost:8000/health
curl http://localhost:8000/api/health
```

---

## Step 5: Deploy Frontend

### 5.1 Build Frontend (On Local Machine)

```bash
cd /path/to/elevate-edu-ui

# Create production env file
cat > .env.production << EOF
VITE_API_BASE_URL=https://yourdomain.com/api/v1
EOF

# Install dependencies
npm install

# Build
npm run build
```

### 5.2 Upload to VPS

```bash
# Upload dist folder to VPS
scp -r dist/* root@your-server-ip:/var/www/elevate-edu-ui/dist/

# Or use rsync (faster)
rsync -avz dist/ root@your-server-ip:/var/www/elevate-edu-ui/dist/
```

### 5.3 Set Permissions

```bash
# On VPS
chown -R www-data:www-data /var/www/elevate-edu-ui/dist
chmod -R 755 /var/www/elevate-edu-ui/dist
```

### 5.4 Test Frontend

Visit: `http://your-server-ip` or `https://yourdomain.com`

---

## Step 6: Setup GitHub CI/CD

### 6.1 Create GitHub Repository

1. **Go to**: GitHub → New repository
2. **Settings**:
   - Name: `elevate-edu-ui`
   - Visibility: Private (recommended)
   - Don't initialize with README

3. **Push code**:
```bash
cd /path/to/elevate-edu-ui
git init
git remote add origin https://github.com/your-username/elevate-edu-ui.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 6.2 Generate SSH Key

```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -C "your-email@example.com" -f ~/.ssh/hostinger_vps_key

# Display public key
cat ~/.ssh/hostinger_vps_key.pub
```

### 6.3 Add SSH Key to VPS

```bash
# SSH into VPS
ssh root@your-server-ip

# Add public key
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Test SSH from local machine
ssh -i ~/.ssh/hostinger_vps_key root@your-server-ip
```

### 6.4 Add GitHub Secrets

**Go to**: Repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `HOSTINGER_HOST` | VPS IP address | `123.456.789.0` |
| `HOSTINGER_USER` | SSH username | `root` |
| `HOSTINGER_SSH_KEY` | Private SSH key | Content of `~/.ssh/hostinger_vps_key` |
| `HOSTINGER_DB_HOST` | Database host | `localhost` |
| `HOSTINGER_DB_NAME` | Database name | `elevate_edu` |
| `HOSTINGER_DB_USER` | Database user | `elevate_user` |
| `HOSTINGER_DB_PASSWORD` | Database password | `your-password` |
| `HOSTINGER_DOMAIN` | Your domain | `yourdomain.com` |
| `SECRET_KEY` | Backend secret | Generate: `openssl rand -hex 32` |

**To get SSH private key**:
```bash
cat ~/.ssh/hostinger_vps_key
# Copy entire output including -----BEGIN RSA PRIVATE KEY----- and -----END RSA PRIVATE KEY-----
```

### 6.5 Copy Workflows

```bash
# On local machine
cd /path/to/elevate-edu-ui

# Copy workflows
cp hostinger-deployment/workflows/*.yml .github/workflows/

# Commit and push
git add .github/
git commit -m "Add Hostinger VPS deployment workflows"
git push origin main
```

### 6.6 Test Automatic Deployment

```bash
# Make a small change
echo "// Test deployment" >> src/App.tsx

# Commit and push
git add src/App.tsx
git commit -m "test: verify automatic deployment"
git push origin main

# Check GitHub Actions tab
# Should see deployment workflow running
```

---

## Step 7: Verify Deployment

### 7.1 Test Backend

```bash
# Health check
curl https://yourdomain.com/api/health

# API docs
curl https://yourdomain.com/api/docs
```

### 7.2 Test Frontend

1. **Visit**: `https://yourdomain.com`
2. **Verify**: Frontend loads correctly
3. **Test**: Login functionality
4. **Test**: All features

### 7.3 Test Code Execution

1. **Go to**: Coding Practice section
2. **Select**: A problem
3. **Write code**: Test Python/C/C++/Java/JavaScript
4. **Run**: Verify code executes
5. **Submit**: Verify submission works

---

## How CI/CD Works

### Overview

GitHub Actions automatically detects what changed and deploys only what's needed:
- **Frontend changes** → Deploys frontend only
- **Backend changes** → Deploys backend only  
- **Both changes** → Deploys both in parallel

### Change Detection

The workflows monitor file paths:

**Backend workflow** (`deploy-backend.yml`) triggers on:
- `backend/**` - Any backend file change
- `.github/workflows/deploy-backend.yml` - Workflow changes

**Frontend workflow** (`deploy-frontend.yml`) triggers on:
- `src/**` - Frontend source changes
- `public/**` - Public assets changes
- `package.json` - Dependencies changes
- `vite.config.ts` - Build config changes

### Deployment Scenarios

#### Scenario 1: Frontend Only Changes

**Example**: Update React component

```bash
git add src/components/Header.tsx
git commit -m "feat: update header"
git push origin main
```

**What Happens**:
1. ✅ GitHub detects `src/**` changed
2. ✅ Triggers `deploy-frontend.yml` only
3. ✅ Builds frontend (`npm run build`)
4. ✅ Deploys to VPS
5. ✅ Backend workflow **skips** (no backend changes)
6. ✅ Done in ~2 minutes!

#### Scenario 2: Backend Only Changes

**Example**: Add API endpoint

```bash
git add backend/app/api/users.py
git commit -m "feat: add user endpoint"
git push origin main
```

**What Happens**:
1. ✅ GitHub detects `backend/**` changed
2. ✅ Triggers `deploy-backend.yml` only
3. ✅ Pulls latest code on VPS
4. ✅ Updates dependencies
5. ✅ Restarts backend service
6. ✅ Frontend workflow **skips** (no frontend changes)
7. ✅ Done in ~3 minutes!

#### Scenario 3: Both Frontend and Backend Changes

**Example**: Add new feature

```bash
git add src/pages/Feature.tsx backend/app/api/feature.py
git commit -m "feat: add new feature"
git push origin main
```

**What Happens**:
1. ✅ GitHub detects both `src/**` and `backend/**` changed
2. ✅ Triggers **both** workflows in parallel
3. ✅ Frontend: Builds and deploys
4. ✅ Backend: Updates and restarts
5. ✅ Both complete independently
6. ✅ Done in ~3-4 minutes!

### Daily Workflow

```bash
# Make changes
git add .
git commit -m "feat: new feature"
git push origin main

# Automatic deployment happens!
# Check GitHub Actions tab to see progress
```

---

## Database Migrations

### Automatic Table Creation

The deployment workflow includes:

```python
# Automatically creates new tables when models are added
python -c "from app.core.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

**What this does**:
- ✅ Creates new tables (if models added)
- ✅ Doesn't modify existing tables
- ✅ Safe to run multiple times

### Migration Scenarios

#### Scenario 1: Adding New Model (Automatic ✅)

**Example**: Add new `Notification` model

```python
# backend/app/models/notification.py
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    message = Column(String)
```

**What Happens**:
1. ✅ You commit and push code
2. ✅ Backend workflow runs
3. ✅ `create_all()` creates new `notifications` table
4. ✅ Done automatically!

**No manual step needed!**

#### Scenario 2: Adding Column to Existing Table (Manual ⚠️)

**Example**: Add `phone` column to `users` table

```python
# backend/app/models/user.py
class User(Base):
    # ... existing columns ...
    phone = Column(String, nullable=True)  # New column
```

**Manual Step Required**:

```bash
# SSH into VPS
ssh root@your-server-ip

cd /var/www/elevate-edu-ui/backend
source venv/bin/activate

# Option 1: Direct SQL (Quick)
mysql -u elevate_user -p elevate_edu << EOF
ALTER TABLE users ADD COLUMN phone VARCHAR(255) NULL;
EOF

# Option 2: Using Python (Safer)
python << EOF
from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(255) NULL"))
    conn.commit()
EOF
```

### Migration Checklist

When adding/changing models:

- [ ] Test locally first
- [ ] Check if `create_all()` handles it automatically
- [ ] If not, prepare manual migration script
- [ ] Backup database (for production)
- [ ] Deploy backend code
- [ ] Run migration (if needed)
- [ ] Verify changes
- [ ] Test application

---

## Security & Maintenance

### 1. Firewall Setup

```bash
# Install UFW
apt install -y ufw

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
ufw status
```

### 2. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured)
certbot renew --dry-run
```

### 3. Regular Updates

```bash
# Update system regularly
apt update && apt upgrade -y

# Update Python packages
cd /var/www/elevate-edu-ui/backend
source venv/bin/activate
pip install --upgrade pip
pip list --outdated
```

### 4. Monitoring Logs

```bash
# Backend logs
tail -f /var/log/elevate-edu-backend.out.log
tail -f /var/log/elevate-edu-backend.err.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u elevate-edu-backend -f
```

### 5. Service Management

```bash
# Backend service
supervisorctl status elevate-edu-backend
supervisorctl restart elevate-edu-backend
supervisorctl stop elevate-edu-backend
supervisorctl start elevate-edu-backend

# Nginx
sudo systemctl status nginx
sudo systemctl restart nginx
sudo systemctl reload nginx

# MySQL
sudo systemctl status mysql
sudo systemctl restart mysql
```

---

## Troubleshooting

### Backend Not Starting

```bash
# SSH into VPS
ssh root@your-server-ip

# Check supervisor status
supervisorctl status elevate-edu-backend

# View logs
tail -f /var/log/elevate-edu-backend.out.log
tail -f /var/log/elevate-edu-backend.err.log

# Restart service
supervisorctl restart elevate-edu-backend

# Check if port is in use
netstat -tlnp | grep 8000
```

### Frontend Not Loading

1. **Check**: Files exist in `/var/www/elevate-edu-ui/dist/`
2. **Verify**: Nginx configuration
3. **Check**: Nginx status: `sudo systemctl status nginx`
4. **Test**: Nginx config: `sudo nginx -t`
5. **Restart**: `sudo systemctl restart nginx`

### Database Connection Failed

```bash
# Test MySQL connection
mysql -u elevate_user -p elevate_edu

# Check MySQL status
sudo systemctl status mysql

# Verify credentials in .env
cat /var/www/elevate-edu-ui/backend/.env | grep DATABASE_URL
```

### GitHub Actions Failing

1. **Check**: GitHub Secrets are correct
2. **Verify**: SSH key format (entire private key)
3. **Test**: SSH manually: `ssh -i key root@server-ip`
4. **Check**: Server accessibility from GitHub
5. **Review**: Workflow logs in GitHub Actions tab

### Nginx Errors

```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Port Already in Use

```bash
# Check what's using port 8000
netstat -tlnp | grep 8000

# Kill process if needed
kill -9 <PID>

# Or change port in supervisor config
nano /etc/supervisor/conf.d/elevate-edu-backend.conf
# Change port from 8000 to 8001
supervisorctl restart elevate-edu-backend
```

---

## Success Checklist

### Pre-Deployment
- [ ] VPS purchased and accessible
- [ ] SSH access working
- [ ] Domain name configured (optional)

### Server Setup
- [ ] Python 3.11 installed
- [ ] MySQL installed and secured
- [ ] Nginx installed
- [ ] Supervisor installed
- [ ] Firewall configured

### Database Setup
- [ ] Database created
- [ ] User created with permissions
- [ ] Credentials saved securely

### Backend Deployment
- [ ] Repository cloned
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] `.env` file configured
- [ ] Database tables created
- [ ] Supervisor service running
- [ ] Nginx configured for backend
- [ ] Backend API accessible

### Frontend Deployment
- [ ] Frontend built locally
- [ ] Files uploaded to VPS
- [ ] Permissions set correctly
- [ ] Nginx configured for frontend
- [ ] Frontend accessible

### GitHub CI/CD
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] SSH key generated
- [ ] SSH key added to VPS
- [ ] GitHub Secrets configured
- [ ] Workflows copied to `.github/workflows/`
- [ ] Test deployment successful

### Verification
- [ ] Backend API accessible
- [ ] Frontend website loads
- [ ] Login functionality works
- [ ] Code execution works
- [ ] All features tested
- [ ] Automatic deployment working

---

## 🎉 You're Done!

Your application is now live at:
**https://yourdomain.com**

### Benefits

✅ **Super Fast Updates**: Push to GitHub = Automatic deployment (2-3 minutes)  
✅ **No Manual Steps**: Everything automated  
✅ **Version Control**: Track all changes  
✅ **Easy Rollback**: Git-based rollback  
✅ **Team Collaboration**: Code reviews  

### Daily Workflow

```bash
# Make changes
git add .
git commit -m "feat: new feature"
git push origin main

# Automatic deployment happens!
# Check GitHub Actions tab to see progress
```

---

## 📚 Quick Reference

### Common Commands

```bash
# SSH into VPS
ssh root@your-server-ip

# Check backend status
supervisorctl status elevate-edu-backend

# View backend logs
tail -f /var/log/elevate-edu-backend.out.log

# Restart backend
supervisorctl restart elevate-edu-backend

# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# Test Nginx config
sudo nginx -t

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### File Locations

- **Backend code**: `/var/www/elevate-edu-ui/backend/`
- **Frontend files**: `/var/www/elevate-edu-ui/dist/`
- **Backend logs**: `/var/log/elevate-edu-backend.out.log`
- **Nginx config**: `/etc/nginx/sites-available/elevate-edu`
- **Supervisor config**: `/etc/supervisor/conf.d/elevate-edu-backend.conf`
- **Environment file**: `/var/www/elevate-edu-ui/backend/.env`

---

**Need Help?** Check troubleshooting section above or Hostinger support.

**Last Updated**: 2024



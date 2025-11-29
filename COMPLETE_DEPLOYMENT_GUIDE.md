# 🚀 Complete Deployment Guide - GitHub to Hostinger VPS with CI/CD

**One comprehensive guide covering everything from GitHub setup to production deployment.**

---

## 📋 Table of Contents

1. [Part 1: GitHub Repository Setup](#part-1-github-repository-setup)
2. [Part 2: What to Commit](#part-2-what-to-commit)
   - [Step 2.1: Check What Will Be Committed](#step-21-check-what-will-be-committed)
   - [Step 2.2: First Commit and Push](#step-22-first-commit-and-push)
   - [Step 2.3: Verify on GitHub](#step-23-verify-on-github)
3. [Part 3: Hostinger VPS Setup (Fresh OS)](#part-3-hostinger-vps-setup-fresh-os)
4. [Part 4: Docker Setup (Recommended)](#part-4-docker-setup-recommended---easiest)
5. [Part 5: Manual Setup (Without Docker)](#part-5-manual-setup-without-docker)
6. [Part 6: GitHub CI/CD Configuration](#part-6-github-cicd-configuration)
7. [Part 7: First Deployment](#part-7-first-deployment)
8. [Part 8: Daily Usage - Git Commands](#part-8-daily-usage)

---

## Part 1: GitHub Repository Setup

### Step 1.1: Create GitHub Repository

1. **Go to GitHub:** https://github.com/new
2. **Repository name:** `Svna_jobs_AWS` (or your preferred name)
3. **Visibility:** Private (recommended) or Public
4. **Initialize:** ❌ Don't initialize with README, .gitignore, or license
5. **Click:** "Create repository"

### Step 1.2: Initialize Git in Your Project

**On your local machine:**

```bash
# Navigate to your project root
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui

# Initialize git (if not already initialized)
git init

# Add remote repository
git remote add origin https://github.com/venuprakash17/Svna_jobs_AWS.git

# Or if using SSH:
# git remote add origin git@github.com:venuprakash17/Svna_jobs_AWS.git
```

**Verify remote:**
```bash
git remote -v
# Should show your GitHub repository URL
```

---

## Part 2: What to Commit

### ✅ Files to COMMIT:

**Commit the ENTIRE project root folder** (`elevate-edu-ui/`)

**The `.gitignore` file already excludes:**
- ❌ `node_modules/` - Frontend dependencies (will be installed on server)
- ❌ `dist/` - Built frontend files (will be built during CI/CD)
- ❌ `backend/venv/` - Python virtual environment (created on server)
- ❌ `backend/.env` - Environment secrets (created on server)
- ❌ `backend/*.db` - Database files (not needed in git)
- ❌ `*.log` - Log files

### ✅ What Gets Committed (Automatically):

```
elevate-edu-ui/
├── .github/workflows/     ✅ GitHub Actions CI/CD workflows
├── src/                   ✅ Frontend source code (React/TypeScript)
├── backend/               ✅ Backend source code (Python/FastAPI)
│   ├── app/               ✅ Application code
│   ├── requirements.txt   ✅ Python dependencies
│   └── Dockerfile         ✅ Docker configuration
├── public/                ✅ Public assets
├── docker-compose.yml     ✅ Docker Compose config
├── nginx.conf             ✅ Nginx configuration
├── package.json           ✅ Frontend dependencies
├── vite.config.ts         ✅ Vite configuration
├── .gitignore             ✅ Git ignore rules
├── README.md              ✅ Project documentation
└── ... (all config files)
```

**Important:** Don't commit:
- `.env` files (secrets)
- `dist/` folder (built files)
- `node_modules/` (dependencies)
- `venv/` (Python environment)

### Step 2.1: Check What Will Be Committed

```bash
# Navigate to project root
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui

# See what will be committed
git status

# See what's ignored
git status --ignored

# See detailed file list
git status --short
```

**📝 Share:** Output of `git status` (to verify files are ready)

### Step 2.2: First Commit and Push

**Execute these commands in order:**

```bash
# 1. Navigate to project root (if not already there)
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui

# 2. Check current status
git status

# 3. Add all files (except those in .gitignore)
git add .

# 4. Verify what's staged
git status

# 5. Commit with message
git commit -m "Initial commit: Elevate Edu application with CI/CD"

# 6. Set main branch (if not already set)
git branch -M main

# 7. Push to GitHub (first time)
git push -u origin main

# 8. Verify push succeeded
git log --oneline -1
```

**Expected output:**
- ✅ Files added successfully
- ✅ Commit created
- ✅ Pushed to GitHub
- ✅ See commit hash

**📝 Share:** 
- ✅ `git push` output
- ✅ Commit hash from `git log`
- ❌ Any errors

**✅ Your code is now on GitHub!**

### Step 2.3: Verify on GitHub

1. **Go to:** `https://github.com/venuprakash17/Svna_jobs_AWS`
2. **You should see:**
   - ✅ All your files
   - ✅ `.github/workflows/` folder
   - ✅ `src/` folder
   - ✅ `backend/` folder
   - ✅ `docker-compose.yml`
   - ✅ `COMPLETE_DEPLOYMENT_GUIDE.md`

**📝 Share:** `✅ Code visible on GitHub` or any issues

---

## Part 3: Hostinger VPS Setup (Fresh OS)

### Prerequisites

- ✅ Hostinger VPS KVM 2 (Ubuntu 22.04 LTS recommended)
- ✅ SSH access to VPS
- ✅ Root or sudo access

### Step 3.1: Connect to Your VPS

**From your local machine:**

```bash
ssh root@72.60.101.14
# Or if using a different username:
# ssh your-username@72.60.101.14
```

**📝 Share the output of:**
```bash
uname -a
cat /etc/os-release
```

### Step 3.2: Update System

```bash
# Update package list
sudo apt-get update

# Upgrade system
sudo apt-get upgrade -y

# Install essential tools
sudo apt-get install -y curl wget git vim
```

**📝 Share:** `✅ System updated` or any errors

### Step 3.3: Install Docker (Recommended)

**This is the easiest way to deploy!**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (if not root)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

**📝 Share the output of:**
```bash
docker --version
docker-compose --version
```

### Step 3.4: Install PostgreSQL (If Not Using Docker)

```bash
# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE elevate_edu;
CREATE USER elevate_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE elevate_edu TO elevate_user;
\q
EOF
```

**📝 Share:** `✅ PostgreSQL installed` or any errors

### Step 3.5: Install Nginx

```bash
# Install Nginx
sudo apt-get install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

**📝 Share:** `✅ Nginx installed` or any errors

---

## Part 4: Docker Setup (Recommended - Easiest!)

### Step 4.1: Prepare Docker Files

**✅ Docker files are already created:**
- ✅ `docker-compose.yml` - Complete setup (PostgreSQL + Backend + Nginx)
- ✅ `nginx.conf` - Nginx configuration for Docker
- ✅ `backend/Dockerfile` - Backend container definition

### Step 4.2: Create Production .env File

**On your local machine:**

```bash
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui

# Create .env.production file
cat > .env.production << 'EOF'
POSTGRES_PASSWORD=your_secure_password_here_change_this
SECRET_KEY=your-secret-key-minimum-32-characters-long-change-this
BACKEND_CORS_ORIGINS=http://72.60.101.14,http://72.60.101.14:80
DEBUG=False
EOF

# Edit with your values
nano .env.production
```

**Update these values:**
- `POSTGRES_PASSWORD` - Choose a strong password
- `SECRET_KEY` - Generate a random 32+ character string
- `BACKEND_CORS_ORIGINS` - Already set for your IP

**📝 Share:** `✅ .env.production created` (don't share actual passwords!)

### Step 4.3: Build Frontend

**On your local machine:**

```bash
# Build frontend with production API URL
VITE_API_BASE_URL=http://72.60.101.14:8000/api/v1 VITE_WS_BASE_URL=ws://72.60.101.14:8000 npm run build

# Verify dist folder
ls -la dist/
```

**📝 Share:** `✅ Frontend built` or any errors

### Step 4.4: Upload Files to VPS

**On your local machine:**

```bash
# Create deployment directory on VPS
ssh root@72.60.101.14 "mkdir -p /root/elevate-edu"

# Upload all necessary files
scp docker-compose.yml root@72.60.101.14:/root/elevate-edu/
scp nginx.conf root@72.60.101.14:/root/elevate-edu/
scp .env.production root@72.60.101.14:/root/elevate-edu/.env
scp -r dist root@72.60.101.14:/root/elevate-edu/
scp -r backend root@72.60.101.14:/root/elevate-edu/
```

**📝 Share:** `✅ Files uploaded` or any errors

### Step 4.5: Deploy with Docker

**SSH into your VPS:**

```bash
ssh root@72.60.101.14

# Navigate to project
cd /root/elevate-edu

# Start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Expected output:**
```
NAME                STATUS
elevate_edu_db      Up (healthy)
elevate_edu_api     Up
elevate_edu_nginx   Up
```

**📝 Share:** Output of `docker-compose ps`

### Step 4.6: Verify Deployment

**Test your application:**

```bash
# Test backend directly
curl http://localhost:8000/health

# Test frontend
curl http://localhost/

# Test API through Nginx
curl http://localhost/api/v1/health
```

**In browser:**
- Visit: `http://72.60.101.14`
- Should see your application!

**📝 Share:** 
- ✅ Website loads at http://72.60.101.14
- ✅ API responds
- ❌ Any errors

---

## Part 5: Manual Setup (Without Docker)

### Step 5.1: Setup Backend

```bash
# Create directory
mkdir -p /home/root/elevate-edu-backend
cd /home/root/elevate-edu-backend

# Clone repository (or upload backend folder)
git clone https://github.com/venuprakash17/Svna_jobs_AWS.git .
# OR upload backend folder manually

cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
nano .env
```

**Add to .env:**
```env
DATABASE_URL=postgresql://elevate_user:your_password@localhost:5432/elevate_edu
SECRET_KEY=your-secret-key-minimum-32-characters-long
BACKEND_CORS_ORIGINS=http://72.60.101.14,http://72.60.101.14:80
DEBUG=False
```

**Create tables:**
```bash
python -c "from app.core.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

**📝 Share:** `✅ Backend setup complete` or any errors

### Step 5.2: Setup Frontend

```bash
# Create directory
mkdir -p /var/www/elevate-edu-ui/dist

# Upload dist folder from your local machine
# scp -r dist/* root@72.60.101.14:/var/www/elevate-edu-ui/dist/

# Fix permissions
sudo chown -R www-data:www-data /var/www/elevate-edu-ui/dist/
sudo chmod -R 755 /var/www/elevate-edu-ui/dist/
```

**📝 Share:** `✅ Frontend uploaded` or any errors

### Step 5.3: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/elevate-edu
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name 72.60.101.14;

    root /var/www/elevate-edu-ui/dist;
    index index.html;

    # Static assets
    location /assets/ {
        alias /var/www/elevate-edu-ui/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Frontend (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/elevate-edu /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

**📝 Share:** Output of `sudo nginx -t`

### Step 5.4: Setup Supervisor (For Backend Service)

```bash
# Install Supervisor
sudo apt-get install -y supervisor

# Create config
sudo nano /etc/supervisor/conf.d/elevate-edu-backend.conf
```

**Paste:**

```ini
[program:elevate-edu-backend]
command=/home/root/elevate-edu-backend/backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
directory=/home/root/elevate-edu-backend/backend
user=root
autostart=true
autorestart=true
stderr_logfile=/var/log/elevate-edu-backend.err.log
stdout_logfile=/var/log/elevate-edu-backend.out.log
environment=PATH="/home/root/elevate-edu-backend/backend/venv/bin"
```

**Start service:**
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start elevate-edu-backend
sudo supervisorctl status elevate-edu-backend
```

**📝 Share:** Output of `sudo supervisorctl status elevate-edu-backend`

---

## Part 6: GitHub CI/CD Configuration

### Step 6.1: Generate SSH Key for GitHub Actions

### Step 6.1: Generate SSH Key for GitHub Actions

**On your local machine:**

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""

# Display PUBLIC key
echo "=== PUBLIC KEY (Add to server) ==="
cat ~/.ssh/github_actions_deploy.pub

# Display PRIVATE key
echo ""
echo "=== PRIVATE KEY (Add to GitHub Secrets) ==="
cat ~/.ssh/github_actions_deploy
```

**📝 Share:** Both keys (I'll tell you where to add them)

### Step 6.2: Add Public Key to Server

**SSH into your VPS:**

```bash
ssh root@72.60.101.14

# Add public key
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Test connection (from local machine)
ssh -i ~/.ssh/github_actions_deploy root@72.60.101.14
```

**📝 Share:** `✅ SSH key added` or any errors

### Step 6.3: Add GitHub Secrets

**Go to:** `https://github.com/venuprakash17/Svna_jobs_AWS/settings/secrets/actions`

**Click:** `New repository secret`

**Add these secrets:**

| Secret Name | Value | Notes |
|------------|-------|-------|
| `VPS_HOST` | `72.60.101.14` | Your VPS IP |
| `VPS_USER` | `root` | Your SSH username |
| `VPS_PORT` | `22` | SSH port (usually 22) |
| `VPS_SSH_KEY` | (paste private key) | Entire private key content |
| `VPS_FRONTEND_PATH` | `/var/www/elevate-edu-ui/dist` | Frontend directory |
| `VPS_BACKEND_PATH` | `/home/root/elevate-edu-backend/backend` | Backend directory |
| `VPS_SUPERVISOR_SERVICE` | `elevate-edu-backend` | Supervisor service name (for manual setup) |
| `VPS_DEPLOY_PATH` | `/root/elevate-edu` | Docker deployment path (for Docker setup) |

**📝 Share:** `✅ All secrets added` or which ones you need help with

### Step 6.4: Choose CI/CD Workflow

**You have 3 workflow options:**

1. **Docker Deployment** (`.github/workflows/deploy-docker.yml`)
   - ✅ Simplest - One workflow deploys everything
   - ✅ Uses Docker Compose
   - ✅ Best for Docker setup

2. **Separate Workflows** (`.github/workflows/deploy-frontend.yml` + `deploy-backend.yml`)
   - ✅ Deploys frontend and backend separately
   - ✅ Faster for small changes
   - ✅ Best for manual setup

3. **Full Stack** (`.github/workflows/deploy-full.yml`)
   - ✅ Deploys both when major changes occur
   - ✅ Good for big updates

**Recommendation:** 
- 🐳 **Using Docker?** → Use `deploy-docker.yml`
- ⚙️ **Manual setup?** → Use separate workflows

**All workflows are ready!** Just add the secrets above.

---

## Part 7: First Deployment

### Step 7.1: Test CI/CD

**Make a small change and push:**

```bash
# On your local machine
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui

# Make a small change
echo "# Deployment Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: CI/CD deployment"
git push origin main
```

### Step 7.2: Check GitHub Actions

1. **Go to:** `https://github.com/venuprakash17/Svna_jobs_AWS/actions`
2. **You should see workflows running**
3. **Click on a workflow to see progress**

**📝 Share:** Screenshot or status of GitHub Actions workflow

### Step 7.3: Verify Deployment

**Test your website:**

```bash
# Visit in browser
http://72.60.101.14

# Test API
curl http://72.60.101.14:8000/health
curl http://72.60.101.14/api/v1/health
```

**📝 Share:** 
- ✅ Website loads
- ✅ API responds
- ❌ Any errors

---

## Part 8: Daily Usage

### Making Changes and Deploying

**Complete workflow with Git commands:**

```bash
# 1. Navigate to project
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui

# 2. Make changes locally
# Edit files in src/ or backend/

# 3. Test locally (optional)
npm run dev          # Frontend (runs on http://localhost:8080)
# Backend should auto-reload if running

# 4. Check what changed
git status

# 5. Stage changes
git add .

# Or stage specific files:
# git add src/pages/MyPage.tsx
# git add backend/app/api/my_endpoint.py

# 6. Commit with descriptive message
git commit -m "feat: add new feature description"

# Good commit message examples:
# git commit -m "fix: resolve 500 error in coding problems endpoint"
# git commit -m "feat: add user dashboard analytics"
# git commit -m "refactor: improve error handling"

# 7. Push to GitHub
git push origin main

# 8. GitHub Actions automatically deploys!
# Check progress: https://github.com/venuprakash17/Svna_jobs_AWS/actions
```

### Git Commands Reference

**Common commands you'll use:**

```bash
# Check status
git status

# See what changed
git diff

# Add all changes
git add .

# Add specific file
git add path/to/file

# Commit
git commit -m "Your commit message"

# Push to GitHub
git push origin main

# Pull latest changes (if working from multiple machines)
git pull origin main

# See commit history
git log --oneline -10

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard changes to a file
git checkout -- path/to/file
```

### After Pushing

**What happens automatically:**

1. **GitHub receives your push**
2. **GitHub Actions detects changes**
3. **Workflow triggers:**
   - Frontend changes → `deploy-frontend.yml` runs
   - Backend changes → `deploy-backend.yml` runs
   - Both changes → Both workflows run in parallel
4. **Deployment happens automatically**
5. **Check status:** Go to GitHub Actions tab

**No manual steps needed!** 🚀

### What Happens Automatically:

- **Frontend changes** (`src/`, `public/`) → Builds and deploys frontend
- **Backend changes** (`backend/`) → Updates and restarts backend
- **Both changes** → Deploys both

---

## 🐳 Docker vs Manual Setup

### Docker (Recommended) ✅

**Benefits:**
- ✅ **Easier setup** - One command to start everything
- ✅ **Isolated services** - Each service in its own container
- ✅ **Easy updates** - Just rebuild and restart
- ✅ **Better resource management** - Docker handles everything
- ✅ **Consistent environment** - Same on dev and production
- ✅ **Automatic restarts** - Services restart if they crash

**Use Docker if:** You want the simplest deployment experience

### Manual Setup

**Benefits:**
- ✅ More control over each service
- ✅ Can customize each component
- ✅ No Docker overhead

**Use Manual if:** You prefer traditional server setup

**Recommendation:** Use Docker for simplicity! 🐳

---

## 📋 Next Steps

**Please complete these and share results:**

1. ✅ **GitHub repo created** → Share repo URL
2. ✅ **Code pushed to GitHub** → Share commit hash
3. ✅ **VPS connected** → Share OS version
4. ✅ **Docker installed** → Share Docker version
5. ✅ **PostgreSQL setup** → Share database name
6. ✅ **SSH key generated** → Share public key
7. ✅ **GitHub secrets added** → Share which ones

**After you share results, I'll:**
- ✅ Update the guide with your specific details
- ✅ Create Docker files if you want
- ✅ Fix any issues
- ✅ Complete the setup

---

**Ready? Start with Part 1 and share your progress!** 🚀


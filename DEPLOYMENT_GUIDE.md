# Complete Deployment Guide

## Quick Start

### 1. Configure Server Details

Create `.env.deploy` file:

```bash
cp .env.deploy.example .env.deploy
# Edit .env.deploy with your server details
```

Or set environment variables:

```bash
export SERVER_HOST="your-server.com"
export SERVER_USER="root"
export SERVER_PORT="22"
export SERVER_PATH="/var/www/elevate-edu"
```

### 2. Run Deployment

```bash
./deploy-to-server.sh
```

That's it! The script will:
- ✅ Check prerequisites
- ✅ Build frontend
- ✅ Run tests
- ✅ Push to git
- ✅ Deploy to server
- ✅ Restart services
- ✅ Verify deployment

## What the Script Does

### 1. Prerequisites Check
- Verifies Git, Node.js, npm, Python are installed
- Checks for uncommitted changes
- Prompts to commit if needed

### 2. Frontend Build
- Installs npm dependencies
- Builds production bundle
- Verifies build output

### 3. Testing
- Runs endpoint tests (if backend is running locally)
- Validates all endpoints work

### 4. Git Push
- Pushes changes to remote repository
- Ensures server can pull latest code

### 5. Server Deployment
- Connects to server via SSH
- Pulls latest code from git
- Installs backend dependencies
- Builds frontend on server
- Restarts services (systemd/PM2/Docker)

### 6. Verification
- Tests server endpoints
- Runs endpoint tests against production

## Server Setup Requirements

Your server should have:

1. **Git Repository**
   ```bash
   # On server
   cd /var/www/elevate-edu
   git init
   git remote add origin <your-repo-url>
   ```

2. **Node.js & npm**
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Python 3.8+**
   ```bash
   sudo apt-get install python3 python3-pip python3-venv
   ```

4. **Service Management** (choose one):
   
   **Option A: systemd**
   ```bash
   # Create service files
   sudo nano /etc/systemd/system/elevate-edu-backend.service
   sudo nano /etc/systemd/system/elevate-edu-frontend.service
   ```

   **Option B: PM2**
   ```bash
   npm install -g pm2
   ```

   **Option C: Docker**
   ```bash
   # Use docker-compose.yml
   ```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_HOST` | `your-server.com` | Server hostname/IP |
| `SERVER_USER` | `root` | SSH username |
| `SERVER_PORT` | `22` | SSH port |
| `SERVER_PATH` | `/var/www/elevate-edu` | Base path on server |
| `BACKEND_PATH` | `$SERVER_PATH/backend` | Backend path |
| `FRONTEND_PATH` | `$SERVER_PATH/frontend` | Frontend path |
| `GIT_REMOTE` | `origin` | Git remote name |
| `GIT_BRANCH` | `main` | Git branch to deploy |

### Using .env.deploy

Create `.env.deploy` file:

```bash
SERVER_HOST=192.168.1.100
SERVER_USER=deploy
SERVER_PORT=22
SERVER_PATH=/var/www/elevate-edu
GIT_BRANCH=main
```

## Deployment Methods

### Method 1: Git-Based (Recommended)

The script uses Git to sync code:

1. Pushes local changes to Git
2. Server pulls from Git
3. Server builds and restarts

**Pros:**
- Version controlled
- Easy rollback
- Works with any server

**Cons:**
- Requires Git repository
- Server needs Git access

### Method 2: Direct SSH Copy

Modify script to use `scp` instead of Git:

```bash
# Copy files directly
scp -r dist/* $SERVER_USER@$SERVER_HOST:$FRONTEND_PATH/
scp -r backend/* $SERVER_USER@$SERVER_HOST:$BACKEND_PATH/
```

## Service Restart Options

The script tries multiple methods:

1. **systemd** (if services exist)
2. **PM2** (if installed)
3. **Docker Compose** (if docker-compose.yml exists)

### Create systemd Services

**Backend Service** (`/etc/systemd/system/elevate-edu-backend.service`):
```ini
[Unit]
Description=Elevate Edu Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/elevate-edu/backend
Environment="PATH=/var/www/elevate-edu/backend/venv/bin"
ExecStart=/var/www/elevate-edu/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8090
Restart=always

[Install]
WantedBy=multi-user.target
```

**Frontend Service** (nginx or serve):
```bash
# Use nginx to serve frontend
# Or use serve: npm install -g serve
```

## Troubleshooting

### SSH Connection Failed

```bash
# Test SSH connection
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST

# Check SSH key
ssh-add -l

# Add SSH key
ssh-copy-id -p $SERVER_PORT $SERVER_USER@$SERVER_HOST
```

### Git Push Failed

```bash
# Check remote
git remote -v

# Set upstream
git push -u origin main
```

### Build Failed

```bash
# Check Node.js version
node --version  # Should be 18+

# Clear cache
rm -rf node_modules package-lock.json
npm install
```

### Server Deployment Failed

```bash
# SSH to server and check
ssh $SERVER_USER@$SERVER_HOST

# Check logs
journalctl -u elevate-edu-backend -f
pm2 logs
docker-compose logs
```

## Manual Deployment

If script fails, deploy manually:

```bash
# 1. Build frontend
npm run build

# 2. Push to git
git push origin main

# 3. SSH to server
ssh $SERVER_USER@$SERVER_HOST

# 4. On server
cd /var/www/elevate-edu
git pull origin main
cd backend
source venv/bin/activate
pip install -r requirements.txt
cd ../frontend
npm install
npm run build

# 5. Restart services
sudo systemctl restart elevate-edu-backend
# Or
pm2 restart elevate-edu-backend
# Or
docker-compose restart
```

## Security Notes

1. **SSH Keys**: Use SSH keys instead of passwords
2. **Environment Variables**: Don't commit `.env.deploy` with secrets
3. **Permissions**: Use non-root user for deployment
4. **Firewall**: Only open necessary ports

## Rollback

If deployment fails:

```bash
# On server
cd /var/www/elevate-edu
git checkout <previous-commit>
# Rebuild and restart
```

## Continuous Deployment

Add to CI/CD:

```yaml
# GitHub Actions example
- name: Deploy to Server
  run: |
    export SERVER_HOST="${{ secrets.SERVER_HOST }}"
    export SERVER_USER="${{ secrets.SERVER_USER }}"
    ./deploy-to-server.sh
```

## Support

For issues:
1. Check server logs
2. Verify SSH connection
3. Test endpoints manually
4. Check service status


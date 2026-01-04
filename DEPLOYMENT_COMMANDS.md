# 🚀 Production Deployment Commands for svnaprojob.online

## Quick Deployment Commands

### Option 1: Automated Deployment Script (Recommended)

```bash
# Make the script executable
chmod +x deploy-production.sh

# Run the deployment script
./deploy-production.sh
```

### Option 2: Manual Step-by-Step Deployment

#### 1. Build Frontend for Production

```bash
# Set production environment variables
export VITE_API_BASE_URL="https://svnaprojob.online/api/v1"
export VITE_WS_BASE_URL="wss://svnaprojob.online"
export NODE_ENV=production

# Install dependencies (if needed)
npm install

# Build for production
npm run build
```

#### 2. Upload Files to Server

```bash
# Upload frontend
rsync -avz --delete dist/ root@72.60.101.14:/var/www/elevate-edu-ui/dist/

# Upload backend
rsync -avz --exclude 'venv' --exclude '__pycache__' --exclude '*.pyc' --exclude '.env' backend/ root@72.60.101.14:/root/elevate-edu/backend/
```

#### 3. Setup on Server

```bash
# SSH into server
ssh root@72.60.101.14

# Navigate to project directory
cd /root/elevate-edu

# Update backend environment
cp backend/.env.production backend/.env
# Edit backend/.env with your actual values (database password, secret key, etc.)

# Restart services
docker-compose restart backend
# OR if using systemd:
# systemctl restart elevate-edu-backend

# Reload nginx
nginx -t && systemctl reload nginx
```

#### 4. Setup SSL Certificate (First Time Only)

```bash
# SSH into server
ssh root@72.60.101.14

# Install certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d svnaprojob.online -d www.svnaprojob.online

# Auto-renewal is set up automatically
```

#### 5. Setup Nginx Configuration

```bash
# SSH into server
ssh root@72.60.101.14

# Copy nginx configuration
cp nginx.production.conf /etc/nginx/sites-available/svnaprojob.online

# Create symlink
ln -s /etc/nginx/sites-available/svnaprojob.online /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

## Git Commands for Pushing Updates

### 1. Commit All Changes

```bash
# Check status
git status

# Add all changes
git add .

# Commit with message
git commit -m "Production ready: Updated domain to svnaprojob.online, fixed placement module, added real-time updates"

# Push to repository
git push origin main
# OR if using a different branch:
# git push origin your-branch-name
```

### 2. Complete Deployment Workflow

```bash
# 1. Commit and push changes
git add .
git commit -m "Production deployment: svnaprojob.online"
git push origin main

# 2. Build and deploy
chmod +x deploy-production.sh
./deploy-production.sh
```

## Post-Deployment Verification

### Check Backend Health

```bash
curl https://svnaprojob.online/api/v1/health
```

### Check Frontend

```bash
curl -I https://svnaprojob.online
```

### View Logs

```bash
# Backend logs
ssh root@72.60.101.14 'docker-compose logs -f backend'

# Nginx logs
ssh root@72.60.101.14 'tail -f /var/log/nginx/access.log'
ssh root@72.60.101.14 'tail -f /var/log/nginx/error.log'
```

## Environment Variables Checklist

### Frontend (.env.production)
- ✅ VITE_API_BASE_URL=https://svnaprojob.online/api/v1
- ✅ VITE_WS_BASE_URL=wss://svnaprojob.online

### Backend (backend/.env)
- ✅ DATABASE_URL (PostgreSQL connection string)
- ✅ SECRET_KEY (Generated with: openssl rand -hex 32)
- ✅ BACKEND_CORS_ORIGINS (includes https://svnaprojob.online)
- ✅ DEBUG=False
- ✅ All other required variables

## Important Notes

1. **SSL Certificate**: Make sure SSL certificate is installed and auto-renewal is configured
2. **Database**: Ensure database is properly configured and migrations are run
3. **CORS**: Backend CORS origins must include the production domain
4. **Environment Variables**: Never commit .env files to git
5. **Backups**: Always backup before deploying major changes

## Troubleshooting

### If deployment fails:
1. Check server logs: `ssh root@72.60.101.14 'docker-compose logs backend'`
2. Verify nginx configuration: `ssh root@72.60.101.14 'nginx -t'`
3. Check file permissions: `ssh root@72.60.101.14 'ls -la /var/www/elevate-edu-ui/dist'`
4. Verify backend is running: `ssh root@72.60.101.14 'docker-compose ps'`

### If site is not accessible:
1. Check DNS: `nslookup svnaprojob.online`
2. Check SSL: `curl -I https://svnaprojob.online`
3. Check firewall: `ssh root@72.60.101.14 'ufw status'`

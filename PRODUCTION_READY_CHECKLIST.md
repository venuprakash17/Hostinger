# ✅ Production Readiness Checklist for svnaprojob.online

## Pre-Deployment Checklist

### 1. Configuration Files ✅
- [x] Updated `backend/app/config.py` with new domain in CORS origins
- [x] Updated `build-production.sh` with new domain
- [x] Updated `docker-compose.yml` with new domain
- [x] Created `nginx.production.conf` for production domain
- [x] Created `deploy-production.sh` deployment script
- [x] Created `DEPLOYMENT_COMMANDS.md` with all commands

### 2. Environment Variables
- [ ] Create `backend/.env` on server with:
  - [ ] `DATABASE_URL` (PostgreSQL connection string)
  - [ ] `SECRET_KEY` (Generate with: `openssl rand -hex 32`)
  - [ ] `BACKEND_CORS_ORIGINS` (includes https://svnaprojob.online)
  - [ ] `DEBUG=False`
  - [ ] All other required variables

### 3. Domain & SSL
- [ ] DNS A record pointing svnaprojob.online to server IP (72.60.101.14)
- [ ] DNS A record pointing www.svnaprojob.online to server IP
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] SSL auto-renewal configured

### 4. Server Setup
- [ ] Nginx installed and configured
- [ ] Docker and Docker Compose installed
- [ ] PostgreSQL database created
- [ ] Database migrations run
- [ ] Backend service running
- [ ] Frontend files in `/var/www/elevate-edu-ui/dist/`

### 5. Security
- [ ] Firewall configured (ports 80, 443, 22 open)
- [ ] SSH key authentication enabled
- [ ] Strong database passwords
- [ ] SECRET_KEY generated and secure
- [ ] CORS origins properly configured
- [ ] DEBUG mode disabled in production

### 6. Testing
- [ ] All API endpoints working
- [ ] Frontend loads correctly
- [ ] Authentication working
- [ ] Database connections working
- [ ] File uploads working
- [ ] WebSocket connections working (if applicable)

## Deployment Steps

### Quick Deploy (All-in-One)

```bash
# 1. Commit all changes
git add .
git commit -m "Production ready: svnaprojob.online deployment"
git push origin main

# 2. Deploy to production
./deploy-production.sh
```

### Manual Deploy

See `DEPLOYMENT_COMMANDS.md` for detailed step-by-step instructions.

## Post-Deployment Verification

### 1. Check Website
```bash
curl -I https://svnaprojob.online
# Should return 200 OK
```

### 2. Check API
```bash
curl https://svnaprojob.online/api/v1/health
# Should return {"status":"healthy"}
```

### 3. Check SSL
```bash
curl -I https://svnaprojob.online
# Should show HTTPS connection
```

### 4. Test Key Features
- [ ] User login
- [ ] Job applications
- [ ] Placement rounds
- [ ] Student progress tracking
- [ ] Admin job management
- [ ] Analytics

## Monitoring

### View Logs
```bash
# Backend logs
ssh root@72.60.101.14 'docker-compose logs -f backend'

# Nginx logs
ssh root@72.60.101.14 'tail -f /var/log/nginx/error.log'
```

### Health Checks
```bash
# API health
curl https://svnaprojob.online/api/v1/health

# Frontend
curl -I https://svnaprojob.online
```

## Rollback Procedure

If something goes wrong:

```bash
# SSH into server
ssh root@72.60.101.14

# Restore backup
cd /root/elevate-edu
cp -r dist.backup.* dist

# Restart services
docker-compose restart backend
systemctl reload nginx
```

## Important Notes

1. **Never commit .env files** - They contain sensitive information
2. **Always test locally first** - Use `npm run build` to test production build
3. **Backup before major changes** - The deployment script creates backups automatically
4. **Monitor logs after deployment** - Check for errors immediately after deploying
5. **SSL Certificate** - Ensure Let's Encrypt auto-renewal is working

## Support

If you encounter issues:
1. Check server logs
2. Verify environment variables
3. Check nginx configuration
4. Verify database connectivity
5. Check CORS settings

# 🚀 DEPLOY AND TEST - SINGLE COMMAND

## One Command Does Everything

```bash
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui && ./deploy-complete.sh
```

## What This Command Does

### 1. Build & Deploy
- ✅ Builds frontend with correct API URLs
- ✅ Uploads to server
- ✅ Clears all caches (nginx, browser)
- ✅ Restarts all services

### 2. Setup
- ✅ Creates super admin user
- ✅ Resets database (fresh start)

### 3. Testing (Automatic)
- ✅ Tests frontend (homepage, login page)
- ✅ Tests backend API (health, endpoints)
- ✅ Tests authentication
- ✅ Tests AI services
- ✅ Tests database connection
- ✅ Tests server status (containers, nginx)
- ✅ Tests super admin login

## After Deployment

### CRITICAL: Clear Browser Cache

**Method 1: Hard Refresh**
- Mac: `Cmd + Shift + R`
- Windows: `Ctrl + Shift + R`

**Method 2: Incognito Mode**
1. Close ALL browser windows
2. Open fresh incognito/private window
3. Visit: `https://svnaprojob.online/login`

### Verify in Console (F12)

You MUST see:
```
[Main] ✅ API URL fixed at startup: https://svnaprojob.online/api/v1
[API Client] ✅ Using pre-fixed URL from main.tsx: https://svnaprojob.online/api/v1
```

**If you see `http://72.60.101.14:8000`:**
- Browser cache is still serving old files
- Clear cache again
- Use incognito mode

### Login

- **URL**: `https://svnaprojob.online/login`
- **Tab**: "Staff"
- **Email**: `admin@elevate.edu`
- **Password**: `Admin123!`

## Test Results

The deploy script will show:
- ✅ Passed: X tests
- ❌ Failed: Y tests

If tests fail, check:
1. Backend container: `ssh root@72.60.101.14 'docker ps | grep backend'`
2. Nginx status: `ssh root@72.60.101.14 'systemctl status nginx'`
3. Backend logs: `ssh root@72.60.101.14 'docker-compose logs backend | tail -50'`

## Manual Testing (Optional)

If you want to test separately:

```bash
# Test all services
./test-all-services.sh

# Test specific endpoint
curl https://svnaprojob.online/api/v1/health

# Test login
curl -X POST https://svnaprojob.online/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elevate.edu","password":"Admin123!"}'
```

## Services Tested

✅ **Frontend**
- Homepage loads
- Login page loads
- New code deployed (URL fix present)

✅ **Backend API**
- Health check
- API endpoints
- Authentication

✅ **Services**
- Backend container
- Nginx server
- Database connection
- AI services

✅ **Authentication**
- Login endpoint
- Super admin login

## Troubleshooting

### If Deployment Fails

1. **Check git status:**
   ```bash
   git status
   ```

2. **Check build:**
   ```bash
   npm run build
   ```

3. **Check server connection:**
   ```bash
   ssh root@72.60.101.14 'echo "Connected"'
   ```

### If Tests Fail

1. **Backend not running:**
   ```bash
   ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose restart backend'
   ```

2. **Nginx not running:**
   ```bash
   ssh root@72.60.101.14 'systemctl start nginx'
   ```

3. **Super admin not created:**
   ```bash
   ssh root@72.60.101.14 'docker exec elevate_edu_api python scripts/create_super_admin_postgres.py --email admin@elevate.edu --password Admin123!'
   ```

### If Browser Shows Old IP

1. **Clear browser cache completely**
2. **Use incognito mode**
3. **Check server files:**
   ```bash
   ssh root@72.60.101.14 'grep -r "__CORRECT_API_URL__" /var/www/elevate-edu-ui/dist/assets/*.js | head -1'
   ```
   Should show the fix code

4. **Clear nginx cache:**
   ```bash
   ssh root@72.60.101.14 'rm -rf /var/cache/nginx/* && systemctl reload nginx'
   ```

---

**🎯 Just run the single command and everything will be deployed and tested!**

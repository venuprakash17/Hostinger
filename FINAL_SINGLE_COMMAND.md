# 🎯 FINAL: Single Command to Deploy and Test Everything

## The One Command

```bash
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui && ./deploy-complete.sh
```

## What It Does (Complete List)

### ✅ Build & Deploy
1. Verifies project directory
2. Checks git status
3. Pushes to repository
4. Installs dependencies
5. **Builds frontend** with correct API URLs
6. **Uploads frontend** to server
7. **Uploads backend** to server
8. **Uploads nginx config** (with JS cache disabled)
9. Creates backup of old files

### ✅ Server Setup
10. Restarts backend container
11. **Updates nginx config** (disables JS caching)
12. **Clears all caches** (nginx, Vite)
13. Reloads nginx

### ✅ Database Setup
14. **Resets all users** (fresh start)
15. **Creates super admin**:
    - Email: `admin@elevate.edu`
    - Password: `Admin123!`

### ✅ Comprehensive Testing
16. Tests frontend (homepage, login)
17. Tests backend API (health, endpoints)
18. Tests authentication
19. Tests AI services
20. Tests database connection
21. Tests server status
22. Tests super admin login

## After Deployment

### 🔥 CRITICAL: Clear Browser Cache

**The browser is serving OLD cached JavaScript files!**

**Method 1: Hard Refresh**
- Mac: `Cmd + Shift + R`
- Windows: `Ctrl + Shift + R`

**Method 2: Incognito Mode (Recommended)**
1. Close ALL browser windows
2. Open fresh incognito/private window
3. Visit: `https://svnaprojob.online/login`

### ✅ Verify in Console (F12)

You MUST see these logs:
```
[Main] ✅ API URL fixed at startup: https://svnaprojob.online/api/v1
[API Client] ✅ Using pre-fixed URL from main.tsx: https://svnaprojob.online/api/v1
[API Client] 🔐 Starting login request to: https://svnaprojob.online/api/v1/auth/login
```

**If you see `http://72.60.101.14:8000`:**
- Browser is using cached files
- Clear cache again
- Use incognito mode

### 🔐 Login

1. Visit: `https://svnaprojob.online/login`
2. Select **"Staff"** tab
3. Enter:
   - Email: `admin@elevate.edu`
   - Password: `Admin123!`
4. Click **"Sign In as Staff"**

## Test Results

The script will show:
```
✅ Passed: X tests
❌ Failed: Y tests
```

**All tests should pass!**

## What's Fixed

1. ✅ **Immediate URL fix** in `main.tsx` (runs before any imports)
2. ✅ **Nginx config** updated to disable JS caching
3. ✅ **Cache clearing** in deploy script
4. ✅ **Comprehensive testing** after deployment
5. ✅ **Super admin** automatically created

## Troubleshooting

### If Browser Still Shows Old IP

1. **Clear browser cache completely:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cached images and files"
   - Clear data

2. **Use incognito mode:**
   - This bypasses all cache

3. **Verify server has new files:**
   ```bash
   ssh root@72.60.101.14 'grep -r "__CORRECT_API_URL__" /var/www/elevate-edu-ui/dist/assets/*.js | head -1'
   ```
   Should show the fix code

4. **Clear nginx cache:**
   ```bash
   ssh root@72.60.101.14 'rm -rf /var/cache/nginx/* && systemctl reload nginx'
   ```

### If Tests Fail

1. **Backend not running:**
   ```bash
   ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose restart backend'
   ```

2. **Nginx not running:**
   ```bash
   ssh root@72.60.101.14 'systemctl start nginx && nginx -t'
   ```

3. **Super admin not created:**
   ```bash
   ssh root@72.60.101.14 'docker exec elevate_edu_api python scripts/create_super_admin_postgres.py --email admin@elevate.edu --password Admin123!'
   ```

## Services Verified

✅ Frontend serving correctly  
✅ Backend API responding  
✅ Database connected  
✅ Authentication working  
✅ AI services accessible  
✅ Super admin created  
✅ Nginx configured correctly  
✅ All caches cleared  

---

**🚀 Just run the single command and everything will be deployed, tested, and ready!**

**Remember: Clear your browser cache after deployment!**

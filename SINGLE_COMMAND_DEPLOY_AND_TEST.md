# 🚀 Single Command: Deploy and Test Everything

## One Command to Rule Them All

```bash
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui && ./deploy-complete.sh
```

This single command will:
1. ✅ Build frontend with correct URLs
2. ✅ Upload to server
3. ✅ Clear all caches
4. ✅ Restart services
5. ✅ Create super admin
6. ✅ **Test all services automatically**

## What Gets Tested

### Frontend Tests
- ✅ Homepage loads
- ✅ Login page loads
- ✅ New code is deployed (URL fix present)

### Backend API Tests
- ✅ Health check endpoint
- ✅ API root endpoint
- ✅ Authentication endpoints

### Service Tests
- ✅ Backend container running
- ✅ Nginx running
- ✅ Database connected
- ✅ AI services (mock interview)

### Authentication Tests
- ✅ Login endpoint accepts requests
- ✅ Super admin can login

## After Deployment

### 1. Clear Browser Cache (CRITICAL)

**Option A: Hard Refresh**
```bash
# Mac: Cmd+Shift+R
# Windows: Ctrl+Shift+R
```

**Option B: Clear All Cache**
1. Close ALL browser windows
2. Open fresh incognito window
3. Visit: `https://svnaprojob.online/login`

### 2. Verify in Console (F12)

You should see:
```
[Main] ✅ API URL fixed at startup: https://svnaprojob.online/api/v1
[API Client] ✅ Using pre-fixed URL from main.tsx: https://svnaprojob.online/api/v1
```

**If you see `http://72.60.101.14:8000` anywhere:**
- Browser is still using cached files
- Clear cache again
- Use incognito mode

### 3. Login

- **Email**: `admin@elevate.edu`
- **Password**: `Admin123!`
- **URL**: `https://svnaprojob.online/login`
- **Tab**: Select "Staff"

## Manual Testing (If Needed)

If you want to test services separately:

```bash
# Test all services
./test-all-services.sh

# Test specific endpoint
curl -I https://svnaprojob.online/api/v1/health

# Check backend logs
ssh root@72.60.101.14 'docker-compose logs backend | tail -50'

# Check nginx status
ssh root@72.60.101.14 'systemctl status nginx'
```

## Troubleshooting

### If Tests Fail

1. **Backend not running:**
   ```bash
   ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose restart backend'
   ```

2. **Nginx not running:**
   ```bash
   ssh root@72.60.101.14 'systemctl start nginx && systemctl status nginx'
   ```

3. **Old code still cached:**
   ```bash
   ssh root@72.60.101.14 'rm -rf /var/cache/nginx/* && systemctl reload nginx'
   ```

### If Login Fails

1. **Check super admin exists:**
   ```bash
   ssh root@72.60.101.14 'docker exec elevate_edu_api python scripts/create_super_admin_postgres.py --email admin@elevate.edu --password Admin123!'
   ```

2. **Check backend logs:**
   ```bash
   ssh root@72.60.101.14 'docker-compose logs backend | grep -i error | tail -20'
   ```

## Services Checklist

After deployment, verify:

- [ ] Frontend loads at `https://svnaprojob.online`
- [ ] Login page works
- [ ] Console shows correct API URL (not old IP)
- [ ] Can login with super admin
- [ ] Can access dashboard
- [ ] Can create colleges/departments
- [ ] API endpoints respond correctly
- [ ] AI services are accessible

---

**🎯 Just run the single command and everything will be tested automatically!**

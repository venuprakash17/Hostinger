# 🎯 SINGLE COMMAND: Deploy, Test, and Fix Everything

## The One Command

```bash
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui && ./deploy-complete.sh
```

## What It Does

1. ✅ Builds frontend with correct URLs
2. ✅ Uploads to server
3. ✅ Updates nginx config (no cache for JS)
4. ✅ Clears all caches
5. ✅ Restarts nginx properly
6. ✅ Creates super admin
7. ✅ Tests all services

## After Deployment

### 🔥 CRITICAL: Clear Browser Cache

**The browser MUST load the new `index.html`!**

**Method 1: Hard Reload (3 Times)**
- Mac: `Cmd + Shift + R` (press 3 times)
- Windows: `Ctrl + Shift + R` (press 3 times)

**Method 2: Incognito Mode (Recommended)**
1. Close ALL browser windows
2. Open fresh incognito window
3. Visit: `https://svnaprojob.online/login?nocache=1`

**Method 3: Clear All Cache**
1. Chrome: `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
2. Select "Cached images and files"
3. Time: "All time"
4. Clear data

### ✅ Verify New Code

**Network Tab (F12):**
- Should see: `index-BcHTL9KV.js` (NOT `index-D7MacLd2.js`)

**Console (F12):**
Should see:
```
[Main] ✅ API URL fixed at startup: https://svnaprojob.online/api/v1
[API Client] ✅ Using pre-fixed URL from main.tsx: https://svnaprojob.online/api/v1
```

**If you see old IP or old build:**
- The runtime script will auto-reload
- Or clear cache again
- Use incognito mode

## Login

- URL: `https://svnaprojob.online/login`
- Tab: "Staff"
- Email: `admin@elevate.edu`
- Password: `Admin123!`

## What's Fixed

1. ✅ **HTML Meta Tags** - Prevents caching
2. ✅ **Runtime Detection** - Auto-reloads if old build
3. ✅ **Nginx Config** - No cache for JS files
4. ✅ **Enhanced main.tsx** - Multiple safety layers
5. ✅ **Proper nginx restart** - Not just reload

## Services Tested

✅ Frontend  
✅ Backend API  
✅ Authentication  
✅ AI Services  
✅ Database  
✅ Super Admin  

---

**🚀 Just run the command, clear browser cache, and it will work!**

**The runtime script will automatically reload if it detects old code!**

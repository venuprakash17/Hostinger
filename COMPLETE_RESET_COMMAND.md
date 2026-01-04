# 🔄 COMPLETE RESET - Single Command

## The Reset Command

```bash
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui && ./reset-and-deploy.sh
```

## What It Does

1. ✅ **Cleans local build** - Removes all cached files
2. ✅ **Builds fresh** - Complete new build
3. ✅ **Removes ALL old files on server** - Complete clean slate
4. ✅ **Uploads new files** - Fresh deployment
5. ✅ **Resets database** - Deletes ALL users
6. ✅ **Creates ONE super admin** - Fresh start
7. ✅ **Configures nginx** - HTTP-only (works without SSL)
8. ✅ **Restarts services** - Everything fresh

## After Reset

### 🔥 CRITICAL: Clear Browser Cache

**The browser MUST load new files!**

**Method 1: Incognito Mode (Easiest)**
1. Close ALL browser windows
2. Open fresh incognito/private window
3. Visit: `http://svnaprojob.online/login?nocache=1`

**Method 2: Hard Reload (3 Times)**
- Mac: `Cmd + Shift + R` (press 3 times)
- Windows: `Ctrl + Shift + R` (press 3 times)

**Method 3: Clear All Cache**
1. Chrome: `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
2. Select "Cached images and files"
3. Time: "All time"
4. Clear data

### ✅ Verify New Code

**Network Tab (F12):**
- Should see: `index-CjOie5ek.js` (or newer)
- Should NOT see: `index-D7MacLd2.js`

**Console (F12):**
Should see:
```
[Main] ✅ API URL fixed at startup: https://svnaprojob.online/api/v1
[Main] ✅ Fetch interceptor installed to block old IP
[API Client] ✅ Using pre-fixed URL from main.tsx: https://svnaprojob.online/api/v1
```

**If you see old IP:**
- The fetch interceptor will block it
- Check console for: `🚨 BLOCKED old IP in fetch call!`
- The URL will be automatically replaced

## Login

- URL: `http://svnaprojob.online/login`
- Tab: "Staff"
- Email: `admin@elevate.edu`
- Password: `Admin123!`

## What's Fixed

1. ✅ **Fetch Interceptor** - Blocks old IP at network level
2. ✅ **Complete Reset** - Everything fresh
3. ✅ **Database Reset** - Only one super admin
4. ✅ **Nginx HTTP Config** - Works without SSL
5. ✅ **No Cache for JS** - Forces browser to reload

## How Fetch Interceptor Works

```javascript
// Intercepts ALL fetch calls
window.fetch = function(input, init) {
  // If URL contains old IP
  if (url.includes('72.60.101.14:8000')) {
    // Automatically replace with correct URL
    url = url.replace('72.60.101.14:8000', 'svnaprojob.online');
  }
  // Continue with corrected URL
  return originalFetch(input, init);
}
```

This means **even if old code runs, the fetch interceptor will fix the URL**!

## Troubleshooting

### If Still Seeing Old IP

1. **Check fetch interceptor is installed:**
   - Console should show: `[Main] ✅ Fetch interceptor installed`
   - If not, the old build is still cached

2. **Clear browser cache completely:**
   - Close all windows
   - Clear browsing data
   - Use incognito mode

3. **Verify server has new files:**
   ```bash
   ssh root@72.60.101.14 'ls -la /var/www/elevate-edu-ui/dist/assets/index-*.js | tail -1'
   ```
   Should show new build hash

---

**🎯 Just run the reset command and clear browser cache - everything will be fresh!**

**The fetch interceptor will block old IP even if cached code runs!**

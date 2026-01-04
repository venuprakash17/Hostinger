# 🚀 DEPLOY NOW - FINAL FIX FOR CACHE ISSUE

## The Problem

Browser is serving **OLD cached JavaScript** (`index-D7MacLd2.js`) instead of new build (`index-BcHTL9KV.js`).

## The Solution

Added **3 layers of cache-busting**:

1. ✅ **HTML Meta Tags** - Prevent browser from caching HTML
2. ✅ **Runtime Detection** - Script detects old build and forces reload
3. ✅ **Nginx Config** - No cache for JS files

## Deploy Command

```bash
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui && ./deploy-complete.sh
```

## After Deployment - CRITICAL STEPS

### Step 1: Clear Browser Cache (MANDATORY)

**Option A: Hard Refresh (Do This 3 Times)**
- Mac: `Cmd + Shift + R` (press 3 times)
- Windows: `Ctrl + Shift + R` (press 3 times)

**Option B: Clear All Cache**
1. Chrome: `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
2. Select "Cached images and files"
3. Time range: "All time"
4. Click "Clear data"

**Option C: Incognito Mode (Easiest)**
1. Close ALL browser windows
2. Open fresh incognito/private window
3. Visit: `https://svnaprojob.online/login?nocache=1`

### Step 2: Verify New Code is Loading

**Check Network Tab (F12 → Network):**
- Should see: `index-BcHTL9KV.js` (or newer)
- Should NOT see: `index-D7MacLd2.js`

**Check Console (F12 → Console):**
Should see:
```
[Main] ✅ API URL fixed at startup: https://svnaprojob.online/api/v1
[Main] Fix timestamp: [number]
[API Client] ✅ Using pre-fixed URL from main.tsx: https://svnaprojob.online/api/v1
```

**If you see `index-D7MacLd2.js` or old IP:**
- Browser is still using cached files
- Clear cache again
- Use incognito mode
- The runtime script will auto-reload if it detects old build

### Step 3: Login

- URL: `https://svnaprojob.online/login`
- Tab: "Staff"
- Email: `admin@elevate.edu`
- Password: `Admin123!`

## What Was Fixed

1. ✅ **HTML Meta Tags** - Prevents browser caching
2. ✅ **Runtime Detection** - Auto-detects and reloads if old build
3. ✅ **Nginx Config** - Fixed `if` statements, no cache for JS
4. ✅ **Enhanced main.tsx** - Multiple safety checks
5. ✅ **Deploy Script** - Properly restarts nginx (not just reload)

## How It Works

1. **Browser loads HTML** → Meta tags prevent caching
2. **Script runs** → Checks for old build hash
3. **If old build detected** → Forces reload with `?nocache=timestamp`
4. **main.tsx runs** → Fixes URL immediately
5. **client.ts uses** → Pre-fixed URL from `window.__CORRECT_API_URL__`

## Troubleshooting

### If Still Seeing Old IP

1. **Verify server has new files:**
   ```bash
   ssh root@72.60.101.14 'ls -la /var/www/elevate-edu-ui/dist/assets/index-*.js | tail -1'
   ```
   Should show: `index-BcHTL9KV.js` (or newer)

2. **Clear nginx cache:**
   ```bash
   ssh root@72.60.101.14 'rm -rf /var/cache/nginx/* && systemctl restart nginx'
   ```

3. **Check nginx is running:**
   ```bash
   ssh root@72.60.101.14 'systemctl status nginx'
   ```

4. **Clear browser cache completely:**
   - Close all windows
   - Clear browsing data
   - Use incognito mode

### If Nginx Fails to Start

```bash
ssh root@72.60.101.14 'nginx -t'
# Fix any errors shown
ssh root@72.60.101.14 'systemctl restart nginx'
```

---

**🎯 The runtime detection will automatically reload if old code is detected!**

**Just deploy and clear your browser cache - the script will handle the rest!**

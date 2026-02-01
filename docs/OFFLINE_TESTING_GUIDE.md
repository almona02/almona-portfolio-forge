# Offline Testing Guide

## ✅ How to Test Offline Functionality

### Option 1: Test in Preview Mode (Recommended)

Preview mode is closest to production and includes service worker support:

```bash
# Build the app
npm run build

# Start preview server
npm run preview
```

Then:
1. Open `http://localhost:4173` in your browser
2. Wait for the service worker to register (check DevTools → Application → Service Workers)
3. Open DevTools → Network tab
4. Check "Offline" checkbox to simulate offline mode
5. Refresh the page - it should work offline!

### Option 2: Test in Dev Mode (Now Enabled)

I've enabled service worker in dev mode for testing:

```bash
# Start dev server
npm run dev
```

Then:
1. Open `http://localhost:3000` in your browser
2. Wait for service worker to register
3. Open DevTools → Network tab
4. Check "Offline" checkbox
5. Refresh - should work offline!

### Option 3: Test on Production Build

For the most accurate production testing:

```bash
# Build for production
npm run build

# Serve with a local server (or deploy)
# The service worker will be active
```

## 🔍 How to Verify Offline Mode

### 1. Check Service Worker Registration

**Chrome DevTools:**
- Open DevTools (F12)
- Go to **Application** tab
- Click **Service Workers** in left sidebar
- You should see your service worker registered

**Console:**
- Look for: `[Almona Egypt SW] Custom service worker registered`

### 2. Test Offline Mode

**Method 1: DevTools Network Tab**
1. Open DevTools → **Network** tab
2. Check **"Offline"** checkbox (top of Network tab)
3. Refresh the page
4. App should still work!

**Method 2: Chrome DevTools Application Tab**
1. Go to **Application** → **Service Workers**
2. Check **"Offline"** checkbox
3. Refresh the page

**Method 3: Disable Network (System Level)**
1. Turn off WiFi/Ethernet
2. Refresh the page
3. App should work from cache

### 3. Verify Cached Assets

**Chrome DevTools:**
- Go to **Application** → **Cache Storage**
- You should see caches like:
  - `almona-egypt-v1.0.0-egypt`
  - `google-fonts-cache`
  - `images-cache`
  - `static-assets-cache`

### 4. Test Offline Functionality

**What Should Work Offline:**
- ✅ App loads and displays
- ✅ Navigation between pages
- ✅ Cached images and assets
- ✅ Previously loaded data
- ✅ UI interactions

**What Won't Work Offline:**
- ❌ New API calls to Supabase
- ❌ Real-time data updates
- ❌ New data fetching
- ❌ External API requests

## 🛠️ Troubleshooting

### Service Worker Not Registering

**Check:**
1. Is the app running on `localhost` or `127.0.0.1`? (Required for service workers)
2. Is HTTPS enabled? (Required for production, not needed for localhost)
3. Check browser console for errors

**Fix:**
```bash
# Clear service workers
# Chrome DevTools → Application → Service Workers → Unregister

# Or clear all site data
# Chrome DevTools → Application → Clear storage → Clear site data
```

### App Not Working Offline

**Check:**
1. Did you wait for service worker to install? (Check console logs)
2. Are assets cached? (Check Cache Storage)
3. Is "Offline" mode actually enabled? (Check Network tab)

**Fix:**
```bash
# Force service worker update
# Chrome DevTools → Application → Service Workers → Update

# Or rebuild
npm run build
npm run preview
```

### Service Worker Conflicts

If you see multiple service workers:
1. Go to **Application** → **Service Workers**
2. Unregister all service workers
3. Refresh the page
4. Only one should register

## 📝 Testing Checklist

- [ ] Service worker registers successfully
- [ ] App loads in offline mode
- [ ] Navigation works offline
- [ ] Cached images display
- [ ] Previously loaded data is accessible
- [ ] UI remains functional
- [ ] No console errors in offline mode
- [ ] App reconnects when back online

## 🎯 Quick Test Commands

```bash
# Build and preview (best for offline testing)
npm run build && npm run preview

# Dev mode with service worker (now enabled)
npm run dev

# Check service worker status
# Open: http://localhost:4173 (or 3000)
# DevTools → Application → Service Workers
```

## 💡 Tips

1. **First Load:** Service worker needs to install first - wait a few seconds after page load
2. **Cache Updates:** Changes to code require rebuild - service worker caches the build
3. **Clear Cache:** Use "Hard Reload" (Ctrl+Shift+R) to bypass cache during development
4. **Production Testing:** Preview mode (`npm run preview`) is closest to production behavior

## 🔄 Reverting Dev Mode Changes

If you want to disable service worker in dev mode again:

Edit `vite.config.ts`:
```typescript
devOptions: {
  enabled: false, // Disable service worker in development
  type: 'module',
},
```

















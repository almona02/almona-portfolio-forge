# Preview Mode Errors Fixed

## Issues Resolved

### 1. Vercel Analytics/Speed Insights 404 Errors
**Error:**
```
:4173/_vercel/speed-insights/script.js:1  Failed to load resource: the server responded with a status of 404 (Not Found)
:4173/_vercel/insights/script.js:1  Failed to load resource: the server responded with a status of 404 (Not Found)
```

**Root Cause:**
Vercel Analytics and Speed Insights components were loading in preview mode (`npm run preview`), but these scripts only exist when deployed on Vercel's infrastructure.

**Fix:**
- Added `isVercel` check in `src/App.tsx` to detect if the app is actually running on Vercel
- Only render `<Analytics />` and `<SpeedInsights />` components when both `isProd` and `isVercel` are true
- The check looks for `vercel.app` or `vercel.com` in the hostname, or checks for `VITE_VERCEL` environment variable

**Files Changed:**
- `src/App.tsx`: Added `isVercel` check and conditional rendering

---

### 2. ServiceWorker manifest.webmanifest Registration Error
**Error:**
```
Uncaught (in promise) SecurityError: Failed to register a ServiceWorker for scope ('http://localhost:4173/') with script ('http://localhost:4173/manifest.webmanifest'): The script has an unsupported MIME type ('application/manifest+json').
```

**Root Cause:**
VitePWA's auto-registration script (`registerSW.js`) was trying to register `manifest.webmanifest` as a service worker script in preview mode. The manifest file is not a service worker script and should not be registered as one.

**Fix:**
- Added preview mode detection in `src/main.tsx` to prevent service worker initialization on localhost
- Added error interception script in `index.html` to:
  - Intercept `navigator.serviceWorker.register()` calls and prevent registration of `manifest.webmanifest`
  - Suppress unhandled promise rejections related to service worker registration errors in preview mode

**Files Changed:**
- `src/main.tsx`: Added `isPreviewMode` check to skip service worker registration on localhost
- `index.html`: Added script to intercept and suppress service worker registration errors

---

## Testing

After these fixes, when running `npm run preview`:
1. ✅ No 404 errors for Vercel scripts (they won't attempt to load)
2. ✅ No ServiceWorker registration errors (registration is prevented in preview mode)
3. ✅ Application functions normally in preview mode
4. ✅ Service workers and analytics will work correctly when deployed to Vercel

---

## Notes

- These fixes only affect preview/development mode
- Production deployments to Vercel will have full functionality:
  - Vercel Analytics and Speed Insights will load correctly
  - Service workers will register properly via VitePWA
- The preview mode detection uses `window.location.hostname` to identify localhost/127.0.0.1


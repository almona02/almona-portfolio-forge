# Production API URL Setup

## Issue
In production, API calls are failing because `VITE_API_URL` is not set, causing requests to go to the wrong URL (Supabase instead of your backend).

## Solution

### For Vercel Deployment:

1. **Go to your Vercel project settings**
2. **Navigate to Environment Variables**
3. **Add the following environment variable:**

   ```
   VITE_API_URL=https://your-backend-domain.com
   ```

   Replace `https://your-backend-domain.com` with your actual backend API URL (e.g., `https://api.yourdomain.com` or your Railway/Render backend URL).

4. **Redeploy your application** after adding the environment variable.

### For Other Platforms:

Set the `VITE_API_URL` environment variable in your deployment platform's environment variable settings.

## Verification

After setting `VITE_API_URL` and redeploying:

1. Open browser console
2. Look for: `📡 SmartScan API configured for: https://your-backend-url`
3. Try uploading a DXF file
4. Check Network tab - API calls should go to your backend, not Supabase

## Current Error

If you see errors like:
```
shfsebdncjnncqqnewfj.supabase.co/rest/v1/api/v2/smart-scan/...
```

This means `VITE_API_URL` is not set, and the app is trying to use `window.location.origin`, which causes requests to be intercepted incorrectly.

## DXF Direct Import Section

The "DXF/DWG Direct Import" section should be visible in the **SmartScan tab** of Profile Tuning Studio. If it's not visible, check:

1. You're on the correct tab (SmartScan tab, not other tabs)
2. The component is rendering (check browser console for errors)
3. The tab content is not hidden by CSS


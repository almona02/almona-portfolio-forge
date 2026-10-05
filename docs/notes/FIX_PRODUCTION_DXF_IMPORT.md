# 🔧 Fix Production DXF Import Issues

## Current Problems

1. ❌ **API calls going to Supabase** instead of Railway backend
2. ❌ **Using SmartScan** (async, requires Celery) instead of **DXF Direct Import** (synchronous)
3. ❌ **`import.meta` error** in production build

## ✅ Solution Steps

### Step 1: Set VITE_API_URL in Vercel (CRITICAL)

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select your project

2. **Settings → Environment Variables**
   - Click **Add New**
   - **Name:** `VITE_API_URL`
   - **Value:** `https://almona-portfolio-forge-production.up.railway.app`
   - **Environment:** Select all (Production, Preview, Development)
   - Click **Save**

3. **Redeploy Vercel**
   - Go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**
   - **OR** push a new commit to trigger auto-deploy

### Step 2: Use DXF Direct Import (Not SmartScan)

In Profile Tuning Studio → **SmartScan tab**, you should see **TWO sections**:

1. **🟢 DXF/DWG Direct Import** (at the top) ← **USE THIS FOR DXF FILES**
   - Green border/card
   - Says "Recommended for DXF"
   - Works immediately, no Celery needed
   - Shows SVG preview instantly

2. **🔵 SmartScan (Images & PDFs)** (below)
   - Blue border/card
   - For images/PDFs only
   - Requires Celery/Redis
   - Async processing

**⚠️ IMPORTANT:** Upload your DXF file in the **DXF/DWG Direct Import** section (green card at top), NOT in the SmartScan section!

### Step 3: Verify After Redeploy

1. **Check Browser Console (F12)**
   - Look for: `📡 SmartScan API configured for: https://almona-portfolio-forge-production.up.railway.app`
   - If you see `window.location.origin` or Supabase URL, `VITE_API_URL` is not set correctly

2. **Check Network Tab**
   - Upload a DXF file
   - API calls should go to: `https://almona-portfolio-forge-production.up.railway.app/api/v2/profile-import/ingest`
   - NOT to: `shfsebdncjnncqqnewfj.supabase.co/rest/v1/api/v2/...`

3. **Test DXF Upload**
   - Use the **DXF/DWG Direct Import** section (green card)
   - Upload `MC 1250 .dxf`
   - Should see SVG preview immediately
   - Should see dimensions extracted

## 🔍 Troubleshooting

### If DXF Direct Import section is not visible:

1. **Scroll down** in the SmartScan tab - it should be at the top
2. **Check browser console** for JavaScript errors
3. **Hard refresh** (Ctrl+Shift+R or Cmd+Shift+R)
4. **Clear browser cache**

### If still seeing Supabase URLs:

1. **Verify VITE_API_URL is set:**
   - Vercel Dashboard → Settings → Environment Variables
   - Should see `VITE_API_URL` with Railway URL

2. **Verify redeploy happened:**
   - Check Vercel Deployments tab
   - Latest deployment should be after you added the variable

3. **Check build logs:**
   - Vercel → Deployments → Latest → Build Logs
   - Look for any errors

### If `import.meta` error persists:

This is a build configuration issue. The error suggests a script is not being treated as a module. Check:
- Vite build configuration
- Script tags in HTML
- Service worker configuration

## ✅ Expected Behavior After Fix

1. ✅ Browser console shows: `📡 SmartScan API configured for: https://almona-portfolio-forge-production.up.railway.app`
2. ✅ Network requests go to Railway, not Supabase
3. ✅ DXF upload works in "DXF/DWG Direct Import" section
4. ✅ SVG preview appears immediately
5. ✅ Dimensions extracted (e.g., "91.5 × 100 mm")

## 📝 Quick Checklist

- [ ] `VITE_API_URL` set in Vercel environment variables
- [ ] Vercel redeployed after setting variable
- [ ] Using "DXF/DWG Direct Import" section (green card)
- [ ] NOT using SmartScan section for DXF files
- [ ] Browser console shows correct API URL
- [ ] Network tab shows requests to Railway backend


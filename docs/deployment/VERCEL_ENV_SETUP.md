# ✅ Vercel Environment Variable Setup

## Your Railway Backend URL

```
https://almona-portfolio-forge-production.up.railway.app
```

## Steps to Configure Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your `almona-portfolio-forge` project

2. **Navigate to Settings**
   - Click on **Settings** tab
   - Click on **Environment Variables** in the left sidebar

3. **Add the Backend URL**
   - Click **Add New**
   - **Name:** `VITE_API_URL`
   - **Value:** `https://almona-portfolio-forge-production.up.railway.app`
   - **Environment:** Select all (Production, Preview, Development)
   - Click **Save**

4. **Redeploy**
   - Go to **Deployments** tab
   - Click the **⋯** (three dots) on the latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger automatic redeploy

## Verify It Works

After redeploying, check the browser console (F12):
- Look for: `📡 SmartScan API configured for: https://almona-portfolio-forge-production.up.railway.app`
- Try uploading a DXF file - it should work!

## Test Backend Health

```bash
curl https://almona-portfolio-forge-production.up.railway.app/health
```

Expected response:
```json
{"status": "healthy", ...}
```

## Test API Routes

```bash
curl https://almona-portfolio-forge-production.up.railway.app/api/v2/smart-scan/supported-formats
```

Expected response:
```json
{"formats": ["dxf", "dwg", "pdf", "png", "jpg", ...]}
```


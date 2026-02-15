# 🔑 Vercel Environment Variables Guide

**Complete list of environment variables needed for Vercel deployment.**

---

## ✅ Required Variables

### Supabase (Critical)
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**How to get:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Settings → API
4. Copy "Project URL" → `VITE_SUPABASE_URL`
5. Copy "anon public" key → `VITE_SUPABASE_ANON_KEY` (use anon key, NOT service_role)

### Backend API (Critical)
```bash
VITE_API_URL=https://your-backend-url.railway.app
```

**How to get:**
- After deploying backend (Railway/Render), use the provided URL
- Example: `https://almona-backend-production.railway.app`

---

## 🎯 Optional Variables (Recommended)

### AI Services
```bash
VITE_GEMINI_KEY=your_google_gemini_api_key
```

**How to get:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Copy → `VITE_GEMINI_KEY`

### Maps & Location
```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

**How to get:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable "Maps JavaScript API"
3. Create credentials → API Key
4. Copy → `VITE_GOOGLE_MAPS_API_KEY`

### Analytics
```bash
VITE_ENABLE_ANALYTICS=true
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

**How to get:**
1. Go to [Google Analytics](https://analytics.google.com)
2. Create GA4 property
3. Get Measurement ID → `VITE_GOOGLE_ANALYTICS_ID`

---

## 📋 How to Set in Vercel

### Method 1: Vercel Dashboard

1. Go to your project on [vercel.com](https://vercel.com)
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter variable name and value
5. Select environments: **Production**, **Preview**, **Development**
6. Click **Save**

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Set environment variable
vercel env add VITE_SUPABASE_URL production
# (Enter value when prompted)

# Pull environment variables
vercel env pull .env.local
```

### Method 3: GitHub Secrets (for CI/CD)

If using GitHub Actions, also set in:
- **Repository → Settings → Secrets and variables → Actions**

---

## 🔄 Environment-Specific Variables

### Production
```bash
VITE_API_URL=https://api.almona.com
VITE_ENABLE_ANALYTICS=true
```

### Preview (Pull Requests)
```bash
VITE_API_URL=https://api-staging.almona.com
VITE_ENABLE_ANALYTICS=false
```

### Development
```bash
VITE_API_URL=http://localhost:8002
VITE_ENABLE_ANALYTICS=false
```

**Note:** Vercel automatically uses the correct environment based on deployment type.

---

## ✅ Verification

After setting variables:

1. **Redeploy** (if variables were added after deployment)
   - Go to Deployments
   - Click "..." → "Redeploy"

2. **Check Build Logs**
   - Verify variables are loaded
   - Check for any missing variable warnings

3. **Test in Browser**
   - Open browser console
   - Check for API connection errors
   - Verify Supabase connection

---

## 🚨 Common Issues

### Issue: Variables not loading
**Solution:**
- Ensure variable names start with `VITE_`
- Redeploy after adding variables
- Check variable is set for correct environment

### Issue: API calls fail
**Solution:**
- Verify `VITE_API_URL` is correct
- Check backend CORS includes Vercel domain
- Verify backend is running

### Issue: Supabase connection fails
**Solution:**
- Verify `VITE_SUPABASE_URL` format (must include `https://`)
- Check `VITE_SUPABASE_ANON_KEY` is the anon key (not service role)
- Verify Supabase project is active

---

## 📝 Complete Variable List

```bash
# ============================================
# VERCEL ENVIRONMENT VARIABLES TEMPLATE
# ============================================

# REQUIRED - Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# REQUIRED - Backend API
VITE_API_URL=

# OPTIONAL - AI Services
VITE_GEMINI_KEY=

# OPTIONAL - Maps
VITE_GOOGLE_MAPS_API_KEY=

# OPTIONAL - Analytics
VITE_ENABLE_ANALYTICS=true
VITE_GOOGLE_ANALYTICS_ID=

# OPTIONAL - Feature Flags
VITE_ENABLE_ML_PREDICTIONS=true
VITE_ENABLE_REALTIME_SYNC=true
```

---

**Ready to deploy?** Set these variables and push to `main`! 🚀


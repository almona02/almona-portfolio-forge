# 🚀 Production Deployment Setup Guide

**Date:** 2025-01-XX  
**Status:** ✅ **READY FOR PRODUCTION**

---

## 📋 Overview

This guide covers deploying Fabricator Pro to production using:
- **Frontend:** Vercel (automatic GitHub triggers)
- **Backend:** Railway/Render/AWS (Docker container)

---

## 🎯 Quick Start Checklist

### Prerequisites
- [ ] GitHub repository connected
- [ ] Vercel account created
- [ ] Backend hosting account (Railway/Render)
- [ ] Supabase project configured
- [ ] Environment variables ready

### Deployment Steps
1. [ ] Configure GitHub Secrets
2. [ ] Set up Vercel project
3. [ ] Deploy backend
4. [ ] Configure environment variables
5. [ ] Test production deployment

---

## 🔧 Step 1: GitHub Secrets Configuration

Go to: **Repository → Settings → Secrets and variables → Actions**

### Required Secrets

#### Vercel Secrets
```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

**How to get Vercel credentials:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel login`
3. Run: `vercel link` (in your project directory)
4. Get token: [Vercel Tokens](https://vercel.com/account/tokens)
5. Get Org/Project IDs: Check `.vercel/project.json` after linking

#### Docker Hub Secrets (for backend)
```bash
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_docker_password
```

#### Frontend Environment Variables (for Vercel)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_API_URL=https://your-backend-url.com
```

**Note:** These will also be set in Vercel dashboard, but GitHub Actions needs them for build.

---

## 🌐 Step 2: Vercel Frontend Deployment

### Option A: Automatic (GitHub Integration)

1. **Connect Repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration

2. **Configure Build Settings**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`

3. **Set Environment Variables in Vercel**
   - Go to Project → Settings → Environment Variables
   - Add all `VITE_*` variables (see below)

4. **Enable Automatic Deployments**
   - Production: Deploy on push to `main` branch
   - Preview: Deploy on pull requests

### Option B: GitHub Actions (Current Setup)

The workflow `.github/workflows/production.yml` will automatically:
- Build frontend
- Deploy to Vercel on push to `main`
- Use secrets from GitHub repository

**Trigger:** Push to `main` branch or manual workflow dispatch

---

## 🔧 Step 3: Backend Deployment

### Option A: Railway (Recommended - Easy Setup)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**
   - Add service → "Dockerfile"
   - Set Dockerfile path: `python_backend/Dockerfile.realistic`
   - Railway will auto-detect and build

4. **Set Environment Variables**
   ```bash
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_service_role_key
   SECRET_KEY=your_secret_key
   TZ=Africa/Cairo
   LANG=ar_EG.UTF-8
   ```

5. **Deploy**
   - Railway will automatically deploy on push to `main`
   - Get your backend URL: `https://your-app.railway.app`

### Option B: Render (Free Tier Available)

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign in with GitHub

2. **Create Web Service**
   - New → Web Service
   - Connect GitHub repository
   - Select branch: `main`

3. **Configure Service**
   - Environment: **Docker**
   - Dockerfile Path: `python_backend/Dockerfile.realistic`
   - Build Command: (auto-detected)
   - Start Command: (auto-detected)

4. **Set Environment Variables**
   - Same as Railway (see above)

5. **Deploy**
   - Render will build and deploy
   - Get your backend URL: `https://your-app.onrender.com`

### Option C: AWS ECS (Enterprise)

1. **Push Docker Image to ECR**
   ```bash
   aws ecr create-repository --repository-name almona-backend
   docker tag almona-backend:latest your-account.dkr.ecr.region.amazonaws.com/almona-backend:latest
   docker push your-account.dkr.ecr.region.amazonaws.com/almona-backend:latest
   ```

2. **Create ECS Task Definition**
   - Use the pushed image
   - Configure environment variables
   - Set resource limits

3. **Create ECS Service**
   - Use Fargate or EC2
   - Configure load balancer
   - Set up auto-scaling

---

## 🔑 Step 4: Environment Variables

### Frontend (Vercel)

Go to: **Vercel Project → Settings → Environment Variables**

```bash
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_API_URL=https://your-backend-url.railway.app

# Optional (for enhanced features)
VITE_GEMINI_KEY=your_gemini_api_key
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
VITE_ENABLE_ANALYTICS=true
VITE_GOOGLE_ANALYTICS_ID=your_ga_id
```

### Backend (Railway/Render)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Locale
TZ=Africa/Cairo
LANG=ar_EG.UTF-8
LC_ALL=ar_EG.UTF-8

# CORS (update with your Vercel domain)
ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.almona02.com
```

---

## 🔄 Step 5: Update Backend CORS

After deploying frontend, update backend CORS to include your Vercel domain:

**File:** `python_backend/apis/main.py`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Development
        "https://your-app.vercel.app",  # ← Add your Vercel domain
        "https://www.almona02.com",  # Production domain
        # ... other domains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Then redeploy backend.**

---

## ✅ Step 6: Verification

### Test Frontend
1. Visit your Vercel deployment URL
2. Check browser console for errors
3. Verify Supabase connection
4. Test API calls to backend

### Test Backend
1. Visit: `https://your-backend-url.com/health`
2. Should return: `{"status": "healthy"}`
3. Test API endpoint: `https://your-backend-url.com/api/v2/...`

### Test Full Workflow
1. **DXF Import:** Upload a DXF file
2. **Profile Tuning:** Tune a profile
3. **Drawing:** Create a window design
4. **Optimization:** Run cutting optimization
5. **Export:** Generate CNC G-code

---

## 🚨 Troubleshooting

### Frontend Issues

**Problem:** White screen / Build fails
- **Solution:** Check Vercel build logs
- **Check:** Environment variables are set correctly
- **Verify:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` are correct

**Problem:** API calls fail
- **Solution:** Verify `VITE_API_URL` points to correct backend
- **Check:** Backend CORS includes Vercel domain
- **Verify:** Backend is running and accessible

### Backend Issues

**Problem:** Backend won't start
- **Solution:** Check Railway/Render logs
- **Check:** `DATABASE_URL` is correct
- **Verify:** All required environment variables are set

**Problem:** CORS errors
- **Solution:** Update `allow_origins` in `main.py`
- **Add:** Your Vercel domain to CORS list
- **Redeploy:** Backend after changes

---

## 📊 Monitoring

### Vercel Analytics
- Go to Vercel dashboard → Analytics
- Monitor page views, performance, errors

### Backend Monitoring
- **Railway:** Built-in logs and metrics
- **Render:** Logs dashboard
- **AWS:** CloudWatch logs

### Error Tracking
- Set up Sentry (optional)
- Monitor browser console errors
- Check backend logs regularly

---

## 🔄 Continuous Deployment

### Automatic Deployments

**Frontend (Vercel):**
- ✅ Deploys on push to `main`
- ✅ Preview deployments on PRs
- ✅ Automatic rollback on errors

**Backend (Railway/Render):**
- ✅ Deploys on push to `main` (if connected)
- ✅ Manual deployment via dashboard
- ✅ Docker image updates trigger redeploy

### Manual Deployment

**Trigger via GitHub Actions:**
```bash
# Go to: Repository → Actions → Production CI/CD Pipeline
# Click: "Run workflow" → Select branch → Run
```

---

## 📝 Post-Deployment Checklist

- [ ] Frontend loads without errors
- [ ] Backend health check passes
- [ ] DXF import works
- [ ] Profile tuning works
- [ ] Drawing/optimization works
- [ ] CNC export works
- [ ] Arabic interface displays correctly
- [ ] Performance is acceptable on Egyptian internet
- [ ] Error tracking is configured
- [ ] Monitoring is set up

---

## 🎯 Next Steps

1. **Test with Pilot Workshop**
   - Share production URL
   - Collect feedback
   - Monitor usage

2. **Optimize Performance**
   - Monitor load times
   - Optimize images
   - Cache static assets

3. **Scale as Needed**
   - Monitor backend resources
   - Scale up if needed
   - Add CDN if necessary

---

## 📞 Support

**Issues?**
- Check deployment logs
- Review environment variables
- Verify CORS configuration
- Check GitHub Actions workflow

**Ready to deploy?** Push to `main` and watch the magic happen! 🚀


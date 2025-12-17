# ⚡ Deployment Quick Start

**Get Fabricator Pro live in 15 minutes!**

---

## 🚀 3-Step Deployment

### Step 1: Set GitHub Secrets (5 min)

Go to: **Repository → Settings → Secrets and variables → Actions**

Add these secrets:
```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_API_URL=https://your-backend-url.railway.app  # (set after backend deploy)
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_docker_password
```

**Get Vercel credentials:**
```bash
npm i -g vercel
vercel login
vercel link
# Check .vercel/project.json for IDs
# Get token: https://vercel.com/account/tokens
```

---

### Step 2: Deploy Backend (5 min)

**Option A: Railway (Recommended)**
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select repository
4. Add PostgreSQL database
5. Set environment variables (see `docs/BACKEND_DEPLOYMENT_OPTIONS.md`)
6. Get backend URL: `https://your-app.railway.app`

**Option B: Render (Free)**
1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Environment: Docker
5. Dockerfile: `python_backend/Dockerfile.realistic`
6. Add PostgreSQL
7. Set environment variables
8. Get backend URL: `https://your-app.onrender.com`

---

### Step 3: Deploy Frontend (5 min)

**Option A: Automatic (GitHub Actions)**
- Push to `main` branch
- GitHub Actions will automatically deploy to Vercel
- Check Actions tab for deployment status

**Option B: Manual (Vercel Dashboard)**
1. Go to [vercel.com](https://vercel.com)
2. Add New Project
3. Import GitHub repository
4. Framework: Vite
5. Set environment variables:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_KEY=your_supabase_anon_key
   VITE_API_URL=https://your-backend-url.railway.app
   ```
6. Deploy!

---

## ✅ Verify Deployment

1. **Frontend:** Visit Vercel deployment URL
2. **Backend:** Visit `https://your-backend-url.com/health`
3. **Test Workflow:**
   - Upload DXF file
   - Tune profile
   - Draw window
   - Optimize cuts
   - Export G-code

---

## 🔧 Update CORS

After deploying, update backend CORS:

**File:** `python_backend/apis/main.py`

Add your Vercel domain to `allow_origins`:
```python
allow_origins=[
    "https://your-app.vercel.app",  # ← Add this
    "https://www.almona02.com",
    # ...
]
```

Then redeploy backend.

---

## 📚 Full Documentation

- **Complete Guide:** `docs/PRODUCTION_DEPLOYMENT_SETUP.md`
- **Environment Variables:** `docs/VERCEL_ENVIRONMENT_VARIABLES.md`
- **Backend Options:** `docs/BACKEND_DEPLOYMENT_OPTIONS.md`

---

## 🎯 Next Steps

1. ✅ Deploy to production
2. ✅ Share URL with pilot workshop
3. ✅ Collect feedback
4. ✅ Polish based on real usage
5. ✅ Prepare for Minister meeting

---

**Ready?** Push to `main` and watch it deploy! 🚀


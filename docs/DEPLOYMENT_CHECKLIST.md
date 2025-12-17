# ✅ Production Deployment Checklist

**Complete this checklist to get Fabricator Pro live!**

---

## 🎯 Step 1: Deploy Backend (Choose One)

### Option A: Railway (Recommended - 5 minutes)

- [ ] Go to [railway.app](https://railway.app)
- [ ] Sign in with GitHub
- [ ] New Project → Deploy from GitHub repo
- [ ] Select `almona-portfolio-forge` repository
- [ ] Add service → Dockerfile
- [ ] Set Dockerfile path: `python_backend/Dockerfile.realistic`
- [ ] Set port: `8000`
- [ ] Add PostgreSQL database
- [ ] Set environment variables (see below)
- [ ] Deploy
- [ ] **Copy backend URL:** `https://your-app.railway.app`

### Option B: Render (Free Tier - 10 minutes)

- [ ] Go to [render.com](https://render.com)
- [ ] Sign in with GitHub
- [ ] New → Web Service
- [ ] Connect GitHub repository
- [ ] Configure:
  - Environment: **Docker**
  - Dockerfile Path: `python_backend/Dockerfile.realistic`
  - Health Check: `/health`
- [ ] Add PostgreSQL database
- [ ] Set environment variables (see below)
- [ ] Deploy
- [ ] **Copy backend URL:** `https://your-app.onrender.com`

---

## 🔑 Step 2: Backend Environment Variables

Set these in Railway/Render:

```bash
# Database (auto-provided if using Railway/Render PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis (optional, for background tasks)
REDIS_URL=redis://localhost:6379/0

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key

# Security
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Locale (Egyptian)
TZ=Africa/Cairo
LANG=ar_EG.UTF-8
LC_ALL=ar_EG.UTF-8
```

---

## 🌐 Step 3: Configure Vercel Environment Variables

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

- [ ] Add `VITE_SUPABASE_URL`
  - Value: `https://your-project.supabase.co`
- [ ] Add `VITE_SUPABASE_KEY`
  - Value: Your Supabase anon key
- [ ] Add `VITE_API_URL`
  - Value: Your backend URL (from Step 1)
  - Example: `https://your-app.railway.app`
- [ ] **Redeploy** Vercel (if variables were added after deployment)

---

## ✅ Step 4: Verify Deployment

### Backend Health Check
- [ ] Visit: `https://your-backend-url.com/health`
- [ ] Should return: `{"status": "healthy"}`

### Frontend Check
- [ ] Visit your Vercel deployment URL
- [ ] Check browser console (F12) - no CORS errors
- [ ] Verify Supabase connection works

---

## 🧪 Step 5: Test Complete Workflow

- [ ] **DXF Import:** Upload a DXF file
- [ ] **Profile Tuning:** Tune a profile
- [ ] **Drawing:** Create a window design
- [ ] **Optimization:** Run cutting optimization
- [ ] **CNC Export:** Generate G-code
- [ ] **Arabic Interface:** Verify RTL and Arabic text display

---

## 📊 Step 6: Monitor & Document

- [ ] Check Railway/Render logs for errors
- [ ] Check Vercel deployment logs
- [ ] Test on Egyptian internet connection
- [ ] Document any issues
- [ ] Fix issues immediately

---

## 🎯 Step 7: Share with Pilot Workshop

- [ ] Share Vercel production URL
- [ ] Provide quick start guide
- [ ] Collect feedback
- [ ] Monitor usage

---

## ✅ Deployment Complete When:

- [x] Backend deployed and accessible
- [x] Frontend deployed to Vercel
- [x] Environment variables configured
- [x] Health checks passing
- [x] Full workflow tested
- [x] No console errors
- [x] Arabic interface working

---

## 🚨 Troubleshooting

### Backend won't start
- Check environment variables are set
- Verify `DATABASE_URL` is correct
- Check Railway/Render logs

### CORS errors
- Verify backend CORS includes Vercel domain
- Check `VITE_API_URL` is correct
- Redeploy backend after CORS changes

### Frontend can't connect to backend
- Verify `VITE_API_URL` is set in Vercel
- Check backend is running
- Verify backend URL is accessible

---

**Ready?** Start with Step 1 and work through the checklist! 🚀


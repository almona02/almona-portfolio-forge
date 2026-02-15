# 🚀 DEPLOY NOW - Quick Start Guide

**Get Fabricator Pro live in 15 minutes!**

---

## ⚡ 3-Step Deployment

### Step 1: Deploy Backend (5 min)

**Railway (Easiest):**
1. Go to [railway.app](https://railway.app) → Sign in with GitHub
2. New Project → Deploy from GitHub repo
3. Select `almona-portfolio-forge`
4. Add service → Dockerfile
5. **Settings → Dockerfile Path:** `python_backend/Dockerfile.realistic` ⚠️ **IMPORTANT: Use backend Dockerfile, NOT frontend!**
6. **Settings → Port:** `8000`
7. Add PostgreSQL database (New → Database → PostgreSQL)
8. Set environment variables (see below)
9. **Copy backend URL:** Settings → Networking → Public Domain

**Or Render (Free):**
1. Go to [render.com](https://render.com) → Sign in with GitHub
2. New → Web Service
3. Connect repo → Environment: **Docker**
4. Dockerfile: `python_backend/Dockerfile.realistic`
5. Add PostgreSQL
6. Set environment variables
7. **Copy backend URL:** `https://your-app.onrender.com`

---

### Step 2: Set Vercel Environment Variables (2 min)

Go to: **Vercel Dashboard → Project → Settings → Environment Variables**

Add:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=https://your-backend.railway.app  # ← Your backend URL from Step 1
```

**Redeploy** Vercel (if variables added after deployment)

---

### Step 3: Verify & Test (5 min)

**Backend:**
```bash
curl https://your-backend-url.com/health
# Should return: {"status": "healthy"}
```

**Frontend:**
- Visit Vercel URL
- Check browser console (F12) - no errors
- Test DXF import → tuning → optimization → export

---

## 🔑 Backend Environment Variables

Set these in Railway/Render:

```bash
# Database (auto if using Railway/Render PostgreSQL)
DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key

# Security
SECRET_KEY=your_secret_key
TZ=Africa/Cairo
LANG=ar_EG.UTF-8
LC_ALL=ar_EG.UTF-8
```

---

## ✅ Complete Checklist

- [ ] Backend deployed to Railway/Render
- [ ] Backend URL copied
- [ ] Vercel environment variables set
- [ ] Vercel redeployed (if needed)
- [ ] Backend health check passes
- [ ] Frontend loads without errors
- [ ] DXF import works
- [ ] Profile tuning works
- [ ] Optimization works
- [ ] CNC export works
- [ ] Arabic interface displays correctly

---

## 🎯 You're Done When:

✅ Backend accessible at `https://your-backend-url.com/health`  
✅ Frontend accessible at `https://your-app.vercel.app`  
✅ Full workflow tested and working  
✅ No console errors  
✅ Ready to share with pilot workshop  

---

## 📚 Full Documentation

- **Vercel via Git:** `docs/VERCEL_GIT_DEPLOYMENT.md`
- **Complete Guide:** `docs/DEPLOYMENT_CHECKLIST.md`
- **Backend Options:** `docs/BACKEND_DEPLOYMENT_OPTIONS.md`
- **Environment Variables:** `docs/VERCEL_ENVIRONMENT_VARIABLES.md`

---

## 🚨 Quick Troubleshooting

**Backend won't start?**
- Check environment variables
- Verify `DATABASE_URL` is correct
- Check Railway/Render logs

**CORS errors?**
- Backend CORS already configured for all Vercel domains
- Verify `VITE_API_URL` is correct

**Frontend can't connect?**
- Check `VITE_API_URL` in Vercel
- Verify backend is running
- Check browser console for errors

---

**Ready?** Start with Step 1! 🚀

# ⚡ Quick Railway Setup - Existing Project

## 🎯 Add YDT to Your Existing Railway Project

### 1. Add New Service
- Railway Dashboard → Your Project
- Click "New Service" → "GitHub Repo"
- Select your repo
- **Root Directory**: `python_backend`

### 2. Set Environment Variables

**Required:**
```
GOOGLE_GEMINI_API_KEY=your-key
SECRET_KEY=your-secret
ALLOWED_ORIGINS=https://yourdomain.com
```

**Optional (connect to existing services):**
```
REDIS_URL=${{redis.REDIS_URL}}
DATABASE_URL=${{postgres.DATABASE_URL}}
```

### 3. Deploy
Railway auto-deploys! Just wait for build to complete.

### 4. Test
```bash
curl https://your-service.railway.app/api/health
```

## ✅ Done!

Your YDT service is now running alongside Redis and Postgres!

---

**Full Guide**: See `RAILWAY_EXISTING_PROJECT.md`


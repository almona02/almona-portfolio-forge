# 🚂 Railway Backend Deployment - Step by Step

**Exact settings for deploying backend to Railway**

---

## 📋 Railway Configuration

### Step 1: Create New Project
1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose **`almona-portfolio-forge`** repository

---

### Step 2: Add Backend Service

**Option A: Auto-detected (if Railway finds Dockerfile)**
- Railway may auto-detect the backend
- If so, skip to Step 3

**Option B: Manual Service Creation**
1. Click **"New"** → **"Service"**
2. Select **"GitHub Repo"**
3. Choose **`almona-portfolio-forge`**

---

### Step 3: Configure Service Settings

Go to: **Service → Settings**

#### Dockerfile Path (CRITICAL)
```
python_backend/Dockerfile.realistic
```

**Important:** 
- ✅ Use `python_backend/Dockerfile.realistic` (NOT frontend Dockerfiles)
- ❌ Don't use `Dockerfile.frontend.realistic` (that's for frontend)
- ❌ Don't use root-level Dockerfiles

#### Port
```
8000
```

#### Root Directory (if needed)
```
python_backend
```

---

### Step 4: Add PostgreSQL Database

1. Click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway creates database automatically
3. **Copy the DATABASE_URL** from the database service
   - It will be in format: `postgresql://user:pass@host:5432/dbname`

---

### Step 5: Set Environment Variables

Go to: **Service → Variables**

Add these variables:

```bash
# Database (from PostgreSQL service)
DATABASE_URL=${{Postgres.DATABASE_URL}}
# OR manually: postgresql://user:pass@host:5432/dbname

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

# Optional: Redis (if you add Redis service)
REDIS_URL=${{Redis.REDIS_URL}}
```

**Note:** Railway can reference other services using `${{ServiceName.VARIABLE_NAME}}`

---

### Step 6: Deploy

1. Railway will automatically start building
2. Watch the **Deployments** tab for build progress
3. Once deployed, get your backend URL:
   - Go to **Settings** → **Networking**
   - Copy the **Public Domain** (e.g., `https://your-app.railway.app`)

---

## ✅ Verification

### Check Deployment
1. Go to **Deployments** tab
2. Wait for build to complete (green checkmark)
3. Check **Logs** tab for any errors

### Test Backend
```bash
curl https://your-app.railway.app/health
# Should return: {"status": "healthy"}
```

---

## 🎯 Quick Reference

| Setting | Value |
|---------|-------|
| **Dockerfile Path** | `python_backend/Dockerfile.realistic` |
| **Port** | `8000` |
| **Root Directory** | `python_backend` (if needed) |
| **Health Check** | `/health` |

---

## 🚨 Common Mistakes

❌ **Wrong Dockerfile:**
- Using `Dockerfile.frontend.realistic` → This is for frontend!
- Using root-level Dockerfile → Wrong location

✅ **Correct:**
- `python_backend/Dockerfile.realistic` → Backend Dockerfile

❌ **Wrong Port:**
- Using port 3000 or 5173 → Those are frontend ports

✅ **Correct:**
- Port 8000 → Backend API port

---

## 📝 After Deployment

1. **Copy Backend URL:** `https://your-app.railway.app`
2. **Update Vercel:** Set `VITE_API_URL` to your Railway URL
3. **Test:** Visit Vercel frontend and test full workflow

---

**Ready?** Follow these exact settings and you'll be live in 5 minutes! 🚀


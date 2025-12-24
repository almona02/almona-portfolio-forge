# 🔧 Railway Dockerfile Fix - Using Correct Dockerfile

## 🚨 The Problem

Railway found **two Dockerfiles**:
1. `Dockerfile` at root (for main backend) ❌ - Railway is using this
2. `python_backend/Dockerfile` (for YDT) ✅ - Railway is skipping this

The root Dockerfile expects `requirements.txt` at root, which doesn't exist, causing the build to fail.

## ✅ Solution: Change Root Directory

### Step 1: Update Railway Settings

In your Railway service settings:

1. **Root Directory**: Change from `/` to `python_backend`
2. **Dockerfile Path**: Change from `/python_backend/Dockerfile` to `Dockerfile`

**Why?**
- Root directory `python_backend` means Railway builds from that folder
- Dockerfile path `Dockerfile` is relative to the root directory
- This way Railway uses `python_backend/Dockerfile` (our YDT Dockerfile)

### Step 2: Update Dockerfile Paths (If Needed)

Since we're building from `python_backend/`, we need to update the Dockerfile to access `ai_agents/` correctly.

**Current Dockerfile has:**
```dockerfile
COPY ai_agents/ydt_agent/ ./ai_agents/ydt_agent/
```

**This won't work** if building from `python_backend/` because `ai_agents/` is at the project root.

## 🔄 Two Options

### Option A: Build from Project Root (Recommended)

**Railway Settings:**
- **Root Directory**: `/` (project root)
- **Dockerfile Path**: `python_backend/Dockerfile`

**But Railway is using root Dockerfile!** We need to explicitly tell it to use our Dockerfile.

**Solution**: Create/update `railway.json` at project root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "python_backend/Dockerfile"
  }
}
```

### Option B: Build from python_backend (Easier)

**Railway Settings:**
- **Root Directory**: `python_backend`
- **Dockerfile Path**: `Dockerfile`

**But then we need to update Dockerfile** to access `../ai_agents/` (which Docker doesn't allow in COPY).

**Better solution**: Update Dockerfile to work from `python_backend/` context.

## ✅ Recommended Fix

### Update Railway Settings:

1. Go to Railway Dashboard → Your YDT service → Settings
2. **Build Section**:
   - **Root Directory**: `python_backend`
   - **Dockerfile Path**: `Dockerfile`
3. **Save**

### Update Dockerfile for python_backend Context:

We need to modify the Dockerfile to copy from parent directory. But Docker doesn't allow `../` in COPY.

**Alternative**: Copy files during build or use a different approach.

Actually, the **best solution** is to keep root directory as `/` but ensure Railway uses the correct Dockerfile.

## 🎯 Best Solution: Use railway.json

Create `railway.json` at **project root** (not in python_backend):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "python_backend/Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port $PORT --workers ${API_WORKERS:-4}",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

This tells Railway to:
- Build from project root
- Use `python_backend/Dockerfile` (not root `Dockerfile`)
- Our Dockerfile can access `ai_agents/` correctly

## 📝 Steps to Fix

1. **Create `railway.json` at project root** (if not exists)
2. **Set Root Directory to `/`** (project root)
3. **Set Dockerfile Path to `python_backend/Dockerfile`**
4. **Redeploy**

Railway should now use the correct Dockerfile!

---

**Quick Fix**: Set Root Directory to `python_backend` and Dockerfile Path to `Dockerfile`, then update Dockerfile to handle the build context.


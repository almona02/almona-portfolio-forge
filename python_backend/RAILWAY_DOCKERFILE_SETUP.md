# 🐳 Railway Dockerfile Configuration

## ✅ Good News: Dockerfile Exists!

The Dockerfile is at: `python_backend/Dockerfile`

## ⚠️ Important: Build Context

The Dockerfile needs to build from the **project root** (not from `python_backend/`) because it needs to access:
- `ai_agents/ydt_agent/` (YDT agent code)
- `ai_agents/ydt_agent/knowledge/` (Knowledge base)

## 🔧 Configure Railway to Use Dockerfile

### Option 1: Railway Dashboard (Recommended)

1. **Go to your YDT service** in Railway
2. **Click "Settings"** tab
3. **Scroll to "Build" section**
4. **Set these values**:
   - **Root Directory**: `python_backend`
   - **Dockerfile Path**: `Dockerfile` (or `python_backend/Dockerfile` if Railway needs full path)
   - **Build Command**: (leave empty - Dockerfile handles it)
   - **Start Command**: (leave empty - Dockerfile CMD handles it)

### Option 2: Update railway.json

The `railway.json` file should configure this. Make sure it's in your repo root or `python_backend/`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "python_backend/Dockerfile"
  }
}
```

### Option 3: Railway CLI

If using Railway CLI, you can specify:

```bash
railway up --dockerfile python_backend/Dockerfile
```

## 🚨 Critical: Build Context Issue

**Problem**: The Dockerfile copies `ai_agents/ydt_agent/` but Railway builds from `python_backend/` directory.

**Solution**: Update Railway settings:

1. **Root Directory**: Leave as `python_backend` (or set to project root)
2. **Dockerfile Path**: `Dockerfile` (relative to root directory)

**OR** update the Dockerfile to work with Railway's build context.

## 🔄 Two Options

### Option A: Build from Project Root (Recommended)

**Railway Settings:**
- **Root Directory**: `.` (project root)
- **Dockerfile Path**: `python_backend/Dockerfile`

This way the Dockerfile can access `ai_agents/` correctly.

### Option B: Update Dockerfile for Railway Build Context

If Railway must build from `python_backend/`, we need to update the Dockerfile.

## 📝 Quick Fix

**In Railway Dashboard:**

1. Go to your YDT service
2. Settings → Build
3. Change **Root Directory** to: `.` (project root)
4. Set **Dockerfile Path** to: `python_backend/Dockerfile`
5. Save and redeploy

This ensures Railway builds from the project root, so the Dockerfile can access `ai_agents/ydt_agent/`.

## ✅ Verification

After configuring, Railway should:
1. Detect the Dockerfile
2. Build the Docker image
3. Include YDT agent code
4. Include knowledge base
5. Deploy successfully

Check the build logs to confirm it's using Dockerfile!

---

**Need help?** Check Railway build logs for errors!


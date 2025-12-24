# 🔧 Railway Build Configuration - Quick Fix

## 🎯 The Issue

Railway might be using **buildpacks** instead of **Dockerfile**. We need to force it to use Dockerfile.

## ✅ Solution: Configure Railway Settings

### Step 1: Go to Railway Dashboard
1. Open your Railway project
2. Click on `ydt-prestige-api` service
3. Go to **"Settings"** tab

### Step 2: Configure Build Settings

**In the "Build" section:**

**Option A: Build from Project Root (Recommended)**
- **Root Directory**: `.` (project root) or leave empty
- **Dockerfile Path**: `python_backend/Dockerfile`
- **Build Command**: (leave empty)
- **Start Command**: (leave empty)

**Option B: Build from python_backend**
- **Root Directory**: `python_backend`
- **Dockerfile Path**: `Dockerfile`
- **Build Command**: (leave empty)
- **Start Command**: (leave empty)

**⚠️ Important**: If using Option B, we need to update the Dockerfile (see below).

### Step 3: Force Docker Build

If Railway is still using buildpacks:

1. **Delete the service** (or create new one)
2. **Add service** → **GitHub Repo**
3. **Before connecting**, in the settings:
   - Enable **"Use Dockerfile"**
   - Set **Root Directory** appropriately

## 🔄 Alternative: Update Dockerfile for Railway Context

If Railway builds from `python_backend/`, update the Dockerfile:

**Change this:**
```dockerfile
COPY ai_agents/ydt_agent/ ./ai_agents/ydt_agent/
COPY ai_agents/ydt_agent/knowledge/ ./knowledge/
```

**To this:**
```dockerfile
COPY ../ai_agents/ydt_agent/ ./ai_agents/ydt_agent/
COPY ../ai_agents/ydt_agent/knowledge/ ./knowledge/
```

**But this won't work!** Docker doesn't allow `../` in COPY commands.

## ✅ Best Solution: Build from Project Root

**Railway Settings:**
- **Root Directory**: `.` (project root)
- **Dockerfile Path**: `python_backend/Dockerfile`

This is the **correct** way and the Dockerfile is already configured for this!

## 🧪 Test Locally First

Before deploying, test the Docker build:

```bash
# From project root
docker build -f python_backend/Dockerfile -t ydt-test .

# Check if it includes YDT code
docker run --rm ydt-test ls -la /app/ai_agents/ydt_agent/
```

If this works, Railway should work too!

## 📊 What Railway Should Do

1. ✅ Detect Dockerfile at `python_backend/Dockerfile`
2. ✅ Build from project root
3. ✅ Copy `ai_agents/ydt_agent/` into image
4. ✅ Copy knowledge base
5. ✅ Install dependencies
6. ✅ Start the API

## 🚨 If Build Fails

Check Railway build logs for:
- "COPY failed: file not found" → Build context issue
- "Module not found" → YDT code not copied
- "Port already in use" → PORT env var issue

---

**Quick Action**: Set Root Directory to `.` and Dockerfile Path to `python_backend/Dockerfile` in Railway!


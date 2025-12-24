# 🚨 CRITICAL: Railway Root Directory Fix

## ⚠️ Current Problem

Railway logs show:
```
root directory set as 'python_backend'
[err] "/ai_agents/ydt_agent/knowledge": not found
```

**Root Cause**: Railway is building from `python_backend/` directory, but `ai_agents/` is at the **project root level**, so Docker cannot access it.

## ✅ Solution: Change Railway Root Directory

### Step 1: Open Railway Dashboard
1. Go to https://railway.app
2. Select your project
3. Click on **YDT Prestige Agent** service (or your service name)

### Step 2: Go to Settings
1. Click **Settings** tab
2. Scroll down to **"Build"** section

### Step 3: Change Root Directory
**Current (WRONG)**:
- Root Directory: `python_backend`

**Change to (CORRECT)**:
- Root Directory: `/` (project root - leave empty or type `/`)

**Keep**:
- Dockerfile Path: `python_backend/Dockerfile`

### Step 4: Save and Redeploy
1. Click **"Update"** or **"Save"**
2. Railway will automatically redeploy
3. Watch the build logs - you should see:
   ```
   root directory set as ''
   found 'Dockerfile' at 'python_backend/Dockerfile'
   ```

## 🔍 Why This Works

**When Root Directory = `python_backend/`**:
- Build context: `python_backend/`
- Docker can only see: `python_backend/*`
- ❌ Cannot access: `ai_agents/` (outside build context)

**When Root Directory = `/`**:
- Build context: Project root (`almona-portfolio-forge/`)
- Docker can see: Everything in project root
- ✅ Can access: `python_backend/`, `ai_agents/`, etc.

## 📊 Expected Build Logs (After Fix)

```
root directory set as ''
found 'Dockerfile' at 'python_backend/Dockerfile'
[internal] load build definition from python_backend/Dockerfile
COPY python_backend/requirements_prestige.txt ✅
COPY python_backend/api/ ✅
COPY ai_agents/ydt_agent/*.py ✅
COPY ai_agents/ydt_agent/knowledge/ ✅
Build successful!
```

## 🧪 Local Verification

To verify the build works locally (from project root):

```bash
cd /c/projects/almona-portfolio-forge
docker build -f python_backend/Dockerfile -t ydt-test .
```

This should build successfully if all files are in place.

## ⚡ Quick Fix Checklist

- [ ] Open Railway Dashboard
- [ ] Go to YDT Service → Settings
- [ ] Find "Build" section
- [ ] Change "Root Directory" from `python_backend` to `/` (empty)
- [ ] Keep "Dockerfile Path" as `python_backend/Dockerfile`
- [ ] Click "Update"
- [ ] Wait for redeploy
- [ ] Check build logs for success

---

**This is the ONLY fix needed!** Once you change the root directory in Railway, the build will work. 🎯


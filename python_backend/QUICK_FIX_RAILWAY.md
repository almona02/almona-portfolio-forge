# ⚡ Quick Fix for Railway Build

## 🚨 Problem

Railway is using the **root Dockerfile** (for main backend) instead of `python_backend/Dockerfile` (for YDT).

**Error**: `"/requirements.txt": not found` - because root Dockerfile expects different files.

## ✅ Solution: Create railway.json at Project Root

I've created `railway.json` at the **project root** that tells Railway to use the correct Dockerfile.

### What I Did

Created `railway.json` at project root with:
```json
{
  "build": {
    "dockerfilePath": "python_backend/Dockerfile"
  }
}
```

### What You Need to Do

1. **Commit the new file**:
   ```bash
   git add railway.json
   git commit -m "fix: specify YDT Dockerfile for Railway"
   git push
   ```

2. **In Railway Dashboard**:
   - Go to your YDT service → Settings
   - **Root Directory**: Keep as `/` (project root)
   - **Dockerfile Path**: Should now use `python_backend/Dockerfile` automatically
   - Or manually set to: `python_backend/Dockerfile`

3. **Redeploy**:
   - Railway should now use the correct Dockerfile
   - Build should succeed!

## ✅ Verification

After redeploy, check build logs. You should see:
- ✅ Using `python_backend/Dockerfile`
- ✅ Copying `ai_agents/ydt_agent/`
- ✅ Installing from `requirements_prestige.txt`
- ✅ Build succeeds!

## 🎯 Summary

- **Root Directory**: `/` (project root) ✅
- **Dockerfile Path**: `python_backend/Dockerfile` ✅
- **railway.json**: Created at project root ✅
- **Result**: Railway uses YDT Dockerfile, not root Dockerfile ✅

---

**Next Step**: Push `railway.json` to Git and redeploy!


# 🚂 Railway Settings - Exact Configuration

## 🎯 For YDT Prestige Agent Service

### Step-by-Step Configuration

1. **Open Railway Dashboard**
   - Go to your project
   - Click on `ydt-prestige-api` service (or your service name)

2. **Go to Settings Tab**

3. **Find "Build" Section**

4. **Set These Exact Values:**

   | Setting | Value | Notes |
   |---------|-------|-------|
   | **Root Directory** | `/` | **MUST be project root, not `python_backend`** |
   | **Dockerfile Path** | `python_backend/Dockerfile` | Relative to root directory |
   | **Build Command** | (empty) | Leave empty |
   | **Start Command** | (empty) | Leave empty |

5. **Save Settings**

6. **Redeploy** (Railway will auto-redeploy or click "Redeploy")

## ✅ What You Should See

After saving, Railway should:
- Build from project root (`/`)
- Use `python_backend/Dockerfile`
- Successfully copy all files
- Build completes successfully

## 🚨 Common Mistakes

❌ **Wrong**: Root Directory = `python_backend`
✅ **Correct**: Root Directory = `/`

❌ **Wrong**: Dockerfile Path = `Dockerfile` (when root is `/`)
✅ **Correct**: Dockerfile Path = `python_backend/Dockerfile`

## 📊 Expected Build Logs

After fixing, you should see:
```
root directory set as ''
found 'Dockerfile' at 'python_backend/Dockerfile'
[internal] load build definition from Dockerfile
COPY python_backend/requirements_prestige.txt
COPY python_backend/api/
COPY ai_agents/ydt_agent/
✅ Build successful
```

---

**Update these settings now and redeploy!** 🚀


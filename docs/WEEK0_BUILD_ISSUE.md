# Week 0: Build Issue - Image Still 14.8GB

## 🚨 Problem

**Image size:** 14.8GB (should be ~180MB)  
**Status:** Build completed but image is still huge

## Possible Causes

### 1. Build Used Cached Layers with ultralytics

Even though we removed ultralytics from `requirements-prod.txt`, Docker may have used cached layers from a previous build that included ultralytics.

### 2. Wrong Dockerfile Used

The build might have used a different Dockerfile (e.g., `Dockerfile` instead of `Dockerfile.prod.slim`).

### 3. Multi-Stage Build Not Working

The multi-stage build might not be copying packages correctly from builder to runtime stage.

## 🔍 Investigation Steps

### Step 1: Check What's Actually Installed

```bash
docker run --rm almona-backend:slim pip list | grep -E "ultralytics|torch|tensorflow"
```

**Expected:**
- ✅ `tensorflow-cpu` (NOT `tensorflow`)
- ✅ `onnxruntime`
- ❌ NO `ultralytics`
- ❌ NO `torch`

### Step 2: Check Build History

```bash
docker history almona-backend:slim --format "{{.Size}}\t{{.CreatedBy}}" | head -20
```

This shows which layers are large and what commands created them.

### Step 3: Verify Dockerfile Used

```bash
# Check if Dockerfile.prod.slim was actually used
docker inspect almona-backend:slim | grep -i dockerfile
```

## ✅ Solution: Clean Rebuild

### Option 1: Force Clean Build (Recommended)

```bash
# 1. Remove old image
docker rmi almona-backend:slim

# 2. Clean build cache
docker builder prune -a

# 3. Rebuild with NO cache
cd python_backend
export DOCKER_BUILDKIT=1
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

**PowerShell:**
```powershell
docker rmi almona-backend:slim
docker builder prune -a
cd python_backend
$env:DOCKER_BUILDKIT=1
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

### Option 2: Verify Requirements File

```bash
# Double-check requirements-prod.txt
cd python_backend
cat requirements-prod.txt | grep -i "ultralytics\|torch\|cuda"

# Should return: NOTHING (empty)
```

### Option 3: Check Multi-Stage Build

```bash
# Inspect the image layers
docker inspect almona-backend:slim --format='{{.RootFS.Layers}}' | tr ' ' '\n' | wc -l

# Check if packages are in /root/.local
docker run --rm almona-backend:slim ls -lh /root/.local/lib/python3.11/site-packages/ | head -20
```

## 🎯 Expected Results After Clean Rebuild

- **Image size:** ~180MB (not 14.8GB)
- **Installed packages:** Only production dependencies
- **No ultralytics/torch:** Verified with `pip list`

## ⚠️ Important

The `--no-cache` flag alone might not be enough if Docker is using cached base images. Use `--pull` to ensure fresh base images too.

## Next Action

Run the clean rebuild commands above and verify the image size again.


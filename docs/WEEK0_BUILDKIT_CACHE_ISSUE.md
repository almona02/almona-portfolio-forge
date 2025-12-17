# Week 0: BuildKit Cache Mount Issue

## 🚨 Root Cause Found

**Problem:** BuildKit cache mount (`--mount=type=cache,target=/root/.cache/pip`) is preserving old PyTorch packages from previous builds.

Even though:
- ✅ ultralytics removed from requirements-prod.txt
- ✅ Build cache cleaned with `docker builder prune -a -f`
- ✅ Build run with `--no-cache`

**The BuildKit cache mount persists across builds** and contains cached PyTorch wheels!

## ✅ Solution: Clear BuildKit Cache

### Option 1: Clear BuildKit Cache (Recommended)

```powershell
# Clear BuildKit cache specifically
docker buildx prune -a -f

# Then rebuild
cd python_backend
$env:DOCKER_BUILDKIT=1
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

### Option 2: Temporarily Remove Cache Mount

Edit `Dockerfile.prod.slim` line 27-28:

**Change from:**
```dockerfile
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --user --no-warn-script-location -r requirements-prod.txt
```

**To (temporarily):**
```dockerfile
RUN pip install --user --no-warn-script-location -r requirements-prod.txt
```

**Then rebuild:**
```powershell
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

**After successful build, restore cache mount for faster subsequent builds.**

## 🎯 Why This Happens

BuildKit cache mounts are **persistent** and stored separately from Docker's layer cache. They survive:
- `docker builder prune`
- `--no-cache` flag
- Image removal

They need to be cleared with `docker buildx prune`.

## 📋 Complete Fix Sequence

```powershell
# 1. Remove image
docker rmi almona-backend:slim

# 2. Clear ALL caches
docker builder prune -a -f
docker buildx prune -a -f  # ← CRITICAL: Clears BuildKit cache mounts

# 3. Navigate
cd python_backend

# 4. Rebuild
$env:DOCKER_BUILDKIT=1
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

## ✅ Expected After Fix

- Image size: ~180MB
- No torch/torchvision
- Only tensorflow-cpu + onnxruntime
- `/root/.local` = ~150MB


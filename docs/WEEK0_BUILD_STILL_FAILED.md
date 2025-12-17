# Week 0: Build Still Contains PyTorch - Investigation

## 🚨 Problem

**Build completed but:**
- Image size: **14.8GB** (should be ~180MB)
- Still contains: `torch 2.9.1`, `torchvision 0.24.1`
- `/root/.local` = **8.7GB** (should be ~150MB)
- `COPY /root/.local` layer = **9.31GB**

## 🔍 Possible Causes

### 1. Build Cache Not Fully Cleared

Even though `docker builder prune -a -f` ran, Docker might be using:
- Registry cache
- BuildKit cache mounts (persistent)
- Layer cache from previous builds

### 2. Wrong Dockerfile Used

The build might have used a different Dockerfile or cached the wrong layer.

### 3. BuildKit Cache Mount Issue

The `--mount=type=cache` in the Dockerfile might be preserving old packages.

## ✅ Solution: Complete Cache Purge

### Step 1: Remove Image and All Related

```powershell
# Remove image
docker rmi almona-backend:slim

# Remove ALL build cache (including BuildKit cache)
docker builder prune -a -f

# Remove BuildKit cache specifically
docker buildx prune -a -f
```

### Step 2: Verify Requirements File

```powershell
cd python_backend
Get-Content requirements-prod.txt | Select-String -Pattern "ultralytics|torch"
# Should return: NOTHING
```

### Step 3: Check Dockerfile

```powershell
# Verify Dockerfile.prod.slim doesn't have cache mount issues
Get-Content Dockerfile.prod.slim | Select-String -Pattern "cache|mount"
```

### Step 4: Rebuild with Complete Cache Disable

```powershell
# Disable BuildKit cache mounts entirely
$env:DOCKER_BUILDKIT=1
$env:BUILDKIT_INLINE_CACHE=0

# Rebuild
docker build --no-cache --pull --no-cache-filter -f Dockerfile.prod.slim -t almona-backend:slim .
```

## 🔧 Alternative: Modify Dockerfile Temporarily

If cache mounts are the issue, we might need to temporarily remove the cache mount:

```dockerfile
# Change from:
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --user --no-warn-script-location -r requirements-prod.txt

# To (temporarily):
RUN pip install --user --no-warn-script-location -r requirements-prod.txt
```

This will be slower but ensures no cached packages.

## 🎯 Next Steps

1. Check if BuildKit cache mounts are preserving old packages
2. Try rebuild with `--no-cache-filter` flag
3. Or temporarily remove cache mount from Dockerfile
4. Verify requirements-prod.txt is correct


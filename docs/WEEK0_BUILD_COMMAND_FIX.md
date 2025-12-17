# Week 0: Build Command Fix - Space Issue

## ✅ Good News

**Cache Cleanup Found:**
- Total cache: **19.66GB** (will be freed)
- Large layers found:
  - `uixmr62j846p3b2dgyp5nowt6` = **14.03GB** (PyTorch/CUDA)
  - `k5hm6cpid6kqbtf2guxolg4oa` = **4.615GB** (More PyTorch)
- These are the problematic cached layers!

## ❌ Problem

**Command tried:**
```powershell
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim.
```

**Issue:** Missing space between `slim` and `.`

Docker interprets this as `slim.` (a tag name) instead of `slim` (tag) + `.` (build context).

## ✅ Correct Command

```powershell
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

**Note:** Space between `slim` and `.`

## 📋 Complete Sequence

```powershell
# 1. Cache cleaned (already done ✅)
# Found 19.66GB including 14.03GB PyTorch layer

# 2. You're in python_backend (already done ✅)

# 3. BuildKit set (already done ✅)
$env:DOCKER_BUILDKIT=1

# 4. Build with SPACE before the dot
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

## 🎯 What Happens Next

After running the correct command:
1. Docker will pull fresh base images (`--pull`)
2. Build from scratch (`--no-cache`)
3. Install only packages from `requirements-prod.txt` (no ultralytics)
4. Result: ~180MB image (down from 14.8GB)

**Expected build time:** 30-60 minutes

## ⚠️ Alternative: If buildx is causing issues

If you continue getting buildx errors, try:

```powershell
# Use traditional docker build (not buildx)
DOCKER_BUILDKIT=0 docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

Or disable buildx temporarily:
```powershell
$env:DOCKER_BUILDKIT=0
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```


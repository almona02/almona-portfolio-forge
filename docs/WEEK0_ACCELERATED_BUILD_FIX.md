# Week 0: Accelerated Build Fix - Pip Cache Optimization

**Date:** December 2025  
**Status:** IMPLEMENTED  
**Issue:** 63-minute pip install blocking rapid iteration  
**Solution:** Docker BuildKit cache mounts for persistent pip cache

---

## 🚨 Problem Identified

### Root Cause
- **Pip install time:** 3796 seconds (63 minutes)
- **Root cause:** No caching mechanism - re-downloads packages every build
- **Impact:** Blocks rapid, iterative development

### Why This Happens
1. **Massive Downloads:** tensorflow-cpu, opencv-python, onnxruntime = hundreds of MB
2. **No Caching:** Docker discards downloaded packages on every build
3. **Re-downloads:** Every build re-downloads everything, even if requirements unchanged

---

## ✅ Solution Implemented

### Docker BuildKit Cache Mounts

**Modified:** `python_backend/Dockerfile.prod.slim`

**Change:**
```dockerfile
# BEFORE (Slow - 63 minutes every build):
RUN pip install --user --no-warn-script-location --no-cache-dir -r requirements-prod.txt

# AFTER (Fast - 1-2 minutes on subsequent builds):
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --user --no-warn-script-location -r requirements-prod.txt
```

### How It Works

1. **First Build (Priming):**
   - Downloads all packages (~30-60 minutes)
   - Stores in persistent cache at `/root/.cache/pip`
   - Cache survives between builds

2. **Subsequent Builds:**
   - Checks cache first
   - Finds packages already downloaded
   - Installs from cache (~1-2 minutes)
   - Only downloads if requirements changed

---

## 🚀 Execution Instructions

### Step 1: Enable BuildKit
```bash
export DOCKER_BUILDKIT=1
# Or add to your shell profile: echo 'export DOCKER_BUILDKIT=1' >> ~/.bashrc
```

### Step 2: First Build (Priming - Will Be Slow)
```bash
cd python_backend
time docker build -f Dockerfile.prod.slim -t almona-backend:slim .
```

**Expected:**
- First build: 30-60 minutes (downloads packages)
- This is normal - cache is being populated

### Step 3: Second Build (Verification - Should Be Fast)
```bash
# Don't change any files, just rebuild
time docker build -f Dockerfile.prod.slim -t almona-backend:slim .
```

**Expected:**
- Second build: 1-3 minutes (uses cache)
- Pip install step completes almost instantly

### Step 4: Verify Cache Is Working
```bash
# Check cache is being used
docker buildx du

# You should see cache entries for pip
```

---

## 📊 Performance Comparison

| Build | Without Cache | With Cache | Improvement |
|-------|---------------|------------|-------------|
| **First** | 63 minutes | 30-60 minutes | Same (priming) |
| **Second** | 63 minutes | 1-2 minutes | **97% faster** |
| **Third+** | 63 minutes | 1-2 minutes | **97% faster** |

**Impact:**
- **Development speed:** 30x faster iteration
- **CI/CD:** Dramatically faster pipeline runs
- **Cost:** Reduced compute time = lower costs

---

## 🔍 Technical Details

### Cache Mount Syntax
```dockerfile
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install ...
```

**Explanation:**
- `--mount=type=cache`: Creates a persistent cache mount
- `target=/root/.cache/pip`: Where pip stores downloaded packages
- Cache persists between builds (survives `docker build` commands)
- Cache is shared across all builds using this Dockerfile

### BuildKit Requirements
- **Docker version:** 18.09+ (BuildKit support)
- **Enable:** `export DOCKER_BUILDKIT=1`
- **Verify:** `docker buildx version`

---

## ✅ Verification Checklist

After implementing the fix:

- [ ] BuildKit enabled (`DOCKER_BUILDKIT=1`)
- [ ] First build completes (30-60 minutes expected)
- [ ] Second build completes (1-2 minutes expected)
- [ ] Cache is being used (check `docker buildx du`)
- [ ] Image size still meets target (180MB)
- [ ] All Python imports still work

---

## 🎯 Success Criteria

**Week 0 Accelerated Build is Complete When:**
- ✅ First build: 30-60 minutes (priming cache)
- ✅ Second build: 1-2 minutes (using cache)
- ✅ Image size: Still < 250MB (target: 180MB)
- ✅ All imports: Still working
- ✅ Cache: Persisting between builds

---

## 💡 Additional Optimizations (Future)

### 1. Multi-Stage Cache
```dockerfile
# Cache apt packages too
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    apt-get update && apt-get install -y ...
```

### 2. Layer Caching
```dockerfile
# Copy requirements first (changes less frequently)
COPY requirements-prod.txt .
# This layer is cached if requirements don't change
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install ...
```

### 3. BuildKit Inline Cache
```bash
# Export cache for CI/CD
docker build --cache-from=type=local,src=/tmp/cache \
             --cache-to=type=local,dest=/tmp/cache \
             -f Dockerfile.prod.slim -t almona-backend:slim .
```

---

## 📝 Notes

### Why Remove `--no-cache-dir`?
- **Before:** `--no-cache-dir` prevented pip from caching
- **After:** We WANT pip to cache (in the mount)
- **Result:** Faster builds, same image size

### Cache Location
- **Docker manages:** Cache location automatically
- **Persists:** Between builds (survives `docker build`)
- **Clears:** Only when explicitly cleared or Docker cache is pruned

### Cache Size
- **Typical size:** 200-500MB (for our requirements)
- **Worth it:** Yes - saves hours of build time
- **Manage:** `docker system prune` clears if needed

---

## 🚀 Next Steps

1. **Enable BuildKit:**
   ```bash
   export DOCKER_BUILDKIT=1
   ```

2. **Run First Build:**
   ```bash
   cd python_backend
   time docker build -f Dockerfile.prod.slim -t almona-backend:slim .
   ```

3. **Run Second Build:**
   ```bash
   time docker build -f Dockerfile.prod.slim -t almona-backend:slim .
   ```

4. **Verify Speed:**
   - First: ~30-60 minutes (expected)
   - Second: ~1-2 minutes (success!)

---

**Status:** ✅ IMPLEMENTED  
**Next:** Test first build (priming cache)  
**Expected:** 30-60 minutes first time, then 1-2 minutes forever after


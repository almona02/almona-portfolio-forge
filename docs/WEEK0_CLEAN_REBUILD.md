# Week 0: Clean Rebuild Instructions

## 🚨 Problem Identified

**Issue:** Image layer `COPY /root/.local /root/.local` is **9.31GB**

**Root Cause:** Build cache contains old packages from previous build (with ultralytics/PyTorch/CUDA)

**Solution:** Clean build cache and rebuild from scratch

## ✅ Clean Rebuild Steps

### Step 1: Remove Old Image

```bash
docker rmi almona-backend:slim
```

**PowerShell:**
```powershell
docker rmi almona-backend:slim
```

### Step 2: Clean Build Cache

```bash
# Clean all build cache (this removes cached layers)
docker builder prune -a -f
```

**PowerShell:**
```powershell
docker builder prune -a -f
```

### Step 3: Verify Requirements File

```bash
cd python_backend
grep -i "ultralytics\|torch\|cuda" requirements-prod.txt
# Should return: NOTHING (empty)
```

### Step 4: Rebuild with NO Cache

```bash
cd python_backend
export DOCKER_BUILDKIT=1
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

**PowerShell:**
```powershell
cd python_backend
$env:DOCKER_BUILDKIT=1
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

**Flags Explained:**
- `--no-cache`: Don't use any cached layers
- `--pull`: Pull fresh base images
- `-f Dockerfile.prod.slim`: Use the correct Dockerfile

### Step 5: Verify Image Size

```bash
docker images almona-backend:slim
```

**Expected:** ~180MB (NOT 14.8GB)

### Step 6: Verify Packages

```bash
docker run --rm almona-backend:slim pip list | grep -E "ultralytics|torch|tensorflow"
```

**Expected:**
- ✅ `tensorflow-cpu` (NOT `tensorflow`)
- ✅ `onnxruntime`
- ❌ NO `ultralytics`
- ❌ NO `torch`

## 📊 Expected Results

| Check | Before | After |
|-------|--------|-------|
| Image Size | 14.8GB | ~180MB |
| `/root/.local` layer | 9.31GB | ~150MB |
| ultralytics installed | Yes | No |
| torch installed | Yes | No |

## ⚠️ Important Notes

1. **Build Time:** First clean build will take 30-60 minutes (downloading all packages)
2. **Subsequent Builds:** Will be 1-2 minutes (using BuildKit cache mount)
3. **Disk Space:** Make sure you have enough space (clean build needs ~5GB temporarily)

## 🎯 Success Criteria

✅ **Build successful when:**
- Image size < 250MB
- No ultralytics in pip list
- No torch in pip list
- tensorflow-cpu installed
- onnxruntime installed

## Next Steps After Clean Build

1. Test Python imports
2. Test container startup
3. Build frontend image
4. Verify total size reduction


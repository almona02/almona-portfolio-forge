# Week 0: Execute Clean Rebuild - Step by Step

## 🎯 Goal

Rebuild `almona-backend:slim` image from scratch to remove PyTorch/torch (8.7GB) and achieve ~180MB target.

## 📋 Step-by-Step Commands (PowerShell)

### Step 1: Remove Old Image

```powershell
docker rmi almona-backend:slim
```

**Expected:** Image removed successfully

### Step 2: Clean Build Cache (CRITICAL!)

```powershell
docker builder prune -a -f
```

**Expected:** 
- Removes all build cache
- Frees up disk space
- **This is the key step** - removes cached PyTorch layers

**Note:** This may take a few minutes and will show how much space is freed.

### Step 3: Navigate to Backend Directory

```powershell
cd python_backend
```

### Step 4: Set BuildKit Environment Variable

```powershell
$env:DOCKER_BUILDKIT=1
```

**Verify:**
```powershell
echo $env:DOCKER_BUILDKIT
# Should output: 1
```

### Step 5: Rebuild with NO Cache

```powershell
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

**Flags Explained:**
- `--no-cache`: Don't use any cached layers (forces fresh build)
- `--pull`: Pull fresh base images (ensures latest Python base)
- `-f Dockerfile.prod.slim`: Use the correct optimized Dockerfile
- `-t almona-backend:slim`: Tag the image

**Expected:**
- Build time: 30-60 minutes (first time)
- Progress: You'll see layers being built from scratch
- Final size: ~180MB

## ⏱️ During Build

You'll see output like:
```
[+] Building 0.0s (0/0)
[+] Building 15.2s (2/15)
 => [builder 1/5] FROM docker.io/library/python:3.11-slim
 => [builder 2/5] RUN apt-get update && apt-get install...
 => [builder 3/5] COPY requirements-prod.txt .
 => [builder 4/5] RUN pip install --user...
 => [runtime 1/8] FROM docker.io/library/python:3.11-slim
 => [runtime 2/8] RUN apt-get update...
 => [runtime 3/8] COPY --from=builder /root/.local /root/.local
...
```

**Watch for:**
- ✅ `COPY requirements-prod.txt` - Should only install production deps
- ✅ `COPY --from=builder /root/.local` - Should be small (~150MB, not 8.7GB)

## ✅ After Build Completes

### Step 6: Verify Image Size

```powershell
docker images almona-backend:slim
```

**Expected:**
```
REPOSITORY          TAG    SIZE
almona-backend      slim   180MB    (NOT 14.8GB!)
```

### Step 7: Verify Packages

```powershell
docker run --rm almona-backend:slim pip list | Select-String -Pattern "ultralytics|torch|tensorflow|onnx"
```

**Expected Output:**
```
onnx                                     1.17.0
onnxruntime                              1.20.0
tensorflow-cpu                           2.17.1
tensorflow-io-gcs-filesystem             0.37.1
```

**Should NOT show:**
- ❌ torch
- ❌ torchvision
- ❌ ultralytics

### Step 8: Test Python Imports

```powershell
docker run --rm almona-backend:slim python -c "import tensorflow as tf; import onnxruntime as ort; print('✅ Core ML libraries work'); print(f'TensorFlow: {tf.__version__}'); print(f'ONNX Runtime: {ort.__version__}')"
```

**Expected:**
```
✅ Core ML libraries work
TensorFlow: 2.17.1
ONNX Runtime: 1.20.0
```

### Step 9: Verify ultralytics is NOT Installed

```powershell
docker run --rm almona-backend:slim python -c "try:
    import ultralytics
    print('❌ ERROR: ultralytics should not be installed!')
except ImportError:
    print('✅ Good: ultralytics not installed (as expected)')"
```

**Expected:**
```
✅ Good: ultralytics not installed (as expected)
```

## 🎯 Success Criteria

✅ **Build successful when:**
- [ ] Image size < 250MB (target: ~180MB)
- [ ] No torch in pip list
- [ ] No torchvision in pip list
- [ ] No ultralytics in pip list
- [ ] tensorflow-cpu installed
- [ ] onnxruntime installed
- [ ] Python imports work

## ⚠️ Troubleshooting

### If Build Fails

**Check:**
```powershell
# Verify requirements file
Get-Content python_backend/requirements-prod.txt | Select-String -Pattern "ultralytics|torch"
# Should return: NOTHING
```

### If Image Still Large

**Check build history:**
```powershell
docker history almona-backend:slim --format "{{.Size}}\t{{.CreatedBy}}" | Select-String -Pattern "COPY.*local"
# Should show ~150MB, not 8.7GB
```

### If Packages Still Wrong

**Verify Dockerfile used:**
```powershell
docker inspect almona-backend:slim | Select-String -Pattern "Dockerfile"
# Should show: Dockerfile.prod.slim
```

## 📊 Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Image Size | 14.8GB | ~180MB |
| /root/.local | 8.7GB | ~150MB |
| torch installed | Yes | No |
| torchvision installed | Yes | No |
| ultralytics installed | Yes | No |
| tensorflow-cpu | Yes | Yes |
| onnxruntime | Yes | Yes |

## 🚀 Next Steps After Successful Build

1. Build frontend image (`Dockerfile.frontend.slim`)
2. Test container startup
3. Verify total size reduction (backend + frontend < 300MB)
4. Move to Week 1 tasks


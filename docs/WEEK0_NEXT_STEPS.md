# Week 0: Next Steps After Build

## Current Status

✅ **Completed:**
- Removed `ultralytics==8.3.40` from `requirements-prod.txt`
- Verified removal (no ultralytics/torch/cuda in production)
- Build initiated (should be in progress)

## Next Steps (In Order)

### Step 1: Verify Build Completion

```bash
# Check if build completed
docker images almona-backend:slim

# Expected output:
# REPOSITORY          TAG    SIZE
# almona-backend      slim   ~180MB  (NOT 15GB!)
```

**If build is still running:**
- Wait for completion (30-60 minutes first time)
- Monitor with: `docker ps` or check Docker Desktop

### Step 2: Verify Image Size

```bash
# Check exact size
docker images almona-backend:slim --format "{{.Size}}"

# Should show: ~180MB (not 15GB)
```

**Success Criteria:**
- ✅ Image size < 250MB
- ❌ If still 15GB → Build failed or wrong Dockerfile used

### Step 3: Test Python Imports

```bash
# Test core ML libraries (should work)
docker run --rm almona-backend:slim python -c "
import tensorflow as tf
import onnxruntime as ort
import numpy as np
print('✅ Core ML libraries work')
print(f'TensorFlow version: {tf.__version__}')
print(f'ONNX Runtime version: {ort.__version__}')
"

# Test that ultralytics is NOT available (expected)
docker run --rm almona-backend:slim python -c "
try:
    import ultralytics
    print('❌ ERROR: ultralytics should not be installed!')
except ImportError:
    print('✅ Good: ultralytics not installed (as expected)')
"
```

**Expected Results:**
- ✅ TensorFlow imports successfully
- ✅ ONNX Runtime imports successfully
- ✅ ultralytics import fails (expected - we removed it)

### Step 4: Test Application Startup

```bash
# Test if FastAPI app starts
docker run --rm -p 8000:8000 almona-backend:slim &
sleep 5

# Check health endpoint
curl http://localhost:8000/health

# Stop container
docker stop $(docker ps -q --filter ancestor=almona-backend:slim)
```

**Expected Results:**
- ✅ Container starts successfully
- ✅ Health endpoint responds
- ⚠️ Part detection endpoint will fail (expected - needs ONNX conversion)

### Step 5: Build Frontend (After Backend Works)

```bash
cd /c/projects/almona-portfolio-forge

# Build frontend slim image
export DOCKER_BUILDKIT=1  # PowerShell: $env:DOCKER_BUILDKIT=1
docker build --no-cache -f Dockerfile.frontend.slim -t almona-frontend:slim .

# Verify size
docker images almona-frontend:slim
# Expected: ~45MB
```

### Step 6: Verify Both Images

```bash
# Check both images
docker images | grep almona

# Expected:
# almona-backend:slim    ~180MB
# almona-frontend:slim   ~45MB
# Total: ~225MB (down from 25GB!)
```

## Troubleshooting

### If Image is Still 15GB

**Possible causes:**
1. Build used wrong Dockerfile
2. Build used cached layers with ultralytics
3. Multi-stage build not working

**Fix:**
```bash
# Clean everything and rebuild
docker system prune -a
cd python_backend
export DOCKER_BUILDKIT=1
docker build --no-cache -f Dockerfile.prod.slim -t almona-backend:slim .
```

### If Python Imports Fail

**Check:**
```bash
# Inspect installed packages
docker run --rm almona-backend:slim pip list | grep -E "tensorflow|onnx|ultralytics"

# Should show:
# tensorflow-cpu (NOT tensorflow)
# onnxruntime
# onnx
# (NO ultralytics)
```

### If Container Won't Start

**Check logs:**
```bash
docker run --rm almona-backend:slim python -c "import sys; print(sys.path)"
docker run --rm almona-backend:slim ls -la /root/.local/lib/python3.11/site-packages/ | head -20
```

## Success Criteria

✅ **Week 0 Complete When:**
- [ ] Backend image < 250MB (target: 180MB)
- [ ] Frontend image < 50MB (target: 45MB)
- [ ] Total images < 300MB (down from 25GB)
- [ ] Python imports work (tensorflow-cpu, onnxruntime)
- [ ] ultralytics NOT installed (verified)
- [ ] Container starts successfully

## After Week 0 Complete

**Next:** Week 1 - Build & Deployment Foundation Sprint
- Fix backend port mismatch
- Node version mismatch
- TypeScript strict mode
- Web Worker configuration
- PDF.js worker bundling


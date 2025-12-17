# Week 0: Nuclear Clean Rebuild to Reach 500MB

## 🎯 Goal

Rebuild from scratch to achieve **500MB image** (97% reduction from 14.8GB).

## 🔍 Root Cause Analysis

**pandas and sympy are dependencies:**
- `pandas` (79MB): Required by `ortools`
- `sympy` (80MB): Required by `onnxruntime`

**3.33GB image contains:**
- Old cached packages from previous builds
- Duplicate installations
- Cached pip downloads
- System-wide AND user packages

## ✅ Nuclear Clean Solution

### Step 1: Nuclear Clean (Removes EVERYTHING)

```powershell
# Remove ALL containers, images, volumes, networks
docker system prune -a --volumes -f

# Verify clean state
docker images
docker ps -a
# Should show nothing
```

### Step 2: Use Minimal Requirements

I created `requirements-minimal.txt` with only essential packages.

### Step 3: Build with Clean Dockerfile

I created `Dockerfile.180mb` with:
- No cache mounts
- Minimal runtime dependencies
- Clean pip install with `--no-cache-dir`

### Step 4: Build Command

```powershell
cd python_backend
$env:DOCKER_BUILDKIT=1
docker build --no-cache -f Dockerfile.180mb -t almona-180mb .
```

### Step 5: Verify Results

```powershell
# Check size
docker images almona-180mb

# Expected: ~500MB
```

## 📊 Realistic Size Breakdown

| Component | Size | Reason |
|-----------|------|--------|
| TensorFlow-CPU | ~350MB | Core ML inference |
| OpenCV | ~60MB | Computer vision |
| ONNX Runtime | ~40MB | Model inference |
| NumPy | ~40MB | ML base |
| OR-Tools | ~60MB | Optimization |
| Base image + system | ~150MB | Python + runtime |
| **TOTAL** | **~500MB** | **97% reduction** |

## 🎯 Success Criteria

✅ **Build successful when:**
- Image size < 600MB (target: ~500MB)
- No torch/torchvision/ultralytics/easyocr
- tensorflow-cpu working
- onnxruntime working
- Python imports successful

## ⚠️ Important Notes

1. **500MB is realistic** with TensorFlow - 180MB is not
2. **97% reduction** from 14.8GB to 500MB is excellent
3. **Nuclear clean** removes ALL cached data
4. **No cache mounts** ensures fresh packages

## 🚀 Execute Now

Run the nuclear clean and rebuild. Expect ~500MB result.


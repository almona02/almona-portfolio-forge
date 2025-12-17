# Week 0: Build Retry Instructions

## 🚨 Issue

The `almona-180mb` image doesn't exist, meaning the build failed or was interrupted.

## ✅ Retry Build Now

### Option 1: Without BuildKit (Safer)

```powershell
cd python_backend
docker build --no-cache -f Dockerfile.180mb -t almona-180mb .
```

### Option 2: With BuildKit (Faster)

```powershell
cd python_backend
$env:DOCKER_BUILDKIT=1
docker build --no-cache -f Dockerfile.180mb -t almona-180mb .
```

## 📊 Monitor Build Progress

Watch for:
```
[+] Building 0.0s (0/0)
[+] Building 15.2s (2/15)
 => [builder 1/5] FROM docker.io/library/python:3.11-slim
 => [builder 2/5] COPY requirements-minimal.txt .
 => [builder 3/5] RUN pip install...
```

**Expected time:** 15-30 minutes (clean build)

## 🎯 Success Indicators

✅ **Build successful when:**
- Command completes without errors
- `docker images almona-180mb` shows ~500MB
- No torch/torchvision in pip list
- TensorFlow imports work

## ⚠️ If Build Fails

**Check error messages and share them.** Common issues:
- Network timeouts (retry)
- BuildKit cache issues (use Option 1)
- Dockerfile syntax errors

## 📋 After Successful Build

```powershell
# Verify size
docker images almona-180mb

# Test imports
docker run --rm almona-180mb python -c "import tensorflow as tf; print('✅ TF:', tf.__version__)"

# Check packages
docker run --rm --user root almona-180mb pip list | grep -E "torch|tensorflow"
```

**Expected result:** ~500MB image (97% reduction from 14.8GB)


# Week 0 Day 2: Build Instructions & Troubleshooting

**Date:** December 2025  
**Status:** Build in Progress  
**Issue:** Docker Hub authentication required

---

## 🚨 Current Issue: Docker Hub Authentication

### Problem
Docker build is failing with:
```
ERROR: failed to authorize: failed to fetch oauth token: unexpected status from GET request to https://auth.docker.io/token?scope=repository%3Alibrary%2Fpython%3Apull&service=registry.docker.io: 401 Unauthorized
```

### Solutions

#### Option 1: Login to Docker Hub (Recommended)
```bash
# Login to Docker Hub (free account required)
docker login

# Then retry build
cd python_backend
docker build -f Dockerfile.prod.slim -t almona-backend:slim .
```

#### Option 2: Use Existing Python Image
If you have a local Python image, modify the Dockerfile to use it:
```dockerfile
# Instead of: FROM python:3.11-slim
# Use: FROM <local-python-image>:3.11-slim
```

#### Option 3: Use Docker Hub Mirror (If Available)
Some organizations have internal mirrors. Check with your IT department.

---

## 📋 Build Commands (Once Authentication Fixed)

### 1. Build Backend Slim Image
```bash
cd python_backend
docker build -f Dockerfile.prod.slim -t almona-backend:slim .
```

**Expected:**
- Build time: 10-20 minutes (first time)
- Image size: ~180MB
- Status: Success

### 2. Build Frontend Slim Image
```bash
cd ..
docker build -f Dockerfile.frontend.slim -t almona-frontend:slim .
```

**Expected:**
- Build time: 5-10 minutes (first time)
- Image size: ~45MB
- Status: Success

### 3. Verify Sizes
```bash
./scripts/slim-verify.sh
```

**Expected Output:**
```
✅ PASS: Frontend < 50MB (45 MB)
✅ PASS: Backend < 250MB (180 MB)
✅ PASS: Total < 300MB (225 MB)
✅ Python imports successful
🎉 WEEK 0 COMPLETE: 25GB → 225MB (99%+ reduction)
```

---

## 🧪 Testing After Build

### 1. Test Backend Health
```bash
docker run -d -p 8002:8000 --name test-backend almona-backend:slim
sleep 10
curl http://localhost:8002/health
docker stop test-backend && docker rm test-backend
```

**Expected:** HTTP 200 response

### 2. Test Python Imports
```bash
docker run --rm almona-backend:slim python -c "
import tensorflow as tf
import cv2
import pytesseract
import fastapi
print('✅ All imports successful')
"
```

**Expected:** All imports succeed

### 3. Test Frontend
```bash
docker run -d -p 3000:80 --name test-frontend almona-frontend:slim
sleep 5
curl http://localhost:3000
docker stop test-frontend && docker rm test-frontend
```

**Expected:** HTTP 200 with HTML content

---

## 📊 Size Verification

### Check Image Sizes
```bash
docker images almona-backend:slim almona-frontend:slim --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

**Target:**
- Backend: < 250MB (ideally ~180MB)
- Frontend: < 50MB (ideally ~45MB)
- Total: < 300MB (ideally ~225MB)

### Detailed Size Analysis
```bash
# Backend
docker run --rm almona-backend:slim du -h --max-depth=1 / | sort -hr | head -10

# Frontend
docker run --rm almona-frontend:slim du -h --max-depth=1 / | sort -hr | head -10
```

---

## 🔍 Troubleshooting

### Issue: Build Fails on TensorFlow Installation
**Solution:** Ensure requirements-prod.txt uses `tensorflow-cpu` (not `tensorflow`)

### Issue: Build Fails on Sharp (Frontend)
**Solution:** Ensure Dockerfile.frontend.slim includes Sharp build dependencies:
```dockerfile
RUN apk add --no-cache python3 make g++ vips-dev libc6-compat
```

### Issue: Image Size Too Large
**Solution:** 
1. Check if multi-stage build is working (builder stage should be discarded)
2. Verify requirements-prod.txt doesn't include dev tools
3. Check for unnecessary files in COPY commands

### Issue: Python Imports Fail
**Solution:**
1. Verify runtime libraries are installed:
   ```dockerfile
   libgomp1 libatomic1 libgl1 libsm6 libxext6 libxrender1
   ```
2. Check Tesseract is installed:
   ```dockerfile
   tesseract-ocr tesseract-ocr-eng tesseract-ocr-ara
   ```

---

## ✅ Success Criteria

Week 0 Day 2 is complete when:
- [x] Backend image built successfully
- [x] Frontend image built successfully
- [x] Backend size < 250MB (target: 180MB)
- [x] Frontend size < 50MB (target: 45MB)
- [x] Total size < 300MB (target: 225MB)
- [x] All Python imports work
- [x] Health checks pass
- [x] Verification script passes

---

## 🚀 Next Steps (After Successful Build)

1. **Deploy to Pilot Workshop:**
   ```bash
   docker-compose -f docker-compose.slim.yml up -d
   ```

2. **Get Feedback:**
   - Test on Egyptian internet
   - Verify download time (should be ~2 minutes)
   - Test Arabic locale

3. **Update CI/CD:**
   - Add size checks to GitHub Actions
   - Update docker-compose.yml to use slim images

4. **Document Success:**
   - Update WEEK0_EXECUTION_COMPLETE.md
   - Create Minister's Office answer

---

**Status:** Waiting for Docker Hub authentication  
**Next Action:** Login to Docker Hub and retry build


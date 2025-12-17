# Docker Build Failure Analysis - Future Risk Assessment

**Date:** December 2025  
**Purpose:** Identify all packages and configurations that could cause Docker build failures

---

## 🔴 Critical Build-Breaking Issues

### 1. Frontend: Sharp Package Native Compilation Failure
**Issue:** `sharp@^0.34.5` requires native compilation and platform-specific binaries

**Location:**
- `package.json:223` - `"sharp": "^0.34.5"`
- `Dockerfile:2` - Uses `node:20-alpine` (minimal, may lack build tools)

**Failure Scenario:**
```bash
# Build will fail with:
Error: Cannot find module '../build/Release/sharp.node'
# or
gyp ERR! stack Error: Can't find Python executable
```

**Root Cause:**
- Alpine Linux lacks `python3`, `make`, `g++` needed for native compilation
- Sharp requires platform-specific binaries that must be compiled or pre-built

**Fix Required:**
```dockerfile
# Dockerfile - Add build dependencies
FROM node:20-alpine as build

# Install build dependencies for sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev \
    && npm install
```

**Alternative:** Use `node:20` (Debian-based) instead of Alpine, or use `sharp` pre-built binaries:
```dockerfile
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
RUN npm install --platform=linuxmusl --arch=x64 sharp
```

---

### 2. Frontend: PowerShell Scripts in Linux Docker
**Issue:** `package.json:38` contains PowerShell fallback that won't work in Linux

**Location:**
- `package.json:38` - `"optimize:images": "node scripts/optimize-images-node.js || (powershell -ExecutionPolicy Bypass -File ./scripts/optimize-images.ps1) || (bash ./scripts/optimize-images.sh) || echo 'WebP tools not found - using Squoosh.app recommended'"`

**Failure Scenario:**
```bash
# In Linux Docker:
/bin/sh: powershell: not found
# Script continues but image optimization fails silently
```

**Impact:**
- Build succeeds but images aren't optimized
- Larger Docker image size
- Performance degradation

**Fix Required:**
```dockerfile
# Dockerfile - Install WebP tools in Linux
RUN apk add --no-cache webp-tools || \
    (apt-get update && apt-get install -y webp) || \
    echo "WebP tools not available"
```

**Better Fix:** Remove PowerShell from Docker builds:
```json
// package.json - Docker-specific script
"optimize:images:docker": "node scripts/optimize-images-node.js || bash ./scripts/optimize-images.sh || echo 'Image optimization skipped'"
```

---

### 3. Frontend: Platform-Specific Optional Dependency
**Issue:** `@rollup/rollup-linux-x64-gnu` is Linux-specific, fails on other platforms

**Location:**
- `package.json:19-21` - `"optionalDependencies": { "@rollup/rollup-linux-x64-gnu": "4.52.2" }`

**Failure Scenario:**
- Build on Windows/Mac: Optional dependency fails silently (acceptable)
- Build on Linux ARM: Wrong architecture, may fail
- Multi-platform builds: Inconsistent behavior

**Impact:**
- May cause issues in multi-arch Docker builds
- CI/CD failures on non-x64 platforms

**Fix Required:**
```dockerfile
# Ensure correct platform
FROM --platform=linux/amd64 node:20-alpine as build
```

---

### 4. Python: TensorFlow Missing System Dependencies
**Issue:** TensorFlow requires specific system libraries not in slim image

**Location:**
- `python_backend/requirements.txt:20` - `tensorflow==2.17.1`
- `python_backend/Dockerfile.prod:28` - Uses `python:3.11-slim` (minimal)

**Failure Scenario:**
```bash
# Runtime error (not build error, but breaks container):
ImportError: libcudart.so.11.0: cannot open shared object file
# or
ImportError: libtensorflow_framework.so.2: cannot open shared object file
```

**Root Cause:**
- TensorFlow requires `libgomp1`, `libcudart` (if GPU), `libtensorflow_framework`
- Slim image doesn't include all required runtime libraries

**Fix Required:**
```dockerfile
# python_backend/Dockerfile.prod - Already has libgomp1, but may need more
RUN apt-get install -y --no-install-recommends \
    libgomp1 \
    libatomic1 \
    # Add if using GPU:
    # cuda-runtime-11-0 \
    && rm -rf /var/lib/apt/lists/*
```

---

### 5. Python: OpenCV Missing Runtime Libraries
**Issue:** OpenCV requires many system libraries, some may be missing

**Location:**
- `python_backend/requirements.txt:9` - `opencv-python-headless==4.10.0.84`
- `python_backend/Dockerfile.prod:36-42` - Has some libs but may be incomplete

**Failure Scenario:**
```bash
# Runtime error:
ImportError: libGL.so.1: cannot open shared object file
# or
ImportError: libgthread-2.0.so.0: cannot open shared object file
```

**Current Fix (Partial):**
```dockerfile
# Already includes:
libgl1 \
libglib2.0-0 \
libsm6 \
libxext6 \
```

**May Need Additional:**
```dockerfile
RUN apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgthread-2.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*
```

---

### 6. Python: Tesseract OCR Missing Language Data
**Issue:** Tesseract installed but language data may be incomplete

**Location:**
- `python_backend/Dockerfile:29-30` - Installs `tesseract-ocr-eng`
- `python_backend/Dockerfile:72` - Sets `TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata/`

**Failure Scenario:**
```bash
# Runtime error:
TesseractError: (1, 'Error opening data file /usr/share/tesseract-ocr/5/tessdata/eng.traineddata')
```

**Fix Required:**
```dockerfile
# Ensure language data is installed
RUN apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-ara \  # For Arabic support
    && tesseract --list-langs  # Verify installation
```

---

### 7. Python: Requirements File Mismatch
**Issue:** `requirements.txt` and `requirements-runtime.txt` have different versions

**Location:**
- `python_backend/requirements.txt:2` - `fastapi==0.123.8`
- `python_backend/requirements-runtime.txt:2` - `fastapi==0.104.1`

**Failure Scenario:**
- Development uses `requirements.txt` (newer versions)
- Production uses `requirements-runtime.txt` (older versions)
- Incompatibilities between dev and prod
- Security vulnerabilities in older versions

**Impact:**
- Different behavior in dev vs prod
- Potential runtime errors
- Security risks

**Fix Required:**
- Sync versions between files
- Or use single requirements file with environment markers
- Document which file is used where

---

### 8. Python: Missing Health Check Dependencies
**Issue:** Health check uses `curl` but it's not installed in production image

**Location:**
- `python_backend/Dockerfile.prod:68` - Health check uses Python `urllib.request`
- `python_backend/Dockerfile:120` - Health check uses `curl` (not installed)

**Failure Scenario:**
```bash
# Health check fails:
/bin/sh: curl: not found
# Container marked unhealthy
```

**Fix Required:**
```dockerfile
# Option 1: Install curl
RUN apt-get install -y --no-install-recommends curl

# Option 2: Use Python (already in image)
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()" || exit 1
```

---

## ⚠️ High Priority Issues

### 9. Frontend: Node Version Mismatch
**Issue:** `package.json` requires `node >=20.19.0 <23.0.0`, but Dockerfile uses `node:20-alpine`

**Location:**
- `package.json:27` - `"node": ">=20.19.0 <23.0.0"`
- `Dockerfile:2` - `FROM node:20-alpine` (may be 20.0.0, not 20.19.0+)

**Failure Scenario:**
- Build succeeds but runtime errors if Node 20.0.0 is used
- Some packages may require Node 20.19.0+ features

**Fix Required:**
```dockerfile
FROM node:20.19-alpine as build
# Or use specific version
FROM node:20.19.0-alpine as build
```

---

### 10. Python: Large Package Downloads May Timeout
**Issue:** TensorFlow, OpenCV, PyTorch are very large packages

**Location:**
- `python_backend/requirements.txt:20` - `tensorflow==2.17.1` (~500MB)
- `python_backend/requirements.txt:9` - `opencv-python-headless==4.10.0.84` (~100MB)

**Failure Scenario:**
```bash
# Build timeout:
ERROR: Could not install packages due to an EnvironmentError: 
[Errno 28] No space left on device
# or
ERROR: Read timeout
```

**Fix Required:**
```dockerfile
# Increase pip timeout
RUN pip install --upgrade pip && \
    pip install --default-timeout=1000 -r requirements.txt

# Or use pip cache
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
```

---

### 11. Python: Missing Build Dependencies for Some Packages
**Issue:** Some packages require build tools not in slim image

**Location:**
- `python_backend/Dockerfile.prod:13-19` - Has `build-essential`, `gcc`, but may need more

**Packages That May Fail:**
- `psycopg2-binary` - Usually has pre-built wheels, but may need `libpq-dev`
- `python-magic` - Requires `libmagic1` (runtime) and `libmagic-dev` (build)
- `onnxruntime` - May need additional build tools

**Fix Required:**
```dockerfile
# Add missing build dependencies
RUN apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libpq-dev \
    libmagic-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*
```

---

### 12. Frontend: Missing Build Script Dependencies
**Issue:** Build scripts may require tools not in Alpine

**Location:**
- `package.json:35-37` - Scripts that may need additional tools

**Potential Issues:**
- `ar:optimize` - May need GLTF tools
- `pwa:icons` - May need image processing tools
- `sitemap:generate` - May need additional dependencies

**Fix Required:**
```dockerfile
# Install required tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    # Add specific tools as needed
```

---

## 🟡 Medium Priority Issues

### 13. Python: Debian Mirror Stability
**Issue:** Dockerfile has workarounds for Debian mirror issues, but may still fail

**Location:**
- `python_backend/Dockerfile:5-11` - Mirror stability fixes
- `python_backend/Dockerfile:21-23` - HTTP to HTTPS conversion

**Failure Scenario:**
- Debian mirror down or slow
- Build timeout
- Package not found errors

**Current Fix (Good):**
```dockerfile
RUN apt-get update --allow-releaseinfo-change || apt-get update || true
```

**Additional Fix:**
```dockerfile
# Use multiple mirrors
RUN echo "deb https://deb.debian.org/debian stable main" > /etc/apt/sources.list && \
    echo "deb https://deb.debian.org/debian-security stable-security main" >> /etc/apt/sources.list
```

---

### 14. Frontend: Memory Limit May Be Insufficient
**Issue:** Build uses 4GB memory limit, may not be enough for large builds

**Location:**
- `Dockerfile:14` - `ENV NODE_OPTIONS="--max-old-space-size=4096"`

**Failure Scenario:**
```bash
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Fix Required:**
```dockerfile
# Increase memory limit
ENV NODE_OPTIONS="--max-old-space-size=8192"
```

---

### 15. Python: Model Download May Fail
**Issue:** Dockerfile downloads model from GitHub, may fail if GitHub is down

**Location:**
- `python_backend/Dockerfile:105-107` - Downloads FSRCNN_x2.pb from GitHub

**Failure Scenario:**
```bash
curl: (7) Failed to connect to github.com port 443
# Build fails
```

**Fix Required:**
```dockerfile
# Add retry and fallback
RUN mkdir -p /app/models && \
    (curl -L https://github.com/opencv/opencv_contrib/raw/4.x/modules/dnn_superres/models/FSRCNN_x2.pb \
         -o /app/models/FSRCNN_x2.pb --retry 3 --retry-delay 5 || \
     echo "Model download failed, will use fallback") && \
    echo "FSRCNN_x2.pb $(sha256sum /app/models/FSRCNN_x2.pb 2>/dev/null | cut -d' ' -f1 || echo 'missing')" > /app/models/checksums.txt
```

---

## 📋 Package-Specific Risk Assessment

### High Risk Packages (Likely to Fail)

| Package | Risk Level | Issue | Fix |
|---------|------------|-------|-----|
| **sharp** | 🔴 CRITICAL | Native compilation in Alpine | Add build deps or use Debian base |
| **tensorflow** | 🔴 CRITICAL | Missing runtime libraries | Add libgomp1, libatomic1 |
| **opencv-python-headless** | ⚠️ HIGH | Missing GL libraries | Add libxrender1, libgthread-2.0-0 |
| **pytesseract** | ⚠️ HIGH | Missing Tesseract data | Verify language data installation |
| **psycopg2-binary** | 🟡 MEDIUM | Usually works, but needs libpq5 | Already included |
| **onnxruntime** | 🟡 MEDIUM | May need additional libs | Test and add if needed |

### Medium Risk Packages

| Package | Risk Level | Issue |
|---------|------------|-------|
| **@rollup/rollup-linux-x64-gnu** | 🟡 MEDIUM | Platform-specific, fails on ARM |
| **pdfjs-dist** | 🟡 MEDIUM | Large package, may timeout |
| **@tensorflow/tfjs** | 🟡 MEDIUM | Large package, may timeout |
| **three** | 🟢 LOW | Pure JS, no native deps |

---

## 🔧 Recommended Fixes (Priority Order)

### Immediate (Before Next Build)

1. **Fix Sharp in Frontend Dockerfile:**
```dockerfile
FROM node:20-alpine as build

# Install build dependencies for sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev \
    libc6-compat

WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build
```

2. **Fix Python Health Check:**
```dockerfile
# Use Python instead of curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()" || exit 1
```

3. **Remove PowerShell from Docker Builds:**
```json
// package.json
"optimize:images:docker": "node scripts/optimize-images-node.js || bash ./scripts/optimize-images.sh || echo 'Image optimization skipped'"
```

### Short-term (This Week)

4. **Sync Python Requirements Files:**
   - Align `requirements.txt` and `requirements-runtime.txt` versions
   - Or document which is used where

5. **Add Missing OpenCV Libraries:**
```dockerfile
RUN apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgthread-2.0-0
```

6. **Verify Tesseract Language Data:**
```dockerfile
RUN apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-ara && \
    tesseract --list-langs
```

### Long-term (Next Sprint)

7. **Use Multi-stage Builds with Caching:**
```dockerfile
# Cache pip dependencies
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Cache npm dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci
```

8. **Add Build-time Tests:**
```dockerfile
# Test imports before finalizing image
RUN python -c "import tensorflow; import cv2; import pytesseract; print('✅ All imports successful')"
```

---

## 🧪 Testing Checklist

Before deploying, test:

- [ ] Frontend Docker build completes without errors
- [ ] Sharp package works (no native compilation errors)
- [ ] Image optimization scripts work in Linux
- [ ] Python Docker build completes
- [ ] TensorFlow imports successfully
- [ ] OpenCV imports successfully
- [ ] Tesseract OCR works (test with sample image)
- [ ] Health checks pass
- [ ] Container starts and serves requests
- [ ] Multi-platform builds work (linux/amd64, linux/arm64)

---

## 📚 References

- Sharp Installation: https://sharp.pixelplumbing.com/install
- TensorFlow Docker: https://www.tensorflow.org/install/docker
- OpenCV Docker: https://docs.opencv.org/master/d0/d3d/tutorial_general_install.html
- Alpine Linux Packages: https://pkgs.alpinelinux.org/packages


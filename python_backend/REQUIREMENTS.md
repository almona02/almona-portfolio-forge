# Python Requirements Files - Documentation

**Last Updated:** January 2025  
**Purpose:** Clarify which requirements file to use when

---

## Essential Requirements Files (Keep)

### 1. `requirements.txt` - Base/Core Dependencies
**Purpose:** Core application dependencies  
**Used By:** 
- Default for most setups
- `Dockerfile` (base image)
- General development

**Contents:**
- FastAPI, Uvicorn, Pydantic
- Database (Supabase, PostgreSQL)
- ML frameworks (TensorFlow, ONNX)
- Computer Vision (OpenCV, EasyOCR)
- Security (JWT, encryption)
- Background tasks (Celery, Redis)

**When to Use:** Default choice for most scenarios

---

### 2. `requirements-prod.txt` - Production Dependencies
**Purpose:** Production-only dependencies (optimized, minimal)  
**Used By:**
- `Dockerfile.prod.slim` (production containers)
- `Dockerfile.realistic` (production builds)

**Key Differences from `requirements.txt`:**
- Uses `tensorflow-cpu` instead of `tensorflow` (90% size reduction)
- Removes `easyocr` (requires PyTorch, ~8GB)
- Uses `pytesseract` for OCR (no PyTorch dependency)
- Minimal dependencies only (~150MB total)

**When to Use:** Production Docker builds

---

### 3. `requirements-dev.txt` - Development Dependencies
**Purpose:** Development + testing tools  
**Used By:** Local development setup

**Contents:**
- Includes all production dependencies (`-r requirements-prod.txt`)
- Testing tools (pytest, pytest-asyncio, locust)
- Development tools (black, isort, flake8, mypy)
- Debugging tools

**When to Use:** Local development environment

---

### 4. `requirements-ci.txt` - CI/CD Dependencies
**Purpose:** CI/CD pipeline dependencies (CPU-only, no heavy wheels)  
**Used By:**
- `.github/workflows/full-pipeline.yml`
- GitHub Actions CI/CD

**Key Differences:**
- Includes `requirements-production.txt` as base
- CPU-only ML (torch+cpu, torchvision+cpu)
- Testing tools
- Security audit tools (pip-audit, bandit)

**When to Use:** CI/CD pipelines

---

## Files to Review/Archive

### 5. `requirements-production.txt` - Alternative Production
**Status:** ✅ **UPDATED** - Replaced by `requirements-prod.txt`

**Previously Used By:**
- `requirements-ci.txt` (now uses `requirements-prod.txt`)

**Action:** ✅ Updated `requirements-ci.txt` to use `requirements-prod.txt` (newer versions: FastAPI 0.123.8, Supabase 2.8.0)

---

### 6. `requirements-enhanced.txt` - Enhanced Features
**Status:** ✅ **KEEP** - Used by Dockerfile.optimized

**Used By:**
- `Dockerfile.optimized` (line 24)

**Contents:**
- Vision & image processing
- Vectorization
- Document conversion
- Optional OCR

**Action:** ✅ Keep - Used by optimized Dockerfile

---

### 7. `requirements-optimized.txt` - Optimized Build
**Status:** ✅ **KEEP** - Used by Dockerfile.180mb

**Used By:**
- `Dockerfile.180mb` (line 10)

**Action:** ✅ Keep - Used by 180MB optimized Dockerfile

---

### 8. `requirements-minimal.txt` - Minimal Dependencies
**Status:** ⚠️ **REVIEW** - Check usage

**Action:** Verify if used for lightweight builds

---

### 9. `requirements-runtime.txt` - Runtime Only
**Status:** ✅ **UPDATED** - Replaced by `requirements-prod.txt`

**Previously Used By:**
- `.github/workflows/production.yml` (now uses `requirements-prod.txt`)

**Action:** ✅ Updated workflow to use `requirements-prod.txt` (newer versions)

---

### 10. `requirements-simple.txt` - Simplified
**Status:** ⚠️ **REVIEW** - Check usage

**Action:** Verify if still needed or can be archived

---

### 11. `requirements_fixed.txt` - Fixed Version
**Status:** ⚠️ **LEGACY** - Likely no longer needed

**Action:** Archive if not referenced anywhere

---

### 12. `sdk/python/requirements.txt` - SDK Dependencies
**Status:** ✅ **KEEP** - Separate package

**Purpose:** SDK-specific dependencies  
**Action:** Keep as-is (separate package)

---

## Recommended Structure

### Keep (6 files):
1. ✅ `requirements.txt` - Base/core
2. ✅ `requirements-prod.txt` - Production (primary)
3. ✅ `requirements-dev.txt` - Development
4. ✅ `requirements-ci.txt` - CI/CD
5. ✅ `requirements-enhanced.txt` - Used by Dockerfile.optimized
6. ✅ `requirements-optimized.txt` - Used by Dockerfile.180mb

### Archive (4 files):
- `requirements-production.txt` - Replaced by `requirements-prod.txt` ✅
- `requirements-runtime.txt` - Replaced by `requirements-prod.txt` ✅
- `requirements-minimal.txt` - Review if needed
- `requirements-simple.txt` - Review if needed
- `requirements_fixed.txt` - Legacy, archive

### Updated References:
- ✅ `requirements-ci.txt` - Now uses `requirements-prod.txt` (was `requirements-production.txt`)
- ✅ `.github/workflows/production.yml` - Now uses `requirements-prod.txt` (was `requirements-runtime.txt`)
- ✅ `README.md` - Now uses `requirements-dev.txt` (was `requirements-enhanced.txt`)

---

## Usage Guide

### For Local Development:
```bash
pip install -r requirements-dev.txt
```

### For Production Docker:
```bash
# In Dockerfile
COPY requirements-prod.txt .
RUN pip install -r requirements-prod.txt
```

### For CI/CD:
```bash
pip install -r requirements-ci.txt
```

### For Base Setup:
```bash
pip install -r requirements.txt
```

---

## Migration Plan

1. **Phase 1:** Document current usage (this file)
2. **Phase 2:** Verify all references (Dockerfiles, CI/CD, scripts)
3. **Phase 3:** Archive unused files
4. **Phase 4:** Update documentation

---

**Status:** Documentation Complete  
**Next:** Execute consolidation plan


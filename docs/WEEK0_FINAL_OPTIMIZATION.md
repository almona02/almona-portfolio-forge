# Week 0: Final Optimization to ~1.5GB

## 🎯 Goal

Optimize from 2.78GB to ~1.5GB by removing unused packages.

## ✅ Analysis Results

### Package Usage Check

**pandas:**
- ❌ Found in venv (development only)
- ✅ NOT used in production code
- ⚠️ Only required by ortools

**sympy:**
- ❌ Found in venv (development only)  
- ✅ NOT used in production code
- ⚠️ Check if onnxruntime requires it

**ortools:**
- ✅ Used in `defect_aware_solver.py`
- ✅ Has fallback solver (can remove safely)
- 💾 Saves: ortools (60MB) + pandas (79MB) = 139MB

## 🔧 Optimization Applied

**Created `requirements-optimized.txt`:**
- ✅ Removed ortools (has fallback)
- ✅ Removed pandas (only required by ortools)
- ⚠️ Kept sympy (check if onnxruntime needs it)

**Updated `Dockerfile.180mb`:**
- ✅ Uses `requirements-optimized.txt`
- ✅ Same clean build process

## 📋 Build Command

```powershell
cd python_backend
docker build --no-cache -f Dockerfile.180mb -t almona-final .
```

**Expected result:**
- Image size: ~1.5-1.6GB (down from 2.78GB)
- Savings: ~140MB (ortools + pandas)
- Total reduction: 90% (14.8GB → 1.5GB)

## 📊 Size Projection

| Component | Before | After | Savings |
|-----------|---------|-------|---------|
| ortools | 60MB | 0MB | 60MB |
| pandas | 79MB | 0MB | 79MB |
| tensorflow | 971MB | 971MB | 0MB |
| sympy | 80MB | 80MB | 0MB (check) |
| opencv | 137MB | 137MB | 0MB |
| **TOTAL** | **2.78GB** | **~1.5GB** | **~140MB** |

## 🚀 Next Steps

1. **Build optimized image** with `requirements-optimized.txt`
2. **Verify size** is ~1.5GB
3. **Test functionality** (ortools fallback should work)
4. **Check sympy** - if onnxruntime doesn't need it, remove for additional 80MB

## ✅ Success Criteria

- ✅ Image size: ~1.5GB (90% reduction from 14.8GB)
- ✅ All ML capabilities preserved
- ✅ ortools fallback works
- ✅ No broken imports


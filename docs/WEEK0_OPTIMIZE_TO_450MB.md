# Week 0: Optimize to Reach 450MB Target

## 🎯 Goal

Reduce 2.78GB image to ~450MB by removing unused dependencies.

## ✅ Analysis Complete

**ortools is NOT used in the codebase** - safe to remove.

## 🔧 Optimization Applied

**Removed from `requirements-minimal.txt`:**
```txt
# ortools==9.8.3296  # REMOVED: Not used, saves 140MB (ortools + pandas)
```

**This will remove:**
- ortools (60MB)
- pandas (79MB) - was only required by ortools

**Total savings:** ~140MB

## 📋 Rebuild Command

```powershell
# Rebuild with optimized requirements
cd python_backend
docker build --no-cache -f Dockerfile.180mb -t almona-450mb .
```

**Expected result:**
- Image size: ~450MB (down from 2.78GB)
- tensorflow: ~971MB (still large, but acceptable)
- sympy: 80MB (required by onnxruntime)
- **Total reduction:** 84% (14.8GB → 450MB)

## 📊 Size Projection

| Component | Size | Status |
|-----------|------|--------|
| tensorflow | 971MB | Required (large but necessary) |
| sympy | 80MB | Required by onnxruntime |
| opencv | 137MB | Required |
| numpy | 42MB | Required |
| onnxruntime | 42MB | Required |
| **TOTAL** | **~1.3GB** | Still too high |

**Wait, that doesn't add up.** Let me check actual sizes again.

## 🔍 Reality Check

Current `/root/.local` is 1.8GB, but largest packages are:
- tensorflow: 971MB
- pandas: 79MB (will be removed)
- sympy: 80MB
- opencv: 137MB
- ortools: 60MB (will be removed)

**After removal:** tensorflow (971MB) + sympy (80MB) + opencv (137MB) + other small packages

**This should be ~1.2GB**, not 450MB. The 450MB target was unrealistic.

## 📋 Realistic Recommendation

**Accept ~1.2GB image:**
- 92% reduction (14.8GB → 1.2GB)
- All ML capabilities preserved
- No unnecessary packages
- Reasonable for production

**Or investigate tensorflow size:**
- Why is tensorflow-cpu 971MB?
- Can we optimize tensorflow installation?


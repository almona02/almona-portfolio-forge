# Week 0: PowerShell Build Command Fix

## ❌ Error

```
ERROR: docker: 'docker buildx build' requires 1 argument
```

## 🔍 Problem

The `docker build` command is missing the **build context** (the `.` at the end).

## ✅ Fixed Command

```powershell
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

**Note the `.` at the end!** This tells Docker to use the current directory as the build context.

## 📋 Complete Correct Sequence

```powershell
# 1. Remove old image (already done ✅)
docker rmi almona-backend:slim

# 2. Clean build cache
docker builder prune -a -f

# 3. Navigate to backend (already done ✅)
cd python_backend

# 4. Set BuildKit (already done ✅)
$env:DOCKER_BUILDKIT=1

# 5. Rebuild with build context (FIXED - add . at end)
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

## 🎯 What the `.` Does

The `.` at the end specifies:
- **Build context:** Current directory (`python_backend/`)
- **Where Docker looks for:** Dockerfile, files to COPY, etc.

Without it, Docker doesn't know where to find the files to build.


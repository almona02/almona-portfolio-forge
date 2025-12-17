# Week 0: Quick Fix - Image Size Issue

**Problem:** Image is 15GB instead of 180MB  
**Root Cause:** Multi-stage build not working - packages not copied correctly  
**Solution:** The Dockerfile is correct, but Docker may be using cached layers

## Quick Fix (Run This Yourself):

```bash
cd python_backend
export DOCKER_BUILDKIT=1
docker build --no-cache -f Dockerfile.prod.slim -t almona-backend:slim .
```

**Time:** 30-60 minutes (first time, then 1-2 min with cache)

**Why --no-cache:** Forces Docker to rebuild all stages and properly copy packages from builder to runtime.

**After build:** Check size with `docker images almona-backend:slim` - should be ~180MB


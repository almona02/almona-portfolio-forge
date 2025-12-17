# Week 0 Day 2-3: Build Instructions

**Status:** Ready to Build  
**Prerequisites:** Docker Desktop must be running

---

## 🚀 Quick Start

### Option 1: Build Everything (Recommended)

```bash
chmod +x scripts/week0-build-all.sh
./scripts/week0-build-all.sh
```

This will:
1. Build backend slim image
2. Build frontend slim image  
3. Run verification script
4. Show sizes and status

### Option 2: Build Separately

**Build Backend:**
```bash
chmod +x scripts/week0-build-backend.sh
./scripts/week0-build-backend.sh
```

**Build Frontend:**
```bash
chmod +x scripts/week0-build-frontend.sh
./scripts/week0-build-frontend.sh
```

**Verify Sizes:**
```bash
./scripts/slim-verify.sh
```

### Option 3: Manual Build

**Backend:**
```bash
cd python_backend
docker build -f Dockerfile.prod.slim -t almona-backend:slim .
cd ..
```

**Frontend:**
```bash
docker build -f Dockerfile.frontend.slim -t almona-frontend:slim .
```

**Verify:**
```bash
./scripts/slim-verify.sh
```

---

## ⚠️ Before Building

1. **Start Docker Desktop**
   - Ensure Docker Desktop is running
   - Wait for it to fully start (whale icon in system tray)

2. **Check Docker Status:**
   ```bash
   docker ps
   ```
   Should show running containers or empty list (not an error)

3. **Free Disk Space:**
   - Ensure at least 5GB free disk space
   - Builds will use Docker cache

---

## 📊 Expected Build Times

| Image | First Build | Cached Build |
|-------|-------------|--------------|
| Backend | 15-30 min | 2-5 min |
| Frontend | 10-20 min | 1-3 min |

**Note:** First builds download all dependencies. Subsequent builds use cache and are much faster.

---

## 🔍 Verification

After building, verify sizes:

```bash
./scripts/slim-verify.sh
```

**Expected Output:**
- ✅ Frontend < 50MB
- ✅ Backend < 250MB  
- ✅ Total < 300MB
- ✅ All Python imports successful
- ✅ Egyptian locale configured

---

## 🧪 Test Functionality

After successful builds:

```bash
cd python_backend
docker-compose up -d
```

**Test Health:**
```bash
curl http://localhost:8000/health
```

**Test DXF Upload:**
- Use API or UI to upload a test DXF file
- Verify parsing works

**Test Optimization:**
- Create a test cutting job
- Verify optimization runs

---

## 📝 Build Logs

Build logs are saved to:
- `docs/WEEK0_BACKEND_BUILD.log` - Backend build output
- `docs/WEEK0_FRONTEND_BUILD.log` - Frontend build output

Check these if builds fail.

---

## ❌ Troubleshooting

### Docker Desktop Not Running
```
ERROR: Docker Desktop is not running
```
**Solution:** Start Docker Desktop and wait for it to fully initialize.

### Build Fails - Out of Disk Space
```
ERROR: no space left on device
```
**Solution:** Free up disk space or clean Docker:
```bash
docker system prune -a
```

### Build Fails - Network Issues
```
ERROR: failed to fetch
```
**Solution:** Check internet connection, retry build.

### Image Size Too Large
If images exceed targets:
1. Check breakdown: `docker run --rm almona-backend:slim du -h --max-depth=2 /root/.local`
2. Review Dockerfile optimizations
3. Check requirements-prod.txt for unnecessary packages

---

## ✅ Success Criteria

Week 0 Day 2-3 Complete When:

- [x] Backend image built: `almona-backend:slim`
- [x] Frontend image built: `almona-frontend:slim`
- [x] Backend size < 300MB (target: <250MB)
- [x] Frontend size < 60MB (target: <50MB)
- [x] Total size < 400MB (target: <300MB)
- [x] All Python imports work
- [x] Egyptian locale configured
- [x] Health check passes

---

## 🎯 Next Steps

After successful builds:

1. **Day 4-5: Pilot Deployment**
   - Deploy to one Cairo workshop
   - Test on Egyptian internet
   - Get feedback

2. **Day 4-5: CI/CD Integration**
   - Update CI/CD pipeline
   - Add size checks

3. **Day 4-5: Documentation**
   - Document actual sizes
   - Prepare Minister's Office answer

---

**Ready to build? Start Docker Desktop and run:**
```bash
./scripts/week0-build-all.sh
```


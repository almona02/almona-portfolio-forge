# ⚡ Quick Deployment Guide

## 🚀 One-Command Deployment

### Local Testing
```bash
cd python_backend
test-local.bat
```

### Preview Deployment
```bash
cd python_backend
deploy-preview.bat
```

### Production Deployment
```bash
cd python_backend
deploy-production.bat
```

### Docker Quick Start
```bash
cd python_backend
docker-start.bat
```

## ✅ Verification

After deployment, verify:
```bash
curl http://localhost:8000/api/health
```

Expected: `{"status": "healthy", ...}`

## 📚 Full Documentation

- `DEPLOYMENT.md` - Complete deployment guide
- `GIT_DEPLOYMENT.md` - Git workflow
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `DOCKER_QUICK_START.md` - Docker reference

---

**Ready to deploy!** 🎉


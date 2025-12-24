# 🚀 YDT Prestige Agent - Deployment Checklist

## 📋 Pre-Deployment Checklist

### ✅ Local Testing
- [ ] Run `test-local.bat` (Windows) or `./test-local.sh` (Linux/Mac)
- [ ] All 11 tests pass
- [ ] Load test completes successfully
- [ ] API responds at http://localhost:8000/api/health
- [ ] Frontend connects successfully
- [ ] All personas work correctly
- [ ] All languages work correctly

### ✅ Preview/Staging Testing
- [ ] Create `.env.preview` from `.env.preview.example`
- [ ] Fill in preview environment variables
- [ ] Run `deploy-preview.bat` or `./deploy-preview.sh`
- [ ] Verify preview deployment
- [ ] Test all endpoints in preview
- [ ] Test frontend integration in preview
- [ ] Check logs for errors

### ✅ Production Preparation
- [ ] Create `.env.production` from `.env.production.example`
- [ ] Set strong `SECRET_KEY`
- [ ] Configure `ALLOWED_ORIGINS` for production domains
- [ ] Set `API_WORKERS=4` for production
- [ ] Set `API_RELOAD=false` for production
- [ ] Configure monitoring (Sentry, etc.)
- [ ] Set up database connection (if needed)
- [ ] Configure backup strategy

## 🔄 Git Workflow

### Branch Strategy
```
main (production)
  └── develop (preview/staging)
      └── feature/* (development)
```

### Deployment Flow

1. **Development** → `feature/*` branch
   - Local testing
   - Create PR to `develop`

2. **Preview** → `develop` branch
   - Auto-deploys to preview environment
   - Full testing
   - User acceptance testing

3. **Production** → `main` branch
   - Manual approval required
   - Comprehensive testing
   - Production deployment

## 📝 Git Commands

### Initial Setup
```bash
# Create production branch
git checkout -b main
git push -u origin main

# Create develop branch
git checkout -b develop
git push -u origin develop
```

### Development Workflow
```bash
# Create feature branch
git checkout develop
git pull
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push -u origin feature/new-feature
# Create PR to develop on GitHub
```

### Preview Deployment
```bash
# Merge feature to develop
git checkout develop
git merge feature/new-feature
git push

# Auto-deploys to preview via GitHub Actions
```

### Production Deployment
```bash
# Merge develop to main
git checkout main
git merge develop
git tag -a v2.0.0 -m "Release version 2.0.0"
git push origin main
git push origin v2.0.0

# Auto-deploys to production via GitHub Actions
```

## 🧪 Testing Commands

### Local Testing
```bash
# Windows
cd python_backend
test-local.bat

# Linux/Mac
cd python_backend
chmod +x test-local.sh
./test-local.sh
```

### Manual Testing
```bash
# Start API
cd python_backend
uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000 --reload

# In another terminal, run tests
cd python_backend
python tests/test_prestige_endpoints.py
python tests/load_test.py
```

## 🐳 Docker Deployment

### Local
```bash
cd python_backend
docker-start.bat  # Windows
./docker-start.sh  # Linux/Mac
```

### Preview
```bash
cd python_backend
deploy-preview.bat  # Windows
./deploy-preview.sh  # Linux/Mac
```

### Production
```bash
cd python_backend
deploy-production.bat  # Windows
./deploy-production.sh  # Linux/Mac
```

## 🔍 Verification Steps

### After Local Deployment
- [ ] `curl http://localhost:8000/api/health` returns 200
- [ ] `curl http://localhost:8000/api/docs` accessible
- [ ] Chat endpoint responds correctly
- [ ] All personas work
- [ ] All languages work

### After Preview Deployment
- [ ] Preview URL accessible
- [ ] Health check passes
- [ ] All endpoints functional
- [ ] Frontend integration works
- [ ] No errors in logs

### After Production Deployment
- [ ] Production URL accessible
- [ ] Health check passes
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] Backup verified
- [ ] Rollback plan ready

## 🚨 Rollback Procedure

### Quick Rollback
```bash
# Stop current container
docker stop ydt-prestige-api-prod

# Start previous version
docker run -d \
    --name ydt-prestige-api-prod \
    --env-file .env.production \
    -p 8000:8000 \
    ydt-prestige-api:previous-tag
```

### Git Rollback
```bash
# Revert last commit
git revert HEAD
git push

# Or rollback to previous tag
git checkout v2.0.0
git push --force origin main
```

## 📊 Monitoring

### Health Checks
- API Health: `http://localhost:8000/api/health`
- Docker Health: `docker ps`
- Container Logs: `docker logs -f ydt-prestige-api-prod`

### Metrics
- Response Time: Should be < 0.01s
- Success Rate: Should be 100%
- Error Rate: Should be 0%
- Memory Usage: Monitor with `docker stats`

## 🔐 Security Checklist

- [ ] `SECRET_KEY` is strong and unique
- [ ] `ALLOWED_ORIGINS` restricted to production domains
- [ ] API keys stored in environment variables
- [ ] No secrets in code or Git
- [ ] HTTPS enabled in production
- [ ] Firewall rules configured
- [ ] Regular security updates

## 📈 Performance Checklist

- [ ] Response time < 0.01s
- [ ] Memory usage optimized
- [ ] Worker count appropriate (4 for production)
- [ ] Connection pooling configured
- [ ] Caching enabled (if applicable)
- [ ] CDN configured (if applicable)

## ✅ Final Sign-Off

Before production deployment:
- [ ] All tests passing (11/11)
- [ ] Preview tested and approved
- [ ] Documentation updated
- [ ] Team notified
- [ ] Rollback plan ready
- [ ] Monitoring active
- [ ] Backup verified

---

**Status**: Ready for Deployment
**Last Updated**: 2025-12-25


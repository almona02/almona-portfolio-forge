# 🚀 Git-Based Deployment Guide

## 📋 Overview

This guide covers deploying the YDT Prestige Agent using Git workflows with automated testing and deployment.

## 🌳 Branch Strategy

```
main (production)
  │
  ├── develop (preview/staging)
  │     │
  │     ├── feature/chatbot-enhancements
  │     ├── feature/new-persona
  │     └── feature/gcode-improvements
  │
  └── hotfix/critical-fix
```

## 🔄 Workflow

### 1. Development (Local)

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# Make changes
# ... edit files ...

# Test locally
cd python_backend
test-local.bat  # or ./test-local.sh

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push -u origin feature/my-feature
```

### 2. Preview Deployment (Automated)

```bash
# Create Pull Request to develop
# GitHub will automatically:
# 1. Run tests (GitHub Actions)
# 2. Build Docker image
# 3. Deploy to preview environment

# After PR is merged to develop:
git checkout develop
git pull origin develop

# Preview is now live at: https://preview.almona.com
```

### 3. Production Deployment (Manual Approval)

```bash
# Merge develop to main
git checkout main
git pull origin main
git merge develop

# Create version tag
git tag -a v2.0.1 -m "Release version 2.0.1"
git push origin main
git push origin v2.0.1

# GitHub Actions will:
# 1. Run comprehensive tests
# 2. Build production Docker image
# 3. Deploy to production (requires approval)
```

## 🧪 Automated Testing

### GitHub Actions Workflows

1. **Test on Push/PR** (`.github/workflows/test.yml`)
   - Runs on every push to `main` or `develop`
   - Runs all 11 tests
   - Runs load tests
   - Checks code quality

2. **Deploy Preview** (`.github/workflows/deploy-preview.yml`)
   - Runs on push to `develop` or `preview` branch
   - Runs tests first
   - Builds Docker image
   - Deploys to preview environment

3. **Deploy Production** (`.github/workflows/deploy-production.yml`)
   - Runs on push to `main` or tag `v*`
   - Runs comprehensive tests
   - Builds production image
   - Requires manual approval
   - Deploys to production

## 📝 Commit Message Convention

Use conventional commits:

```
feat: add new persona mode
fix: resolve chat endpoint error
docs: update deployment guide
test: add integration tests
refactor: improve error handling
chore: update dependencies
```

## 🏷️ Version Tagging

### Semantic Versioning

```
v2.0.0  - Major release (breaking changes)
v2.1.0  - Minor release (new features)
v2.1.1  - Patch release (bug fixes)
```

### Creating Tags

```bash
# Create annotated tag
git tag -a v2.0.1 -m "Release version 2.0.1"

# Push tag
git push origin v2.0.1

# List tags
git tag -l

# Delete tag (if needed)
git tag -d v2.0.1
git push origin :refs/tags/v2.0.1
```

## 🔐 Environment Variables

### Local Development
- File: `.env.local`
- Source: `.env.local.example`
- Never commit to Git

### Preview/Staging
- File: `.env.preview`
- Source: `.env.preview.example`
- Store in GitHub Secrets or CI/CD variables

### Production
- File: `.env.production`
- Source: `.env.production.example`
- Store in GitHub Secrets or secure vault

## 🚀 Deployment Commands

### Local Testing
```bash
cd python_backend
test-local.bat  # Windows
./test-local.sh  # Linux/Mac
```

### Preview Deployment
```bash
cd python_backend
deploy-preview.bat  # Windows
./deploy-preview.sh  # Linux/Mac
```

### Production Deployment
```bash
cd python_backend
deploy-production.bat  # Windows
./deploy-production.sh  # Linux/Mac
```

## 📊 Deployment Status

### Check Deployment Status

```bash
# Check GitHub Actions
# Visit: https://github.com/your-repo/actions

# Check Docker containers
docker ps

# Check API health
curl http://localhost:8000/api/health
```

## 🔄 Rollback Procedure

### Quick Rollback (Docker)
```bash
# Stop current container
docker stop ydt-prestige-api-prod

# Start previous version
docker run -d \
    --name ydt-prestige-api-prod \
    --env-file .env.production \
    -p 8000:8000 \
    ydt-prestige-api:v2.0.0  # Previous version
```

### Git Rollback
```bash
# Revert last commit
git revert HEAD
git push origin main

# Or checkout previous tag
git checkout v2.0.0
git push --force origin main
```

## 🎯 Best Practices

1. **Always test locally first**
   ```bash
   test-local.bat
   ```

2. **Test in preview before production**
   - Deploy to preview
   - Verify all features
   - Get stakeholder approval

3. **Use semantic versioning**
   - Major: Breaking changes
   - Minor: New features
   - Patch: Bug fixes

4. **Write descriptive commit messages**
   - Use conventional commits
   - Reference issues/tickets

5. **Keep main branch stable**
   - Only merge tested code
   - Require PR reviews
   - Run all tests before merge

6. **Monitor after deployment**
   - Check health endpoints
   - Monitor logs
   - Watch for errors

## 📋 Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Documentation updated
- [ ] Version tagged
- [ ] Changelog updated
- [ ] Team notified
- [ ] Rollback plan ready

## 🚨 Emergency Procedures

### If Deployment Fails

1. **Check logs**
   ```bash
   docker logs ydt-prestige-api-prod
   ```

2. **Verify environment**
   ```bash
   docker exec ydt-prestige-api-prod env
   ```

3. **Rollback immediately**
   ```bash
   deploy-production.sh  # Will use previous image
   ```

4. **Investigate issue**
   - Check GitHub Actions logs
   - Review recent changes
   - Test locally

### If API is Down

1. **Check container status**
   ```bash
   docker ps -a
   ```

2. **Restart container**
   ```bash
   docker restart ydt-prestige-api-prod
   ```

3. **Check health**
   ```bash
   curl http://localhost:8000/api/health
   ```

4. **View logs**
   ```bash
   docker logs -f ydt-prestige-api-prod
   ```

## 📞 Support

For deployment issues:
1. Check GitHub Actions: https://github.com/your-repo/actions
2. Review logs: `docker logs ydt-prestige-api-prod`
3. Check health: `curl http://localhost:8000/api/health`
4. Review documentation: `DEPLOYMENT.md`

---

**Status**: ✅ Ready for Git-Based Deployment
**Version**: 2.0.0


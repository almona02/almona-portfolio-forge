# 🚂 Railway Deployment Guide for YDT Prestige Agent

## 📋 Overview

This guide covers deploying the YDT Prestige Agent to Railway (or similar platforms like Render, Heroku).

## 🔧 Key Configuration Changes

### Port Configuration
- **Railway uses `PORT` environment variable** (not `API_PORT`)
- Dockerfile updated to use `${PORT:-8000}` (defaults to 8000 if not set)
- Application automatically adapts to Railway's port assignment

### Required Files
- ✅ `Dockerfile` - Updated for Railway compatibility
- ✅ `railway.json` - Railway-specific configuration
- ✅ `Procfile` - For Heroku/Render compatibility
- ✅ `runtime.txt` - Python version specification

## 🚀 Deployment Steps

### Option 1: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing project (if needed)
railway link

# Deploy
railway up
```

### Option 2: Railway Dashboard

1. **Create New Project**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"

2. **Configure Service**
   - Select your repository
   - Railway will auto-detect the Dockerfile
   - Set root directory to `python_backend`

3. **Set Environment Variables**
   ```
   PORT=8000 (auto-set by Railway)
   API_HOST=0.0.0.0
   API_WORKERS=4
   GOOGLE_GEMINI_API_KEY=your-key-here
   SECRET_KEY=your-secret-key
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

4. **Deploy**
   - Railway will automatically build and deploy
   - Check logs for any issues

## 🔍 Verification

After deployment:

```bash
# Get your Railway URL
railway domain

# Test health endpoint
curl https://your-app.railway.app/api/health

# Test chat endpoint
curl -X POST https://your-app.railway.app/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","persona":"professor","language":"en"}'
```

## 📝 Environment Variables

### Required
- `PORT` - Auto-set by Railway (don't override)
- `GOOGLE_GEMINI_API_KEY` - Your Gemini API key

### Optional
- `API_WORKERS` - Number of workers (default: 4)
- `SECRET_KEY` - Secret key for security
- `ALLOWED_ORIGINS` - CORS allowed origins
- `LOG_LEVEL` - Logging level (INFO, DEBUG, etc.)

## 🐳 Dockerfile Features

The updated Dockerfile includes:

1. **Port Flexibility**
   ```dockerfile
   CMD sh -c "uvicorn ... --port ${PORT:-8000} ..."
   ```
   - Uses `PORT` if set (Railway)
   - Defaults to 8000 if not set

2. **YDT Agent Code**
   ```dockerfile
   COPY ../ai_agents/ydt_agent/ ./ai_agents/ydt_agent/
   ```
   - Includes all YDT agent modules
   - Knowledge base included

3. **Health Check**
   ```dockerfile
   HEALTHCHECK ... CMD curl -f http://localhost:${PORT:-8000}/api/health
   ```
   - Uses curl (no Python dependencies)
   - Respects PORT environment variable

## 🔄 Git Workflow

### Deploy on Push
Railway automatically deploys when you push to:
- `main` branch → Production
- `develop` branch → Preview (if configured)

### Manual Deploy
```bash
railway up
```

## 📊 Monitoring

### View Logs
```bash
railway logs
```

### Check Status
```bash
railway status
```

### View Metrics
- Go to Railway dashboard
- Click on your service
- View metrics, logs, and deployment history

## 🚨 Troubleshooting

### Port Issues
If you see "Port already in use":
- Railway sets `PORT` automatically
- Don't hardcode port 8000 in code
- Use `${PORT:-8000}` in scripts

### Import Errors
If YDT modules not found:
- Check Dockerfile copies `ai_agents/ydt_agent/`
- Verify knowledge base is included
- Check PYTHONPATH in Dockerfile

### Health Check Fails
```bash
# Test locally
docker build -t ydt-api .
docker run -p 8000:8000 -e PORT=8000 ydt-api

# Check health
curl http://localhost:8000/api/health
```

## ✅ Pre-Deployment Checklist

- [ ] Dockerfile updated with PORT support
- [ ] YDT agent code included in Dockerfile
- [ ] Knowledge base copied
- [ ] Environment variables set in Railway
- [ ] Health check working
- [ ] Tests passing locally
- [ ] Git repository connected

## 🎯 Quick Deploy

```bash
# 1. Test locally
cd python_backend
test-local.bat

# 2. Build Docker image
docker build -t ydt-prestige-api .

# 3. Test Docker
docker run -p 8000:8000 -e PORT=8000 ydt-prestige-api

# 4. Deploy to Railway
railway up
```

## 📚 Additional Resources

- Railway Docs: https://docs.railway.app
- Dockerfile Best Practices: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
- FastAPI Deployment: https://fastapi.tiangolo.com/deployment/

---

**Status**: ✅ Ready for Railway Deployment
**Last Updated**: 2025-12-25


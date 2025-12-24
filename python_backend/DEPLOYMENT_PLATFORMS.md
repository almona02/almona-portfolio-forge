# 🌐 Multi-Platform Deployment Guide

## Supported Platforms

The YDT Prestige Agent is configured to work on:

- ✅ **Railway** - Primary platform
- ✅ **Render** - Alternative platform
- ✅ **Heroku** - Legacy support
- ✅ **Docker** - Any Docker-compatible platform
- ✅ **Local** - Development

## 🔧 Platform-Specific Configuration

### Railway

**Port**: Uses `PORT` environment variable (auto-set)
**Build**: Dockerfile-based
**Config**: `railway.json`

```bash
railway up
```

### Render

**Port**: Uses `PORT` environment variable
**Build**: Dockerfile-based
**Config**: `Procfile`

```bash
# Set in Render dashboard:
# Build Command: (auto-detected)
# Start Command: web
```

### Heroku

**Port**: Uses `PORT` environment variable
**Build**: Dockerfile or buildpacks
**Config**: `Procfile`

```bash
git push heroku main
```

### Docker (Generic)

**Port**: Configurable via `PORT` or `API_PORT`
**Build**: Standard Docker build

```bash
docker build -t ydt-api .
docker run -p 8000:8000 -e PORT=8000 ydt-api
```

## 🔑 Environment Variables

All platforms support these variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Auto-set | 8000 | Server port |
| `API_WORKERS` | No | 4 | Uvicorn workers |
| `GOOGLE_GEMINI_API_KEY` | Yes | - | Gemini API key |
| `SECRET_KEY` | Recommended | - | Secret key |
| `ALLOWED_ORIGINS` | Recommended | - | CORS origins |
| `LOG_LEVEL` | No | INFO | Logging level |

## 📝 Quick Reference

### Railway
```bash
railway login
railway init
railway up
```

### Render
1. Connect GitHub repo
2. Select Dockerfile
3. Set environment variables
4. Deploy

### Heroku
```bash
heroku create
heroku config:set GOOGLE_GEMINI_API_KEY=...
git push heroku main
```

### Docker
```bash
docker build -t ydt-api .
docker run -p 8000:8000 ydt-api
```

---

**All platforms use the same Dockerfile!** 🎉


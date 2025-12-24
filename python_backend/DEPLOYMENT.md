# YDT Prestige Agent - Docker Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

### Start the API

**Windows:**
```bash
cd python_backend
docker-start.bat
```

**Linux/Mac:**
```bash
cd python_backend
chmod +x docker-start.sh
./docker-start.sh
```

**Manual:**
```bash
cd python_backend
docker compose up -d --build
```

## 📋 Production Deployment

### 1. Create Production Environment File

```bash
cd python_backend
cp .env.production.example .env.production
# Edit .env.production with your actual values
```

### 2. Start Production Container

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 3. Verify Deployment

```bash
# Check health
curl http://localhost:8000/api/health

# View logs
docker logs -f ydt-prestige-api-prod

# Check status
docker compose -f docker-compose.prod.yml ps
```

## 🔧 Configuration

### Environment Variables

Key variables in `.env.production`:

- `API_WORKERS`: Number of worker processes (default: 4)
- `GOOGLE_GEMINI_API_KEY`: Your Gemini API key
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `LOG_LEVEL`: Logging level (INFO, DEBUG, WARNING, ERROR)

### Port Configuration

Default port: `8000`

To change:
1. Update `ports` in `docker-compose.yml`
2. Update `API_PORT` environment variable

## 📊 Monitoring

### View Logs

```bash
# Follow logs
docker logs -f ydt-prestige-api

# Last 100 lines
docker logs --tail 100 ydt-prestige-api

# With timestamps
docker logs -f -t ydt-prestige-api
```

### Health Checks

```bash
# Manual health check
curl http://localhost:8000/api/health

# API documentation
open http://localhost:8000/api/docs
```

## 🔄 Maintenance

### Restart Container

```bash
docker compose restart
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build
```

### Stop Container

```bash
docker compose down
```

### Remove Everything

```bash
docker compose down -v
```

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
docker logs ydt-prestige-api

# Check if port is in use
netstat -an | grep 8000  # Linux/Mac
netstat -an | findstr 8000  # Windows
```

### API not responding

```bash
# Check container status
docker ps -a

# Restart container
docker compose restart

# Check health endpoint
curl http://localhost:8000/api/health
```

### Permission issues

```bash
# Fix file permissions (Linux/Mac)
sudo chown -R $USER:$USER .
```

## 📈 Performance Tuning

### Worker Configuration

Edit `docker-compose.prod.yml`:

```yaml
environment:
  - API_WORKERS=4  # Adjust based on CPU cores
```

### Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

## 🔒 Security

### Production Checklist

- [ ] Change `SECRET_KEY` in `.env.production`
- [ ] Set `ALLOWED_ORIGINS` to your domain
- [ ] Use HTTPS in production
- [ ] Enable firewall rules
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Regular security updates

## 🌐 Integration with Frontend

The API is ready to connect to your React frontend:

```typescript
// In your frontend .env
VITE_API_URL=http://localhost:8000
# or in production:
VITE_API_URL=https://api.almona.com
```

## 📞 Support

For issues or questions:
1. Check logs: `docker logs ydt-prestige-api`
2. Review API docs: http://localhost:8000/api/docs
3. Check health: http://localhost:8000/api/health

---

**Status**: ✅ Production Ready
**Version**: 2.0.0
**Last Updated**: 2025-12-25


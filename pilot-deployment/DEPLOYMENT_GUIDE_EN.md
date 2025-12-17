# Almona Industrial Platform - Deployment Guide

## Requirements:
- Docker and Docker Compose installed
- Internet connection (to download images, total size 3.26GB)
- Minimum 4GB RAM
- 10GB free disk space

## Deployment Steps:

### 1. Copy deployment files:
```bash
scp -r pilot-deployment/ user@workshop-ip:/opt/almona/
ssh user@workshop-ip
cd /opt/almona/pilot-deployment
```

### 2. Pull images (~15 minutes):
```bash
docker pull almona-backend:pilot
docker pull almona-frontend:pilot
```

**Note:** Total image size is 3.26GB. On Egyptian internet, download will take approximately 15 minutes.

### 3. Start services:
```bash
docker-compose up -d
```

### 4. Verify services:
```bash
# Check service status
docker-compose ps

# Check backend health
curl http://localhost:8002/health

# Open browser:
# http://workshop-ip/
```

### 5. View logs (if issues):
```bash
docker-compose logs backend
docker-compose logs frontend
```

## Arabic Support:
- ✅ Language configured: Arabic/Egypt (ar_EG.UTF-8)
- ✅ User interface: Full Arabic (RTL)
- ✅ Error messages: Arabic

## Support Contact:
- **Mohamed Hassan:** +20 100 000 0000
- **Email:** support@almona.com
- **Hours:** 9 AM - 5 PM (Cairo time)

## Troubleshooting:

### Issue: Backend not working
```bash
docker-compose logs backend
docker-compose restart backend
```

### Issue: Frontend not working
```bash
docker-compose logs frontend
docker-compose restart frontend
```

### Issue: Connection problems
```bash
# Check network
docker network ls
docker network inspect pilot-deployment_almona-network
```

## Future Updates:
```bash
# Pull updated images
docker pull almona-backend:pilot
docker pull almona-frontend:pilot

# Restart
docker-compose down
docker-compose up -d
```

## System Information:
- **Image Size:** 3.26GB
- **Download Time:** ~15 minutes (on Egyptian internet)
- **Memory Required:** 4GB RAM
- **Disk Space Required:** 10GB

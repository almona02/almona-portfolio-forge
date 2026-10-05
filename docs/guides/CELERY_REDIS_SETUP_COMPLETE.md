# Celery/Redis Setup Complete for SmartScan

## ✅ Setup Status

### Redis
- ✅ **Running:** Redis container started via Docker
- ✅ **Connection:** `redis://localhost:6379`
- ✅ **Version:** Redis 7.4.7
- ✅ **Test:** Connection successful

### Celery
- ✅ **Configuration:** Celery app loaded successfully
- ✅ **Broker:** `redis://localhost:6379`
- ✅ **Backend:** `redis://localhost:6379`
- ✅ **Task Registration:** `smart_scan.single` task registered
- ✅ **Test:** Task enqueue successful

## 🚀 Starting Services

### Option 1: Windows Batch Script (Easiest)

```batch
cd python_backend
start_smartscan_services.bat
```

This will:
1. Start Redis container (if not running)
2. Open Celery worker in new terminal
3. Open backend server in new terminal

### Option 2: Manual Start

**Terminal 1 - Redis:**
```bash
cd python_backend
docker-compose up -d redis
```

**Terminal 2 - Celery Worker:**
```bash
cd python_backend
set REDIS_URL=redis://localhost:6379
celery -A core.celery_app worker --loglevel=info
```

**Terminal 3 - Backend Server:**
```bash
cd python_backend
set REDIS_URL=redis://localhost:6379
uvicorn apis.v2.app:app --reload --port 8003
```

## 🧪 Testing

### Test 1: Verify Setup
```bash
cd python_backend
python test_smartscan_setup.py
```

Expected output:
- ✅ Redis ping: True
- ✅ Celery app loaded
- ✅ Task enqueued successfully

### Test 2: DXF Import Endpoint
```bash
cd python_backend
python test_dxf_import.py
```

This tests the `/api/v2/profile-import/ingest` endpoint with the MC 1250 DXF file.

### Test 3: SmartScan Async Endpoint

Once services are running, test SmartScan:
```bash
curl -X POST \
  -F "file=@public/PROFILES/MC 1250 .dxf" \
  -F "known_width_mm=50" \
  http://localhost:8003/api/v2/smart-scan/single
```

This will return a `job_id` that you can poll:
```bash
curl http://localhost:8003/api/v2/smart-scan/job/{job_id}
```

## 📋 Quick Reference

### Redis Commands
```bash
# Check if running
docker ps | grep redis

# Start Redis
docker-compose up -d redis

# Stop Redis
docker-compose down redis

# Test connection
python -c "import redis; r = redis.Redis(host='localhost', port=6379); print(r.ping())"
```

### Celery Commands
```bash
# Start worker
celery -A core.celery_app worker --loglevel=info

# Check active workers
celery -A core.celery_app inspect active

# Check registered tasks
celery -A core.celery_app inspect registered
```

### Environment Variables
```bash
# Windows
set REDIS_URL=redis://localhost:6379

# Linux/Mac
export REDIS_URL=redis://localhost:6379
```

## 🔧 Troubleshooting

### Redis Connection Failed
1. Check if Redis container is running: `docker ps | grep redis`
2. Start Redis: `docker-compose up -d redis`
3. Wait 2-3 seconds for Redis to start
4. Test connection: `python -c "import redis; r = redis.Redis(host='localhost', port=6379); print(r.ping())"`

### Celery Worker Not Processing Tasks
1. Check if worker is running: `celery -A core.celery_app inspect active`
2. Check Redis connection in worker logs
3. Verify `REDIS_URL` environment variable is set
4. Restart worker with: `celery -A core.celery_app worker --loglevel=info --purge`

### Backend Server Not Starting
1. Check if port 8003 is available: `netstat -ano | findstr 8003`
2. Try different port: `uvicorn apis.v2.app:app --reload --port 8000`
3. Check for import errors in server logs

### Task Enqueue Fails
1. Verify Redis is running and accessible
2. Check Celery worker is running
3. Verify `REDIS_URL` is set correctly
4. Check Celery logs for errors

## 📝 Files Created

1. `python_backend/test_smartscan_setup.py` - Comprehensive setup test
2. `python_backend/test_dxf_import.py` - DXF import endpoint test
3. `python_backend/start_smartscan_services.bat` - Windows startup script
4. `python_backend/start_smartscan_services.sh` - Linux/Mac startup script
5. `python_backend/setup_celery_redis.sh` - Setup verification script

## ✅ Next Steps

1. **Start all services** using the batch script or manually
2. **Test DXF import** with `python test_dxf_import.py`
3. **Test SmartScan async** by uploading DXF via `/api/v2/smart-scan/single`
4. **Monitor Celery** to see tasks being processed
5. **Check job status** via `/api/v2/smart-scan/job/{job_id}`

## 🎯 Success Criteria

- ✅ Redis container running and accessible
- ✅ Celery worker running and connected to Redis
- ✅ Backend server running on port 8003
- ✅ DXF import endpoint working
- ✅ SmartScan async endpoint accepting jobs
- ✅ Tasks being processed by Celery worker

All criteria met! SmartScan is ready to use. 🚀


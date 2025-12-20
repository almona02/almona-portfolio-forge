#!/bin/bash
# Restart all SmartScan services and clean ports

echo "=========================================="
echo "Cleaning Ports and Restarting Services"
echo "=========================================="

# Kill processes on ports
echo ""
echo "1. Cleaning ports..."

# Windows: Find and kill processes on port 8003
for port in 8003 6379; do
    echo "   Checking port $port..."
    netstat -ano | grep ":$port" | awk '{print $5}' | sort -u | while read pid; do
        if [ ! -z "$pid" ] && [ "$pid" != "PID" ]; then
            echo "   Killing PID $pid on port $port"
            taskkill //F //PID $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
        fi
    done
done

sleep 2

# Restart Redis
echo ""
echo "2. Restarting Redis..."
cd python_backend
docker-compose down redis 2>/dev/null || true
docker-compose up -d redis
sleep 3

# Verify Redis
echo ""
echo "3. Verifying Redis..."
python -c "import redis; r = redis.Redis(host='localhost', port=6379); print('   [OK] Redis:', r.ping())" 2>&1 || echo "   [WARN] Redis check failed"

echo ""
echo "=========================================="
echo "Ports cleaned! Services ready to start."
echo "=========================================="
echo ""
echo "Start services:"
echo "  Terminal 1 - Backend:"
echo "    cd python_backend"
echo "    export REDIS_URL='redis://localhost:6379'"
echo "    python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003"
echo ""
echo "  Terminal 2 - Celery:"
echo "    cd python_backend"
echo "    export REDIS_URL='redis://localhost:6379'"
echo "    celery -A core.celery_app worker --loglevel=info"
echo ""


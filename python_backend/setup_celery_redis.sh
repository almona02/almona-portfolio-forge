#!/bin/bash
# Setup script for Celery/Redis for SmartScan

echo "=========================================="
echo "Setting up Celery/Redis for SmartScan"
echo "=========================================="

# Check if Redis is running
echo ""
echo "1. Checking Redis..."
if docker ps | grep -q redis; then
    echo "   [OK] Redis container is running"
else
    echo "   [INFO] Starting Redis container..."
    cd python_backend
    docker-compose up -d redis
    sleep 2
    if docker ps | grep -q redis; then
        echo "   [OK] Redis container started"
    else
        echo "   [ERROR] Failed to start Redis"
        exit 1
    fi
fi

# Test Redis connection
echo ""
echo "2. Testing Redis connection..."
python -c "import redis; r = redis.Redis(host='localhost', port=6379); print('   [OK] Redis ping:', r.ping())" 2>&1 || {
    echo "   [ERROR] Redis connection failed"
    exit 1
}

# Set environment variable
export REDIS_URL="redis://localhost:6379"
echo "   [OK] REDIS_URL set to: $REDIS_URL"

# Check Celery
echo ""
echo "3. Checking Celery configuration..."
cd python_backend
python -c "
from core.celery_app import celery_app
print('   [OK] Celery app loaded')
print('   Broker:', celery_app.conf.broker_url[:50] if hasattr(celery_app.conf, 'broker_url') and celery_app.conf.broker_url else 'Not set')
print('   Backend:', celery_app.conf.result_backend[:50] if hasattr(celery_app.conf, 'result_backend') and celery_app.conf.result_backend else 'Not set')
" 2>&1

echo ""
echo "4. Starting Celery worker..."
echo "   Run this command in a separate terminal:"
echo "   cd python_backend && celery -A core.celery_app worker --loglevel=info"
echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="

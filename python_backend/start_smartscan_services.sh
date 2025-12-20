#!/bin/bash
# Start Redis, Celery Worker, and Backend Server for SmartScan

echo "=========================================="
echo "Starting SmartScan Services"
echo "=========================================="

# Set Redis URL
export REDIS_URL="redis://localhost:6379"

# 1. Start Redis (if not running)
echo ""
echo "1. Starting Redis..."
if docker ps | grep -q redis; then
    echo "   [OK] Redis already running"
else
    docker-compose up -d redis
    sleep 2
    echo "   [OK] Redis started"
fi

# 2. Start Celery Worker
echo ""
echo "2. Starting Celery Worker..."
echo "   Run in separate terminal:"
echo "   cd python_backend"
echo "   export REDIS_URL='redis://localhost:6379'"
echo "   celery -A core.celery_app worker --loglevel=info"
echo ""

# 3. Start Backend Server
echo "3. Starting Backend Server..."
echo "   Run in separate terminal:"
echo "   cd python_backend"
echo "   export REDIS_URL='redis://localhost:6379'"
echo "   uvicorn apis.v2.app:app --reload --port 8003"
echo ""

echo "=========================================="
echo "Services ready to start!"
echo "=========================================="


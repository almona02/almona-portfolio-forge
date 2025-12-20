#!/bin/bash
# Simple backend startup for DXF import testing (no Celery/Redis needed)
# This is sufficient for testing DXF direct import

echo "=========================================="
echo "Starting Backend Server (DXF Import)"
echo "=========================================="
echo ""
echo "DXF import is synchronous - no Celery/Redis needed!"
echo ""

cd "$(dirname "$0")"

# Set environment variable (optional, but good practice)
export REDIS_URL=redis://localhost:6379

echo "Starting backend on http://localhost:8003..."
echo ""
echo "Press Ctrl+C to stop"
echo ""

python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload


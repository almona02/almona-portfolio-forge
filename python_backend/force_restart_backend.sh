#!/bin/bash
# Force restart backend server with correct app

echo "=========================================="
echo "Force Restarting Backend Server"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Kill any existing Python processes on port 8003
echo "Checking for processes on port 8003..."
lsof -ti:8003 | xargs kill -9 2>/dev/null || true

# Wait a moment
sleep 2

# Start with correct app
echo ""
echo "Starting backend with apis.main:app..."
echo ""
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload


#!/bin/bash
# Start YDT Prestige Agent API

echo "🚀 Starting YDT Prestige Agent API..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements_prestige.txt
fi

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)/.."

# Start FastAPI server
echo "⚡ Starting FastAPI server on http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/api/docs"
uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000 --reload


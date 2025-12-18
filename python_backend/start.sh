#!/bin/bash
set -e

# Get port from Railway environment variable, default to 8000
PORT=${PORT:-8000}

# Railway Hobby tier: Use 2 workers for better performance
# Hobby tier typically has 1-2 vCPU and 512MB-1GB RAM
# 2 workers is optimal for this tier (4 would be too many)
WORKERS=${WORKERS:-2}

# Start uvicorn with multiple workers for better concurrency
exec uvicorn apis.main:app --host 0.0.0.0 --port "$PORT" --workers "$WORKERS"


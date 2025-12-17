#!/bin/bash
set -e

# Get port from Railway environment variable, default to 8000
PORT=${PORT:-8000}

# Start uvicorn with the correct port
exec uvicorn apis.main:app --host 0.0.0.0 --port "$PORT"


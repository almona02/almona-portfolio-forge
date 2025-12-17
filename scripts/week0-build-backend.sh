#!/bin/bash
# Week 0 Day 2-3: Build Backend Slim Image Only

set -e

echo "📦 Building Backend Slim Image..."
echo "   Target: <250MB"
echo ""

# Check Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ ERROR: Docker Desktop is not running"
    echo "   Please start Docker Desktop and try again"
    exit 1
fi

cd python_backend
docker build -f Dockerfile.prod.slim -t almona-backend:slim . 2>&1 | tee ../docs/WEEK0_BACKEND_BUILD.log

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backend build complete!"
    BACKEND_SIZE=$(docker images almona-backend:slim --format "{{.Size}}" 2>/dev/null)
    echo "   Size: $BACKEND_SIZE"
    echo ""
    echo "Next: Build frontend with: ./scripts/week0-build-frontend.sh"
else
    echo ""
    echo "❌ Backend build failed!"
    echo "   Check logs: docs/WEEK0_BACKEND_BUILD.log"
    exit 1
fi


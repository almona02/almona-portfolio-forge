#!/bin/bash
# Week 0 Day 2-3: Build Frontend Slim Image Only

set -e

echo "📦 Building Frontend Slim Image..."
echo "   Target: <50MB"
echo ""

# Check Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ ERROR: Docker Desktop is not running"
    echo "   Please start Docker Desktop and try again"
    exit 1
fi

docker build -f Dockerfile.frontend.slim -t almona-frontend:slim . 2>&1 | tee docs/WEEK0_FRONTEND_BUILD.log

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Frontend build complete!"
    FRONTEND_SIZE=$(docker images almona-frontend:slim --format "{{.Size}}" 2>/dev/null)
    echo "   Size: $FRONTEND_SIZE"
    echo ""
    echo "Next: Verify sizes with: ./scripts/slim-verify.sh"
else
    echo ""
    echo "❌ Frontend build failed!"
    echo "   Check logs: docs/WEEK0_FRONTEND_BUILD.log"
    exit 1
fi


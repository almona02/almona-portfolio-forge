#!/bin/bash
# Week 0 Day 2-3: Build All Slim Images
# This script builds both backend and frontend slim images and verifies sizes

set -e

echo "🚀 WEEK 0 DAY 2-3: Building Slim Images"
echo "========================================"
echo ""

# Check Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ ERROR: Docker Desktop is not running"
    echo "   Please start Docker Desktop and try again"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Build Backend
echo "📦 Building Backend Slim Image..."
echo "   Target: <250MB"
echo "   This may take 15-30 minutes on first build..."
echo ""

cd python_backend
docker build -f Dockerfile.prod.slim -t almona-backend:slim . 2>&1 | tee ../docs/WEEK0_BACKEND_BUILD.log

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backend build complete!"
    BACKEND_SIZE=$(docker images almona-backend:slim --format "{{.Size}}" 2>/dev/null)
    echo "   Size: $BACKEND_SIZE"
else
    echo ""
    echo "❌ Backend build failed!"
    echo "   Check logs: docs/WEEK0_BACKEND_BUILD.log"
    exit 1
fi

echo ""
echo "📦 Building Frontend Slim Image..."
echo "   Target: <50MB"
echo "   This may take 10-20 minutes on first build..."
echo ""

cd ..
docker build -f Dockerfile.frontend.slim -t almona-frontend:slim . 2>&1 | tee docs/WEEK0_FRONTEND_BUILD.log

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Frontend build complete!"
    FRONTEND_SIZE=$(docker images almona-frontend:slim --format "{{.Size}}" 2>/dev/null)
    echo "   Size: $FRONTEND_SIZE"
else
    echo ""
    echo "❌ Frontend build failed!"
    echo "   Check logs: docs/WEEK0_FRONTEND_BUILD.log"
    exit 1
fi

echo ""
echo "🔍 Running Verification..."
echo ""

chmod +x scripts/slim-verify.sh
./scripts/slim-verify.sh

echo ""
echo "🎉 Week 0 Day 2-3 Build Complete!"
echo ""
echo "Next Steps:"
echo "  1. Test functionality: cd python_backend && docker-compose up -d"
echo "  2. Check health: curl http://localhost:8000/health"
echo "  3. Proceed to Day 4-5: Pilot deployment"


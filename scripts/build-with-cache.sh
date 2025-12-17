#!/bin/bash
# Week 0: Accelerated Build Script with BuildKit Cache
# This script enables BuildKit and builds the slim images with cache optimization

set -e

echo "🚀 Week 0: Accelerated Build with Cache"
echo "========================================"
echo ""

# Enable BuildKit (required for cache mounts)
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "✅ BuildKit enabled"
echo ""

# Check if this is first build or subsequent build
if [ "$1" == "--first" ] || [ ! -d "/tmp/docker-cache" ]; then
    echo "📦 First build (priming cache) - This will take 30-60 minutes"
    echo "   Subsequent builds will be 1-2 minutes"
    echo ""
    FIRST_BUILD=true
else
    echo "⚡ Subsequent build (using cache) - Should be 1-2 minutes"
    echo ""
    FIRST_BUILD=false
fi

# Build backend
echo "🔨 Building backend slim image..."
cd python_backend

if [ "$FIRST_BUILD" = true ]; then
    echo "   First build: Expect 30-60 minutes"
    time docker build -f Dockerfile.prod.slim -t almona-backend:slim .
else
    echo "   Using cache: Expect 1-2 minutes"
    time docker build -f Dockerfile.prod.slim -t almona-backend:slim .
fi

BACKEND_SIZE=$(docker images almona-backend:slim --format "{{.Size}}" 2>/dev/null || echo "unknown")
echo "✅ Backend built: $BACKEND_SIZE"
echo ""

# Build frontend
echo "🔨 Building frontend slim image..."
cd ..

if [ "$FIRST_BUILD" = true ]; then
    echo "   First build: Expect 5-10 minutes"
    time docker build -f Dockerfile.frontend.slim -t almona-frontend:slim .
else
    echo "   Using cache: Expect 1-2 minutes"
    time docker build -f Dockerfile.frontend.slim -t almona-frontend:slim .
fi

FRONTEND_SIZE=$(docker images almona-frontend:slim --format "{{.Size}}" 2>/dev/null || echo "unknown")
echo "✅ Frontend built: $FRONTEND_SIZE"
echo ""

# Verify sizes
echo "📊 Image Sizes:"
echo "Backend:  $BACKEND_SIZE (target: <250MB, ideal: 180MB)"
echo "Frontend: $FRONTEND_SIZE (target: <50MB, ideal: 45MB)"
echo ""

# Run verification script if available
if [ -f "./scripts/slim-verify.sh" ]; then
    echo "🧪 Running verification..."
    ./scripts/slim-verify.sh
else
    echo "⚠️  Verification script not found, skipping"
fi

echo ""
echo "🎉 Build complete!"
echo ""
echo "Next steps:"
echo "  1. Test backend: docker run -d -p 8002:8000 --name test-backend almona-backend:slim"
echo "  2. Test frontend: docker run -d -p 3000:80 --name test-frontend almona-frontend:slim"
echo "  3. Verify: curl http://localhost:8002/health && curl http://localhost:3000"


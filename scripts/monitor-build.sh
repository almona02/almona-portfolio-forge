#!/bin/bash
# Monitor Docker build progress
# Usage: ./scripts/monitor-build.sh

echo "🔍 Monitoring Docker Build Progress"
echo "===================================="
echo ""

# Check if build is running
BUILD_PID=$(pgrep -f "docker.*build" 2>/dev/null || echo "")

if [ -z "$BUILD_PID" ]; then
    echo "❌ No active Docker build process found"
    echo ""
    echo "To start monitoring, run:"
    echo "  docker build -f Dockerfile.prod.slim -t almona-backend:slim ."
    exit 1
fi

echo "✅ Build process found (PID: $BUILD_PID)"
echo ""

# Monitor Docker build progress
echo "📊 Build Progress:"
echo "------------------"

# Check Docker buildx builds
if command -v docker &> /dev/null; then
    echo "Checking Docker build status..."
    docker buildx ls 2>/dev/null || echo "BuildKit not available"
fi

echo ""
echo "💡 Tips:"
echo "  - Build is running in background"
echo "  - Check your terminal for detailed progress"
echo "  - First build: 30-60 minutes (normal)"
echo "  - Subsequent builds: 1-2 minutes (with cache)"
echo ""
echo "To view build logs in real-time, check your terminal where you started the build."


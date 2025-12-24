#!/bin/bash
# Quick Docker Verification Script

echo "🔍 Verifying Docker Setup..."
echo "=============================="

# Check Docker
if docker --version > /dev/null 2>&1; then
    echo "✅ Docker installed: $(docker --version)"
else
    echo "❌ Docker not found"
    exit 1
fi

# Check Docker Compose
if docker compose version > /dev/null 2>&1; then
    echo "✅ Docker Compose installed: $(docker compose version)"
elif docker-compose --version > /dev/null 2>&1; then
    echo "✅ Docker Compose installed: $(docker-compose --version)"
else
    echo "❌ Docker Compose not found"
    exit 1
fi

# Check if Docker daemon is running
if docker info > /dev/null 2>&1; then
    echo "✅ Docker daemon is running"
else
    echo "❌ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

# Check if Dockerfile exists
if [ -f "Dockerfile" ]; then
    echo "✅ Dockerfile found"
else
    echo "❌ Dockerfile not found"
    exit 1
fi

# Check if docker-compose.yml exists
if [ -f "docker-compose.yml" ]; then
    echo "✅ docker-compose.yml found"
else
    echo "❌ docker-compose.yml not found"
    exit 1
fi

echo ""
echo "🎉 All checks passed! Ready to deploy."
echo ""
echo "Next steps:"
echo "  1. Run: ./docker-start.sh (or docker-start.bat on Windows)"
echo "  2. Wait for container to start"
echo "  3. Visit: http://localhost:8000/api/health"


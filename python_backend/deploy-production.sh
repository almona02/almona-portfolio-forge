#!/bin/bash
# Production Deployment Script

set -e  # Exit on error

echo "🚀 YDT Prestige Agent - Production Deployment"
echo "============================================="

# Safety check
read -p "⚠️  Are you deploying to PRODUCTION? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 1
fi

# Check environment
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production not found!"
    echo "Please create .env.production from .env.production.example"
    exit 1
fi

# Verify Git status
echo "📋 Checking Git status..."
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Continue anyway? (yes/no)"
    read confirm
    if [ "$confirm" != "yes" ]; then
        exit 1
    fi
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Run comprehensive tests
echo "🧪 Running production tests..."
python tests/test_prestige_endpoints.py
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Aborting deployment."
    exit 1
fi

# Build production image
echo "🐳 Building production Docker image..."
docker build -t ydt-prestige-api:latest -t ydt-prestige-api:$(date +%Y%m%d-%H%M%S) .

# Tag for registry (if using)
# docker tag ydt-prestige-api:latest your-registry/ydt-prestige-api:latest

# Stop existing production container
echo "🛑 Stopping existing production container..."
docker stop ydt-prestige-api-prod 2>/dev/null || true
docker rm ydt-prestige-api-prod 2>/dev/null || true

# Start production container
echo "🚀 Starting production container..."
docker run -d \
    --name ydt-prestige-api-prod \
    --env-file .env.production \
    -p 8000:8000 \
    --restart always \
    --memory="2g" \
    --cpus="2" \
    ydt-prestige-api:latest

# Wait for startup
echo "⏳ Waiting for API to start..."
sleep 10

# Verify deployment
MAX_RETRIES=5
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8000/api/health > /dev/null; then
        echo "✅ Production deployment successful!"
        break
    fi
    RETRY=$((RETRY + 1))
    echo "⏳ Retry $RETRY/$MAX_RETRIES..."
    sleep 5
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo "❌ Deployment verification failed"
    docker logs ydt-prestige-api-prod
    exit 1
fi

# Final verification
echo ""
echo "📊 Final Verification:"
echo "======================"
curl -s http://localhost:8000/api/health | python -m json.tool
echo ""

echo "✅ Production deployment complete!"
echo "📍 API: http://localhost:8000"
echo "📍 Docs: http://localhost:8000/api/docs"
echo ""
echo "📝 Monitoring Commands:"
echo "  View logs: docker logs -f ydt-prestige-api-prod"
echo "  Check status: docker ps | grep ydt-prestige-api-prod"
echo "  View stats: docker stats ydt-prestige-api-prod"


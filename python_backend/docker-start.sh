#!/bin/bash
# YDT Prestige Agent - Docker Start Script

echo "🚀 Starting YDT Prestige Agent with Docker..."
echo "=============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ docker-compose is not available. Please install it."
    exit 1
fi

# Check environment
if [ -f ".env.production" ]; then
    echo "📋 Using production environment..."
    $COMPOSE_CMD -f docker-compose.prod.yml up -d --build
else
    echo "📋 Using development environment..."
    $COMPOSE_CMD up -d --build
fi

# Wait for API to be ready
echo "⏳ Waiting for API to start..."
sleep 5

# Check health
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅ API is running!"
    echo "📍 API URL: http://localhost:8000"
    echo "📍 API Docs: http://localhost:8000/api/docs"
    echo "📍 Health Check: http://localhost:8000/api/health"
else
    echo "⚠️  API might still be starting. Check logs with: docker logs ydt-prestige-api"
fi

echo ""
echo "📊 Container Status:"
$COMPOSE_CMD ps

echo ""
echo "📝 Useful Commands:"
echo "  View logs: docker logs -f ydt-prestige-api"
echo "  Stop: docker-compose down"
echo "  Restart: docker-compose restart"
echo "  Shell: docker exec -it ydt-prestige-api bash"


#!/bin/bash
# Preview/Staging Deployment Script

echo "🚀 YDT Prestige Agent - Preview Deployment"
echo "=========================================="

# Check environment
if [ ! -f ".env.preview" ]; then
    echo "⚠️  .env.preview not found. Creating from example..."
    cp .env.preview.example .env.preview
    echo "⚠️  Please edit .env.preview with your configuration"
    exit 1
fi

# Run tests first
echo "🧪 Running pre-deployment tests..."
python tests/test_prestige_endpoints.py
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Aborting deployment."
    exit 1
fi

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t ydt-prestige-api:preview .

# Stop existing container
echo "🛑 Stopping existing preview container..."
docker stop ydt-prestige-api-preview 2>/dev/null
docker rm ydt-prestige-api-preview 2>/dev/null

# Start new container
echo "🚀 Starting preview container..."
docker run -d \
    --name ydt-prestige-api-preview \
    --env-file .env.preview \
    -p 8000:8000 \
    --restart unless-stopped \
    ydt-prestige-api:preview

# Wait for startup
echo "⏳ Waiting for API to start..."
sleep 5

# Verify deployment
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅ Preview deployment successful!"
    echo "📍 API: http://localhost:8000"
    echo "📍 Docs: http://localhost:8000/api/docs"
else
    echo "❌ Deployment verification failed"
    docker logs ydt-prestige-api-preview
    exit 1
fi

echo ""
echo "📊 Container Status:"
docker ps | grep ydt-prestige-api-preview

echo ""
echo "📝 Useful Commands:"
echo "  View logs: docker logs -f ydt-prestige-api-preview"
echo "  Stop: docker stop ydt-prestige-api-preview"
echo "  Restart: docker restart ydt-prestige-api-preview"


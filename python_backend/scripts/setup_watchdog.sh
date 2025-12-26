#!/bin/bash
# Setup script for Industry Watchdog service

echo "🚀 Setting up Industry Watchdog Service"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: Must run from python_backend directory"
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pip install -r requirements-watchdog.txt

# Verify installation
echo ""
echo "✅ Verifying installation..."
python -c "import feedparser; print('✅ feedparser installed')" || echo "❌ feedparser failed"
python -c "import httpx; print('✅ httpx installed')" || echo "❌ httpx failed"
python -c "import dateutil; print('✅ python-dateutil installed')" || echo "❌ python-dateutil failed"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run test: python scripts/test_watchdog_pipeline.py"
echo "2. Configure Celery beat schedule for daily scanning"
echo "3. Add API router to FastAPI app"
echo "4. Test API endpoints"


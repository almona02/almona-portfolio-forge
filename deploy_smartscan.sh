#!/bin/bash
# Production deployment script for SmartScan v2.0

set -e

echo "🚀 SmartScan v2.0 Production Deployment"
echo "========================================"

PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi
VENV_DIR="${VENV_DIR:-venv}"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$APP_DIR/python_backend"
REQUIREMENTS_FILE="$BACKEND_DIR/requirements-production.txt"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo -e "${RED}❌ $1 is not installed. Please install it first.${NC}"
    exit 1
  fi
}

check_port() {
  if lsof -Pi :"$1" -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
    return 1
  fi
  return 0
}

echo "🔍 Checking prerequisites..."
check_command "$PYTHON_BIN"
check_command pip3

if [ ! -d "$VENV_DIR" ]; then
  echo "📦 Creating virtual environment..."
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

echo "🔧 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

echo "📦 Installing dependencies..."
if [ -f "$REQUIREMENTS_FILE" ]; then
  pip install --upgrade pip
  pip install -r "$REQUIREMENTS_FILE"
else
  echo -e "${YELLOW}⚠️  requirements-production.txt not found, using default${NC}"
  pip install --upgrade pip
  pip install fastapi uvicorn python-multipart
  pip install opencv-python-headless pillow numpy
  pip install easyocr pytesseract svgpathtools potrace pdf2image ezdxf
  pip install structlog psutil
fi

echo "📝 Creating production requirements file..."
pip freeze > "$REQUIREMENTS_FILE"

export SMARTSCAN_ENV="production"
export OCR_CACHE_PATH="/var/cache/smartscan/ocr"
export MAX_FILE_SIZE_MB="50"
export ENHANCED_SCAN_TIMEOUT="30"

echo "📁 Creating directories..."
mkdir -p "$OCR_CACHE_PATH"
mkdir -p "$BACKEND_DIR/logs"

health_check() {
  echo "🏥 Running health check..."
  if curl -s http://localhost:8001/health >/dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
  else
    echo -e "${RED}❌ Backend health check failed${NC}"
    return 1
  fi
  python3 - <<'PYCODE'
try:
    from ai_services.vision.ocr_service import TechnicalOCRService
    _ = TechnicalOCRService()
    print("✅ OCR service initialized")
except Exception as exc:
    print(f"❌ OCR service failed: {exc}")
    raise SystemExit(1)
PYCODE
}

echo "🚀 Starting SmartScan backend..."
cd "$BACKEND_DIR"

if ! check_port 8001; then
  echo -e "${YELLOW}Stopping existing process on port 8001...${NC}"
  pkill -f "uvicorn.*8001" || true
  sleep 2
fi

nohup uvicorn apis.main:app \
  --host 0.0.0.0 \
  --port 8001 \
  --workers 4 \
  --log-level info \
  --access-log \
  --timeout-keep-alive 30 \
  >> "$BACKEND_DIR/logs/backend_$(date +%Y%m%d_%H%M%S).log" 2>&1 &

BACKEND_PID=$!
echo "📝 Backend PID: $BACKEND_PID"

echo "⏳ Waiting for backend to start..."
sleep 5

if health_check; then
  echo -e "\n${GREEN}========================================${NC}"
  echo -e "${GREEN}✅ SmartScan v2.0 deployed successfully!${NC}"
  echo -e "${GREEN}========================================${NC}\n"
  echo "📊 Deployment Summary:"
  echo "  • Backend: http://localhost:8001"
  echo "  • API Docs: http://localhost:8001/docs"
  echo "  • Logs: $BACKEND_DIR/logs/"
  echo "  • OCR Cache: $OCR_CACHE_PATH"
  echo ""
  echo "🔧 Configuration:"
  echo "  • Environment: $SMARTSCAN_ENV"
  echo "  • Max file size: ${MAX_FILE_SIZE_MB}MB"
  echo "  • Enhanced scan timeout: ${ENHANCED_SCAN_TIMEOUT}s"
  echo ""
  echo "🚨 To stop the backend:"
  echo "    kill $BACKEND_PID"
  echo ""
  echo $BACKEND_PID > "$BACKEND_DIR/backend.pid"
else
  echo -e "\n${RED}========================================${NC}"
  echo -e "${RED}❌ Deployment failed health check${NC}"
  echo -e "${RED}========================================${NC}"
  echo -e "\n📋 Last 20 lines of log:"
  tail -20 "$BACKEND_DIR"/logs/backend_*.log 2>/dev/null || echo "No log file found"
  kill $BACKEND_PID 2>/dev/null || true
  exit 1
fi


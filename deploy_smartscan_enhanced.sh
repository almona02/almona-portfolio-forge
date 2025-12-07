#!/bin/bash
# Enhanced deployment with health monitoring for SmartScan v2.0

set -e

echo "🚀 SmartScan v2.0 Enhanced Deployment"
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
check_command curl

if [ ! -d "$VENV_DIR" ]; then
  echo "📦 Creating virtual environment..."
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

echo "🔧 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

echo "📦 Installing dependencies..."
pip install --upgrade pip
if [ -f "$REQUIREMENTS_FILE" ]; then
  pip install -r "$REQUIREMENTS_FILE"
else
  pip install fastapi uvicorn python-multipart
  pip install opencv-python-headless pillow numpy easyocr pytesseract svgpathtools potrace pdf2image ezdxf structlog psutil
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

enhanced_health_check() {
  echo "🏥 Running enhanced health checks..."
  if curl -s http://localhost:8001/api/v2/health/simple | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ Basic health check passed${NC}"
  else
    echo -e "${RED}❌ Basic health check failed${NC}"
    return 1
  fi

  OCR_HEALTH=$(curl -s http://localhost:8001/api/v2/health/ocr || true)
  if echo "$OCR_HEALTH" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✅ OCR service healthy${NC}"
  else
    echo -e "${YELLOW}⚠️  OCR service warning${NC}"
  fi

  TEST_IMG="$BACKEND_DIR/test_images/synthetic_test.png"
  if [ -f "$TEST_IMG" ]; then
    RESPONSE=$(curl -s -X POST -F "file=@$TEST_IMG" -F "enable_ocr=true" http://localhost:8001/api/v2/smart-scan/enhanced || true)
    if echo "$RESPONSE" | grep -q '"success":true'; then
      echo -e "${GREEN}✅ Enhanced scan endpoint working${NC}"
    else
      echo -e "${YELLOW}⚠️  Enhanced scan test warning${NC}"
      echo "$RESPONSE"
    fi
  else
    echo -e "${YELLOW}⚠️  No test image found, skipping enhanced scan test${NC}"
  fi
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

if enhanced_health_check; then
  echo -e "\n${GREEN}✅ SmartScan v2.0 deployed successfully!${NC}"
  echo $BACKEND_PID > "$BACKEND_DIR/backend.pid"
else
  echo -e "\n${RED}❌ Deployment failed health check${NC}"
  tail -20 "$BACKEND_DIR"/logs/backend_*.log 2>/dev/null || true
  kill $BACKEND_PID 2>/dev/null || true
  exit 1
fi


#!/bin/bash
# SmartScan v2.0 Complete Deployment with Auto Python Detection

set -e

echo "🚀 SmartScan v2.0 Complete Deployment"
echo "======================================"

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$APP_DIR/python_backend"
VENV_DIR="${VENV_DIR:-$BACKEND_DIR/venv}"
REQUIREMENTS_FILE="$BACKEND_DIR/requirements-production.txt"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}❌ $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

detect_python() {
  if command -v python3 >/dev/null 2>&1; then
    echo "python3"
  elif command -v python >/dev/null 2>&1; then
    echo "python"
  else
    error "No Python interpreter found. Please install Python 3.8+"
    exit 1
  fi
}

PYTHON_BIN=${PYTHON_BIN:-$(detect_python)}
PIP_BIN="$PYTHON_BIN -m pip"
log "Using Python: $PYTHON_BIN ($($PYTHON_BIN --version 2>&1))"

PYTHON_VERSION=$($PYTHON_BIN -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
if (( $(echo "$PYTHON_VERSION < 3.8" | bc -l 2>/dev/null || echo "0") )); then
  error "Python 3.8+ required. Found $PYTHON_VERSION"
  exit 1
fi
success "Python $PYTHON_VERSION detected"

log "Setting up virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
  $PYTHON_BIN -m venv "$VENV_DIR"
  success "Virtual environment created at $VENV_DIR"
else
  warning "Virtual environment already exists at $VENV_DIR"
fi

if [ -f "$VENV_DIR/bin/activate" ]; then
  source "$VENV_DIR/bin/activate"
  log "Virtual environment activated"
elif [ -f "$VENV_DIR/Scripts/activate" ]; then
  source "$VENV_DIR/Scripts/activate"
  log "Virtual environment activated (Windows)"
else
  error "Could not activate virtual environment"
  exit 1
fi

log "Installing dependencies..."
$PIP_BIN install --upgrade pip
if [ -f "$REQUIREMENTS_FILE" ]; then
  $PIP_BIN install -r "$REQUIREMENTS_FILE"
  success "Dependencies installed from $REQUIREMENTS_FILE"
else
  warning "requirements-production.txt not found, installing core deps"
  $PIP_BIN install fastapi uvicorn python-multipart
  $PIP_BIN install opencv-python-headless pillow numpy
  $PIP_BIN install easyocr psutil structlog
  success "Core dependencies installed"
fi

log "Verifying OCR installation..."
$PYTHON_BIN - <<'PYCODE'
try:
    import easyocr
    print("  ✅ EasyOCR installed")
except ImportError:
    print("  ⚠️  EasyOCR not available")
try:
    import psutil
    print("  ✅ psutil installed")
except ImportError:
    print("  ❌ psutil missing")
try:
    import structlog
    print("  ✅ structlog installed")
except ImportError:
    print("  ❌ structlog missing")
PYCODE

log "Creating directories..."
mkdir -p "$BACKEND_DIR/logs"
mkdir -p "$BACKEND_DIR/test_images"
success "Directories created"

log "Creating test image..."
$PYTHON_BIN - <<'PYCODE'
from PIL import Image, ImageDraw, ImageFont
import os

img = Image.new('RGB', (800, 400), color='white')
draw = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype('arial.ttf', 40)
except Exception:
    try:
        font = ImageFont.truetype('DejaVuSans.ttf', 40)
    except Exception:
        font = ImageFont.load_default()

texts = [
    "JUMBO 100 PROFILE",
    "WIDTH: 100 MM  HEIGHT: 100 MM",
    "ALUMINIUM WITH THERMAL BREAK",
    "EGYPTIAN STANDARD - KLEEMANN",
]
y = 50
for text in texts:
    draw.text((50, y), text, fill='black', font=font)
    y += 60

test_dir = os.path.join(os.path.dirname(__file__), "python_backend", "test_images")
os.makedirs(test_dir, exist_ok=True)
path = os.path.join(test_dir, "synthetic_test.png")
img.save(path)
print(f"  ✅ Test image created at {path}")
PYCODE

log "Checking port 8001..."
if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1; then
  warning "Port 8001 is in use. Stopping existing process..."
  kill -9 $(lsof -ti:8001) 2>/dev/null || true
  sleep 2
fi

log "Starting SmartScan backend..."
cd "$BACKEND_DIR"
cat > start_smartscan.sh << 'EOF'
#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ -f "venv/bin/activate" ]; then
  source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
  source venv/Scripts/activate
fi
exec uvicorn apis.main:app \
  --host 0.0.0.0 \
  --port 8001 \
  --workers 2 \
  --log-level info \
  --access-log
EOF
chmod +x start_smartscan.sh

nohup ./start_smartscan.sh >> logs/backend_$(date +%Y%m%d_%H%M%S).log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid
log "Backend starting (PID: $BACKEND_PID)..."
sleep 5

check_health() {
  local endpoint=$1
  local timeout=15
  local start_time
  start_time=$(date +%s)
  while true; do
    if curl -s "http://localhost:8001$endpoint" >/dev/null 2>&1; then
      return 0
    fi
    if [ $(($(date +%s) - start_time)) -gt $timeout ]; then
      return 1
    fi
    sleep 1
  done
}

log "Running health checks..."
if check_health "/api/v2/health/simple"; then
  success "Backend is responding"
else
  error "Backend failed to start"
  echo "Last 20 lines of log:"
  tail -20 logs/backend_*.log 2>/dev/null || echo "No log file found"
  exit 1
fi

log "Testing API endpoints..."
test_endpoint() {
  local name=$1
  local endpoint=$2
  local method=${3:-GET}
  if curl -s -X "$method" "http://localhost:8001$endpoint" >/dev/null 2>&1; then
    success "  $name: OK"
  else
    error "  $name: FAILED"
  fi
}
test_endpoint "Health" "/api/v2/health"
test_endpoint "OCR Health" "/api/v2/health/ocr"
test_endpoint "Metrics" "/api/v2/health/metrics"
test_endpoint "Supported Formats" "/api/v2/smart-scan/supported-formats"

log "Testing enhanced scan..."
TEST_IMG="$BACKEND_DIR/test_images/synthetic_test.png"
if [ -f "$TEST_IMG" ]; then
  RESPONSE=$(curl -s -X POST \
    -F "file=@$TEST_IMG" \
    -F "enable_ocr=true" \
    -F "require_validation=true" \
    http://localhost:8001/api/v2/smart-scan/enhanced)
  if echo "$RESPONSE" | grep -q '"success":true'; then
    success "Enhanced scan test passed"
    CONFIDENCE=$(echo "$RESPONSE" | $PYTHON_BIN -c "import sys,json; d=json.load(sys.stdin); print(d['data']['quality'].get('confidence_score'))" 2>/dev/null <<< "$RESPONSE" || echo "N/A")
    TIER=$(echo "$RESPONSE" | $PYTHON_BIN -c "import sys,json; d=json.load(sys.stdin); print(d['data']['quality'].get('accuracy_tier'))" 2>/dev/null <<< "$RESPONSE" || echo "N/A")
    echo "  Confidence: $CONFIDENCE"
    echo "  Accuracy Tier: $TIER"
  else
    warning "Enhanced scan test completed with warnings"
    echo "$RESPONSE"
  fi
else
  warning "Test image not found, skipping enhanced scan test"
fi

echo ""
echo "========================================"
success "SmartScan v2.0 Deployment Complete!"
echo "========================================"
echo ""
echo "📊 Dashboard:"
echo "  • Backend: http://localhost:8001"
echo "  • API Docs: http://localhost:8001/api/docs"
echo "  • Health: http://localhost:8001/api/v2/health"
echo ""
echo "🔧 Management:"
echo "  • Logs: $BACKEND_DIR/logs/"
echo "  • PID File: $BACKEND_DIR/backend.pid"
echo "  • Virtual Env: $VENV_DIR"
echo ""
echo "🚀 Quick Tests:"
echo "  curl http://localhost:8001/api/v2/health | jq ."
echo "  python monitor_smartscan_enhanced.py"
echo ""
echo "🛑 To stop: kill \$(cat $BACKEND_DIR/backend.pid)"
echo "▶️  To restart: ./start_smartscan.sh"
echo ""


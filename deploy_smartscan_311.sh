#!/bin/bash
# SmartScan v2.0 - Python 3.11 Deployment
set -e

echo "🚀 SmartScan v2.0 - Python 3.11 Deployment"
echo "=========================================="

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$APP_DIR/python_backend"
VENV_DIR="${VENV_DIR:-$BACKEND_DIR/venv}"
REQUIREMENTS_FILE="$BACKEND_DIR/requirements-production.txt"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

find_python_311() {
  for binary in python3.11 python3.11m python3; do
    if command -v "$binary" >/dev/null 2>&1; then
      ver=$("$binary" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "0.0")
      [[ "$ver" == "3.11" ]] && { echo "$binary"; return 0; }
    fi
  done
  if command -v py >/dev/null 2>&1; then
    ver=$(py -3.11 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "0.0")
    [[ "$ver" == "3.11" ]] && { echo "py -3.11"; return 0; }
  fi
  return 1
}

PYTHON_BIN=${PYTHON_BIN:-$(find_python_311 || true)}
if [ -z "$PYTHON_BIN" ]; then
  error "Python 3.11 not found. Install python3.11 and retry."
  exit 1
fi
log "Using Python: $PYTHON_BIN ($($PYTHON_BIN --version 2>&1))"

ver=$($PYTHON_BIN -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "0.0")
if [[ "$ver" != "3.11" ]]; then
  error "Python version $ver found; 3.11 required."
  exit 1
fi
success "Python 3.11 confirmed"

log "Setting up virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
  $PYTHON_BIN -m venv "$VENV_DIR"
  success "Virtual environment created at $VENV_DIR"
else
  warning "Virtual environment already exists (reusing)"
fi

if [ -f "$VENV_DIR/bin/activate" ]; then
  source "$VENV_DIR/bin/activate"
elif [ -f "$VENV_DIR/Scripts/activate" ]; then
  source "$VENV_DIR/Scripts/activate"
else
  error "Could not activate virtual environment"
  exit 1
fi

log "Installing dependencies..."
pip install --upgrade pip setuptools wheel
if [ -f "$REQUIREMENTS_FILE" ]; then
  pip install -r "$REQUIREMENTS_FILE"
  success "Dependencies installed from $REQUIREMENTS_FILE"
else
  warning "requirements-production.txt not found, installing core deps"
  pip install fastapi==0.104.1 uvicorn==0.24.0 python-multipart==0.0.6
  pip install opencv-python-headless==4.8.1.78 numpy==1.24.3 pillow==10.1.0
  pip install easyocr==1.7.1 psutil==5.9.6 structlog==23.2.0
  pip install potrace==0.1.3 svgpathtools==1.6.1
fi

log "Verifying critical dependencies..."
$PYTHON_BIN - <<'PYCODE'
import sys
deps = [
    ("numpy", "numpy"),
    ("cv2", "cv2"),
    ("PIL", "PIL"),
    ("easyocr", "easyocr"),
]
for name, mod in deps:
    try:
        m = __import__(mod)
        version = getattr(m, "__version__", None) or getattr(getattr(m, "Image", None), "__version__", "unknown")
        print(f"✅ {name}: {version}")
    except Exception as exc:
        print(f"❌ {name}: {exc}")
        sys.exit(1)
PYCODE

log "Creating test image..."
$PYTHON_BIN - <<'PYCODE'
from PIL import Image, ImageDraw, ImageFont
import os
base_dir = os.path.dirname(__file__)
test_dir = os.path.join(base_dir, "python_backend", "test_images")
os.makedirs(test_dir, exist_ok=True)
path = os.path.join(test_dir, "egyptian_test.png")
img = Image.new("RGB", (800, 300), "white")
draw = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype("arial.ttf", 30)
except Exception:
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    except Exception:
        font = ImageFont.load_default()
lines = [
    "JUMBO 100 ALUMINIUM PROFILE",
    "DIMENSIONS: 100 x 100 MM",
    "THERMAL BREAK SYSTEM",
    "EGYPTIAN STANDARD COMPLIANT",
]
y = 30
for line in lines:
    draw.text((30, y), line, fill="black", font=font)
    y += 45
img.save(path)
print(f"✅ Test image saved: {path}")
PYCODE

log "Starting SmartScan backend..."
cd "$BACKEND_DIR"
if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1; then
  warning "Port 8001 in use, stopping existing process..."
  kill -9 $(lsof -ti:8001) 2>/dev/null || true
  sleep 2
fi
mkdir -p "$BACKEND_DIR/pids" "$BACKEND_DIR/logs"
nohup $PYTHON_BIN -m uvicorn apis.main:app \
  --host 0.0.0.0 \
  --port 8001 \
  --workers 2 \
  --log-level info \
  --access-log \
  --timeout-keep-alive 30 \
  >> logs/backend_$(date +%Y%m%d_%H%M%S).log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > pids/backend.pid
log "Backend started (PID: $BACKEND_PID)"
sleep 5

log "Running health checks..."
if curl -s http://localhost:8001/api/v2/health/simple >/dev/null; then
  success "Backend is responding"
else
  error "Backend failed health check"
  tail -20 logs/backend_*.log 2>/dev/null || true
  exit 1
fi

echo ""
success "SmartScan v2.0 deployed successfully!"
echo "📊 Quick checks:"
echo "  curl http://localhost:8001/api/v2/health"
echo "  curl http://localhost:8001/api/v2/health/ocr"
echo "  curl http://localhost:8001/api/v2/smart-scan/supported-formats"
echo ""
echo "🛑 To stop: kill \$(cat $BACKEND_DIR/pids/backend.pid)"


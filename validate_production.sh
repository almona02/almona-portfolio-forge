#!/bin/bash
# SmartScan v2.0 Production Validation (port 8002)
set -e

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

BACKEND_URL="http://localhost:8002"
TEST_IMAGE="python_backend/test_images/egyptian_test.png"

echo "🎯 SmartScan v2.0 Production Validation"
echo "Backend: $BACKEND_URL"
echo "Timestamp: $(date)"
echo "======================================="

log "1) Backend availability"
if curl -s "$BACKEND_URL/api/v2/health/simple" >/dev/null; then
  success "Backend is responding"
else
  error "Backend not responding at $BACKEND_URL"
  exit 1
fi

log "2) Health endpoint"
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/api/v2/health")
status=$(echo "$HEALTH_RESPONSE" | python - <<'PY' 2>/dev/null || echo "unknown"
import sys, json
data = json.load(sys.stdin)
print(data.get("status", "unknown"))
PY
)
if [ "$status" = "healthy" ]; then
  success "Health endpoint OK"
else
  warning "Health status: $status"
fi

log "3) OCR health"
OCR_RESPONSE=$(curl -s "$BACKEND_URL/api/v2/health/ocr")
ocr_status=$(echo "$OCR_RESPONSE" | python - <<'PY' 2>/dev/null || echo "unknown"
import sys, json
data = json.load(sys.stdin)
print(data.get("status", "unknown"))
PY
)
if [ "$ocr_status" = "healthy" ]; then
  engine=$(echo "$OCR_RESPONSE" | python - <<'PY' 2>/dev/null || echo "unknown"
import sys, json
data = json.load(sys.stdin)
print(data.get("engine", "unknown"))
PY
)
  success "OCR service healthy ($engine)"
else
  warning "OCR status: $ocr_status"
fi

log "4) Enhanced scan test"
if [ -f "$TEST_IMAGE" ]; then
  RESPONSE=$(curl -s -X POST \
    -F "file=@$TEST_IMAGE" \
    -F "enable_ocr=true" \
    -F "require_validation=true" \
    "$BACKEND_URL/api/v2/smart-scan/enhanced")

  if echo "$RESPONSE" | python - <<'PY' 2>/dev/null; then
import sys, json
data = json.load(sys.stdin)
if not data.get("success"):
    sys.exit(1)
scan = data["data"]
print("\n📊 Scan Metrics:")
print(f"  Confidence: {scan['quality'].get('confidence_score', 0):.2f}")
print(f"  Accuracy Tier: {scan['quality'].get('accuracy_tier', 'unknown')}")
print(f"  Processing Time: {scan.get('metadata', {}).get('processing_time_ms', 'n/a')}ms")
td = scan.get("technical_data") or {}
if td.get("profile_name"):
    print(f"  OCR Name: {td['profile_name']}")
if td.get("material_hints"):
    print(f"  Materials: {', '.join(td['material_hints'])}")
print(f"  OCR Confidence: {td.get('confidence', 0):.2f}")
match = (scan.get("suggestions") or {}).get("egyptian_standard_match")
if match:
    print(f"  Egyptian Standard: {match.get('name')}")
    print(f"  Match Score: {match.get('match_score', 0):.2f}")
    dev = match.get('deviation_mm', {})
    print(f"  Deviation: {dev.get('width', 0):.1f}mm width, {dev.get('height', 0):.1f}mm height")
PY
  then
    success "Enhanced scan succeeded"
  else
    error "Enhanced scan failed"
    echo "$RESPONSE" | python -m json.tool 2>/dev/null || echo "$RESPONSE"
  fi
else
  warning "Test image not found: $TEST_IMAGE"
fi

log "5) Frontend config hints"
if [ -f ".env.local" ] && grep -q "8002" .env.local; then
  success ".env.local configured for 8002"
else
  warning ".env.local missing or not set to 8002 (set VITE_API_URL=http://localhost:8002)"
fi

echo ""
echo "✅ Validation complete. Backend: $BACKEND_URL"


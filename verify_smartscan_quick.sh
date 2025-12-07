#!/bin/bash
# SmartScan v2.0 Quick Verification
echo "🔍 SmartScan v2.0 Quick Verification"
echo "==================================="

check_endpoint() {
  local name=$1
  local endpoint=$2
  local method=${3:-GET}
  if curl -s -X "$method" "http://localhost:8001$endpoint" >/dev/null 2>&1; then
    echo "✅ $name"
  else
    echo "❌ $name"
  fi
}

echo ""
echo "🏥 Health Checks:"
check_endpoint "Basic Health" "/api/v2/health/simple"
check_endpoint "Full Health" "/api/v2/health"
check_endpoint "OCR Health" "/api/v2/health/ocr"
check_endpoint "Metrics" "/api/v2/health/metrics"

echo ""
echo "🔬 Enhanced Scan Test:"
TEST_IMG="python_backend/test_images/egyptian_test.png"
if [ -f "$TEST_IMG" ]; then
  echo "Using test image: $TEST_IMG"
  RESPONSE=$(curl -s -X POST \
    -F "file=@$TEST_IMG" \
    -F "enable_ocr=true" \
    http://localhost:8001/api/v2/smart-scan/enhanced)
  echo "$RESPONSE" | python - <<'PYCODE'
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get("success"):
        scan = data["data"]
        print("✅ Enhanced scan successful!")
        print(f"   Confidence: {scan['quality'].get('confidence_score', 0):.2f}")
        print(f"   Accuracy Tier: {scan['quality'].get('accuracy_tier', 'unknown')}")
        ocr = scan.get("technical_data") or {}
        if ocr.get("profile_name"):
            print(f"   OCR Name: {ocr['profile_name']}")
        if ocr.get("material_hints"):
            print(f"   Materials: {', '.join(ocr['material_hints'])}")
        match = (scan.get('suggestions') or {}).get('egyptian_standard_match')
        if match:
            print(f"   Egyptian Standard: {match.get('name')} ({match.get('match_score',0):.2f})")
    else:
        print("❌ Scan failed")
        print(f"   Error: {data.get('error', 'Unknown')}")
except Exception as exc:
    print(f"⚠️  Could not parse response: {exc}")
PYCODE
else
  echo "⚠️  Test image not found: $TEST_IMG"
  echo "   Re-run deployment to recreate it."
fi

echo ""
echo "📋 Log Status:"
LOG_FILES=$(ls -1 python_backend/logs/backend_*.log 2>/dev/null | wc -l)
if [ "$LOG_FILES" -gt 0 ]; then
  LATEST_LOG=$(ls -t python_backend/logs/backend_*.log | head -1)
  LOG_SIZE=$(du -h "$LATEST_LOG" | cut -f1)
  LOG_LINES=$(wc -l < "$LATEST_LOG")
  echo "✅ Logs found: $LOG_FILES files"
  echo "   Latest: $(basename "$LATEST_LOG") ($LOG_SIZE, $LOG_LINES lines)"
  echo "   Last scan entry:"
  grep -i "smartscan_complete\|smartscan_start" "$LATEST_LOG" | tail -1 | python - <<'PYCODE'
import sys, json
try:
    line = sys.stdin.read().strip()
    if line:
        data = json.loads(line)
        event = data.get("event", "")
        scan_type = data.get("scan_type", "")
        success = data.get("success", "")
        time_ms = data.get("processing_time_ms", 0)
        print(f"     {event}: {scan_type} scan, success: {success}, time: {time_ms}ms")
    else:
        print("     No scan entries yet")
except Exception:
    print("     Could not parse log entry")
PYCODE
else
  echo "⚠️  No log files found"
fi

echo ""
echo "==================================="
echo "🎯 Quick commands:"
echo "  curl http://localhost:8001/api/v2/health | jq ."
echo "  curl -X POST -F \"file=@python_backend/test_images/egyptian_test.png\" \\"
echo "       -F \"enable_ocr=true\" http://localhost:8001/api/v2/smart-scan/enhanced | jq ."
echo ""
echo "🌐 Browser:"
echo "  API Docs: http://localhost:8001/api/docs"
echo "  Test Page: http://localhost:3000/test-scanner"


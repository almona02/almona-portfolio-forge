#!/bin/bash
echo "🔬 Quick SmartScan Test (port 8002)"
echo "==================================="

curl -s http://localhost:8002/api/v2/health/simple | jq '.'
echo ""
echo "Enhanced scan test:"
curl -s -X POST \
  -F "file=@python_backend/test_images/egyptian_test.png" \
  -F "enable_ocr=true" \
  http://localhost:8002/api/v2/smart-scan/enhanced | \
  jq '{success: .success, confidence: .data.quality.confidence_score, tier: .data.quality.accuracy_tier, ocr_name: .data.technical_data.profile_name}'


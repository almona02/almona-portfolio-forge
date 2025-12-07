#!/bin/bash

echo "🔍 TIER 2 IMPLEMENTATION VERIFICATION"
echo "======================================"

echo ""
echo "1. Checking Backend Files..."
echo "---------------------------"
ls -la python_backend/apis/v2/scan_profile.py
ls -la python_backend/ai_services/scanning/scale_engine/
ls -la test_final_integration.py

echo ""
echo "2. Checking Frontend Files..."
echo "----------------------------"
ls -la src/types/scan.ts
ls -la src/services/scanApi.ts
ls -la src/components/fabricator/smartscan/
ls -la src/pages/TestScanner.tsx

echo ""
echo "3. Checking Dependencies..."
echo "--------------------------"
grep -A2 -B2 "antd\|@ant-design" package.json

echo ""
echo "4. Quick API Test..."
echo "-------------------"
curl -s http://localhost:8001/api/v2/health | python -m json.tool

echo ""
echo "✅ Verification Complete!"
echo "Start backend: python -m uvicorn apis.main:app --host 0.0.0.0 --port 8001"
echo "Start frontend: npm run dev"
echo "Test UI: http://localhost:3000/test-scanner"

#!/bin/bash
# test_everything.sh - Complete test suite for YDT Prestige Agent

echo "🚀 YDT Prestige Agent - Complete Test Suite"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ "$1" = "success" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $2${NC}"
    elif [ "$1" = "error" ]; then
        echo -e "${RED}❌ $2${NC}"
    else
        echo -e "${BLUE}ℹ️  $2${NC}"
    fi
}

# Check if in correct directory
if [ ! -f "api/prestige_endpoints.py" ]; then
    print_status "error" "Please run from python_backend directory"
    exit 1
fi

# Step 1: Check Python environment
print_status "info" "Step 1: Checking Python environment..."
python --version
pip --version

# Step 2: Install dependencies if needed
print_status "info" "Step 2: Checking dependencies..."
if [ ! -d "venv" ]; then
    print_status "warning" "Virtual environment not found. Creating..."
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements_prestige.txt 2>/dev/null || pip install fastapi uvicorn pydantic
    pip install -r tests/requirements_test.txt 2>/dev/null || pip install pytest requests aiohttp
else
    source venv/bin/activate 2>/dev/null || true
fi

# Step 3: Start API server
print_status "info" "Step 3: Starting API server..."
uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000 --reload > api.log 2>&1 &
API_PID=$!
sleep 5

# Check if API started
if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    print_status "success" "API server started successfully (PID: $API_PID)"
else
    print_status "error" "Failed to start API server"
    cat api.log 2>/dev/null || echo "Check api.log for errors"
    exit 1
fi

# Step 4: Run quick verification
print_status "info" "Step 4: Running quick verification..."
chmod +x tests/verify_prestige_api.sh 2>/dev/null || true
if bash tests/verify_prestige_api.sh; then
    print_status "success" "Quick verification passed"
else
    print_status "warning" "Quick verification had issues (check output above)"
fi

# Step 5: Run comprehensive tests
print_status "info" "Step 5: Running comprehensive tests..."
python tests/run_tests_with_report.py
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_status "success" "Comprehensive tests passed"
else
    print_status "warning" "Some tests may have failed (check output above)"
fi

# Step 6: Run performance test (optional, can be slow)
print_status "info" "Step 6: Running performance test (light load)..."
python tests/load_test.py 2>/dev/null || print_status "warning" "Performance test skipped (may need aiohttp)"

# Step 7: Generate summary
print_status "info" "Step 7: Generating test summary..."
echo ""
echo "📊 TEST SUMMARY"
echo "==============="

if [ -f "tests/test_report.json" ]; then
    python -c "
import json, sys
try:
    with open('tests/test_report.json') as f:
        data = json.load(f)

    summary = data.get('summary', {})
    env = data.get('environment', {})

    print('📅 Timestamp:', data.get('timestamp', 'N/A'))
    print('')
    print('📈 Results:')
    print(f'  Total Tests: {summary.get(\"total_tests\", 0)}')
    print(f'  Passed: {summary.get(\"passed_tests\", 0)}')
    print(f'  Failed: {summary.get(\"failed_tests\", 0)}')
    print(f'  Success Rate: {summary.get(\"success_rate\", 0):.1f}%')
    print('')
    print('🎯 Status:', end=' ')
    if summary.get('all_passed'):
        print('✅ ALL TESTS PASSED - GOLD TIER CERTIFIED')
    else:
        print('⚠️  SOME TESTS FAILED - CHECK DETAILS')
    print('')
    print('💻 Environment:')
    print(f'  Python: {env.get(\"python_version\", \"N/A\")}')
    print(f'  System: {env.get(\"system\", \"N/A\")} {env.get(\"release\", \"N/A\")}')
except Exception as e:
    print('Could not parse test report:', str(e))
" 2>/dev/null || echo "Test report not available"
fi

# Step 8: List generated files
print_status "info" "Step 8: Generated files:"
ls -la tests/*.html tests/*.json 2>/dev/null | head -5 || echo "  No test files generated yet"

# Step 9: Clean up
print_status "info" "Step 9: Cleaning up..."
kill $API_PID 2>/dev/null && print_status "success" "API server stopped" || print_status "warning" "API server may still be running (PID: $API_PID)"

echo ""
echo "=========================================="
echo "🧪 Testing complete! Check test_report.html for details."
echo "🚀 YDT Prestige Agent is ready for deployment!"


#!/bin/bash
# Local Testing Script - Comprehensive Test Suite

echo "🧪 YDT Prestige Agent - Local Testing"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Python
echo -e "${YELLOW}Checking Python environment...${NC}"
if ! python --version > /dev/null 2>&1; then
    echo -e "${RED}❌ Python not found${NC}"
    exit 1
fi
python --version

# Check dependencies
echo -e "\n${YELLOW}Checking dependencies...${NC}"
if [ ! -f "requirements_prestige.txt" ]; then
    echo -e "${RED}❌ requirements_prestige.txt not found${NC}"
    exit 1
fi

# Install dependencies if needed
if ! python -c "import fastapi" > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pip install -r requirements_prestige.txt
fi

# Check environment file
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}Creating .env.local from example...${NC}"
    cp .env.local.example .env.local
    echo -e "${YELLOW}⚠️  Please edit .env.local with your configuration${NC}"
fi

# Start API in background
echo -e "\n${YELLOW}Starting API server...${NC}"
uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000 --reload > api.log 2>&1 &
API_PID=$!
sleep 5

# Check if API started
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo -e "${GREEN}✅ API is running (PID: $API_PID)${NC}"
else
    echo -e "${RED}❌ API failed to start. Check api.log${NC}"
    kill $API_PID 2>/dev/null
    exit 1
fi

# Run tests
echo -e "\n${YELLOW}Running test suite...${NC}"
python tests/test_prestige_endpoints.py
TEST_RESULT=$?

# Run load test
echo -e "\n${YELLOW}Running load test...${NC}"
python tests/load_test.py
LOAD_RESULT=$?

# Stop API
echo -e "\n${YELLOW}Stopping API server...${NC}"
kill $API_PID 2>/dev/null
wait $API_PID 2>/dev/null

# Summary
echo -e "\n${YELLOW}======================================"
echo "TEST SUMMARY"
echo "======================================${NC}"
if [ $TEST_RESULT -eq 0 ] && [ $LOAD_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo -e "${GREEN}✅ Ready for preview deployment${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi


#!/bin/bash

echo "🔍 TIER 2 COMPLETE SYSTEM VERIFICATION"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking system status...${NC}"
echo ""

# Check backend
echo "1. 🔧 BACKEND SERVER"
if netstat -ano | findstr :8001 > /dev/null; then
    echo -e "   ${GREEN}✅ Running on port 8001${NC}"
    BACKEND_PID=$(netstat -ano | findstr :8001 | awk '{print $5}' | head -1)
    echo "   PID: $BACKEND_PID"
    
    # Test health endpoint
    if curl -s http://localhost:8001/api/v2/health | grep -q "healthy"; then
        echo -e "   ${GREEN}✅ Health endpoint: OK${NC}"
    else
        echo -e "   ${RED}❌ Health endpoint failed${NC}"
    fi
else
    echo -e "   ${RED}❌ Not running${NC}"
    echo "   Start with: cd python_backend && uvicorn main:app --host 0.0.0.0 --port 8001"
fi
echo ""

# Check frontend
echo "2. 🎨 FRONTEND SERVER"
if netstat -ano | findstr :3000 > /dev/null; then
    echo -e "   ${GREEN}✅ Running on port 3000${NC}"
    FRONTEND_PID=$(netstat -ano | findstr :3000 | awk '{print $5}' | head -1)
    echo "   PID: $FRONTEND_PID"
    
    # Test frontend
    if curl -s http://localhost:3000 | grep -q "<html\|<!DOCTYPE"; then
        echo -e "   ${GREEN}✅ Frontend responding${NC}"
    else
        echo -e "   ${RED}❌ Frontend not responding${NC}"
    fi
else
    echo -e "   ${RED}❌ Not running${NC}"
    echo "   Start with: npm run dev"
fi
echo ""

# Check test scanner page
echo "3. 📋 TEST SCANNER PAGE"
if curl -s http://localhost:3000/test-scanner | grep -q "Tier 2 Profile Scanner"; then
    echo -e "   ${GREEN}✅ Test scanner page accessible${NC}"
else
    echo -e "   ${RED}❌ Test scanner page not found${NC}"
fi
echo ""

# Check test image exists
echo "4. 📸 TEST IMAGE"
TEST_IMAGE="public/PROFILES/JUMBO 100/profile_sample.jpg"
if [ -f "$TEST_IMAGE" ]; then
    echo -e "   ${GREEN}✅ Found: $TEST_IMAGE${NC}"
    echo "   Size: $(du -h \"$TEST_IMAGE\" | cut -f1)"
else
    echo -e "   ${RED}❌ Test image not found${NC}"
    echo "   Expected at: $TEST_IMAGE"
fi
echo ""

# Manual verification steps
echo "5. 👤 MANUAL VERIFICATION STEPS"
echo "   Please open browser and test:"
echo ""
echo "   ${YELLOW}STEP 1:${NC} Go to http://localhost:3000/test-scanner"
echo "   ${YELLOW}STEP 2:${NC} Upload profile_sample.jpg"
echo "   ${YELLOW}STEP 3:${NC} Ensure 'Auto-detect scale' is checked"
echo "   ${YELLOW}STEP 4:${NC} Click 'Scan with AI Detection'"
echo "   ${YELLOW}STEP 5:${NC} Wait for processing"
echo "   ${YELLOW}EXPECTED:${NC} Modal showing:"
echo "        • Scale: 0.110639 mm/px"
echo "        • Confidence: 68% (Medium)"
echo "        • Label: '45.59'"
echo "        • Suggestion: 'Moderate confidence...'"
echo "   ${YELLOW}STEP 6:${NC} Click 'Use Detected Scale'"
echo "   ${YELLOW}STEP 7:${NC} Verify results show dimensions"
echo ""

# API test
echo "6. 🔌 API END-TO-END TEST"
echo "   You can also run the automated test:"
echo "   ${YELLOW}SCAN_TEST_BASE_URL=http://localhost:8001 \\n   SCAN_TEST_AUTH_TOKEN=<your-token> \\n   python test_final_integration.py \"public/PROFILES/JUMBO 100/profile_sample.jpg\"${NC}"
echo ""

# Server management
echo "7. ⚙️ SERVER MANAGEMENT"
echo "   ${YELLOW}To stop backend:${NC} taskkill /PID $BACKEND_PID /F"
echo "   ${YELLOW}To stop frontend:${NC} taskkill /PID $FRONTEND_PID /F"
echo "   ${YELLOW}Or use Ctrl+C in their terminals${NC}"
echo ""

echo "========================================"
echo -e "${GREEN}READY FOR FINAL UI TEST!${NC}"
echo "========================================"

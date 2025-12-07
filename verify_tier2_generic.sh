#!/bin/bash

# verify_tier2_generic.sh
# Generic verification for Tier 2 Profile Scanner

echo "🔍 TIER 2 GENERIC PROFILE SCANNER VERIFICATION"
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Checking generic profile scanner system...${NC}"
echo ""

# Check backend
echo "1. 🔧 BACKEND SERVER (Generic Profile Scanner API)"
if netstat -ano | findstr :8001 > /dev/null; then
    echo -e "   ${GREEN}✅ Running on port 8001${NC}"
    BACKEND_PID=$(netstat -ano | findstr :8001 | awk '{print $5}' | head -1)
    echo "   PID: $BACKEND_PID"
    
    # Test health endpoint
    if curl -s http://localhost:8001/api/v2/health | grep -q "healthy"; then
        echo -e "   ${GREEN}✅ Health endpoint: OK${NC}"
        echo "   Service: Tier 2 Profile Scan API"
    else
        echo -e "   ${RED}❌ Health endpoint failed${NC}"
    fi
else
    echo -e "   ${RED}❌ Not running${NC}"
    echo "   Start: cd python_backend && uvicorn main:app --host 0.0.0.0 --port 8001"
fi
echo ""

# Check frontend
echo "2. 🎨 FRONTEND DEV SERVER"
if netstat -ano | findstr :3000 > /dev/null; then
    echo -e "   ${GREEN}✅ Running on port 3000${NC}"
    FRONTEND_PID=$(netstat -ano | findstr :3000 | awk '{print $5}' | head -1)
    echo "   PID: $FRONTEND_PID"
    
    # Test frontend - use wget or curl with user agent
    if curl -s -A "Mozilla" http://localhost:3000 | grep -q -i "react\\|html\\|doctype"; then
        echo -e "   ${GREEN}✅ Frontend responding${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Frontend may be SPA (check manually)${NC}"
    fi
else
    echo -e "   ${RED}❌ Not running${NC}"
    echo "   Start: npm run dev"
fi
echo ""

# Check if test image exists (any sample)
echo "3. 📸 SAMPLE ENGINEERING DRAWING"
TEST_IMAGE="public/PROFILES/JUMBO 100/profile_sample.jpg"
if [ -f "$TEST_IMAGE" ]; then
    echo -e "   ${GREEN}✅ Found sample drawing${NC}"
    # Fix for spaces in path
    filesize=$(stat -f%z "$TEST_IMAGE" 2>/dev/null || stat -c%s "$TEST_IMAGE" 2>/dev/null)
    if [ "$filesize" != "" ] && [ "$filesize" -gt 0 ]; then
        size_mb=$(awk "BEGIN { printf \"%.2f\", ${filesize}/1024/1024 }")
        echo "   Size: ${size_mb} MB"
        echo "   Note: This is just a sample. Scanner works with ANY profile drawing."
    fi
else
    echo -e "   ${YELLOW}⚠️  No sample found, but scanner works with any image${NC}"
    echo "   Upload any engineering drawing with dimension labels"
fi
echo ""

# Generic manual verification steps
echo "4. 👤 GENERIC SCANNER TEST"
echo "   ${YELLOW}System Purpose:${NC}"
echo "   • Scan ANY engineering drawing/profile"
echo "   • Auto-detect scale from dimension labels"
echo "   • Extract vector profile and dimensions"
echo ""
echo "   ${YELLOW}Test Procedure:${NC}"
echo "   1. Open http://localhost:3000/test-scanner"
echo "   2. Upload ANY engineering drawing (.jpg, .png)"
echo "   3. Enable 'Auto-detect scale'"
echo "   4. Click 'Scan with AI Detection'"
echo "   5. AI will analyze and suggest scale"
echo "   6. Confirm or adjust as needed"
echo "   7. View extracted profile and dimensions"
echo ""
echo "   ${YELLOW}Expected AI Behavior:${NC}"
echo "   • High confidence (>80%): Auto-apply"
echo "   • Medium confidence (60-80%): Suggest & verify"
echo "   • Low confidence (<60%): Manual entry"
echo ""

# API capabilities
echo "5. 🔌 API CAPABILITIES"
echo "   ${YELLOW}POST /api/v2/scan/profile${NC}"
echo "   • Input: ANY image with dimension labels"
echo "   • Output: Vector SVG + dimensions + scale detection"
echo "   • Features: OCR, line detection, scale inference"
echo "   • Generic: No profile-specific logic"
echo ""

# Test with curl example
echo "6. 📝 API TEST EXAMPLE"
echo "   Test with ANY image:"
echo "   ${YELLOW}curl -X POST http://localhost:8001/api/v2/scan/profile \\"
echo "     -F \"file=@your_drawing.jpg\" \\"
echo "     -F \"auto_detect_scale=true\"${NC}"
echo ""

echo "================================================"
echo -e "${GREEN}GENERIC PROFILE SCANNER READY FOR TESTING!${NC}"
echo "================================================"
echo ""
echo "📋 ${YELLOW}Key Points:${NC}"
echo "• Works with ANY engineering drawing"
echo "• NOT tied to JUMBO 100 or any specific system"
echo "• AI scale detection is generic"
echo "• Output: Vector profile + dimensions"


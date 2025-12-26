#!/bin/bash
# Quick YDT Production Test
# Usage: ./scripts/test_ydt_production.sh [production-url]

PROD_URL="${1:-http://localhost:8000}"

echo "🧪 YDT Production Quick Test"
echo "============================"
echo "Testing: ${PROD_URL}"
echo ""

# Test 1: Health Check
echo "1. Health Check..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/api/health")
if [ "$HEALTH" = "200" ]; then
    echo "   ✅ API is running"
else
    echo "   ❌ API not responding (HTTP $HEALTH)"
    exit 1
fi

# Test 2: Knowledge Base Endpoint
echo ""
echo "2. Knowledge Base Endpoint..."
KB_RESPONSE=$(curl -s -w "\n%{http_code}" "${PROD_URL}/api/v2/ydt/parser/knowledge-base")
KB_CODE=$(echo "$KB_RESPONSE" | tail -n1)
KB_BODY=$(echo "$KB_RESPONSE" | sed '$d')

if [ "$KB_CODE" = "200" ]; then
    echo "   ✅ Knowledge base endpoint working"
    
    # Extract key stats
    FILES=$(echo "$KB_BODY" | grep -o '"totalFiles":[0-9]*' | grep -o '[0-9]*' | head -1)
    SYSTEMS=$(echo "$KB_BODY" | grep -o '"systems":\[.*\]' | grep -o '\[.*\]' | jq 'length' 2>/dev/null || echo "N/A")
    
    echo "   📊 Files parsed: ${FILES:-N/A}"
    echo "   📊 Systems: ${SYSTEMS:-N/A}"
    
    # Check for Egyptian data
    if echo "$KB_BODY" | grep -q "egyptian"; then
        echo "   ✅ Contains Egyptian fabrication knowledge"
    else
        echo "   ⚠️  Missing Egyptian data"
    fi
else
    echo "   ❌ Knowledge base endpoint failed (HTTP $KB_CODE)"
    echo "   Response: ${KB_BODY:0:200}"
    exit 1
fi

# Test 3: Stats Endpoint
echo ""
echo "3. Stats Endpoint..."
STATS=$(curl -s "${PROD_URL}/api/v2/ydt/parser/stats")
if echo "$STATS" | grep -q '"status":"success"'; then
    echo "   ✅ Stats endpoint working"
    echo "$STATS" | jq '.' 2>/dev/null || echo "$STATS"
else
    echo "   ⚠️  Stats endpoint issue"
    echo "$STATS"
fi

echo ""
echo "============================"
echo "✅ YDT Production Test Complete!"
echo ""
echo "Next Steps:"
echo "  1. Check browser console for YDT initialization"
echo "  2. Test YDT features in FabricatorWorkflow"
echo "  3. Verify Morning Brief on dashboard"


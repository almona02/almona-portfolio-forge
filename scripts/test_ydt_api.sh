#!/bin/bash
# YDT API Verification Script
# Tests the YDT knowledge base API endpoint

echo "🔍 Testing YDT API Endpoint"
echo "============================"
echo ""

# Default to localhost, but allow override
BASE_URL="${1:-http://localhost:8000}"
ENDPOINT="${BASE_URL}/api/v2/ydt/parser/knowledge-base"

echo "Testing: ${ENDPOINT}"
echo ""

# Test the endpoint
response=$(curl -s -w "\n%{http_code}" "${ENDPOINT}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: ${http_code}"
echo ""

if [ "$http_code" -eq 200 ]; then
    echo "✅ API Endpoint is working!"
    echo ""
    echo "Response Preview:"
    echo "$body" | head -n 20
    echo ""
    echo "Checking knowledge base structure..."
    
    # Check if response has expected structure
    if echo "$body" | grep -q "egyptian"; then
        echo "✅ Contains 'egyptian' data"
    fi
    if echo "$body" | grep -q "fabricationKnowledge"; then
        echo "✅ Contains 'fabricationKnowledge'"
    fi
    if echo "$body" | grep -q "systemPacks"; then
        echo "✅ Contains 'systemPacks'"
    fi
    
    # Count items
    files_count=$(echo "$body" | grep -o '"totalFiles":[0-9]*' | grep -o '[0-9]*' | head -1)
    if [ ! -z "$files_count" ]; then
        echo "✅ Files parsed: ${files_count}"
    fi
else
    echo "❌ API Endpoint returned error"
    echo ""
    echo "Response:"
    echo "$body"
fi

echo ""
echo "============================"


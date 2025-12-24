#!/bin/bash
# verify_prestige_api.sh - Quick verification script for YDT Prestige API

echo "🧪 YDT Prestige API Verification Script"
echo "========================================"

# Check if API is running
echo "1. Checking API health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health)

if [ "$HEALTH_RESPONSE" != "200" ]; then
    echo "❌ API is not running. Please start it first."
    echo "   Run: uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000 --reload"
    exit 1
fi

echo "✅ API is running"

# Test basic endpoints
echo -e "\n2. Testing endpoints..."

ENDPOINTS=(
    "/api/v1/knowledge/stats"
    "/api/v1/machine/capabilities"
    "/api/v1/learn/modules?language=en"
)

for endpoint in "${ENDPOINTS[@]}"; do
    echo -n "   Testing $endpoint... "
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000$endpoint")
    if [ "$RESPONSE" = "200" ]; then
        echo "✅"
    else
        echo "❌ (HTTP $RESPONSE)"
    fi
done

# Test chat endpoint with payload
echo -e "\n3. Testing chat functionality..."
CHAT_PAYLOAD='{
  "message": "What is the power of AIM 7510?",
  "persona": "professor",
  "language": "en"
}'

CHAT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$CHAT_PAYLOAD" \
  http://localhost:8000/api/v1/chat)

if echo "$CHAT_RESPONSE" | grep -q '"success":true'; then
    CONFIDENCE=$(echo "$CHAT_RESPONSE" | grep -o '"confidence":[0-9.]*' | cut -d':' -f2)
    RESPONSE_TIME=$(echo "$CHAT_RESPONSE" | grep -o '"response_time":[0-9.]*' | cut -d':' -f2)
    echo "   ✅ Chat working - Confidence: ${CONFIDENCE}%, Response Time: ${RESPONSE_TIME}s"
else
    echo "   ❌ Chat failed"
fi

# Test all personas
echo -e "\n4. Testing all personas..."
PERSONAS=("professor" "doctor" "tour-guide" "code-master" "nervous-system")

for persona in "${PERSONAS[@]}"; do
    echo -n "   Testing $persona persona... "
    PERSONA_PAYLOAD="{\"message\":\"Test\",\"persona\":\"$persona\",\"language\":\"en\"}"
    
    RESPONSE=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -d "$PERSONA_PAYLOAD" \
      http://localhost:8000/api/v1/chat)
    
    if echo "$RESPONSE" | grep -q "\"persona\":\"$persona\""; then
        echo "✅"
    else
        echo "❌"
    fi
done

# Test all languages
echo -e "\n5. Testing all languages..."
LANGUAGES=("tr" "en" "ru" "ar")

for lang in "${LANGUAGES[@]}"; do
    echo -n "   Testing $lang language... "
    LANG_PAYLOAD="{\"message\":\"Test\",\"persona\":\"professor\",\"language\":\"$lang\"}"
    
    RESPONSE=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -d "$LANG_PAYLOAD" \
      http://localhost:8000/api/v1/chat)
    
    if echo "$RESPONSE" | grep -q "\"language\":\"$lang\""; then
        echo "✅"
    else
        echo "❌"
    fi
done

echo -e "\n========================================"
echo "🎉 Verification Complete!"
echo "   Frontend: http://localhost:3000"
echo "   API Docs: http://localhost:8000/api/docs"
echo "   Health: http://localhost:8000/api/health"


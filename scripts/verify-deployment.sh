#!/bin/bash
# scripts/verify-deployment.sh
# Verify production deployment is working

set -e

echo "🔍 Verifying Production Deployment"
echo "==================================="
echo ""

# Get backend URL from environment or prompt
if [ -z "$BACKEND_URL" ]; then
    echo "Enter your backend URL (e.g., https://your-app.railway.app):"
    read -r BACKEND_URL
fi

if [ -z "$FRONTEND_URL" ]; then
    echo "Enter your frontend URL (e.g., https://your-app.vercel.app):"
    read -r FRONTEND_URL
fi

echo ""
echo "📊 Testing Backend..."
echo ""

# Test backend health
echo "1. Backend Health Check:"
if curl -f -s "${BACKEND_URL}/health" > /dev/null; then
    echo "   ✅ Backend is healthy"
    curl -s "${BACKEND_URL}/health" | jq . || curl -s "${BACKEND_URL}/health"
else
    echo "   ❌ Backend health check failed"
    exit 1
fi

echo ""

# Test backend API
echo "2. Backend API Root:"
if curl -f -s "${BACKEND_URL}/" > /dev/null; then
    echo "   ✅ Backend API is accessible"
    curl -s "${BACKEND_URL}/" | jq . || curl -s "${BACKEND_URL}/"
else
    echo "   ❌ Backend API not accessible"
    exit 1
fi

echo ""

# Test frontend
echo "3. Frontend Accessibility:"
if curl -f -s "${FRONTEND_URL}" > /dev/null; then
    echo "   ✅ Frontend is accessible"
else
    echo "   ❌ Frontend not accessible"
    exit 1
fi

echo ""

# Test CORS
echo "4. CORS Configuration:"
CORS_HEADER=$(curl -s -I -X OPTIONS "${BACKEND_URL}/health" -H "Origin: ${FRONTEND_URL}" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_HEADER" ]; then
    echo "   ✅ CORS configured"
    echo "   $CORS_HEADER"
else
    echo "   ⚠️  CORS headers not found (may still work)"
fi

echo ""
echo "✅ Deployment Verification Complete!"
echo ""
echo "📋 Next Steps:"
echo "  1. Test DXF import in frontend"
echo "  2. Test profile tuning"
echo "  3. Test optimization"
echo "  4. Test CNC export"
echo "  5. Verify Arabic interface"
echo ""


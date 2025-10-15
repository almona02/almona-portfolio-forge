#!/bin/bash

echo "🏥 INFRASTRUCTURE HEALTH CHECK"
echo "============================="
echo

# Railway project URL (update this after deployment)
RAILWAY_URL="https://almona-portfolio-forge-production.up.railway.app"

echo "🔍 Testing health endpoints..."
echo

# Test main health check
echo "📊 Main Health Check:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ $RAILWAY_URL/health - Status: $HTTP_CODE"
    curl -s "$RAILWAY_URL/health" | python3 -m json.tool 2>/dev/null || echo "Response received but not JSON"
else
    echo "❌ $RAILWAY_URL/health - Status: $HTTP_CODE (Service may be starting up)"
fi

echo
echo "🗄️ Database Health Check:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/health/database" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Database - Status: $HTTP_CODE"
else
    echo "❌ Database - Status: $HTTP_CODE"
fi

echo
echo "🔄 Redis Health Check:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/health/redis" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Redis - Status: $HTTP_CODE"
else
    echo "❌ Redis - Status: $HTTP_CODE"
fi

echo
echo "📧 Email Health Check:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/health/email" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Email - Status: $HTTP_CODE"
else
    echo "❌ Email - Status: $HTTP_CODE"
fi

echo
echo "🚀 Railway Services Recommendations:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/health/railway" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Railway recommendations available"
    echo "📋 Service recommendations:"
    curl -s "$RAILWAY_URL/health/railway" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    recommendations = data.get('recommendations', [])
    if recommendations:
        for rec in recommendations:
            priority = rec.get('priority', 'UNKNOWN')
            service = rec.get('service', 'Unknown')
            action = rec.get('action', 'No action')
            command = rec.get('command', '')
            print(f'  {priority}: {service} - {action}')
            if command:
                print(f'    Command: {command}')
    else:
        print('  ✅ All services properly configured!')
except:
    print('  Could not parse recommendations')
"
else
    echo "❌ Railway recommendations not available - Status: $HTTP_CODE"
fi

echo
echo "🎯 SUMMARY:"
echo "If you see ❌ statuses, these services need to be added:"
echo "  railway add postgresql"
echo "  railway add redis"  
echo "  railway add resend"

echo
echo "🔄 Re-run this script after adding services to verify they work."

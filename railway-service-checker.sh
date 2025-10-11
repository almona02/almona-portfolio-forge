#!/bin/bash

echo "🚀 RAILWAY SERVICE DEPLOYMENT CHECKER"
echo "====================================="
echo

# Check if user is authenticated
if ! railway whoami > /dev/null 2>&1; then
    echo "❌ Railway authentication required!"
    echo "Execute: railway login --browserless"
    exit 1
fi

echo "✅ Railway authenticated as: $(railway whoami)"
echo

# Check project connection
if ! railway status > /dev/null 2>&1; then
    echo "❌ No Railway project connected!"
    echo "Execute: railway switch"
    echo "Select: zoological-transformation"
    exit 1
fi

echo "✅ Connected to Railway project"
echo

# Show current environment variables
echo "🔍 Current environment variables:"
VARS_OUTPUT=$(railway variables 2>/dev/null)

# Check for critical services
HAS_DATABASE=$(echo "$VARS_OUTPUT" | grep -c "DATABASE_URL" || echo "0")
HAS_REDIS=$(echo "$VARS_OUTPUT" | grep -c "REDIS_URL" || echo "0")
HAS_RESEND=$(echo "$VARS_OUTPUT" | grep -c "RESEND_API_KEY" || echo "0")

echo
echo "📊 Service Status:"

if [ "$HAS_DATABASE" -gt 0 ]; then
    echo "  ✅ PostgreSQL: DATABASE_URL configured"
else
    echo "  ❌ PostgreSQL: Not found"
    echo "     Execute: railway add postgresql"
fi

if [ "$HAS_REDIS" -gt 0 ]; then
    echo "  ✅ Redis: REDIS_URL configured"  
else
    echo "  ❌ Redis: Not found"
    echo "     Execute: railway add redis"
fi

if [ "$HAS_RESEND" -gt 0 ]; then
    echo "  ✅ Resend: RESEND_API_KEY configured"
else
    echo "  ❌ Resend: Not found"  
    echo "     Execute: railway add resend"
fi

echo
TOTAL_SERVICES=$((HAS_DATABASE + HAS_REDIS + HAS_RESEND))

if [ "$TOTAL_SERVICES" -eq 3 ]; then
    echo "🎉 ALL CRITICAL SERVICES CONFIGURED!"
    echo "✅ Your infrastructure is production-ready!"
    echo 
    echo "🔄 Next steps:"
    echo "1. Deploy your backend: railway up"
    echo "2. Test services: ./test-infrastructure-health.sh"
elif [ "$TOTAL_SERVICES" -eq 0 ]; then
    echo "🚨 INFRASTRUCTURE EMERGENCY!"
    echo "❌ NO CRITICAL SERVICES FOUND!"
    echo
    echo "🚀 Execute these commands NOW:"
    echo "  railway add postgresql"
    echo "  railway add redis"  
    echo "  railway add resend"
else
    echo "⚠️  PARTIAL INFRASTRUCTURE SETUP"
    echo "📊 Services configured: $TOTAL_SERVICES/3"
    echo
    echo "🚀 Still need to add:"
    if [ "$HAS_DATABASE" -eq 0 ]; then echo "  railway add postgresql"; fi
    if [ "$HAS_REDIS" -eq 0 ]; then echo "  railway add redis"; fi
    if [ "$HAS_RESEND" -eq 0 ]; then echo "  railway add resend"; fi
fi

echo
echo "🔄 Run this script again after adding services to check progress."
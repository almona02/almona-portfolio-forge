#!/bin/bash

echo "🚨 RAILWAY INFRASTRUCTURE VALIDATION"
echo "===================================="
echo

# Check if Railway CLI is working
echo "📡 Checking Railway CLI authentication..."
if railway whoami > /dev/null 2>&1; then
    echo "✅ Railway CLI authenticated successfully"
    RAILWAY_USER=$(railway whoami)
    echo "   User: $RAILWAY_USER"
else
    echo "❌ Railway CLI not authenticated"
    echo "   Run: railway login --browserless"
    exit 1
fi

echo

# Check current project
echo "🎯 Checking Railway project connection..."
if railway status > /dev/null 2>&1; then
    echo "✅ Connected to Railway project"
    railway status
else
    echo "❌ No Railway project connected"
    echo "   Run: railway switch"
    exit 1
fi

echo

# Check services
echo "🗄️ Checking Railway services..."
echo "Services that should be added:"
echo "  1. PostgreSQL (DATABASE_URL)"
echo "  2. Redis (REDIS_URL)" 
echo "  3. Resend (RESEND_API_KEY)"

echo
echo "Current environment variables:"
railway variables | grep -E "(DATABASE_URL|REDIS_URL|RESEND_API_KEY)" || echo "❌ No critical services found"

echo
echo "🚀 Next steps:"
echo "  railway add postgresql"
echo "  railway add redis"
echo "  railway add resend"

echo
echo "📊 After adding services, test with:"
echo "  curl https://almona-portfolio-forge-production.up.railway.app/health/railway"
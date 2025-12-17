#!/bin/bash
# scripts/deploy-backend-railway.sh
# Quick Railway deployment script

set -e

echo "🚀 Deploying Backend to Railway"
echo "================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "⚠️  Railway CLI not found"
    echo ""
    echo "Install Railway CLI:"
    echo "  npm i -g @railway/cli"
    echo ""
    echo "Or use Railway Dashboard:"
    echo "  1. Go to https://railway.app"
    echo "  2. New Project → Deploy from GitHub"
    echo "  3. Select repository"
    echo "  4. Add service → Dockerfile"
    echo "  5. Set Dockerfile path: python_backend/Dockerfile.realistic"
    echo "  6. Set port: 8000"
    echo ""
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "⚠️  Not logged in to Railway"
    echo "   Run: railway login"
    exit 1
fi

echo "✅ Logged in to Railway"
echo ""

# Check if project is linked
if [ ! -f ".railway/project.json" ]; then
    echo "⚠️  Project not linked to Railway"
    echo "   Run: railway link"
    exit 1
fi

echo "✅ Project linked"
echo ""

# Deploy
echo "📦 Deploying backend..."
echo "   Dockerfile: python_backend/Dockerfile.realistic"
echo "   Port: 8000"
echo ""

cd python_backend
railway up --service backend

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📋 Next Steps:"
echo "  1. Check Railway dashboard for deployment status"
echo "  2. Get backend URL from Railway"
echo "  3. Update Vercel environment variables:"
echo "     VITE_API_URL=https://your-backend.railway.app"
echo "  4. Test backend health: curl https://your-backend.railway.app/health"
echo ""


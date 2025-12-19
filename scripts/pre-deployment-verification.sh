#!/bin/bash
# Pre-Deployment Verification Script
# Comprehensive checks before production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track results
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_TOTAL=0

# Function to run a check
run_check() {
    local check_name=$1
    local check_command=$2
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Running: ${check_name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    
    if eval "$check_command"; then
        echo -e "${GREEN}✅ PASSED: ${check_name}${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED: ${check_name}${NC}"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
        return 1
    fi
}

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Pre-Deployment Verification Suite                  ║${NC}"
echo -e "${BLUE}║   Almona Portfolio Forge - Production Ready Check  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Clean previous builds
echo -e "${YELLOW}Step 1: Cleaning previous builds...${NC}"
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite
echo -e "${GREEN}✅ Clean complete${NC}"
echo ""

# Step 2: npm install
run_check "npm install - Dependency Installation" "npm install --legacy-peer-deps"

echo ""

# Step 3: npm run analyze
echo -e "${YELLOW}Step 3: Running bundle analysis...${NC}"
if npm run analyze 2>&1 | tee analyze-output.log; then
    echo -e "${GREEN}✅ Bundle analysis complete${NC}"
    if [ -f "dist/stats.html" ]; then
        echo -e "${GREEN}✅ HTML visualization generated: dist/stats.html${NC}"
    fi
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}❌ Bundle analysis failed${NC}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
echo ""

# Step 4: npm run lint
run_check "npm run lint - Linting Check" "npm run lint"

echo ""

# Step 5: npm run build
echo -e "${YELLOW}Step 5: Building production bundle...${NC}"
if npm run build 2>&1 | tee build-output.log; then
    echo -e "${GREEN}✅ Build complete${NC}"
    
    # Check build outputs
    if [ -d "dist" ]; then
        echo -e "${GREEN}✅ dist/ directory created${NC}"
        DIST_SIZE=$(du -sh dist | cut -f1)
        echo -e "${BLUE}   Build size: ${DIST_SIZE}${NC}"
        
        # Check for critical files
        if [ -f "dist/index.html" ]; then
            echo -e "${GREEN}✅ index.html present${NC}"
        else
            echo -e "${RED}❌ index.html missing${NC}"
            CHECKS_FAILED=$((CHECKS_FAILED + 1))
        fi
        
        # Check for assets
        if [ -d "dist/assets" ]; then
            ASSET_COUNT=$(find dist/assets -type f | wc -l)
            echo -e "${GREEN}✅ assets/ directory present (${ASSET_COUNT} files)${NC}"
        else
            echo -e "${YELLOW}⚠️  assets/ directory missing${NC}"
        fi
    else
        echo -e "${RED}❌ dist/ directory not created${NC}"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}❌ Build failed${NC}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
echo ""

# Step 6: Frontend test at port 3000
echo -e "${YELLOW}Step 6: Testing frontend at port 3000...${NC}"
echo -e "${BLUE}   Starting preview server...${NC}"
echo -e "${YELLOW}   Please verify manually: http://localhost:3000${NC}"
echo -e "${YELLOW}   Press Ctrl+C to stop the server after verification${NC}"
echo ""

# Start preview server in background
npm run preview -- --port 3000 > preview-server.log 2>&1 &
PREVIEW_PID=$!

# Wait for server to start
sleep 5

# Check if server is running
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend server is running on port 3000${NC}"
    echo -e "${BLUE}   Open http://localhost:3000 in your browser${NC}"
    echo -e "${YELLOW}   Press Enter after verifying the frontend...${NC}"
    read -r
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}❌ Frontend server failed to start${NC}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
CHECKS_TOTAL=$((CHECKS_TOTAL + 1))

# Kill preview server
kill $PREVIEW_PID 2>/dev/null || true
echo ""

# Step 7: Backend verification
echo -e "${YELLOW}Step 7: Backend verification (Railway, Redis, Postgres)...${NC}"
echo -e "${BLUE}   Checking backend configuration...${NC}"

# Check for Railway environment variables
if [ -f ".env" ] || [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ Environment file found${NC}"
    
    # Check for Railway-specific variables
    if grep -q "RAILWAY" .env 2>/dev/null || grep -q "RAILWAY" .env.local 2>/dev/null; then
        echo -e "${GREEN}✅ Railway configuration detected${NC}"
    else
        echo -e "${YELLOW}⚠️  Railway configuration not found in env files${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No .env file found (may be using Railway environment variables)${NC}"
fi

# Check Python backend
if [ -d "python_backend" ]; then
    echo -e "${GREEN}✅ Python backend directory found${NC}"
    
    # Check for requirements
    if [ -f "python_backend/requirements.txt" ]; then
        echo -e "${GREEN}✅ requirements.txt found${NC}"
    fi
    
    # Check for Railway configuration
    if [ -f "python_backend/railway.json" ] || [ -f "railway.json" ]; then
        echo -e "${GREEN}✅ Railway configuration found${NC}"
    fi
else
    echo -e "${RED}❌ Python backend directory not found${NC}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
echo ""

# Step 8: Final backend test
echo -e "${YELLOW}Step 8: Final backend test at preview...${NC}"
echo -e "${BLUE}   This would test the backend API endpoints${NC}"
echo -e "${YELLOW}   Backend should be running on Railway${NC}"
echo -e "${YELLOW}   Test endpoints manually or run: npm run test:api${NC}"
echo ""

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Pre-Deployment Verification Summary                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Total Checks: ${CHECKS_TOTAL}"
echo -e "${GREEN}Passed: ${CHECKS_PASSED}${NC}"
echo -e "${RED}Failed: ${CHECKS_FAILED}${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All pre-deployment checks passed!${NC}"
    echo -e "${GREEN}🚀 System is ready for deployment!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some pre-deployment checks failed!${NC}"
    echo -e "${YELLOW}⚠️  Please fix the issues before deploying${NC}"
    exit 1
fi


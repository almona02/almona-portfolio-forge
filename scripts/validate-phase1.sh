#!/bin/bash

echo "🔍 Almona Egypt Phase 1 Validation Script"
echo "=========================================="
echo ""

# Check if dev server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Dev server not running on port 3000"
    echo "   Start with: npm run dev"
    exit 1
fi

echo "✅ Dev server is running on http://localhost:3000"
echo ""

# Instructions for manual validation
echo "📋 Manual Validation Steps:"
echo "=========================="
echo ""
echo "1. Open browser: http://localhost:3000"
echo "2. Open DevTools (F12)"
echo "3. Go to Console tab"
echo "4. Run: validateAlmonaPerformance()"
echo ""
echo "5. Check Performance Dashboard (bottom-right corner in dev mode)"
echo ""
echo "6. Verify Service Worker:"
echo "   - DevTools → Application → Service Workers"
echo "   - Should see: service-worker.js registered"
echo ""
echo "7. Check Network Tab:"
echo "   - Look for prefetch requests"
echo "   - Hero image should have fetchpriority='high'"
echo "   - Critical CSS should be inline (no network request)"
echo ""
echo "8. Test Offline Mode:"
echo "   - Network tab → Check 'Offline'"
echo "   - Reload page"
echo "   - Should see offline.html"
echo ""
echo "=========================================="
echo "✅ Validation script complete"
echo ""
echo "Next: Run Lighthouse audit with:"
echo "  npx lighthouse http://localhost:3000 --output=html --output-path=./lighthouse-report.html"


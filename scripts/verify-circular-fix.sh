#!/bin/bash
# scripts/verify-circular-fix.sh
# Verify that circular dependency fixes are working

echo "🔍 VERIFYING CIRCULAR DEPENDENCY FIX"
echo "===================================="

# Clear all caches
echo -e "\n1. Clearing caches..."
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf dist

# Build
echo -e "\n2. Building project..."
npm run build 2>&1 | tail -100

# Check vendor-misc
echo -e "\n3. Analyzing vendor-misc bundle..."
VENDOR_FILE=$(find dist/assets -name "vendor-misc-*.js" -type f 2>/dev/null | head -1)

if [ -f "$VENDOR_FILE" ]; then
  echo "Found: $VENDOR_FILE"
  SIZE=$(wc -c < "$VENDOR_FILE" 2>/dev/null || echo "0")
  echo "Size: $(($SIZE / 1024 / 1024)) MB"
  
  # Check for excluded packages
  echo -e "\n4. Checking for excluded packages:"
  EXCLUDED_COUNT=$(grep -o "refractor\|prismjs\|highlight.js\|@uiw/react-md-editor" "$VENDOR_FILE" 2>/dev/null | wc -l | xargs)
  echo "Excluded package mentions: $EXCLUDED_COUNT"
  
  # Check for circular dependency errors
  echo -e "\n5. Checking for circular dependency patterns:"
  if grep -q "Cannot access '[A-Z]' before initialization" "$VENDOR_FILE" 2>/dev/null; then
    echo "❌ STILL HAS CIRCULAR DEPENDENCY ERROR"
    grep -B5 -A5 "Cannot access '[A-Z]' before initialization" "$VENDOR_FILE" | head -20
  else
    echo "✅ No circular dependency errors found!"
  fi
else
  echo "❌ No vendor-misc bundle found"
fi

echo -e "\n✅ Verification complete"


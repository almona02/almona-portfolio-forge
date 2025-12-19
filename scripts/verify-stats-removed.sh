#!/bin/bash
# scripts/verify-stats-removed.sh

echo "🔍 VERIFYING STATS.JS REMOVAL"
echo "=============================="

# Clear caches
rm -rf node_modules/.vite
rm -rf dist

# Build
echo -e "\nBuilding project..."
npm run build 2>&1 | tail -50

# Check vendor-misc
VENDOR_FILE=$(find dist/assets -name "vendor-misc-*.js" -type f | head -1)

if [ -f "$VENDOR_FILE" ]; then
  echo -e "\nAnalyzing: $(basename $VENDOR_FILE)"

  # Check for stats.js
  STATS_COUNT=$(grep -o "stats\.js" "$VENDOR_FILE" | wc -l)
  echo "stats.js mentions: $STATS_COUNT"

  if [ "$STATS_COUNT" -gt 0 ]; then
    echo -e "\n❌ stats.js is STILL in the bundle!"
    echo "First few occurrences:"
    grep -n "stats\.js" "$VENDOR_FILE" | head -5
  else
    echo -e "\n✅ stats.js successfully removed from bundle!"
  fi

  # Check for circular dependency errors
  echo -e "\nChecking for circular dependency errors..."
  if grep -q "Cannot access '[A-Z]' before initialization" "$VENDOR_FILE"; then
    echo "❌ Circular dependency error still present"
    LINE=$(grep -n "Cannot access '[A-Z]' before initialization" "$VENDOR_FILE" | head -1)
    echo "Error at line: $LINE"

    # Show context
    LINE_NUM=$(echo "$LINE" | cut -d: -f1)
    echo -e "\nError context:"
    sed -n "$((LINE_NUM-2)),$((LINE_NUM+2))p" "$VENDOR_FILE"
  else
    echo "✅ No circular dependency errors found!"
  fi
fi

echo -e "\n✅ Verification complete"

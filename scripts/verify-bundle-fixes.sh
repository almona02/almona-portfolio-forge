#!/bin/bash
# scripts/verify-bundle-fixes.sh

echo "🔍 VERIFYING BUNDLE FIXES"
echo "=========================="

# Clear and build
rm -rf node_modules/.vite dist
echo -e "\nBuilding project..."
npm run build 2>&1 | tail -50

echo -e "\n📊 BUNDLE ANALYSIS:"
echo "==================="

# Check vendor-misc size
VENDOR_FILE=$(find dist/assets -name "vendor-misc-*.js" -type f | head -1)
if [ -f "$VENDOR_FILE" ]; then
  VENDOR_SIZE=$(wc -c < "$VENDOR_FILE")
  echo "vendor-misc size: $(($VENDOR_SIZE / 1024 / 1024)) MB"

  # Check for problematic packages
  echo -e "\n🔍 CHECKING FOR PROBLEMATIC PACKAGES:"

  PACKAGES=("hls.js" "qs" "query-string" "Cannot access")
  for pkg in "${PACKAGES[@]}"; do
    COUNT=$(grep -o "$pkg" "$VENDOR_FILE" | wc -l)
    if [ "$COUNT" -gt 0 ]; then
      echo "  ⚠️  $pkg: $COUNT occurrences"
    else
      echo "  ✅ $pkg: Not found"
    fi
  done

  # Check for circular dependency errors
  if grep -q "Cannot access '[a-z]' before initialization" "$VENDOR_FILE"; then
    echo -e "\n❌ CIRCULAR DEPENDENCY ERROR FOUND!"
    ERROR_LINE=$(grep -n "Cannot access '[a-z]' before initialization" "$VENDOR_FILE" | head -1)
    echo "Error at line: $ERROR_LINE"

    # Show context
    LINE_NUM=$(echo "$ERROR_LINE" | cut -d: -f1)
    echo -e "\nError context:"
    sed -n "$((LINE_NUM-5)),$((LINE_NUM+5))p" "$VENDOR_FILE"
  else
    echo -e "\n✅ No circular dependency errors!"
  fi
fi

# Check chunk distribution
echo -e "\n📦 CHUNK DISTRIBUTION:"
echo "====================="
find dist/assets -name "*.js" -type f -exec sh -c '
  file="$1"
  size=$(($(wc -c < "$file") / 1024))
  echo "  $(basename "$file"): ${size}KB"
' _ {} \;

echo -e "\n✅ Verification complete"

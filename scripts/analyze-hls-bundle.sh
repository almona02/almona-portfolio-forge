#!/bin/bash
# scripts/analyze-hls-bundle.sh

echo "🔍 ANALYZING HLS.JS BUNDLE ISSUE"
echo "================================"

# Clear and build
rm -rf node_modules/.vite dist
echo -e "\n1. Building project..."
npm run build 2>&1 | grep -i "hls\|video-hls\|chunk" | tail -20

# Check if video-hls chunk exists
echo -e "\n2. Looking for video-hls chunk..."
VIDEO_HLS_CHUNK=$(find dist/assets -name "*video-hls*" -type f)
VENDOR_CHUNK=$(find dist/assets -name "*vendor-misc*" -type f)

if [ -n "$VIDEO_HLS_CHUNK" ]; then
  echo "✅ Found video-hls chunk: $(basename $VIDEO_HLS_CHUNK)"
  echo "   Size: $(($(wc -c < "$VIDEO_HLS_CHUNK") / 1024))KB"

  # Check if it contains hls.js
  if grep -q "hls\.js\|Hls" "$VIDEO_HLS_CHUNK"; then
    echo "   Contains hls.js: YES"
  else
    echo "   Contains hls.js: NO ❌"
  fi
else
  echo "❌ No video-hls chunk found!"
fi

if [ -n "$VENDOR_CHUNK" ]; then
  echo -e "\n3. Checking vendor-misc for hls.js..."
  VENDOR_SIZE=$(($(wc -c < "$VENDOR_CHUNK") / 1024))
  echo "   vendor-misc size: ${VENDOR_SIZE}KB"

  # Count hls.js mentions
  HLS_COUNT=$(grep -o "hls\.js\|Hls" "$VENDOR_CHUNK" | wc -l)
  echo "   hls.js mentions: $HLS_COUNT"

  if [ "$HLS_COUNT" -gt 0 ]; then
    echo "❌ hls.js is STILL in vendor-misc!"

    # Find the import
    echo -e "\n4. Finding hls.js imports in vendor-misc..."
    grep -n "hls\.js\|from.*hls\|require.*hls" "$VENDOR_CHUNK" | head -10

    # Show context around the error
    if grep -q "Cannot access 'Ca' before initialization" "$VENDOR_CHUNK"; then
      echo -e "\n5. Circular dependency error context:"
      grep -B10 -A10 "Cannot access 'Ca' before initialization" "$VENDOR_CHUNK" | head -30
    fi
  else
    echo "✅ hls.js is NOT in vendor-misc"
  fi
fi

# Check what imports hls.js
echo -e "\n6. Finding what imports hls.js..."
grep -r "from.*hls\|require.*hls" dist/assets/*.js 2>/dev/null | head -10

echo -e "\n✅ Analysis complete"




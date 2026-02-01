#!/bin/bash

# Anchor Release Preparation Script
# Usage: ./scripts/prepare_anchor_release.sh

echo "⚓ ALMONA SYSTEM - PREPARING ANCHOR RELEASE ⚓"
echo "------------------------------------------------"

# 1. Verification/Tests
echo "🧪 Running Constitutional Verification Tests..."
# We run the specific test file we polished earlier
npx vitest run src/tests/constitutional/GuaranteeVerification.test.ts
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo "❌ TEST FAILURE. Release Aborted."
    exit 1
fi
echo "✅ Tests Passed."

# 2. Build
echo "🏗️  Building Production Bundle..."
npm run build
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo "❌ BUILD FAILURE. Release Aborted."
    exit 1
fi
echo "✅ Build Successful."

# 3. Release Hash
TIMESTAMP=$(date +"%Y%m%d%H%M")
# Check if git is available, otherwise use mock hash
if command -v git &> /dev/null; then
  GIT_HASH=$(git rev-parse --short HEAD)
else
  GIT_HASH="nohash"
fi

RELEASE_HASH="RC1.0-${TIMESTAMP}-${GIT_HASH}"

echo ""
echo "🎉 RELEASE CANDIDATE READY"
echo "🔖 Release Hash: $RELEASE_HASH"
echo "📂 Artifacts: /dist"
echo "------------------------------------------------"
echo "Ready for deployment to Anchor Workshop."

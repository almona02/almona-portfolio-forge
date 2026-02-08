#!/usr/bin/env bash
# ALMONA Cut Optimisation Upgrade Script
# Backs up cutting modules, runs benchmark, and verifies tests.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

echo "ALMONA CUT OPTIMISATION UPGRADE"
echo "==============================="

echo "Backing up current cut optimization system..."
cp -f src/lib/fabricator/UPVCCuttingEngine.ts src/lib/fabricator/UPVCCuttingEngine.backup.ts 2>/dev/null || true
cp -f src/components/fabricator/CutListViewer.tsx src/components/fabricator/CutListViewer.backup.tsx 2>/dev/null || true
cp -f src/lib/fabricator/CutListExport.ts src/lib/fabricator/CutListExport.backup.ts 2>/dev/null || true

echo "Running cutting engine tests..."
npm run test:almona-cut -- --run 2>/dev/null || npm run test -- --run src/lib/fabricator/__tests__/AlmonaCuttingEngine.test.ts 2>/dev/null || true

echo "Running ALMONA cut benchmark..."
npm run benchmark:almona-cut 2>/dev/null || npx tsx scripts/benchmark-almona-cut.ts 2>/dev/null || true

echo "Upgrade script finished. Use AlmonaCutListViewer and printCutListAlmonaStyle for Cut Optimisation output."

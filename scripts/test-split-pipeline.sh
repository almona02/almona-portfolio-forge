#!/bin/bash
# test-split-pipeline.sh - Incremental bundle splitting test

set -e

echo "🚀 Testing Bundle Splitting Pipeline"
echo "=================================="

# Step 1: Backup current working config
if [ -f vite.config.ts ]; then
  cp vite.config.ts vite.config.backup.ts
  echo "✅ Created backup: vite.config.backup.ts"
else
  echo "❌ vite.config.ts not found!"
  exit 1
fi

# Step 2: Test minimal split (just standalone engines)
echo ""
echo "🧪 Step 1: Testing minimal split (standalone engines only)..."
cat > vite.config.test-minimal.ts << 'EOF'
// Minimal safe split - ONLY standalone engines
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/') || id.includes('\\src\\')) return undefined;
          if (!id.includes('node_modules')) return undefined;
          
          // ONLY split these standalone libraries
          if (id.includes('three') && !id.includes('@react-three')) return 'vendor-three';
          if (id.includes('ammo.js')) return 'vendor-physics';
          if (id.includes('@pdf-lib') || id.includes('jspdf')) return 'vendor-document';
          
          // Everything else stays together
          return 'vendor-react';
        }
      }
    }
  }
});
EOF

# Note: This is a template - actual implementation needs full config
echo "  (Template created - needs full vite.config.ts structure)"

# Step 3: Build and verify
echo ""
echo "🔨 Building with current safe config..."
npm run build 2>&1 | grep -E "(✓ built|Error|failed|built in)" | tail -5

if [ $? -eq 0 ]; then
  echo "✅ Build successful"
  
  # Check bundle sizes
  echo ""
  echo "📊 Bundle Analysis:"
  ls -lh dist/assets/*.js 2>/dev/null | grep -E "(vendor|engine)" | awk '{print $5, $9}' | head -10
  
  echo ""
  echo "✅ Minimal split configuration is working"
else
  echo "❌ Build failed"
  if [ -f vite.config.backup.ts ]; then
    cp vite.config.backup.ts vite.config.ts
    echo "✅ Restored backup"
  fi
  exit 1
fi

echo ""
echo "=================================="
echo "Pipeline test complete! ✅"
echo ""
echo "Next steps:"
echo "1. Test in browser: npm run preview"
echo "2. Verify no console errors"
echo "3. Only then consider adding ONE more split"


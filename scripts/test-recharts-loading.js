/**
 * Test Script: Check if Recharts is bundled or lazy loaded
 * Run this to understand current Recharts loading behavior
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Testing Recharts Loading Behavior\n');
console.log('='.repeat(60));

// 1. Check if Recharts chunks exist
console.log('\n1. Checking for Recharts chunks in dist/assets...');
const distAssets = path.join(process.cwd(), 'dist/assets');
const files = fs.readdirSync(distAssets);
const rechartsChunks = files.filter(f => 
  f.includes('recharts') || 
  f.includes('chart') && f.endsWith('.js')
);

if (rechartsChunks.length > 0) {
  console.log('✅ Found Recharts chunks (lazy loaded):');
  rechartsChunks.forEach(file => {
    const stats = fs.statSync(path.join(distAssets, file));
    console.log(`   • ${file}: ${(stats.size / 1024).toFixed(1)}KB`);
  });
} else {
  console.log('⚠️  No Recharts chunks found (likely bundled in react-vendor)');
}

// 2. Check react-vendor size
console.log('\n2. Checking react-vendor bundle...');
const reactVendor = files.find(f => f.includes('react-vendor') && f.endsWith('.js'));
if (reactVendor) {
  const stats = fs.statSync(path.join(distAssets, reactVendor));
  const sizeMB = stats.size / 1024 / 1024;
  console.log(`   • ${reactVendor}: ${sizeMB.toFixed(2)}MB`);
  
  if (sizeMB > 6) {
    console.log('   ⚠️  Large bundle - Recharts might be included');
  }
}

// 3. Check if chart.tsx imports are static
console.log('\n3. Checking chart.tsx import pattern...');
const chartFile = path.join(process.cwd(), 'src/shared/ui/ui/chart.tsx');
if (fs.existsSync(chartFile)) {
  const content = fs.readFileSync(chartFile, 'utf8');
  if (content.includes("import * as RechartsPrimitive from \"recharts\"")) {
    console.log('   ⚠️  STATIC IMPORT found in chart.tsx');
    console.log('   → This pulls Recharts into the bundle');
    console.log('   → Even if components lazy load, chart.tsx imports it statically');
  } else {
    console.log('   ✅ No static import found');
  }
}

// 4. Check component lazy loading
console.log('\n4. Checking component lazy loading patterns...');
const salesChart = path.join(process.cwd(), 'src/components/admin/SalesChart.tsx');
if (fs.existsSync(salesChart)) {
  const content = fs.readFileSync(salesChart, 'utf8');
  if (content.includes('lazy(() => import(\'recharts\')')) {
    console.log('   ✅ SalesChart uses lazy loading');
  } else {
    console.log('   ⚠️  SalesChart does NOT use lazy loading');
  }
}

// 5. Recommendations
console.log('\n' + '='.repeat(60));
console.log('\n📊 Analysis Summary:\n');

if (rechartsChunks.length > 0) {
  console.log('✅ Recharts IS lazy loaded (chunks exist)');
  console.log('   → The "unused" estimate might be conservative');
  console.log('   → Recharts is in bundle but only executes when needed');
  console.log('   → This is actually acceptable behavior');
  console.log('\n💡 Recommendation: Keep current setup (SAFER)');
} else {
  console.log('⚠️  Recharts is NOT lazy loaded (no chunks found)');
  console.log('   → Recharts is bundled in react-vendor');
  console.log('   → This is due to static import in chart.tsx');
  console.log('   → Need to make chart.tsx lazy to fix this');
  console.log('\n💡 Recommendation: Test in browser first, then consider fixing');
}

console.log('\n🧪 Next Steps:');
console.log('   1. Run: npm run preview');
console.log('   2. Open browser DevTools → Network tab');
console.log('   3. Navigate to page with charts (e.g., /admin)');
console.log('   4. Check if Recharts chunk loads on-demand');
console.log('   5. If yes → Keep current setup');
console.log('   6. If no → Consider making chart.tsx lazy (with rollback ready)');


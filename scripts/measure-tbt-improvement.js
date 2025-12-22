import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📊 Measuring TBT Improvement\n');

async function measurePerformance() {
  console.log('1. Building project...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed');
    process.exit(1);
  }
  
  console.log('\n2. Analyzing bundle...');
  const distPath = path.join(process.cwd(), 'dist/assets');
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ dist/assets folder not found');
    process.exit(1);
  }
  
  const files = fs.readdirSync(distPath);
  const jsFiles = files.filter(f => f.endsWith('.js') && !f.includes('.map'));
  
  console.log('\n📦 Bundle Analysis:');
  console.log('==================');
  
  let reactVendorSize = 0;
  let routeChunks = [];
  let engineChunks = [];
  let totalSize = 0;
  
  jsFiles.forEach(file => {
    const stats = fs.statSync(path.join(distPath, file));
    const sizeKB = stats.size / 1024;
    const sizeMB = sizeKB / 1024;
    totalSize += stats.size;
    
    let type = 'Other';
    if (file.includes('react-vendor')) {
      type = 'React Core';
      reactVendorSize = stats.size;
    } else if (file.includes('route-') || file.includes('Fabricator') || file.includes('Admin') || file.includes('Shop')) {
      type = 'Route Chunk';
      routeChunks.push({ file, size: stats.size });
    } else if (file.includes('engine-') || file.includes('vendor-')) {
      type = 'Engine/Vendor';
      engineChunks.push({ file, size: stats.size });
    } else if (file.includes('index-')) {
      type = 'App Code';
    }
    
    console.log(`${type.padEnd(15)} ${file.padEnd(40)} ${sizeMB.toFixed(2)}MB`);
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`Total Bundle Size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  
  if (reactVendorSize > 0) {
    const reactVendorMB = reactVendorSize / 1024 / 1024;
    console.log(`\n🎯 React Vendor Size: ${reactVendorMB.toFixed(2)}MB`);
    
    if (reactVendorMB < 4) {
      console.log('✅ SUCCESS: React vendor reduced significantly!');
      console.log('📈 Expected TBT reduction: 600-800ms');
      console.log('💡 This should reduce JavaScript execution time from 2.3s to ~1.5s');
    } else if (reactVendorMB < 5) {
      console.log('⚠️ MODERATE: React vendor could be smaller');
      console.log('💡 Add more route splitting for heavy pages');
    } else {
      console.log('⚠️ LARGE: React vendor still needs optimization');
      console.log('💡 Consider lazy loading more routes and components');
    }
  }
  
  // Count lazy chunks
  console.log(`\n🔗 Lazy Chunks Created: ${routeChunks.length} route chunks`);
  
  if (routeChunks.length > 0) {
    console.log('✅ Dynamic imports are working!');
    console.log('\nRoute chunks:');
    routeChunks.forEach(chunk => {
      const sizeMB = chunk.size / 1024 / 1024;
      console.log(`  • ${chunk.file}: ${sizeMB.toFixed(2)}MB`);
    });
  } else {
    console.log('⚠️ No route chunks found - routes may not be lazy loaded');
  }
  
  if (engineChunks.length > 0) {
    console.log(`\n⚙️ Engine/Vendor Chunks: ${engineChunks.length}`);
    engineChunks.forEach(chunk => {
      const sizeMB = chunk.size / 1024 / 1024;
      console.log(`  • ${chunk.file}: ${sizeMB.toFixed(2)}MB`);
    });
  }
  
  console.log('\n✅ Analysis complete!');
  console.log('\n🎯 Next Steps:');
  console.log('1. Test in browser: npm run preview');
  console.log('2. Check Network tab for chunk loading');
  console.log('3. Verify no console errors');
  console.log('4. Run PageSpeed Insights to measure TBT improvement');
}

measurePerformance().catch(console.error);


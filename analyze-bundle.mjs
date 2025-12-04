#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes the build output to identify what's in the vendor chunk
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Analyzing bundle chunks...\n');

const distPath = path.join(__dirname, 'dist', 'assets');

if (!fs.existsSync(distPath)) {
  console.error('❌ dist/assets folder not found. Run "npm run build" first.');
  process.exit(1);
}

const files = fs.readdirSync(distPath);
const jsFiles = files.filter(f => f.endsWith('.js'));

// Group files by type
const chunks = {
  vendor: [],
  react: [],
  fabricator: [],
  pages: [],
  scope: [],
  other: []
};

let totalSize = 0;

jsFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  totalSize += stats.size;

  const fileInfo = { name: file, size: sizeKB, sizeBytes: stats.size };

  if (file.includes('scope-')) {
    chunks.scope.push(fileInfo);
  } else if (file.includes('vendor')) {
    chunks.vendor.push(fileInfo);
  } else if (file.includes('react')) {
    chunks.react.push(fileInfo);
  } else if (file.includes('fabricator')) {
    chunks.fabricator.push(fileInfo);
  } else if (file.match(/^[A-Z]/)) {
    chunks.pages.push(fileInfo);
  } else {
    chunks.other.push(fileInfo);
  }
});

// Sort by size
Object.keys(chunks).forEach(key => {
  chunks[key].sort((a, b) => b.sizeBytes - a.sizeBytes);
});

// Display results
console.log('📊 BUNDLE ANALYSIS RESULTS\n');
console.log('='.repeat(80));

console.log('\n🎯 VENDOR CHUNKS (largest first):');
console.log('-'.repeat(80));
chunks.vendor.forEach(f => {
  const bar = '█'.repeat(Math.floor(f.sizeBytes / 100000));
  console.log(`  ${f.name.padEnd(50)} ${f.size.padStart(10)} KB ${bar}`);
});
const vendorTotal = chunks.vendor.reduce((sum, f) => sum + f.sizeBytes, 0);
console.log(`  Total vendor size: ${(vendorTotal / 1024).toFixed(2)} KB (${(vendorTotal / 1024 / 1024).toFixed(2)} MB)`);

console.log('\n🔍 SCOPE CHUNKS (auto-generated from @scoped packages):');
console.log('-'.repeat(80));
chunks.scope.forEach(f => {
  const bar = '█'.repeat(Math.floor(f.sizeBytes / 50000));
  console.log(`  ${f.name.padEnd(50)} ${f.size.padStart(10)} KB ${bar}`);
});
const scopeTotal = chunks.scope.reduce((sum, f) => sum + f.sizeBytes, 0);
console.log(`  Total scope size: ${(scopeTotal / 1024).toFixed(2)} KB (${(scopeTotal / 1024 / 1024).toFixed(2)} MB)`);

console.log('\n⚛️  REACT CHUNKS:');
console.log('-'.repeat(80));
chunks.react.forEach(f => {
  const bar = '█'.repeat(Math.floor(f.sizeBytes / 100000));
  console.log(`  ${f.name.padEnd(50)} ${f.size.padStart(10)} KB ${bar}`);
});

console.log('\n🏭 FABRICATOR CHUNKS (top 10):');
console.log('-'.repeat(80));
chunks.fabricator.slice(0, 10).forEach(f => {
  const bar = '█'.repeat(Math.floor(f.sizeBytes / 100000));
  console.log(`  ${f.name.padEnd(50)} ${f.size.padStart(10)} KB ${bar}`);
});
if (chunks.fabricator.length > 10) {
  console.log(`  ... and ${chunks.fabricator.length - 10} more fabricator chunks`);
}

console.log('\n📄 PAGE CHUNKS (top 10):');
console.log('-'.repeat(80));
chunks.pages.slice(0, 10).forEach(f => {
  const bar = '█'.repeat(Math.floor(f.sizeBytes / 50000));
  console.log(`  ${f.name.padEnd(50)} ${f.size.padStart(10)} KB ${bar}`);
});

console.log('\n📦 SUMMARY:');
console.log('-'.repeat(80));
console.log(`  Total bundle size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Total JS files: ${jsFiles.length}`);
console.log(`  Vendor chunks: ${chunks.vendor.length}`);
console.log(`  Scope chunks: ${chunks.scope.length}`);
console.log(`  React chunks: ${chunks.react.length}`);
console.log(`  Fabricator chunks: ${chunks.fabricator.length}`);
console.log(`  Page chunks: ${chunks.pages.length}`);
console.log(`  Other chunks: ${chunks.other.length}`);

// Find largest chunks overall
console.log('\n🔥 TOP 20 LARGEST CHUNKS:');
console.log('-'.repeat(80));
const allChunks = [...chunks.vendor, ...chunks.react, ...chunks.fabricator, ...chunks.pages, ...chunks.scope, ...chunks.other];
allChunks.sort((a, b) => b.sizeBytes - a.sizeBytes);
allChunks.slice(0, 20).forEach((f, i) => {
  const bar = '█'.repeat(Math.floor(f.sizeBytes / 100000));
  const sizeMB = (f.sizeBytes / 1024 / 1024).toFixed(2);
  console.log(`  ${(i + 1).toString().padStart(2)}. ${f.name.padEnd(42)} ${f.size.padStart(10)} KB (${sizeMB} MB) ${bar}`);
});

console.log('\n' + '='.repeat(80));
console.log('\n💡 KEY FINDINGS:');

// Analyze the main vendor chunk
const mainVendor = chunks.vendor.find(f => f.name.startsWith('vendor-') && !f.name.includes('scope'));
if (mainVendor) {
  console.log(`\n⚠️  Main vendor chunk: ${mainVendor.name}`);
  console.log(`   Size: ${mainVendor.size} KB (${(mainVendor.sizeBytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   This chunk contains unmatched libraries that fell through the splitting logic.`);
}

// Check for large vendor chunks
const largeVendors = chunks.vendor.filter(f => f.sizeBytes > 1000000);
if (largeVendors.length > 0) {
  console.log('\n⚠️  Large vendor chunks (>1MB):');
  largeVendors.forEach(f => {
    console.log(`   - ${f.name}: ${f.size} KB (${(f.sizeBytes / 1024 / 1024).toFixed(2)} MB)`);
    if (f.name.includes('three-ecosystem')) {
      console.log(`     → Contains: @react-spring/three, @react-three/xr, @use-gesture, ammo.js`);
      console.log(`     → Recommendation: Lazy load 3D features`);
    } else if (f.name.includes('ml-vendor')) {
      console.log(`     → Contains: TensorFlow.js`);
      console.log(`     → Recommendation: Lazy load ML features`);
    } else if (f.name.includes('pdf-vendor')) {
      console.log(`     → Contains: pdf-lib, pdfjs-dist`);
      console.log(`     → Recommendation: Lazy load PDF generation`);
    } else if (f.name.includes('file-vendor')) {
      console.log(`     → Contains: ExcelJS, file-saver`);
      console.log(`     → Recommendation: Lazy load file export features`);
    } else if (f.name.includes('maps-vendor')) {
      console.log(`     → Contains: maplibre-gl`);
      console.log(`     → Recommendation: Lazy load map features`);
    } else if (f.name.includes('fabricator-components')) {
      console.log(`     → Contains: Fabricator UI components`);
      console.log(`     → Recommendation: Already route-split, consider further splitting`);
    }
  });
}

// Analyze scope chunks
if (chunks.scope.length > 0) {
  console.log('\n📊 Scope chunks breakdown:');
  chunks.scope.forEach(f => {
    const scopeName = f.name.match(/scope-([^-]+)-vendor/)?.[1] || 'unknown';
    console.log(`   - @${scopeName}: ${f.size} KB`);
  });
  console.log(`\n   Note: These are auto-generated from @scoped packages that weren't explicitly handled.`);
}

console.log('\n✅ RECOMMENDATIONS:');
console.log('\n1. Main vendor chunk investigation:');
console.log('   - Open dist/stats.html to see what\'s in the main vendor chunk');
console.log('   - Look for large libraries that can be split out');
console.log('   - Consider if all dependencies are necessary');

console.log('\n2. Lazy loading opportunities:');
console.log('   - TensorFlow (ml-vendor): 3MB - lazy load ML features');
console.log('   - Three.js ecosystem: 3.2MB - lazy load 3D features');
console.log('   - PDF libraries: 1.7MB - lazy load PDF generation');
console.log('   - ExcelJS: 1.4MB - lazy load Excel export');
console.log('   - Maps: 1.1MB - lazy load map features');

console.log('\n3. Further optimization:');
console.log('   - Review scope chunks for potential consolidation');
console.log('   - Consider dynamic imports for heavy features');
console.log('   - Check for duplicate dependencies');

console.log('\n');


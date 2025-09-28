#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bundle Analysis Script
 * Analyzes the built bundle and provides optimization recommendations
 */

const DIST_DIR = path.join(__dirname, '../dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

function analyzeBundle() {
  console.log('🔍 Analyzing bundle...\n');

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  const assets = fs.readdirSync(ASSETS_DIR);
  const jsFiles = assets.filter(file => file.endsWith('.js'));
  const cssFiles = assets.filter(file => file.endsWith('.css'));
  const otherFiles = assets.filter(file => !file.endsWith('.js') && !file.endsWith('.css'));

  console.log('📊 Bundle Analysis Results:');
  console.log('=' .repeat(50));

  // Analyze JS files
  console.log('\n📦 JavaScript Files:');
  let totalJSSize = 0;
  jsFiles.forEach(file => {
    const filePath = path.join(ASSETS_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalJSSize += stats.size;
    
    const sizeCategory = stats.size > 500000 ? '🔴 Large' : 
                        stats.size > 200000 ? '🟡 Medium' : '🟢 Small';
    
    console.log(`  ${sizeCategory} ${file}: ${sizeKB} KB`);
  });

  // Analyze CSS files
  console.log('\n🎨 CSS Files:');
  let totalCSSSize = 0;
  cssFiles.forEach(file => {
    const filePath = path.join(ASSETS_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalCSSSize += stats.size;
    
    const sizeCategory = stats.size > 100000 ? '🔴 Large' : 
                        stats.size > 50000 ? '🟡 Medium' : '🟢 Small';
    
    console.log(`  ${sizeCategory} ${file}: ${sizeKB} KB`);
  });

  // Analyze other files
  console.log('\n📁 Other Assets:');
  let totalOtherSize = 0;
  otherFiles.forEach(file => {
    const filePath = path.join(ASSETS_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalOtherSize += stats.size;
    
    console.log(`  ${file}: ${sizeKB} KB`);
  });

  // Summary
  const totalSize = totalJSSize + totalCSSSize + totalOtherSize;
  const totalSizeKB = (totalSize / 1024).toFixed(2);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

  console.log('\n📈 Summary:');
  console.log('=' .repeat(50));
  console.log(`Total JavaScript: ${(totalJSSize / 1024).toFixed(2)} KB`);
  console.log(`Total CSS: ${(totalCSSSize / 1024).toFixed(2)} KB`);
  console.log(`Total Other: ${(totalOtherSize / 1024).toFixed(2)} KB`);
  console.log(`Total Bundle Size: ${totalSizeKB} KB (${totalSizeMB} MB)`);

  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');
  console.log('=' .repeat(50));

  if (totalJSSize > 1000000) { // 1MB
    console.log('🔴 JavaScript bundle is large (>1MB). Consider:');
    console.log('   - Further code splitting');
    console.log('   - Tree shaking unused code');
    console.log('   - Lazy loading heavy components');
  }

  if (totalCSSSize > 200000) { // 200KB
    console.log('🟡 CSS bundle is medium-large (>200KB). Consider:');
    console.log('   - CSS purging');
    console.log('   - Critical CSS inlining');
    console.log('   - CSS code splitting');
  }

  if (totalSize > 2000000) { // 2MB
    console.log('🔴 Total bundle is large (>2MB). Consider:');
    console.log('   - Image optimization');
    console.log('   - Asset compression');
    console.log('   - CDN usage');
  }

  // Check for large individual files
  const largeFiles = jsFiles.filter(file => {
    const filePath = path.join(ASSETS_DIR, file);
    const stats = fs.statSync(filePath);
    return stats.size > 500000; // 500KB
  });

  if (largeFiles.length > 0) {
    console.log('\n🔴 Large individual files detected:');
    largeFiles.forEach(file => {
      const filePath = path.join(ASSETS_DIR, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   - ${file}: ${sizeKB} KB`);
    });
    console.log('   Consider splitting these files further.');
  }

  // Performance score
  let score = 100;
  if (totalJSSize > 1000000) score -= 30;
  else if (totalJSSize > 500000) score -= 15;
  
  if (totalCSSSize > 200000) score -= 20;
  else if (totalCSSSize > 100000) score -= 10;
  
  if (totalSize > 2000000) score -= 25;
  else if (totalSize > 1000000) score -= 15;

  const scoreColor = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
  console.log(`\n${scoreColor} Performance Score: ${score}/100`);

  if (score < 80) {
    console.log('\n⚠️  Bundle optimization needed for better performance.');
  } else {
    console.log('\n✅ Bundle size is well optimized!');
  }
}

// Run analysis
analyzeBundle();

/**
 * Analyze Images for Optimization
 * Identifies large images that need optimization for LCP improvement
 */

import fs from 'fs';
import path from 'path';

console.log('🖼️  Analyzing Images for Optimization\n');
console.log('='.repeat(60));

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
const largeImageThreshold = 200 * 1024; // 200KB

function scanDirectory(dir, baseDir = '') {
  const results = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(baseDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and dist
        if (!entry.name.includes('node_modules') && 
            !entry.name.includes('dist') &&
            !entry.name.startsWith('.')) {
          results.push(...scanDirectory(fullPath, relativePath));
        }
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (imageExtensions.includes(ext)) {
          try {
            const stats = fs.statSync(fullPath);
            results.push({
              path: relativePath,
              fullPath,
              size: stats.size,
              sizeKB: (stats.size / 1024).toFixed(1),
              sizeMB: (stats.size / 1024 / 1024).toFixed(2),
              isLarge: stats.size > largeImageThreshold,
              extension: ext
            });
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
  
  return results;
}

async function analyzeImages() {
  console.log('📦 Scanning for images...\n');
  
  const publicDir = path.join(process.cwd(), 'public');
  const srcDir = path.join(process.cwd(), 'src');
  
  const publicImages = fs.existsSync(publicDir) ? scanDirectory(publicDir, 'public') : [];
  const srcImages = fs.existsSync(srcDir) ? scanDirectory(srcDir, 'src') : [];
  
  const allImages = [...publicImages, ...srcImages];
  
  console.log(`Found ${allImages.length} images total\n`);
  
  // Sort by size (largest first)
  const sortedImages = allImages.sort((a, b) => b.size - a.size);
  
  // Large images (LCP candidates)
  const largeImages = sortedImages.filter(img => img.isLarge);
  
  console.log(`🚨 Large Images (>200KB) - LCP Candidates: ${largeImages.length}\n`);
  console.log('='.repeat(60));
  
  largeImages.slice(0, 20).forEach((img, index) => {
    const marker = index < 5 ? '🔥' : '⚠️';
    console.log(`${marker} ${img.path}`);
    console.log(`   Size: ${img.sizeMB}MB (${img.sizeKB}KB)`);
    console.log(`   Type: ${img.extension.toUpperCase()}`);
    console.log('');
  });
  
  // Calculate total size
  const totalSize = allImages.reduce((sum, img) => sum + img.size, 0);
  const largeImagesSize = largeImages.reduce((sum, img) => sum + img.size, 0);
  
  console.log('='.repeat(60));
  console.log('\n📊 Summary:\n');
  console.log(`Total Images: ${allImages.length}`);
  console.log(`Total Size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Large Images: ${largeImages.length}`);
  console.log(`Large Images Size: ${(largeImagesSize / 1024 / 1024).toFixed(2)}MB`);
  
  // WebP conversion potential
  const webpSavings = largeImagesSize * 0.7; // 70% reduction estimate
  console.log(`\n💡 WebP Conversion Potential:`);
  console.log(`   Current: ${(largeImagesSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   After WebP: ${((largeImagesSize - webpSavings) / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Savings: ${(webpSavings / 1024 / 1024).toFixed(2)}MB (70%)`);
  
  // Top 5 LCP candidates
  console.log(`\n🎯 Top 5 LCP Optimization Candidates:\n`);
  largeImages.slice(0, 5).forEach((img, index) => {
    console.log(`${index + 1}. ${img.path}`);
    console.log(`   → Convert to WebP: ${(img.size * 0.7 / 1024).toFixed(0)}KB savings`);
    console.log(`   → Add responsive sizes: 400w, 800w, 1200w, 1600w`);
    console.log(`   → Lazy load if below fold`);
    console.log('');
  });
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    totalImages: allImages.length,
    totalSizeMB: totalSize / 1024 / 1024,
    largeImages: largeImages.length,
    largeImagesSizeMB: largeImagesSize / 1024 / 1024,
    topCandidates: largeImages.slice(0, 10).map(img => ({
      path: img.path,
      sizeKB: img.sizeKB,
      extension: img.extension
    })),
    webpSavingsMB: webpSavings / 1024 / 1024
  };
  
  fs.writeFileSync(
    './image-analysis-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('✅ Analysis saved to image-analysis-report.json');
  console.log('\n🎯 Next Steps:');
  console.log('   1. Convert top 5 images to WebP');
  console.log('   2. Add responsive image sizes');
  console.log('   3. Implement lazy loading for below-fold images');
  console.log('   4. Test LCP improvement');
}

analyzeImages().catch(console.error);


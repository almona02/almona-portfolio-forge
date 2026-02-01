/**
 * Bundle Size Analysis Script
 * 
 * Analyzes Vite build output to identify large chunks and optimization opportunities.
 * 
 * Usage: npm run analyze:bundle
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import { readFileSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'dist');

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Analyze bundle sizes
 */
function analyzeBundleSizes() {
  console.log('🔍 Analyzing bundle sizes...\n');

  try {
    const assetsDir = join(distDir, 'assets');
    const files = readdirSync(assetsDir);

    const chunks = files
      .filter(file => file.endsWith('.js') || file.endsWith('.css'))
      .map(file => {
        const filePath = join(assetsDir, file);
        const size = getFileSize(filePath);
        return {
          name: file,
          size,
          type: file.endsWith('.js') ? 'JavaScript' : 'CSS',
        };
      })
      .sort((a, b) => b.size - a.size);

    // Calculate totals
    const jsChunks = chunks.filter(c => c.type === 'JavaScript');
    const cssChunks = chunks.filter(c => c.type === 'CSS');
    const totalJsSize = jsChunks.reduce((sum, c) => sum + c.size, 0);
    const totalCssSize = cssChunks.reduce((sum, c) => sum + c.size, 0);
    const totalSize = totalJsSize + totalCssSize;

    console.log('📊 Bundle Size Summary\n');
    console.log(`Total JavaScript: ${formatBytes(totalJsSize)}`);
    console.log(`Total CSS: ${formatBytes(totalCssSize)}`);
    console.log(`Total Size: ${formatBytes(totalSize)}\n`);

    console.log('📦 Top 10 Largest Chunks\n');
    chunks.slice(0, 10).forEach((chunk, index) => {
      const percentage = ((chunk.size / totalSize) * 100).toFixed(2);
      console.log(`${index + 1}. ${chunk.name}`);
      console.log(`   ${formatBytes(chunk.size)} (${percentage}%) - ${chunk.type}`);
    });

    // Generate recommendations
    console.log('\n💡 Optimization Recommendations\n');
    
    const largeChunks = chunks.filter(c => c.size > 500 * 1024);
    if (largeChunks.length > 0) {
      console.log(`⚠️  ${largeChunks.length} chunks exceed 500KB:`);
      largeChunks.forEach(chunk => {
        console.log(`   - ${chunk.name}: ${formatBytes(chunk.size)}`);
        console.log(`     Consider code splitting or lazy loading`);
      });
      console.log('');
    }

    if (totalJsSize > 3 * 1024 * 1024) {
      console.log(`⚠️  Total JavaScript bundle exceeds 3MB (${formatBytes(totalJsSize)})`);
      console.log(`   Target: <3MB for 3G/4G networks`);
      console.log(`   Recommendations:`);
      console.log(`   - Enable aggressive code splitting`);
      console.log(`   - Lazy load non-critical features`);
      console.log(`   - Use dynamic imports for large dependencies`);
      console.log('');
    }

    const entryChunks = jsChunks.filter(c => 
      c.name.includes('index') || c.name.includes('main') || c.name.includes('app')
    );
    if (entryChunks.length > 0) {
      const largestEntry = entryChunks[0];
      if (largestEntry.size > 200 * 1024) {
        console.log(`⚠️  Entry chunk is large: ${largestEntry.name} (${formatBytes(largestEntry.size)})`);
        console.log(`   Consider splitting into smaller initial chunks`);
        console.log('');
      }
    }

    // Check for vendor chunks
    const vendorChunks = jsChunks.filter(c => 
      c.name.includes('vendor') || c.name.includes('chunk')
    );
    if (vendorChunks.length > 0) {
      const vendorTotal = vendorChunks.reduce((sum, c) => sum + c.size, 0);
      console.log(`📚 Vendor chunks: ${vendorChunks.length} chunks, ${formatBytes(vendorTotal)} total`);
      
      const largeVendorChunks = vendorChunks.filter(c => c.size > 300 * 1024);
      if (largeVendorChunks.length > 0) {
        console.log(`   ⚠️  ${largeVendorChunks.length} vendor chunks exceed 300KB:`);
        largeVendorChunks.forEach(chunk => {
          console.log(`      - ${chunk.name}: ${formatBytes(chunk.size)}`);
        });
        console.log('');
      }
    }

    console.log('✅ Analysis complete!\n');

  } catch (error) {
    console.error('❌ Error analyzing bundle:', error.message);
    console.log('\n💡 Make sure to build the project first: npm run build\n');
    process.exit(1);
  }
}

// Run analysis
analyzeBundleSizes();

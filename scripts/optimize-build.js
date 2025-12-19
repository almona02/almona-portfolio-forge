#!/usr/bin/env node
/**
 * Build Optimization Script
 * 
 * Finds and optimizes heavy imports in the codebase by suggesting
 * lazy loading patterns for better bundle splitting.
 * 
 * Usage: node scripts/optimize-build.js
 */

const fs = require('fs');
const path = require('path');

// Heavy libraries that should be lazy-loaded
const HEAVY_LIBRARIES = [
  { pattern: /import\s*\*\s*as\s*THREE\s*from\s*['"]three['"]/g, replacement: "const THREE = await import('three')" },
  { pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@react-three\/fiber['"]/g, replacement: "const { $1 } = await import('@react-three/fiber')" },
  { pattern: /import\s*\*\s*as\s*tf\s*from\s*['"]@tensorflow\/tfjs['"]/g, replacement: "const tf = await import('@tensorflow/tfjs')" },
  { pattern: /import\s*ExcelJS\s*from\s*['"]exceljs['"]/g, replacement: "const ExcelJS = await import('exceljs')" },
  { pattern: /import\s*\*\s*as\s*pdfjs\s*from\s*['"]pdfjs-dist['"]/g, replacement: "const pdfjs = await import('pdfjs-dist')" },
];

// Directories to scan
const SCAN_DIRECTORIES = [
  path.join(__dirname, '../src/components'),
  path.join(__dirname, '../src/pages'),
  path.join(__dirname, '../src/lib'),
];

// Files to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.test\./,
  /\.spec\./,
  /optimized-imports\.ts/,
];

let optimizedCount = 0;
let totalFiles = 0;

/**
 * Check if file should be skipped
 */
function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Optimize imports in a file
 */
function optimizeImports(filePath) {
  if (shouldSkip(filePath)) {
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check for heavy imports
    HEAVY_LIBRARIES.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        console.log(`⚠️  Found heavy import in: ${path.relative(process.cwd(), filePath)}`);
        console.log(`   Consider using lazy loading: ${replacement}`);
        modified = true;
      }
    });

    if (modified) {
      optimizedCount++;
      // Note: We're not auto-replacing to avoid breaking code
      // This script is for analysis only
    }

    return modified;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });

  files.forEach(file => {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      scanDirectory(fullPath);
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      totalFiles++;
      optimizeImports(fullPath);
    }
  });
}

/**
 * Main execution
 */
console.log('🔍 Scanning for heavy imports...\n');

SCAN_DIRECTORIES.forEach(dir => {
  if (fs.existsSync(dir)) {
    scanDirectory(dir);
  }
});

console.log(`\n📊 Analysis Complete:`);
console.log(`   Total files scanned: ${totalFiles}`);
console.log(`   Files with heavy imports: ${optimizedCount}`);

if (optimizedCount > 0) {
  console.log(`\n💡 Recommendations:`);
  console.log(`   1. Use lazy loading for heavy libraries`);
  console.log(`   2. Import from '@/lib/optimized-imports' for common patterns`);
  console.log(`   3. Wrap heavy components with <Lazy3DWrapper>`);
  console.log(`   4. Use React.lazy() for route-level code splitting`);
}

console.log('\n✅ Optimization analysis complete!\n');


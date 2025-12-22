#!/usr/bin/env node

/**
 * Bundle Optimization Verification Script
 * 
 * Safely verifies bundle optimization changes without breaking the application.
 * 
 * Usage:
 *   node scripts/verify-bundle-optimization.js --phase=baseline
 *   node scripts/verify-bundle-optimization.js --phase=exclusion-test
 *   node scripts/verify-bundle-optimization.js --phase=chunk-splitting
 *   node scripts/verify-bundle-optimization.js --phase=full
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Parse command line arguments
const args = process.argv.slice(2);
const phase = args.find(arg => arg.startsWith('--phase='))?.split('=')[1] || 'full';

// Verification results
const results = {
  build: { passed: false, message: '' },
  bundleSize: { passed: false, message: '', before: 0, after: 0 },
  hlsExcluded: { passed: false, message: '' },
  chunks: { passed: false, message: '', chunks: [] },
  runtime: { passed: false, message: '' },
  performance: { passed: false, message: '', metrics: {} },
};

/**
 * Phase 1: Baseline Verification
 * Establishes current working state before changes
 */
async function verifyBaseline() {
  log('\n📊 Phase 1: Baseline Verification', 'blue');
  log('='.repeat(50), 'blue');
  
  // Store phase for hls.js check logic
  const currentPhase = phase;

  try {
    // 1. Verify build works
    info('1. Testing build...');
    execSync('npm run build', { 
      cwd: projectRoot, 
      stdio: 'inherit',
      env: { ...process.env, ANALYZE: 'false' }
    });
    results.build.passed = true;
    results.build.message = 'Build completed successfully';
    success('Build test passed');

    // 2. Check bundle size
    info('2. Analyzing bundle size...');
    const distPath = join(projectRoot, 'dist');
    const assetsPath = join(distPath, 'assets');
    let totalSize = 0;
    let vendorSize = 0;
    const vendorFiles = [];
    
    if (existsSync(distPath)) {
      if (existsSync(assetsPath)) {
        // Cross-platform file finding using Node.js fs
        const findJsFiles = (dir, fileList = []) => {
          const files = readdirSync(dir, { withFileTypes: true });
          for (const file of files) {
            const filePath = join(dir, file.name);
            if (file.isDirectory()) {
              findJsFiles(filePath, fileList);
            } else if (file.name.endsWith('.js')) {
              fileList.push(filePath);
            }
          }
          return fileList;
        };

        const allFiles = findJsFiles(assetsPath);

        for (const filePath of allFiles) {
          if (existsSync(filePath)) {
            const stats = statSync(filePath);
            totalSize += stats.size;
            
            const relativePath = filePath.replace(distPath + (process.platform === 'win32' ? '\\' : '/'), '');
            if (relativePath.includes('vendor') || relativePath.includes('react-vendor')) {
              vendorSize += stats.size;
              vendorFiles.push({ file: relativePath, size: stats.size });
            }
          }
        }

        results.bundleSize.before = vendorSize;
        results.bundleSize.passed = true;
        results.bundleSize.message = `Vendor bundle: ${(vendorSize / 1024 / 1024).toFixed(2)}MB`;
        success(`Bundle analysis: ${(totalSize / 1024 / 1024).toFixed(2)}MB total, ${(vendorSize / 1024 / 1024).toFixed(2)}MB vendor`);
        
        if (vendorFiles.length > 0) {
          info('Vendor chunks found:');
          vendorFiles.forEach(({ file, size }) => {
            log(`  - ${file}: ${(size / 1024 / 1024).toFixed(2)}MB`, 'cyan');
          });
        }
      }
    }

    // 3. Check if hls.js is in bundle
    info('3. Checking for hls.js in bundle...');
    const bundleAnalysisPath = join(distPath, 'bundle-analysis.html');
    let hlsFound = false;
    
    if (existsSync(bundleAnalysisPath)) {
      const analysisContent = readFileSync(bundleAnalysisPath, 'utf8');
      hlsFound = analysisContent.includes('hls.js') || analysisContent.includes('hls.mjs');
    } else {
      // Check actual bundle files using cross-platform method
      if (existsSync(assetsPath)) {
        const findJsFiles = (dir, fileList = []) => {
          const files = readdirSync(dir, { withFileTypes: true });
          for (const file of files) {
            const filePath = join(dir, file.name);
            if (file.isDirectory()) {
              findJsFiles(filePath, fileList);
            } else if (file.name.endsWith('.js')) {
              fileList.push(filePath);
            }
          }
          return fileList;
        };
        
        const jsFiles = findJsFiles(assetsPath);
        for (const filePath of jsFiles) {
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf8');
            if (content.includes('hls.js') || content.includes('hls.mjs') || content.includes('Hls')) {
              hlsFound = true;
              break;
            }
          }
        }
      }
    }

    // In baseline phase, finding hls.js is EXPECTED (it should be there)
    // In exclusion-test phase, NOT finding hls.js is EXPECTED (it should be excluded)
    const isBaselinePhase = currentPhase === 'baseline' || currentPhase === 'full';
    if (isBaselinePhase) {
      // Baseline: hls.js SHOULD be found (pass if found)
      results.hlsExcluded.passed = hlsFound;
      results.hlsExcluded.message = hlsFound 
        ? 'hls.js found in bundle (expected in baseline)' 
        : 'hls.js not found in bundle (unexpected in baseline)';
      
      if (hlsFound) {
        success('hls.js found in bundle (expected in baseline)');
      } else {
        warning('hls.js not found in bundle (unexpected in baseline)');
      }
    } else {
      // Exclusion test: hls.js should NOT be found (pass if not found)
      results.hlsExcluded.passed = !hlsFound;
      results.hlsExcluded.message = hlsFound 
        ? 'hls.js still found in bundle (exclusion failed)' 
        : 'hls.js successfully excluded from bundle';
      
      if (hlsFound) {
        error('hls.js still found in bundle');
      } else {
        success('hls.js successfully excluded');
      }
    }

    // 4. Check chunk structure
    info('4. Analyzing chunk structure...');
    if (vendorFiles && vendorFiles.length > 0) {
      const chunks = vendorFiles.map(f => f.file);
      results.chunks.chunks = chunks;
      results.chunks.passed = true;
      results.chunks.message = `Found ${chunks.length} vendor chunks`;
      success(results.chunks.message);
    } else {
      results.chunks.passed = false;
      results.chunks.message = 'No vendor chunks found';
      warning(results.chunks.message);
    }

    success('Baseline verification complete');
    return true;

  } catch (err) {
    error(`Baseline verification failed: ${err.message}`);
    results.build.passed = false;
    results.build.message = err.message;
    return false;
  }
}

/**
 * Phase 2: Exclusion Test
 * Verifies that hls.js exclusion works without breaking the app
 */
async function verifyExclusion() {
  log('\n🔍 Phase 2: hls.js Exclusion Test', 'blue');
  log('='.repeat(50), 'blue');

  try {
    // 1. Verify build still works
    info('1. Testing build after exclusion...');
    execSync('npm run build', { 
      cwd: projectRoot, 
      stdio: 'inherit',
      env: { ...process.env, ANALYZE: 'false' }
    });
    results.build.passed = true;
    success('Build test passed');

    // 2. Check bundle size reduction
    info('2. Checking bundle size reduction...');
    const distPath = join(projectRoot, 'dist');
    if (existsSync(distPath)) {
      const assetsPath = join(distPath, 'assets');
      if (existsSync(assetsPath)) {
        // Cross-platform file finding
        const findJsFiles = (dir, fileList = []) => {
          const files = readdirSync(dir, { withFileTypes: true });
          for (const file of files) {
            const filePath = join(dir, file.name);
            if (file.isDirectory()) {
              findJsFiles(filePath, fileList);
            } else if (file.name.endsWith('.js')) {
              fileList.push(filePath);
            }
          }
          return fileList;
        };

        const allFiles = findJsFiles(assetsPath);
        let vendorSize = 0;
        for (const filePath of allFiles) {
          if (existsSync(filePath)) {
            const stats = statSync(filePath);
            const relativePath = filePath.replace(distPath + (process.platform === 'win32' ? '\\' : '/'), '');
            if (relativePath.includes('vendor') || relativePath.includes('react-vendor')) {
              vendorSize += stats.size;
            }
          }
        }

        results.bundleSize.after = vendorSize;
        const reduction = results.bundleSize.before - vendorSize;
        const reductionPercent = ((reduction / results.bundleSize.before) * 100).toFixed(1);
        
        if (reduction > 0) {
          results.bundleSize.passed = true;
          results.bundleSize.message = `Bundle reduced by ${(reduction / 1024 / 1024).toFixed(2)}MB (${reductionPercent}%)`;
          success(results.bundleSize.message);
        } else {
          warning('Bundle size did not decrease (may need to check vite config)');
        }
      }
    }

    // 3. Verify hls.js is excluded
    info('3. Verifying hls.js exclusion...');
    const distPath2 = join(projectRoot, 'dist');
    const assetsPath2 = join(distPath2, 'assets');
    
    // Cross-platform file finding
    const findJsFiles = (dir, fileList = []) => {
      if (!existsSync(dir)) return fileList;
      const files = readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = join(dir, file.name);
        if (file.isDirectory()) {
          findJsFiles(filePath, fileList);
        } else if (file.name.endsWith('.js')) {
          fileList.push(filePath);
        }
      }
      return fileList;
    };
    
    const jsFiles = existsSync(assetsPath2) ? findJsFiles(assetsPath2) : [];
    let hlsFound = false;
    for (const filePath of jsFiles) {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        // Check for hls.js imports or usage
        if (content.includes('node_modules/hls.js') || 
            content.includes('hls.js/dist') ||
            (content.includes('Hls') && content.includes('hls'))) {
          hlsFound = true;
          break;
        }
      }
    }

    results.hlsExcluded.passed = !hlsFound;
    results.hlsExcluded.message = hlsFound 
      ? 'hls.js still found in bundle (exclusion failed)' 
      : 'hls.js successfully excluded from bundle';
    
    if (hlsFound) {
      error('hls.js still found in bundle');
      return false;
    } else {
      success('hls.js successfully excluded');
    }

    // 4. Check vite config
    info('4. Verifying vite.config.ts changes...');
    const viteConfigPath = join(projectRoot, 'vite.config.ts');
    if (existsSync(viteConfigPath)) {
      const viteConfig = readFileSync(viteConfigPath, 'utf8');
      const hasHlsExclusion = viteConfig.includes('hls.js') && 
                            (viteConfig.includes('exclude') || viteConfig.includes('optimizeDeps'));
      
      if (hasHlsExclusion) {
        success('vite.config.ts includes hls.js exclusion');
      } else {
        warning('vite.config.ts may not have hls.js exclusion configured');
      }
    }

    success('Exclusion test complete');
    return true;

  } catch (err) {
    error(`Exclusion test failed: ${err.message}`);
    return false;
  }
}

/**
 * Phase 3: Chunk Splitting Verification
 * Verifies that vendor chunks are split correctly
 */
async function verifyChunkSplitting() {
  log('\n📦 Phase 3: Chunk Splitting Verification', 'blue');
  log('='.repeat(50), 'blue');

  try {
    // 1. Verify build
    info('1. Testing build with chunk splitting...');
    execSync('npm run build', { 
      cwd: projectRoot, 
      stdio: 'inherit',
      env: { ...process.env, ANALYZE: 'false' }
    });
    results.build.passed = true;
    success('Build test passed');

    // 2. Analyze chunk structure
    info('2. Analyzing chunk structure...');
    const distPath = join(projectRoot, 'dist');
    const assetsPath = join(distPath, 'assets');
    
    if (existsSync(assetsPath)) {
      // Cross-platform file finding
      const findJsFiles = (dir, fileList = []) => {
        const files = readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const filePath = join(dir, file.name);
          if (file.isDirectory()) {
            findJsFiles(filePath, fileList);
          } else if (file.name.endsWith('.js')) {
            fileList.push(filePath);
          }
        }
        return fileList;
      };

      const allFiles = findJsFiles(assetsPath);
      const chunks = [];
      for (const filePath of allFiles) {
        if (existsSync(filePath)) {
          const stats = statSync(filePath);
          const sizeMB = stats.size / 1024 / 1024;
          const fileName = filePath.split(/[/\\]/).pop(); // Cross-platform path split
          const relativePath = filePath.replace(distPath + (process.platform === 'win32' ? '\\' : '/'), '');
          
          if (relativePath.includes('vendor') || relativePath.includes('chunk')) {
            chunks.push({ 
              name: fileName, 
              size: stats.size, 
              sizeMB: parseFloat(sizeMB.toFixed(2))
            });
          }
        }
      }

      // Check chunk sizes
      const largeChunks = chunks.filter(c => parseFloat(c.sizeMB) > 2);
      if (largeChunks.length > 0) {
        warning(`Found ${largeChunks.length} chunks > 2MB:`);
        largeChunks.forEach(c => {
          log(`  - ${c.name}: ${c.sizeMB}MB`, 'yellow');
        });
      } else {
        success('All chunks are < 2MB');
      }

      results.chunks.chunks = chunks;
      results.chunks.passed = largeChunks.length === 0;
      results.chunks.message = `Found ${chunks.length} chunks, ${largeChunks.length} > 2MB`;

      info('Chunk breakdown:');
      chunks.forEach(c => {
        log(`  - ${c.name}: ${c.sizeMB}MB`, 'cyan');
      });
    }

    success('Chunk splitting verification complete');
    return true;

  } catch (err) {
    error(`Chunk splitting verification failed: ${err.message}`);
    return false;
  }
}

/**
 * Generate final report
 */
function generateReport() {
  log('\n📊 Verification Report', 'blue');
  log('='.repeat(50), 'blue');

  log('\nBuild Status:', 'cyan');
  if (results.build.passed) {
    success(`  ${results.build.message}`);
  } else {
    error(`  ${results.build.message}`);
  }

  log('\nBundle Size:', 'cyan');
  if (results.bundleSize.passed) {
    success(`  Before: ${(results.bundleSize.before / 1024 / 1024).toFixed(2)}MB`);
    if (results.bundleSize.after > 0) {
      success(`  After: ${(results.bundleSize.after / 1024 / 1024).toFixed(2)}MB`);
      const reduction = results.bundleSize.before - results.bundleSize.after;
      success(`  Reduction: ${(reduction / 1024 / 1024).toFixed(2)}MB`);
    }
  } else {
    error(`  ${results.bundleSize.message}`);
  }

  log('\nhls.js Exclusion:', 'cyan');
  if (results.hlsExcluded.passed) {
    success(`  ${results.hlsExcluded.message}`);
  } else {
    error(`  ${results.hlsExcluded.message}`);
  }

  log('\nChunk Structure:', 'cyan');
  if (results.chunks.passed) {
    success(`  ${results.chunks.message}`);
  } else {
    error(`  ${results.chunks.message}`);
  }

  // Overall status
  const allPassed = results.build.passed && 
                   results.bundleSize.passed && 
                   results.hlsExcluded.passed && 
                   results.chunks.passed;

  log('\n' + '='.repeat(50), 'blue');
  if (allPassed) {
    success('✅ ALL VERIFICATIONS PASSED');
    log('\n🎉 Bundle optimization is safe to proceed!', 'green');
  } else {
    error('❌ SOME VERIFICATIONS FAILED');
    log('\n⚠️  Review failures before proceeding', 'yellow');
  }
  log('='.repeat(50), 'blue');
}

// Main execution
async function main() {
  log('\n🚀 Bundle Optimization Verification', 'blue');
  log('='.repeat(50), 'blue');
  log(`Phase: ${phase}\n`, 'cyan');

  let allPassed = true;

  try {
    switch (phase) {
      case 'baseline':
        allPassed = await verifyBaseline();
        break;
      case 'exclusion-test':
        allPassed = await verifyExclusion();
        break;
      case 'chunk-splitting':
        allPassed = await verifyChunkSplitting();
        break;
      case 'full':
        allPassed = await verifyBaseline();
        if (allPassed) {
          allPassed = await verifyExclusion();
        }
        if (allPassed) {
          allPassed = await verifyChunkSplitting();
        }
        break;
      default:
        error(`Unknown phase: ${phase}`);
        process.exit(1);
    }

    generateReport();

    process.exit(allPassed ? 0 : 1);

  } catch (err) {
    error(`Verification failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

main();


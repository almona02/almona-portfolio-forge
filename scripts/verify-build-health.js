import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying Build Health\n');

try {
  // 1. Build the project
  console.log('1. Building project...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed\n');
  
  // 2. Check for errors in build output
  console.log('2. Checking build output...');
  let buildLog;
  try {
    buildLog = execSync('npm run build 2>&1', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch (error) {
    buildLog = error.stdout?.toString() || error.message || '';
  }
  
  const errors = buildLog.match(/Error:|failed|ERR_/gi);
  if (errors && errors.length > 0) {
    console.error(`❌ Build errors found: ${errors.length}`);
    console.log(buildLog.slice(-2000)); // Last 2000 chars
    process.exit(1);
  }
  console.log('✅ No build errors detected\n');
  
  // 3. Analyze chunk sizes
  console.log('3. Analyzing chunks...');
  const distPath = path.join(process.cwd(), 'dist/assets');
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ dist/assets folder not found');
    process.exit(1);
  }
  
  const files = fs.readdirSync(distPath);
  const jsFiles = files.filter(f => f.endsWith('.js') && !f.includes('.map'));
  const vendorFiles = jsFiles.filter(f => f.includes('vendor') || f.includes('engine') || f.includes('drei'));
  
  if (vendorFiles.length === 0) {
    console.log('⚠️  No vendor chunks found - all code may be in one bundle');
  } else {
    console.log(`Found ${vendorFiles.length} vendor/engine chunks:`);
    let totalSize = 0;
    vendorFiles.forEach(file => {
      const stats = fs.statSync(path.join(distPath, file));
      const sizeMB = stats.size / 1024 / 1024;
      const sizeKB = stats.size / 1024;
      totalSize += stats.size;
      console.log(`  • ${file}: ${sizeMB.toFixed(2)}MB (${sizeKB.toFixed(0)}KB)`);
    });
    console.log(`\n  Total vendor size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  }
  
  // 4. Check for circular dependency patterns in built files
  console.log('\n4. Checking for potential initialization issues...');
  const reactVendor = jsFiles.find(f => f.includes('react-vendor'));
  if (reactVendor) {
    const filePath = path.join(distPath, reactVendor);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for problematic patterns (these would cause runtime errors)
    const problematicPatterns = [
      /Cannot access ['"]\w+['"] before initialization/,
      /is not defined/,
      /ReferenceError.*before initialization/
    ];
    
    let hasIssues = false;
    problematicPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        console.warn(`⚠️  Found potential issue in ${reactVendor}:`);
        console.warn(`   Pattern: ${pattern}`);
        hasIssues = true;
      }
    });
    
    if (!hasIssues) {
      console.log('✅ No initialization issues detected in bundle');
    }
  } else {
    console.log('ℹ️  No react-vendor chunk found to analyze');
  }
  
  // 5. Check chunk file references
  console.log('\n5. Verifying chunk references...');
  const indexHtml = path.join(process.cwd(), 'dist/index.html');
  if (fs.existsSync(indexHtml)) {
    const htmlContent = fs.readFileSync(indexHtml, 'utf8');
    const scriptMatches = htmlContent.match(/assets\/[^"']+\.js/g) || [];
    const referencedChunks = [...new Set(scriptMatches.map(m => m.replace('assets/', '')))];
    
    console.log(`Found ${referencedChunks.length} referenced chunks in index.html`);
    
    // Check if all referenced chunks exist
    let missingChunks = [];
    referencedChunks.forEach(chunk => {
      const chunkPath = path.join(distPath, chunk);
      if (!fs.existsSync(chunkPath)) {
        missingChunks.push(chunk);
      }
    });
    
    if (missingChunks.length > 0) {
      console.error(`❌ Missing chunks:`);
      missingChunks.forEach(chunk => console.error(`   • ${chunk}`));
      process.exit(1);
    } else {
      console.log('✅ All referenced chunks exist');
    }
  }
  
  console.log('\n✅ Build health check PASSED');
  console.log('\n🎯 Recommendation:');
  if (vendorFiles.length <= 3) {
    console.log('• Current splitting is minimal and safe');
    console.log('• Consider adding ONE more split at a time');
    console.log('• Test each split in browser before proceeding');
  } else if (vendorFiles.length <= 6) {
    console.log('• Current splitting is moderate');
    console.log('• Monitor for any runtime issues');
    console.log('• Consider using dynamic imports for heavy features');
  } else {
    console.log('• Current splitting is extensive');
    console.log('• Watch for circular dependency issues');
    console.log('• Consider consolidating if issues arise');
  }
  
} catch (error) {
  console.error('❌ Verification failed:', error.message);
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
  process.exit(1);
}


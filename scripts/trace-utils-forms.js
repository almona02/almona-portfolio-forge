#!/usr/bin/env node
/**
 * Trace utils-forms Chunk Issue
 * 
 * Helps identify what's causing the initialization error in utils-forms chunk
 * Usage: node scripts/trace-utils-forms.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Tracing utils-forms chunk issue...\n');

// Check if bundle analysis JSON exists
const statsJsonPath = path.join(__dirname, '../dist/stats.json');
const bundleHtmlPath = path.join(__dirname, '../dist/bundle-analysis.html');

if (!fs.existsSync(statsJsonPath) && !fs.existsSync(bundleHtmlPath)) {
  console.log('❌ Bundle analysis not found. Run: npm run build:analyze');
  process.exit(1);
}

// Search for form-related imports in source code
const formLibraries = [
  'react-hook-form',
  'formik',
  '@hookform/resolvers',
  'zod',
  'yup',
];

console.log('📦 Searching for form library imports...\n');

const srcDir = path.join(__dirname, '../src');
const filesToCheck = [];

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      findFiles(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const allFiles = findFiles(srcDir);
let formImportCount = 0;

allFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    formLibraries.forEach(lib => {
      if (content.includes(lib)) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes(lib) && (line.includes('import') || line.includes('require'))) {
            console.log(`📄 ${path.relative(process.cwd(), filePath)}:${index + 1}`);
            console.log(`   ${line.trim()}\n`);
            formImportCount++;
          }
        });
      }
    });
  } catch (error) {
    // Skip files that can't be read
  }
});

console.log(`\n📊 Found ${formImportCount} form library imports\n`);

// Check vite config for utils-forms chunk
const viteConfigPath = path.join(__dirname, '../vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  
  if (viteConfig.includes('utils-forms') || viteConfig.includes('react-hook-form')) {
    console.log('✅ Found utils-forms configuration in vite.config.ts\n');
    
    // Extract the manualChunks configuration
    const chunksMatch = viteConfig.match(/manualChunks[^}]+react-hook-form[^}]+/s);
    if (chunksMatch) {
      console.log('📋 Manual chunks config for forms:');
      console.log(chunksMatch[0].substring(0, 200) + '...\n');
    }
  }
}

// Check for circular dependencies
console.log('🔗 Checking for potential circular dependencies...\n');

const formFiles = allFiles.filter(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    return formLibraries.some(lib => content.includes(lib));
  } catch {
    return false;
  }
});

console.log(`Found ${formFiles.length} files using form libraries:\n`);
formFiles.slice(0, 10).forEach(file => {
  console.log(`  - ${path.relative(process.cwd(), file)}`);
});

if (formFiles.length > 10) {
  console.log(`  ... and ${formFiles.length - 10} more files\n`);
}

// Recommendations
console.log('\n💡 Recommendations:\n');
console.log('1. Check bundle-analysis.html in browser');
console.log('2. Search for "utils-forms" in the visualization');
console.log('3. Look for circular dependencies (red edges)');
console.log('4. Check if react-hook-form and formik are both included');
console.log('5. Consider splitting form libraries into separate chunks\n');

console.log('🔍 To debug the exact line 1644:');
console.log('1. Open dist/bundle-analysis.html');
console.log('2. Find utils-forms chunk');
console.log('3. Click to expand and see all modules');
console.log('4. Look for modules with circular dependencies\n');


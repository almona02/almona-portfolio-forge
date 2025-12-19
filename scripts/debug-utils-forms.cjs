#!/usr/bin/env node
/**
 * Debug utils-forms Chunk Issue
 * 
 * Helps identify what's causing the initialization error at utils-forms-CS_oc9He.js:1:1644
 * 
 * Usage: 
 *   1. Run: npm run build:analyze
 *   2. Run: node scripts/debug-utils-forms.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging utils-forms chunk issue...\n');
console.log('Looking for: utils-forms-CS_oc9He.js:1:1644\n');

// Check dist directory for the actual chunk file
const distDir = path.join(__dirname, '../dist/assets');
let utilsFormsChunk = null;

if (fs.existsSync(distDir)) {
  const files = fs.readdirSync(distDir);
  utilsFormsChunk = files.find(f => f.includes('utils-forms') && f.endsWith('.js'));
  
  if (utilsFormsChunk) {
    console.log(`✅ Found chunk: ${utilsFormsChunk}\n`);
    const chunkPath = path.join(distDir, utilsFormsChunk);
    const stats = fs.statSync(chunkPath);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB\n`);
    
    // Read first 2000 characters to see the structure
    const content = fs.readFileSync(chunkPath, 'utf8');
    const lines = content.split('\n');
    
    console.log(`   Total lines: ${lines.length}\n`);
    console.log('📄 First 20 lines:\n');
    lines.slice(0, 20).forEach((line, i) => {
      console.log(`   ${i + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
    });
    
    // Look for line 1644 (or around that area)
    if (lines.length >= 1644) {
      console.log('\n📄 Around line 1644:\n');
      const start = Math.max(0, 1644 - 5);
      const end = Math.min(lines.length, 1644 + 5);
      lines.slice(start, end).forEach((line, i) => {
        const lineNum = start + i + 1;
        const marker = lineNum === 1644 ? ' 👈 ERROR HERE' : '';
        console.log(`   ${lineNum}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}${marker}`);
      });
    }
    
    // Look for common initialization issues
    console.log('\n🔍 Searching for potential issues...\n');
    
    // Check for underscore usage
    const underscoreMatches = content.match(/_/g);
    if (underscoreMatches) {
      console.log(`   Found ${underscoreMatches.length} underscore characters\n`);
    }
    
    // Check for circular dependency patterns
    const circularPatterns = [
      /Cannot access.*before initialization/,
      /ReferenceError/,
      /undefined.*before/,
    ];
    
    circularPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        console.log(`   ⚠️  Found pattern: ${pattern}\n`);
      }
    });
    
    // Check for form library imports
    const formLibs = ['react-hook-form', 'formik', '@hookform', 'zod'];
    formLibs.forEach(lib => {
      const matches = content.match(new RegExp(lib, 'g'));
      if (matches) {
        console.log(`   📦 Found ${matches.length} references to: ${lib}\n`);
      }
    });
  } else {
    console.log('❌ utils-forms chunk not found in dist/assets/\n');
    console.log('Available chunks:\n');
    files.filter(f => f.endsWith('.js')).slice(0, 10).forEach(f => {
      console.log(`   - ${f}`);
    });
  }
}

// Check bundle analysis JSON if available
const statsJsonPath = path.join(__dirname, '../dist/stats.json');
if (fs.existsSync(statsJsonPath)) {
  console.log('\n📊 Analyzing stats.json...\n');
  try {
    const stats = JSON.parse(fs.readFileSync(statsJsonPath, 'utf8'));
    
    // Find utils-forms in the tree
    function findChunk(node, name) {
      if (node.name && node.name.includes(name)) {
        return node;
      }
      if (node.children) {
        for (const child of node.children) {
          const found = findChunk(child, name);
          if (found) return found;
        }
      }
      return null;
    }
    
    const utilsForms = findChunk(stats, 'utils-forms');
    if (utilsForms) {
      console.log('✅ Found utils-forms in bundle analysis:\n');
      console.log(`   Name: ${utilsForms.name}`);
      console.log(`   Size: ${(utilsForms.size / 1024).toFixed(2)} KB`);
      if (utilsForms.children) {
        console.log(`   Modules: ${utilsForms.children.length}\n`);
        console.log('   Top modules:\n');
        utilsForms.children.slice(0, 10).forEach(child => {
          console.log(`     - ${child.name} (${(child.size / 1024).toFixed(2)} KB)`);
        });
      }
    } else {
      console.log('❌ utils-forms not found in stats.json\n');
      console.log('Available chunks:\n');
      function listChunks(node, depth = 0) {
        if (node.name && node.name.includes('vendor') || node.name.includes('utils')) {
          console.log(`${'  '.repeat(depth)}- ${node.name} (${(node.size / 1024).toFixed(2)} KB)`);
        }
        if (node.children && depth < 2) {
          node.children.forEach(child => listChunks(child, depth + 1));
        }
      }
      listChunks(stats);
    }
  } catch (error) {
    console.log(`❌ Error reading stats.json: ${error.message}\n`);
  }
}

// Check source files for form imports
console.log('\n📦 Checking source files for form library usage...\n');

const srcDir = path.join(__dirname, '../src');
const formLibraries = ['react-hook-form', 'formik', '@hookform/resolvers'];

function findFormImports(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      findFormImports(filePath, results);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        formLibraries.forEach(lib => {
          if (content.includes(`from '${lib}'`) || content.includes(`from "${lib}"`)) {
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (line.includes(lib)) {
                results.push({
                  file: path.relative(process.cwd(), filePath),
                  line: idx + 1,
                  content: line.trim()
                });
              }
            });
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }
  });
  
  return results;
}

const formImports = findFormImports(srcDir);
console.log(`Found ${formImports.length} form library imports:\n`);
formImports.slice(0, 20).forEach(imp => {
  console.log(`   ${imp.file}:${imp.line}`);
  console.log(`     ${imp.content.substring(0, 80)}${imp.content.length > 80 ? '...' : ''}\n`);
});

if (formImports.length > 20) {
  console.log(`   ... and ${formImports.length - 20} more\n`);
}

// Recommendations
console.log('\n💡 Next Steps:\n');
console.log('1. Open dist/bundle-analysis.html in browser');
console.log('2. Search for "utils-forms" or "react-hook-form"');
console.log('3. Click on the chunk to see all modules');
console.log('4. Look for circular dependencies (red edges in graph)');
console.log('5. Check if both react-hook-form and formik are included');
console.log('6. Look for underscore (_) variable initialization issues\n');

console.log('🔧 To fix the initialization error:');
console.log('1. Check if there\'s a circular dependency between form files');
console.log('2. Look for variables named "_" that might conflict');
console.log('3. Check import order in form-related files');
console.log('4. Consider splitting react-hook-form and formik into separate chunks\n');


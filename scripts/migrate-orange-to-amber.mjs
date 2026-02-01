#!/usr/bin/env node
/**
 * Color Migration Script: Orange → Amber
 * 
 * Systematically replaces all orange-* Tailwind colors with amber-* equivalents
 * to complete the Dark Gold Prestige theme migration.
 * 
 * Usage: node scripts/migrate-orange-to-amber.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'src');

// Color mappings: orange-* → amber-*
const colorMappings = [
  { from: 'orange-50', to: 'amber-50' },
  { from: 'orange-100', to: 'amber-100' },
  { from: 'orange-200', to: 'amber-200' },
  { from: 'orange-300', to: 'amber-300' },
  { from: 'orange-400', to: 'amber-400' },
  { from: 'orange-500', to: 'amber-500' },
  { from: 'orange-600', to: 'amber-600' },
  { from: 'orange-700', to: 'amber-700' },
  { from: 'orange-800', to: 'amber-800' },
  { from: 'orange-900', to: 'amber-900' },
  { from: 'orange-950', to: 'amber-950' },
];

// Gradient patterns
const gradientMappings = [
  { from: /from-orange-(\d+)/g, to: (match, num) => `from-amber-${num}` },
  { from: /to-orange-(\d+)/g, to: (match, num) => `to-amber-${num}` },
  { from: /via-orange-(\d+)/g, to: (match, num) => `via-amber-${num}` },
];

// File extensions to process
const extensions = ['.tsx', '.ts', '.jsx', '.js', '.css'];

let filesProcessed = 0;
let replacementsMade = 0;
const filesChanged = [];

function shouldProcessFile(filePath) {
  const ext = extname(filePath);
  if (!extensions.includes(ext)) return false;
  
  // Skip node_modules, dist, build, etc.
  if (filePath.includes('node_modules') || 
      filePath.includes('dist') || 
      filePath.includes('build') ||
      filePath.includes('.next')) {
    return false;
  }
  
  return true;
}

function processFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileReplacements = 0;
    
    // Replace solid colors
    for (const mapping of colorMappings) {
      const regex = new RegExp(mapping.from.replace('-', '\\-'), 'g');
      const matches = (newContent.match(regex) || []).length;
      if (matches > 0) {
        newContent = newContent.replace(regex, mapping.to);
        fileReplacements += matches;
      }
    }
    
    // Replace gradients
    for (const mapping of gradientMappings) {
      const matches = (newContent.match(mapping.from) || []).length;
      if (matches > 0) {
        newContent = newContent.replace(mapping.from, mapping.to);
        fileReplacements += matches;
      }
    }
    
    if (fileReplacements > 0) {
      writeFileSync(filePath, newContent, 'utf8');
      filesProcessed++;
      replacementsMade += fileReplacements;
      filesChanged.push({ file: filePath, count: fileReplacements });
      console.log(`✓ ${filePath}: ${fileReplacements} replacements`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    
    try {
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDirectory(fullPath);
      } else if (stat.isFile() && shouldProcessFile(fullPath)) {
        processFile(fullPath);
      }
    } catch (error) {
      // Skip files we can't read
    }
  }
}

console.log('🔄 Starting Orange → Amber color migration...\n');
console.log(`📁 Processing files in: ${srcDir}\n`);

walkDirectory(srcDir);

console.log('\n' + '='.repeat(60));
console.log('✅ Migration Complete!');
console.log('='.repeat(60));
console.log(`📊 Files processed: ${filesProcessed}`);
console.log(`🔄 Total replacements: ${replacementsMade}`);
console.log(`📝 Files changed: ${filesChanged.length}`);

if (filesChanged.length > 0) {
  console.log('\n📋 Changed files:');
  filesChanged.slice(0, 20).forEach(({ file, count }) => {
    console.log(`   ${file} (${count} replacements)`);
  });
  if (filesChanged.length > 20) {
    console.log(`   ... and ${filesChanged.length - 20} more files`);
  }
}

console.log('\n✨ Done! Review changes and test your application.');


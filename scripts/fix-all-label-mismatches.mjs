#!/usr/bin/env node
/**
 * Comprehensive Label Component Fix Script
 * 
 * Fixes all Label component mismatches where files import Label
 * as a component but use HTML <label> tags.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'src');

let filesFixed = 0;
const fixedFiles = [];

function shouldProcessFile(filePath) {
  const ext = extname(filePath);
  if (!['.tsx', '.jsx'].includes(ext)) return false;
  if (filePath.includes('node_modules') || filePath.includes('dist')) return false;
  return true;
}

function processFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    
    // Check if file imports Label component (any import path)
    const importsLabel = /import.*Label.*from.*['"]@\/(shared\/ui\/ui|components\/ui)\/label['"]/.test(content);
    
    if (!importsLabel) return;
    
    let modified = false;
    const originalContent = content;
    
    // Fix opening tags: <label -> <Label (but only if it's not already Label)
    // Match <label with attributes or just <label>
    const labelOpenPatterns = [
      /<label\s+htmlFor=/g,
      /<label\s+className=/g,
      /<label\s+for=/g,
      /<label\s+id=/g,
      /<label>/g,
      /<label\s+>/g,
    ];
    
    for (const pattern of labelOpenPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match) => {
          return match.replace('<label', '<Label');
        });
        modified = true;
      }
    }
    
    // Fix closing tags: </label> -> </Label> (but only if we have Label opening tags)
    if (content.includes('<Label') && content.includes('</label>')) {
      content = content.replace(/<\/label>/g, '</Label>');
      modified = true;
    }
    
    if (modified && content !== originalContent) {
      writeFileSync(filePath, content, 'utf8');
      filesFixed++;
      fixedFiles.push(filePath);
      console.log(`✓ Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`✗ Error: ${filePath}`, error.message);
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
      // Skip
    }
  }
}

console.log('🔧 Fixing all Label component mismatches...\n');
walkDirectory(srcDir);
console.log(`\n✅ Fixed ${filesFixed} files`);
if (fixedFiles.length > 0) {
  console.log('\nFixed files:');
  fixedFiles.forEach(f => console.log(`  - ${f}`));
}


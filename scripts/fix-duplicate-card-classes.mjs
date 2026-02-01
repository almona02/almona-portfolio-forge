#!/usr/bin/env node
/**
 * Fix Duplicate Card Classes
 * 
 * Removes duplicate prestige card classes that may have been added
 * by multiple pattern matches.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'src');

let filesFixed = 0;

function shouldProcessFile(filePath) {
  const ext = extname(filePath);
  if (!['.tsx', '.jsx'].includes(ext)) return false;
  if (filePath.includes('node_modules') || filePath.includes('dist')) return false;
  return true;
}

function processFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix duplicate card classes
    content = content.replace(/card-dark\s+card-dark/g, 'card-dark');
    content = content.replace(/card-premium\s+card-premium/g, 'card-premium');
    content = content.replace(/card-glass-dark\s+card-glass-dark/g, 'card-glass-dark');
    
    // Fix triple duplicates
    content = content.replace(/card-dark\s+card-dark\s+card-dark/g, 'card-dark');
    content = content.replace(/card-premium\s+card-premium\s+card-premium/g, 'card-premium');
    content = content.replace(/card-glass-dark\s+card-glass-dark\s+card-glass-dark/g, 'card-glass-dark');
    
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf8');
      filesFixed++;
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

console.log('🔧 Fixing duplicate card classes...\n');
walkDirectory(srcDir);
console.log(`\n✅ Fixed ${filesFixed} files`);


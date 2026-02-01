#!/usr/bin/env node
/**
 * Fix Label Component Usage
 * 
 * Fixes files that import Label as a component but were incorrectly
 * changed to HTML <label> tags by the typography migration script.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
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
    
    // Check if file imports Label component (any path)
    const importsLabel = /import.*Label.*from.*['"]@\/(shared\/ui\/ui|components\/ui)\/label['"]/.test(content);
    
    if (!importsLabel) return;
    
    let modified = false;
    
    // Fix opening tags: <label className="typography-label" -> <Label className="typography-label"
    const labelOpenRegex = /<label\s+(htmlFor|className|for)=/g;
    if (labelOpenRegex.test(content)) {
      content = content.replace(labelOpenRegex, '<Label $1=');
      modified = true;
    }
    
    // Fix closing tags: </label> -> </Label> (but only if we have Label opening tags)
    if (content.includes('<Label ') && content.includes('</label>')) {
      content = content.replace(/<\/label>/g, '</Label>');
      modified = true;
    }
    
    if (modified) {
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

console.log('🔧 Fixing Label component usage...\n');
walkDirectory(srcDir);
console.log(`\n✅ Fixed ${filesFixed} files`);


#!/usr/bin/env node
/**
 * Typography Standardization Script
 * 
 * Systematically adds typography classes to H1-H4 tags and labels
 * to complete the Dark Gold Prestige theme typography migration.
 * 
 * Usage: node scripts/migrate-typography.mjs
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'src');

// File extensions to process
const extensions = ['.tsx', '.jsx'];

// Classes that typography classes replace (to be removed)
const conflictingClasses = {
  h1: ['text-3xl', 'text-4xl', 'text-5xl', 'font-bold', 'font-extrabold', 'uppercase', 'tracking-wide', 'tracking-wider'],
  h2: ['text-2xl', 'text-3xl', 'font-bold', 'font-extrabold', 'uppercase', 'tracking-wide', 'tracking-wider'],
  h3: ['text-xl', 'text-2xl', 'font-semibold', 'font-bold', 'uppercase', 'tracking-wide'],
  h4: ['text-lg', 'text-xl', 'font-semibold', 'font-bold', 'uppercase', 'tracking-wide'],
};

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

function addTypographyClass(tag, className) {
  const typographyClass = `typography-${tag}`;
  
  // If typography class already exists, don't add it again
  if (className && className.includes(typographyClass)) {
    return className;
  }
  
  // Add typography class
  const newClasses = className 
    ? `${typographyClass} ${className}`.trim()
    : typographyClass;
  
  return newClasses;
}

function removeConflictingClasses(tag, className) {
  if (!className) return className;
  
  const classes = className.split(/\s+/);
  const conflicting = conflictingClasses[tag] || [];
  
  // Remove conflicting classes
  const filtered = classes.filter(cls => {
    // Don't remove if it's a color, spacing, or other utility class
    if (cls.startsWith('text-') && !cls.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)/)) {
      return true; // Keep color classes like text-amber-400
    }
    if (cls.startsWith('mb-') || cls.startsWith('mt-') || cls.startsWith('mx-') || 
        cls.startsWith('p-') || cls.startsWith('px-') || cls.startsWith('py-')) {
      return true; // Keep spacing classes
    }
    // Remove conflicting typography-related classes
    return !conflicting.some(conflict => cls === conflict || cls.startsWith(conflict + '-'));
  });
  
  return filtered.join(' ');
}

function processFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileReplacements = 0;
    
    // Process H1 tags
    newContent = newContent.replace(
      /<h1\s+([^>]*?)>/gi,
      (match, attrs) => {
        // Extract className
        const classNameMatch = attrs.match(/className=["']([^"']*?)["']/);
        let className = classNameMatch ? classNameMatch[1] : '';
        
        // Add typography class
        className = addTypographyClass('h1', className);
        
        // Remove conflicting classes
        className = removeConflictingClasses('h1', className);
        
        // Reconstruct attributes
        let newAttrs = attrs;
        if (classNameMatch) {
          newAttrs = attrs.replace(/className=["'][^"']*?["']/, `className="${className}"`);
        } else {
          newAttrs = `${attrs} className="${className}"`.trim();
        }
        
        fileReplacements++;
        return `<h1 ${newAttrs}>`;
      }
    );
    
    // Process H2 tags
    newContent = newContent.replace(
      /<h2\s+([^>]*?)>/gi,
      (match, attrs) => {
        const classNameMatch = attrs.match(/className=["']([^"']*?)["']/);
        let className = classNameMatch ? classNameMatch[1] : '';
        className = addTypographyClass('h2', className);
        className = removeConflictingClasses('h2', className);
        
        let newAttrs = attrs;
        if (classNameMatch) {
          newAttrs = attrs.replace(/className=["'][^"']*?["']/, `className="${className}"`);
        } else {
          newAttrs = `${attrs} className="${className}"`.trim();
        }
        
        fileReplacements++;
        return `<h2 ${newAttrs}>`;
      }
    );
    
    // Process H3 tags
    newContent = newContent.replace(
      /<h3\s+([^>]*?)>/gi,
      (match, attrs) => {
        const classNameMatch = attrs.match(/className=["']([^"']*?)["']/);
        let className = classNameMatch ? classNameMatch[1] : '';
        className = addTypographyClass('h3', className);
        className = removeConflictingClasses('h3', className);
        
        let newAttrs = attrs;
        if (classNameMatch) {
          newAttrs = attrs.replace(/className=["'][^"']*?["']/, `className="${className}"`);
        } else {
          newAttrs = `${attrs} className="${className}"`.trim();
        }
        
        fileReplacements++;
        return `<h3 ${newAttrs}>`;
      }
    );
    
    // Process H4 tags
    newContent = newContent.replace(
      /<h4\s+([^>]*?)>/gi,
      (match, attrs) => {
        const classNameMatch = attrs.match(/className=["']([^"']*?)["']/);
        let className = classNameMatch ? classNameMatch[1] : '';
        className = addTypographyClass('h4', className);
        className = removeConflictingClasses('h4', className);
        
        let newAttrs = attrs;
        if (classNameMatch) {
          newAttrs = attrs.replace(/className=["'][^"']*?["']/, `className="${className}"`);
        } else {
          newAttrs = `${attrs} className="${className}"`.trim();
        }
        
        fileReplacements++;
        return `<h4 ${newAttrs}>`;
      }
    );
    
    // Process labels (only if they don't already have typography-label)
    newContent = newContent.replace(
      /<label\s+([^>]*?)>/gi,
      (match, attrs) => {
        const classNameMatch = attrs.match(/className=["']([^"']*?)["']/);
        let className = classNameMatch ? classNameMatch[1] : '';
        
        // Skip if already has typography-label
        if (className && className.includes('typography-label')) {
          return match;
        }
        
        // Add typography-label for form labels
        className = addTypographyClass('label', className);
        
        let newAttrs = attrs;
        if (classNameMatch) {
          newAttrs = attrs.replace(/className=["'][^"']*?["']/, `className="${className}"`);
        } else {
          newAttrs = `${attrs} className="${className}"`.trim();
        }
        
        fileReplacements++;
        return `<label ${newAttrs}>`;
      }
    );
    
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

console.log('🔄 Starting Typography Standardization...\n');
console.log(`📁 Processing files in: ${srcDir}\n`);

walkDirectory(srcDir);

console.log('\n' + '='.repeat(60));
console.log('✅ Typography Standardization Complete!');
console.log('='.repeat(60));
console.log(`📊 Files processed: ${filesProcessed}`);
console.log(`🔄 Total replacements: ${replacementsMade}`);
console.log(`📝 Files changed: ${filesChanged.length}`);

if (filesChanged.length > 0) {
  console.log('\n📋 Changed files (first 20):');
  filesChanged.slice(0, 20).forEach(({ file, count }) => {
    console.log(`   ${file} (${count} replacements)`);
  });
  if (filesChanged.length > 20) {
    console.log(`   ... and ${filesChanged.length - 20} more files`);
  }
}

console.log('\n✨ Done! Review changes and test your application.');


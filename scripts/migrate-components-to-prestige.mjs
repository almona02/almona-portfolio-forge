#!/usr/bin/env node
/**
 * Component Standardization Script
 * 
 * Migrates buttons, cards, and status indicators to use prestige CSS classes
 * instead of inline Tailwind classes.
 * 
 * Usage: node scripts/migrate-components-to-prestige.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'src');

const extensions = ['.tsx', '.jsx'];
let filesProcessed = 0;
let replacementsMade = 0;
const filesChanged = [];

function shouldProcessFile(filePath) {
  const ext = extname(filePath);
  if (!extensions.includes(ext)) return false;
  if (filePath.includes('node_modules') || filePath.includes('dist')) return false;
  if (filePath.includes('prestige-design-system.css')) return false; // Skip CSS file itself
  return true;
}

function processFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let fileReplacements = 0;
    const originalContent = content;

    // ============================================================================
    // BUTTON MIGRATIONS
    // ============================================================================

    // Pattern 1: Primary buttons (amber/gold colors)
    // Match: className="... bg-amber-500 ..." or "bg-amber-600" or gradient patterns
    const primaryButtonPatterns = [
      // Solid amber backgrounds
      {
        pattern: /className=["']([^"']*?)bg-amber-500([^"']*?)["']/g,
        replacement: (match, before = '', after = '') => {
          // Remove conflicting classes
          const allClasses = (before + ' ' + after).trim().split(/\s+/).filter(c => 
            c && !c.match(/^(bg-amber-|hover:bg-amber-|text-slate-900|text-\[#0a0a0a\]|font-semibold|font-bold)$/)
          );
          const newClasses = [...allClasses, 'btn-primary'].filter(Boolean).join(' ');
          return `className="${newClasses}"`;
        }
      },
      {
        pattern: /className=["']([^"']*?)bg-amber-600([^"']*?)["']/g,
        replacement: (match, before = '', after = '') => {
          const allClasses = (before + ' ' + after).trim().split(/\s+/).filter(c => 
            c && !c.match(/^(bg-amber-|hover:bg-amber-|text-slate-900|text-\[#0a0a0a\]|font-semibold|font-bold)$/)
          );
          const newClasses = [...allClasses, 'btn-primary'].filter(Boolean).join(' ');
          return `className="${newClasses}"`;
        }
      },
      // Gradient buttons
      {
        pattern: /className=["']([^"']*?)from-amber-500.*?to-amber-[46]00([^"']*?)["']/g,
        replacement: (match, before = '', after = '') => {
          const allClasses = (before + ' ' + after).trim().split(/\s+/).filter(c => 
            c && !c.match(/^(from-amber-|to-amber-|bg-gradient-|text-slate-900|font-semibold|font-bold)$/)
          );
          const newClasses = [...allClasses, 'btn-primary-gradient'].filter(Boolean).join(' ');
          return `className="${newClasses}"`;
        }
      },
      {
        pattern: /className=["']([^"']*?)bg-gradient-to-r.*?from-amber-500.*?to-amber-[46]00([^"']*?)["']/g,
        replacement: (match, before = '', after = '') => {
          const allClasses = (before + ' ' + after).trim().split(/\s+/).filter(c => 
            c && !c.match(/^(from-amber-|to-amber-|bg-gradient-|text-slate-900|font-semibold|font-bold)$/)
          );
          const newClasses = [...allClasses, 'btn-primary-gradient'].filter(Boolean).join(' ');
          return `className="${newClasses}"`;
        }
      }
    ];

    // Pattern 2: Secondary buttons (slate/dark colors)
    const secondaryButtonPatterns = [
      {
        pattern: /className=["']([^"']*?)bg-slate-700([^"']*?)["']/g,
        replacement: (match, before = '', after = '') => {
          const allClasses = (before + ' ' + after).trim().split(/\s+/).filter(c => 
            c && !c.match(/^(bg-slate-|hover:bg-slate-|border-slate-|text-slate-100|font-semibold)$/)
          );
          const newClasses = [...allClasses, 'btn-secondary'].filter(Boolean).join(' ');
          return `className="${newClasses}"`;
        }
      },
      {
        pattern: /className=["']([^"']*?)bg-\[#1a1a1a\]([^"']*?)["']/g,
        replacement: (match, before = '', after = '') => {
          // Check if it has amber border/text (secondary-dark) or just dark (secondary)
          if (match.includes('border-amber') || match.includes('text-amber')) {
            const allClasses = (before + ' ' + after).trim().split(/\s+/).filter(c => 
              c && !c.match(/^(bg-\[#1a1a1a\]|border-amber-|text-amber-|backdrop-blur)$/)
            );
            const newClasses = [...allClasses, 'btn-secondary-dark'].filter(Boolean).join(' ');
            return `className="${newClasses}"`;
          }
          const allClasses = (before + ' ' + after).trim().split(/\s+/).filter(c => 
            c && !c.match(/^(bg-\[#1a1a1a\]|text-slate-|font-semibold)$/)
          );
          const newClasses = [...allClasses, 'btn-secondary'].filter(Boolean).join(' ');
          return `className="${newClasses}"`;
        }
      }
    ];

    // Apply button migrations
    for (const { pattern, replacement } of [...primaryButtonPatterns, ...secondaryButtonPatterns]) {
      content = content.replace(pattern, (match) => {
        const result = replacement(match);
        if (result !== match) {
          fileReplacements++;
          return result;
        }
        return match;
      });
    }

    // ============================================================================
    // CARD MIGRATIONS - IMPROVED DETECTION
    // ============================================================================

    // Helper function to check if a className belongs to a Card component
    // We look for context clues: Card component usage, card-like styling, etc.
    function isCardContext(content, matchIndex) {
      // Look backwards for <Card or CardContent, CardHeader, etc.
      const beforeMatch = content.substring(Math.max(0, matchIndex - 200), matchIndex);
      const afterMatch = content.substring(matchIndex, Math.min(content.length, matchIndex + 200));
      
      // Check for Card component usage
      if (/<Card\s|CardContent|CardHeader|CardTitle|CardDescription/.test(beforeMatch + afterMatch)) {
        return true;
      }
      
      // Check for card-like styling patterns
      const cardIndicators = [
        /rounded.*border|shadow.*border|p-.*border|bg-.*border|backdrop-blur.*border/,
        /bg-slate-|bg-gray-|bg-\[#/,
        /border-amber-|border-slate-|border-gray-/
      ];
      
      return cardIndicators.some(pattern => pattern.test(beforeMatch + afterMatch));
    }

    // Helper function to check if prestige card class already exists
    function hasPrestigeCardClass(classes) {
      return classes.some(c => c && (c.includes('card-premium') || c.includes('card-glass-dark') || c.includes('card-dark')));
    }

    // Helper function to clean up conflicting classes
    function removeConflictingCardClasses(classes, cardType) {
      const conflicts = {
        'premium': [
          'border-2', 'border-amber-500', 'border-amber-600', 'border-amber-400',
          'bg-\[#0f0f0f\]', 'bg-\[#1a1a1a\]', 'bg-slate-800', 'bg-slate-900',
          'bg-gray-900', 'backdrop-blur'
        ],
        'glass-dark': [
          'bg-\[#0f0f0f\]', 'bg-\[#1a1a1a\]', 'backdrop-blur', 'border-amber-'
        ],
        'dark': [
          'bg-\[#1a1a1a\]', 'bg-\[#0f0f0f\]', 'border-2', 'border-amber-', 'backdrop-blur'
        ]
      };
      
      const toRemove = conflicts[cardType] || [];
      return classes.filter(c => 
        c && !toRemove.some(conflict => c.includes(conflict))
      );
    }

    // Pattern 1: Premium cards - Multiple variations
    const premiumCardPatterns = [
      // Pattern 1a: border-2 with amber-600
      {
        pattern: /className=["']([^"']*?)(border-2.*?border-amber-600|border-amber-600.*?border-2)([^"']*?)["']/g,
        cardType: 'premium'
      },
      // Pattern 1b: border-2 with amber-500 (common in prestige components)
      {
        pattern: /className=["']([^"']*?)(border-2.*?border-amber-500|border-amber-500.*?border-2)([^"']*?)["']/g,
        cardType: 'premium'
      },
      // Pattern 1c: border with amber-500/60 (with opacity)
      {
        pattern: /className=["']([^"']*?)(border.*?border-amber-500\/60|border-amber-500\/60.*?border)([^"']*?)["']/g,
        cardType: 'premium'
      },
      // Pattern 1d: bg-slate-900 with border-amber (prestige pattern)
      {
        pattern: /className=["']([^"']*?)(bg-slate-900.*?border-amber-|border-amber-.*?bg-slate-900)([^"']*?)["']/g,
        cardType: 'premium'
      },
      // Pattern 1e: bg-slate-800 with border-amber
      {
        pattern: /className=["']([^"']*?)(bg-slate-800.*?border-amber-|border-amber-.*?bg-slate-800)([^"']*?)["']/g,
        cardType: 'premium'
      }
    ];

    for (const { pattern, cardType } of premiumCardPatterns) {
      content = content.replace(pattern, (match, before = '', middle = '', after = '') => {
        const matchIndex = content.indexOf(match);
        if (isCardContext(content, matchIndex)) {
          const allClasses = (before + ' ' + middle + ' ' + after).trim().split(/\s+/).filter(Boolean);
          // Skip if prestige card class already exists
          if (hasPrestigeCardClass(allClasses)) {
            return match;
          }
          const cleanedClasses = removeConflictingCardClasses(allClasses, cardType);
          const newClasses = [...cleanedClasses, 'card-premium'].filter(Boolean).join(' ');
          fileReplacements++;
          return `className="${newClasses}"`;
        }
        return match;
      });
    }

    // Pattern 2: Glass morphism cards - Multiple variations
    const glassCardPatterns = [
      // Pattern 2a: bg-[#0f0f0f]/90 with backdrop-blur
      {
        pattern: /className=["']([^"']*?)(bg-\[#0f0f0f\]\/90.*?backdrop-blur|backdrop-blur.*?bg-\[#0f0f0f\]\/90)([^"']*?)["']/g,
        cardType: 'glass-dark'
      },
      // Pattern 2b: bg-slate-900/60 with backdrop-blur-xl (common pattern)
      {
        pattern: /className=["']([^"']*?)(bg-slate-900\/60.*?backdrop-blur|backdrop-blur.*?bg-slate-900\/60)([^"']*?)["']/g,
        cardType: 'glass-dark'
      },
      // Pattern 2c: bg-slate-800/50 with backdrop-blur
      {
        pattern: /className=["']([^"']*?)(bg-slate-800\/50.*?backdrop-blur|backdrop-blur.*?bg-slate-800\/50)([^"']*?)["']/g,
        cardType: 'glass-dark'
      },
      // Pattern 2d: Any backdrop-blur with border-amber
      {
        pattern: /className=["']([^"']*?)(backdrop-blur.*?border-amber-|border-amber-.*?backdrop-blur)([^"']*?)["']/g,
        cardType: 'glass-dark'
      }
    ];

    for (const { pattern, cardType } of glassCardPatterns) {
      content = content.replace(pattern, (match, before = '', middle = '', after = '') => {
        const matchIndex = content.indexOf(match);
        if (isCardContext(content, matchIndex)) {
          const allClasses = (before + ' ' + middle + ' ' + after).trim().split(/\s+/).filter(Boolean);
          // Skip if prestige card class already exists
          if (hasPrestigeCardClass(allClasses)) {
            return match;
          }
          const cleanedClasses = removeConflictingCardClasses(allClasses, cardType);
          const newClasses = [...cleanedClasses, 'card-glass-dark'].filter(Boolean).join(' ');
          fileReplacements++;
          return `className="${newClasses}"`;
        }
        return match;
      });
    }

    // Pattern 3: Dark cards - Multiple variations
    const darkCardPatterns = [
      // Pattern 3a: bg-[#1a1a1a]/60 with border-amber-600/30
      {
        pattern: /className=["']([^"']*?)(bg-\[#1a1a1a\]\/60.*?border-amber-600\/30|border-amber-600\/30.*?bg-\[#1a1a1a\]\/60)([^"']*?)["']/g,
        cardType: 'dark'
      },
      // Pattern 3b: bg-[#1a1a1a] with border-amber (any opacity)
      {
        pattern: /className=["']([^"']*?)(bg-\[#1a1a1a\].*?border-amber-|border-amber-.*?bg-\[#1a1a1a\])([^"']*?)["']/g,
        cardType: 'dark'
      },
      // Pattern 3c: bg-gray-900 with border-gray-800 (dark theme)
      {
        pattern: /className=["']([^"']*?)(bg-gray-900.*?border-gray-800|border-gray-800.*?bg-gray-900)([^"']*?)["']/g,
        cardType: 'dark'
      },
      // Pattern 3d: bg-slate-800 with border-slate-700
      {
        pattern: /className=["']([^"']*?)(bg-slate-800.*?border-slate-700|border-slate-700.*?bg-slate-800)([^"']*?)["']/g,
        cardType: 'dark'
      }
    ];

    for (const { pattern, cardType } of darkCardPatterns) {
      content = content.replace(pattern, (match, before = '', middle = '', after = '') => {
        const matchIndex = content.indexOf(match);
        if (isCardContext(content, matchIndex)) {
          const allClasses = (before + ' ' + middle + ' ' + after).trim().split(/\s+/).filter(Boolean);
          // Skip if prestige card class already exists
          if (hasPrestigeCardClass(allClasses)) {
            return match;
          }
          const cleanedClasses = removeConflictingCardClasses(allClasses, cardType);
          const newClasses = [...cleanedClasses, 'card-dark'].filter(Boolean).join(' ');
          fileReplacements++;
          return `className="${newClasses}"`;
        }
        return match;
      });
    }

    // Pattern 4: Explicit Card component detection
    // Look for <Card className="..." patterns and migrate based on content
    const explicitCardPattern = /<Card\s+[^>]*?className=["']([^"']*?)["']/g;
    content = content.replace(explicitCardPattern, (match, classes = '') => {
      const allClasses = classes.trim().split(/\s+/).filter(Boolean);
      // Skip if prestige card class already exists
      if (hasPrestigeCardClass(allClasses)) {
        return match;
      }
      
      // Check if it has premium card indicators
      if (classes.includes('border-amber-') && (classes.includes('bg-slate-') || classes.includes('bg-gray-') || classes.includes('bg-['))) {
        const cleanedClasses = removeConflictingCardClasses(allClasses, 'premium');
        const newClasses = [...cleanedClasses, 'card-premium'].filter(Boolean).join(' ');
        fileReplacements++;
        return match.replace(classes, newClasses);
      }
      // Check if it has glass morphism indicators
      if (classes.includes('backdrop-blur') && (classes.includes('bg-[') || classes.includes('bg-slate-900'))) {
        const cleanedClasses = removeConflictingCardClasses(allClasses, 'glass-dark');
        const newClasses = [...cleanedClasses, 'card-glass-dark'].filter(Boolean).join(' ');
        fileReplacements++;
        return match.replace(classes, newClasses);
      }
      // Check if it has dark card indicators
      if ((classes.includes('bg-gray-900') || classes.includes('bg-slate-800')) && classes.includes('border-')) {
        const cleanedClasses = removeConflictingCardClasses(allClasses, 'dark');
        const newClasses = [...cleanedClasses, 'card-dark'].filter(Boolean).join(' ');
        fileReplacements++;
        return match.replace(classes, newClasses);
      }
      return match;
    });

    // ============================================================================
    // STATUS INDICATOR MIGRATIONS (simpler - just add classes, don't remove)
    // ============================================================================

    // Status valid (green/emerald)
    const statusValidPattern = /className=["']([^"']*?)(text-emerald-400|text-green-500|bg-emerald-400)([^"']*?)["']/g;
    content = content.replace(statusValidPattern, (match, before = '', color = '', after = '') => {
      if (!match.includes('status-valid')) {
        const allClasses = (before + ' ' + after).trim().split(/\s+/).filter(Boolean);
        const newClasses = [...allClasses, 'status-valid'].filter(Boolean).join(' ');
        fileReplacements++;
        return `className="${newClasses}"`;
      }
      return match;
    });

    // Status warning (amber)
    const statusWarningPattern = /className=["']([^"']*?)(text-amber-500|text-yellow-500)([^"']*?)["']/g;
    content = content.replace(statusWarningPattern, (match, before = '', color = '', after = '') => {
      if (!match.includes('status-warning') && (match.includes('status') || match.includes('indicator'))) {
        const allClasses = (before + ' ' + after).trim().split(/\s+/).filter(Boolean);
        const newClasses = [...allClasses, 'status-warning'].filter(Boolean).join(' ');
        fileReplacements++;
        return `className="${newClasses}"`;
      }
      return match;
    });

    // Status error (red)
    const statusErrorPattern = /className=["']([^"']*?)(text-red-500|text-red-600|bg-red-500)([^"']*?)["']/g;
    content = content.replace(statusErrorPattern, (match, before = '', color = '', after = '') => {
      if (!match.includes('status-error') && (match.includes('status') || match.includes('error'))) {
        const allClasses = (before + ' ' + after).trim().split(/\s+/).filter(Boolean);
        const newClasses = [...allClasses, 'status-error'].filter(Boolean).join(' ');
        fileReplacements++;
        return `className="${newClasses}"`;
      }
      return match;
    });

    if (fileReplacements > 0 && content !== originalContent) {
      writeFileSync(filePath, content, 'utf8');
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

console.log('🔄 Starting Component Standardization...\n');
console.log(`📁 Processing files in: ${srcDir}\n`);

walkDirectory(srcDir);

console.log('\n' + '='.repeat(60));
console.log('✅ Component Standardization Complete!');
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


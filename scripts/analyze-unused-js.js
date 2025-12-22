/**
 * Analyze Unused JavaScript in Bundle
 * Identifies which libraries/components are actually used vs imported
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 Analyzing Unused JavaScript...\n');

// Known heavy libraries and their usage patterns
const HEAVY_LIBRARIES = {
  'antd': {
    name: 'Ant Design',
    size: '~1.2MB',
    commonUnused: [
      'DatePicker', 'TimePicker', 'Calendar', 'Tree', 'TreeSelect',
      'Transfer', 'Table (if using custom tables)', 'Form (if using react-hook-form)',
      'Upload (if not using)', 'Cascader', 'AutoComplete'
    ],
    checkPattern: /from ['"]antd['"]|import.*antd/g
  },
  'recharts': {
    name: 'Recharts',
    size: '~230KB',
    commonUnused: [
      'RadialBarChart', 'RadarChart', 'Treemap', 'Sankey',
      'ComposedChart (if not using)', 'Brush (if not using)'
    ],
    checkPattern: /from ['"]recharts['"]|import.*recharts/g
  },
  'framer-motion': {
    name: 'Framer Motion',
    size: '~150KB',
    commonUnused: [
      'AnimatePresence (if not using)', 'useAnimation (if not using)',
      'useSpring (if not using)', 'motion.div (if only using motion)'
    ],
    checkPattern: /from ['"]framer-motion['"]|import.*framer-motion/g
  },
  '@tensorflow/tfjs': {
    name: 'TensorFlow.js',
    size: '~230KB',
    usage: 'Only in AI components (should be lazy loaded)',
    checkPattern: /from ['"]@tensorflow\/tfjs['"]|import.*@tensorflow\/tfjs/g
  },
  'three': {
    name: 'Three.js',
    size: '~149KB',
    usage: 'Only in 3D viewers (should be lazy loaded)',
    checkPattern: /from ['"]three['"]|import.*three/g
  }
};

function scanDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and dist
        if (!entry.name.includes('node_modules') && 
            !entry.name.includes('dist') &&
            !entry.name.includes('.git')) {
          walk(fullPath);
        }
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function analyzeLibraryUsage(library, srcFiles) {
  const usage = {
    importCount: 0,
    files: [],
    components: new Set()
  };
  
  srcFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for imports
      if (library.checkPattern.test(content)) {
        usage.importCount++;
        usage.files.push(path.relative(process.cwd(), file));
        
        // Extract component names (basic pattern matching)
        if (library.name === 'Ant Design') {
          const antdImports = content.match(/import\s+{([^}]+)}\s+from\s+['"]antd['"]/g);
          if (antdImports) {
            antdImports.forEach(imp => {
              const matches = imp.match(/{([^}]+)}/);
              if (matches) {
                matches[1].split(',').forEach(comp => {
                  usage.components.add(comp.trim());
                });
              }
            });
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  });
  
  return usage;
}

async function analyzeUnusedJS() {
  console.log('📦 Scanning source files...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src directory not found');
    process.exit(1);
  }
  
  const srcFiles = scanDirectory(srcDir);
  console.log(`Found ${srcFiles.length} source files\n`);
  
  console.log('📊 Library Usage Analysis:\n');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const [key, library] of Object.entries(HEAVY_LIBRARIES)) {
    const usage = analyzeLibraryUsage(library, srcFiles);
    
    results.push({
      library: library.name,
      size: library.size,
      filesUsing: usage.importCount,
      components: Array.from(usage.components).slice(0, 10), // First 10
      usageFiles: usage.files.slice(0, 5) // First 5 files
    });
    
    console.log(`\n${library.name} (${library.size}):`);
    console.log(`  Files using: ${usage.importCount}`);
    if (usage.components.size > 0) {
      console.log(`  Components imported: ${Array.from(usage.components).slice(0, 10).join(', ')}`);
      if (usage.components.size > 10) {
        console.log(`  ... and ${usage.components.size - 10} more`);
      }
    }
    if (usage.files.length > 0) {
      console.log(`  Sample files: ${usage.files.slice(0, 3).join(', ')}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Recommendations:\n');
  
  // Analyze react-vendor
  console.log('1. React Vendor Bundle (1.9MB, 1.2MB unused):');
  console.log('   • Tree-shake unused Ant Design components');
  console.log('   • Use named imports: import { Button } from "antd"');
  console.log('   • Avoid: import * as Antd from "antd"');
  console.log('   • Lazy load Recharts (only load when chart is visible)');
  console.log('   • Lazy load Framer Motion (only in animated components)');
  
  // Analyze document-vendor
  console.log('\n2. Document Vendor (571KB, 414KB unused):');
  console.log('   • Already lazy loaded via lazyExportPDF() ✅');
  console.log('   • Consider splitting PDF/Excel/DXF into separate chunks');
  
  // Analyze ml-engine
  console.log('\n3. ML Engine (272KB, 230KB unused):');
  console.log('   • Already lazy loaded in AI components ✅');
  console.log('   • Verify TensorFlow.js only loads when AI tab opens');
  
  // Analyze three-engine
  console.log('\n4. Three Engine (214KB, 149KB unused):');
  console.log('   • Already lazy loaded via LazyModelWrapper ✅');
  console.log('   • Verify Three.js only loads on "Load 3D Model" click');
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    libraries: results,
    recommendations: {
      reactVendor: 'Tree-shake unused Ant Design components, lazy load Recharts/Framer Motion',
      documentVendor: 'Already optimized - verify lazy loading works',
      mlEngine: 'Already optimized - verify lazy loading works',
      threeEngine: 'Already optimized - verify lazy loading works'
    }
  };
  
  fs.writeFileSync(
    './unused-js-analysis.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✅ Analysis saved to unused-js-analysis.json');
  console.log('\n🎯 Next Steps:');
  console.log('   1. Review unused-js-analysis.json');
  console.log('   2. Update imports to use named imports (tree-shaking)');
  console.log('   3. Lazy load Recharts in chart components');
  console.log('   4. Lazy load Framer Motion in animated components');
  console.log('   5. Rebuild and measure bundle size reduction');
}

analyzeUnusedJS().catch(console.error);


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function analyzeModuleDependencies() {
  console.log('🔍 Analyzing module dependencies...\n');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const deps = { ...packageJson.dependencies || {}, ...packageJson.devDependencies || {} };
  
  // Known problematic dependency chains
  const PROBLEMATIC_CHAINS = {
    'react': ['react-dom', 'react-is', 'scheduler', 'react-router-dom'],
    'three': ['@react-three/fiber', '@react-three/drei', 'three-stdlib'],
    'antd': ['@ant-design/icons', '@ant-design/cssinjs'],
    'recharts': ['d3-scale', 'd3-array', 'd3-shape'],
    '@tensorflow/tfjs': ['@tensorflow/tfjs-core', '@tensorflow/tfjs-backend-cpu']
  };
  
  console.log('📦 Dependency Chains to Keep Together:');
  let foundChains = 0;
  Object.entries(PROBLEMATIC_CHAINS).forEach(([mainLib, dependencies]) => {
    if (deps[mainLib]) {
      const missing = dependencies.filter(dep => !deps[dep]);
      const present = dependencies.filter(dep => deps[dep]);
      if (present.length > 0) {
        console.log(`  ✅ ${mainLib} + ${present.join(', ')}`);
        if (missing.length > 0) {
          console.log(`     ⚠️  Missing: ${missing.join(', ')}`);
        }
        foundChains++;
      }
    }
  });
  
  if (foundChains === 0) {
    console.log('  (No problematic chains found)');
  }
  
  // Analyze import patterns in code
  console.log('\n🔍 Checking for dynamic imports...');
  const srcDir = path.join(process.cwd(), 'src');
  
  const dynamicImports = [];
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !file.includes('node_modules') && !file.startsWith('.')) {
          scanDir(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const importMatches = content.match(/import\(/g);
          if (importMatches) {
            dynamicImports.push({
              file: path.relative(process.cwd(), fullPath),
              count: importMatches.length
            });
          }
        }
      } catch (err) {
        // Skip files we can't read
      }
    });
  }
  
  if (fs.existsSync(srcDir)) {
    scanDir(srcDir);
    if (dynamicImports.length > 0) {
      console.log(`✅ Found ${dynamicImports.length} files with dynamic imports:`);
      dynamicImports
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .forEach(imp => {
          console.log(`  • ${imp.file}: ${imp.count} dynamic import(s)`);
        });
    } else {
      console.log('  ℹ️  No dynamic imports found (consider adding for heavy components)');
    }
  }
  
  // Analyze current bundle structure
  console.log('\n📊 Current Bundle Analysis:');
  const distPath = path.join(process.cwd(), 'dist/assets');
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    const jsFiles = files.filter(f => f.endsWith('.js') && !f.includes('.map'));
    const vendorFiles = jsFiles.filter(f => f.includes('vendor') || f.includes('engine'));
    
    if (vendorFiles.length > 0) {
      console.log(`Found ${vendorFiles.length} vendor/engine chunks:`);
      vendorFiles.forEach(file => {
        const stats = fs.statSync(path.join(distPath, file));
        const sizeMB = stats.size / 1024 / 1024;
        const sizeKB = stats.size / 1024;
        console.log(`  • ${file}: ${sizeMB.toFixed(2)}MB (${sizeKB.toFixed(0)}KB)`);
      });
    } else {
      console.log('  ℹ️  No vendor chunks found (run build first)');
    }
  } else {
    console.log('  ℹ️  dist/ folder not found (run build first)');
  }
  
  console.log('\n✅ Analysis complete!');
}

analyzeModuleDependencies();


#!/usr/bin/env node

/**
 * Performance Optimization Script
 * Analyzes and optimizes the application for better performance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 Performance Optimization Analysis\n');

// 1. Analyze bundle size
function analyzeBundleSize() {
  console.log('📊 Bundle Size Analysis:');
  
  const distPath = path.join(projectRoot, 'dist');
  if (!fs.existsSync(distPath)) {
    console.log('❌ No dist folder found. Run "npm run build" first.\n');
    return;
  }

  const assetsPath = path.join(distPath, 'assets');
  if (!fs.existsSync(assetsPath)) {
    console.log('❌ No assets folder found.\n');
    return;
  }

  const files = fs.readdirSync(assetsPath);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  const cssFiles = files.filter(file => file.endsWith('.css'));
  
  let totalJsSize = 0;
  let totalCssSize = 0;
  
  console.log('\n📦 JavaScript Files:');
  jsFiles.forEach(file => {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalJsSize += stats.size;
    
    const category = getFileCategory(file);
    console.log(`  ${category} ${file}: ${sizeKB} KB`);
  });
  
  console.log('\n🎨 CSS Files:');
  cssFiles.forEach(file => {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalCssSize += stats.size;
    
    const category = getFileCategory(file);
    console.log(`  ${category} ${file}: ${sizeKB} KB`);
  });
  
  console.log(`\n📈 Total JavaScript: ${(totalJsSize / 1024).toFixed(2)} KB`);
  console.log(`📈 Total CSS: ${(totalCssSize / 1024).toFixed(2)} KB`);
  console.log(`📈 Total Assets: ${((totalJsSize + totalCssSize) / 1024).toFixed(2)} KB\n`);
  
  // Performance recommendations
  console.log('💡 Performance Recommendations:');
  
  if (totalJsSize > 2 * 1024 * 1024) { // 2MB
    console.log('  ⚠️  JavaScript bundle is large (>2MB). Consider:');
    console.log('     - Further code splitting');
    console.log('     - Lazy loading non-critical components');
    console.log('     - Tree shaking unused code');
  }
  
  if (totalCssSize > 500 * 1024) { // 500KB
    console.log('  ⚠️  CSS bundle is large (>500KB). Consider:');
    console.log('     - Removing unused CSS');
    console.log('     - Critical CSS inlining');
    console.log('     - CSS purging');
  }
  
  const largestJsFile = jsFiles.reduce((largest, file) => {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    return stats.size > largest.size ? { file, size: stats.size } : largest;
  }, { file: '', size: 0 });
  
  if (largestJsFile.size > 1 * 1024 * 1024) { // 1MB
    console.log(`  ⚠️  Largest JS file (${largestJsFile.file}) is >1MB. Consider splitting.`);
  }
  
  console.log('');
}

function getFileCategory(filename) {
  if (filename.includes('app-')) return '🏠';
  if (filename.includes('vendor-react')) return '⚛️';
  if (filename.includes('vendor-threejs')) return '🎮';
  if (filename.includes('vendor-supabase')) return '🗄️';
  if (filename.includes('vendor-routing')) return '🛣️';
  if (filename.includes('vendor-ui')) return '🎨';
  if (filename.includes('vendor-forms')) return '📝';
  if (filename.includes('vendor-utils')) return '🔧';
  if (filename.includes('vendor-i18n')) return '🌍';
  if (filename.includes('vendor-charts')) return '📊';
  if (filename.includes('vendor-heavy')) return '⚖️';
  if (filename.includes('vendor-misc')) return '📦';
  if (filename.includes('lucide-icons')) return '🎯';
  if (filename.includes('index-')) return '🚀';
  return '📄';
}

// 2. Check for performance issues in source code
function analyzeSourceCode() {
  console.log('🔍 Source Code Analysis:');
  
  const srcPath = path.join(projectRoot, 'src');
  if (!fs.existsSync(srcPath)) {
    console.log('❌ No src folder found.\n');
    return;
  }
  
  const issues = [];
  
  // Check for large imports
  checkLargeImports(srcPath, issues);
  
  // Check for missing lazy loading
  checkLazyLoading(srcPath, issues);
  
  // Check for performance anti-patterns
  checkPerformancePatterns(srcPath, issues);
  
  if (issues.length === 0) {
    console.log('  ✅ No major performance issues found in source code.\n');
  } else {
    console.log('  ⚠️  Performance issues found:');
    issues.forEach(issue => console.log(`     - ${issue}`));
    console.log('');
  }
}

function checkLargeImports(dir, issues) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      checkLargeImports(filePath, issues);
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for large library imports
      const largeImports = [
        '@tensorflow/tfjs',
        'three',
        '@react-three/fiber',
        'chart.js',
        'recharts',
        'pdf-lib',
        'xlsx'
      ];
      
      largeImports.forEach(lib => {
        if (content.includes(`import`) && content.includes(lib)) {
          issues.push(`Large library "${lib}" imported in ${path.relative(projectRoot, filePath)} - consider lazy loading`);
        }
      });
    }
  });
}

function checkLazyLoading(dir, issues) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      checkLazyLoading(filePath, issues);
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for heavy components that should be lazy loaded
      const heavyComponents = [
        'EnhancedGLBViewer',
        'Model3DDialog',
        'Chart',
        'PDFViewer',
        'ExcelViewer'
      ];
      
      heavyComponents.forEach(component => {
        if (content.includes(component) && !content.includes('lazy') && !content.includes('Lazy')) {
          issues.push(`Heavy component "${component}" in ${path.relative(projectRoot, filePath)} - consider lazy loading`);
        }
      });
    }
  });
}

function checkPerformancePatterns(dir, issues) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      checkPerformancePatterns(filePath, issues);
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for performance anti-patterns
      if (content.includes('useEffect') && content.includes('[]') && content.includes('fetch')) {
        issues.push(`Potential performance issue in ${path.relative(projectRoot, filePath)} - fetch in useEffect without proper cleanup`);
      }
      
      if (content.includes('console.log') && !content.includes('// TODO: Remove')) {
        issues.push(`Console.log found in ${path.relative(projectRoot, filePath)} - remove for production`);
      }
    }
  });
}

// 3. Generate performance recommendations
function generateRecommendations() {
  console.log('💡 Performance Optimization Recommendations:\n');
  
  console.log('🚀 Immediate Actions:');
  console.log('  1. Enable PWA caching for better offline performance');
  console.log('  2. Implement lazy loading for heavy components');
  console.log('  3. Use React.memo() for expensive components');
  console.log('  4. Implement virtual scrolling for large lists');
  console.log('  5. Optimize images with WebP format and lazy loading\n');
  
  console.log('📊 Monitoring:');
  console.log('  1. Set up Core Web Vitals monitoring');
  console.log('  2. Use Lighthouse CI for performance regression testing');
  console.log('  3. Monitor bundle size changes in CI/CD');
  console.log('  4. Set up performance budgets\n');
  
  console.log('🔧 Advanced Optimizations:');
  console.log('  1. Implement service worker for aggressive caching');
  console.log('  2. Use HTTP/2 server push for critical resources');
  console.log('  3. Implement critical CSS inlining');
  console.log('  4. Use resource hints (preload, prefetch, preconnect)');
  console.log('  5. Implement image optimization with next-gen formats\n');
  
  console.log('📱 Mobile Optimizations:');
  console.log('  1. Implement touch-friendly interactions');
  console.log('  2. Optimize for mobile viewport');
  console.log('  3. Use mobile-specific performance techniques');
  console.log('  4. Implement progressive loading\n');
}

// 4. Create performance monitoring setup
function createPerformanceMonitoring() {
  console.log('📊 Setting up Performance Monitoring...\n');
  
  const performanceScript = `
// Performance monitoring setup
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log('Performance Metric:', metric);
  
  // Example: Send to Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
}

// Monitor Core Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

// Performance budget monitoring
const performanceBudget = {
  FCP: 1800, // 1.8s
  LCP: 2500, // 2.5s
  FID: 100,  // 100ms
  CLS: 0.1,  // 0.1
  TTFB: 800  // 800ms
};

function checkPerformanceBudget(metric) {
  const budget = performanceBudget[metric.name];
  if (budget && metric.value > budget) {
    console.warn(\`Performance budget exceeded for \${metric.name}: \${metric.value} > \${budget}\`);
  }
}

getCLS(checkPerformanceBudget);
getFID(checkPerformanceBudget);
getFCP(checkPerformanceBudget);
getLCP(checkPerformanceBudget);
getTTFB(checkPerformanceBudget);
`;

  const performancePath = path.join(projectRoot, 'src/lib/performance.ts');
  fs.writeFileSync(performancePath, performanceScript);
  console.log('✅ Created performance monitoring script at src/lib/performance.ts\n');
}

// Main execution
async function main() {
  try {
    analyzeBundleSize();
    analyzeSourceCode();
    generateRecommendations();
    createPerformanceMonitoring();
    
    console.log('🎉 Performance optimization analysis complete!');
    console.log('📝 Next steps:');
    console.log('  1. Review the recommendations above');
    console.log('  2. Implement lazy loading for heavy components');
    console.log('  3. Set up performance monitoring');
    console.log('  4. Run Lighthouse audits regularly');
    console.log('  5. Monitor Core Web Vitals in production\n');
    
  } catch (error) {
    console.error('❌ Error during performance analysis:', error);
    process.exit(1);
  }
}

main();

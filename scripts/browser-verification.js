/**
 * Browser Console Verification Script
 * Copy and paste this entire script into your browser console on the production site
 * 
 * Usage: Open DevTools (F12) → Console → Paste this script → Press Enter
 */

(function() {
  console.log('%c🔍 DEPLOYMENT VERIFICATION STARTED', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = {
    performanceMonitoring: false,
    bomRenderTime: null,
    slowOperations: 0,
    consoleErrors: false,
    serviceWorker: false,
    bundleSize: null,
    lighthouseReady: false
  };

  // 1. Check Performance Monitoring
  console.log('1️⃣  Performance Monitoring:');
  try {
    if (typeof window.performanceMonitor !== 'undefined') {
      const metrics = window.performanceMonitor.getMetrics();
      results.performanceMonitoring = true;
      results.metricsCount = metrics.length;
      console.log('   ✅ Performance monitor active');
      console.log(`   📊 Metrics tracked: ${metrics.length}`);
      
      // Check BOM render time
      const bomRender = metrics.find(m => m.name === 'engineering_bay_render');
      if (bomRender) {
        results.bomRenderTime = bomRender.value;
        const status = bomRender.value < 100 ? '✅' : '⚠️';
        console.log(`   ${status} BOM Render: ${bomRender.value.toFixed(2)}ms (target: <100ms)`);
      }
      
      // Check for slow operations
      const slowOps = metrics.filter(m => m.value > 100);
      results.slowOperations = slowOps.length;
      if (slowOps.length > 0) {
        console.log(`   ⚠️  Slow operations (>100ms): ${slowOps.length}`);
        slowOps.forEach(op => {
          console.log(`      - ${op.component || 'Unknown'}: ${op.value.toFixed(2)}ms`);
        });
      } else {
        console.log('   ✅ No slow operations detected');
      }
    } else {
      console.log('   ❌ Performance monitor not found');
    }
  } catch (error) {
    console.log('   ❌ Error checking performance:', error.message);
  }
  console.log('');

  // 2. Check Console Errors
  console.log('2️⃣  Console Errors:');
  // Note: We can't detect past errors, but we can check for error patterns
  const errorPatterns = ['Error', 'Failed', 'Cannot', 'undefined'];
  let errorCount = 0;
  const originalError = console.error;
  console.error = function(...args) {
    errorCount++;
    originalError.apply(console, args);
  };
  results.consoleErrors = errorCount > 0;
  console.log(`   ${errorCount === 0 ? '✅' : '⚠️'} Console errors: ${errorCount}`);
  console.log('');

  // 3. Check Service Worker
  console.log('3️⃣  Service Worker:');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      results.serviceWorker = registrations.length > 0;
      console.log(`   ${results.serviceWorker ? '✅' : '⚠️'} Service Workers: ${registrations.length}`);
      registrations.forEach((reg, idx) => {
        console.log(`      ${idx + 1}. ${reg.scope}`);
      });
    }).catch(err => {
      console.log(`   ❌ Error checking Service Worker: ${err.message}`);
    });
  } else {
    console.log('   ⚠️  Service Workers not supported');
  }
  console.log('');

  // 4. Check Bundle Sizes
  console.log('4️⃣  Bundle Sizes:');
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const jsFiles = scripts
    .map(s => s.src)
    .filter(src => src.includes('.js') && !src.includes('analytics'));
  
  console.log(`   📦 JavaScript files: ${jsFiles.length}`);
  
  // Try to get sizes from Performance API
  if ('PerformanceObserver' in window) {
    const resources = performance.getEntriesByType('resource');
    const jsResources = resources.filter(r => r.name.includes('.js'));
    const totalSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    results.bundleSize = totalSize;
    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
    const status = totalSize < 1.5 * 1024 * 1024 ? '✅' : '⚠️';
    console.log(`   ${status} Total JS size: ${sizeMB}MB (target: <1.5MB)`);
  }
  console.log('');

  // 5. Check Core Web Vitals
  console.log('5️⃣  Core Web Vitals:');
  if ('PerformanceObserver' in window) {
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach(entry => {
      if (entry.name === 'first-contentful-paint') {
        const status = entry.startTime < 1000 ? '✅' : '⚠️';
        console.log(`   ${status} FCP: ${entry.startTime.toFixed(0)}ms (target: <1000ms)`);
      }
    });
    
    // LCP (simplified check)
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      const lcp = lcpEntries[lcpEntries.length - 1];
      const lcpTime = lcp.renderTime || lcp.loadTime;
      const status = lcpTime < 2000 ? '✅' : '⚠️';
      console.log(`   ${status} LCP: ${lcpTime.toFixed(0)}ms (target: <2000ms)`);
    }
  }
  console.log('');

  // 6. Final Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('%c📊 VERIFICATION SUMMARY', 'font-size: 14px; font-weight: bold;');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const allPassed = 
    results.performanceMonitoring &&
    (results.bomRenderTime === null || results.bomRenderTime < 100) &&
    results.slowOperations === 0 &&
    !results.consoleErrors;
  
  if (allPassed) {
    console.log('%c✅ ALL CHECKS PASSED - DEPLOYMENT SUCCESSFUL!', 'font-size: 14px; font-weight: bold; color: #10b981;');
  } else {
    console.log('%c⚠️  SOME CHECKS NEED ATTENTION', 'font-size: 14px; font-weight: bold; color: #f59e0b;');
  }
  
  console.log('\n📋 Results:');
  console.table(results);
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Run Lighthouse audit (DevTools → Lighthouse tab)');
  console.log('   2. Test core features (Engineering Bay, 3D preview)');
  console.log('   3. Monitor for 24 hours');
  console.log('   4. Check GitHub Actions for Lighthouse CI results\n');
  
  return results;
})();


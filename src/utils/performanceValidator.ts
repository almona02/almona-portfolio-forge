/**
 * Performance Validation Tool for Phase 1
 * Run this in browser console after implementation
 * Phase 1: Emergency Performance Fixes Validation
 */

interface ValidationResults {
  results: Record<string, boolean>;
  loadTimes: {
    FCP: number;
    LCP: number;
    TBT: number;
    CLS: number;
  };
  recommendations: string[];
  connection: {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  } | null;
}

export const validatePhase1Optimizations = (): ValidationResults => {
  const results: Record<string, boolean> = {};
  const recommendations: string[] = [];

  console.log('🔍 Almona Egypt Phase 1 Performance Validation');
  console.log('='.repeat(50));

  // 1. Check Critical CSS
  const criticalCSS = document.querySelector('style#critical-css');
  results['Critical CSS Inlined'] = !!criticalCSS;
  if (!criticalCSS) recommendations.push('Add critical CSS inline');

  // 2. Check Hero Image Optimization
  const heroImg = document.querySelector('img[fetchpriority="high"]') || 
                  document.querySelector('img[fetchPriority="high"]');
  results['Hero Image High Priority'] = !!heroImg;
  if (!heroImg) recommendations.push('Add fetchpriority="high" to hero image');

  // 3. Check Prefetching
  const prefetchLinks = Array.from(document.querySelectorAll('link[rel="prefetch"]'));
  results['Prefetch Links Present'] = prefetchLinks.length > 0;
  if (prefetchLinks.length === 0) recommendations.push('Add route prefetching');

  // 4. Check Service Worker
  results['Service Worker Registered'] = 'serviceWorker' in navigator;
  if (!('serviceWorker' in navigator)) recommendations.push('Enable Service Workers');

  // 5. Check Font Loading
  const fontLinks = Array.from(document.querySelectorAll('link[as="font"]'));
  results['Font Preloading'] = fontLinks.length > 0;
  if (fontLinks.length === 0) {
    // Check for alternative font loading methods
    const fontPreload = Array.from(document.querySelectorAll('link[rel="preload"][href*="font"]'));
    results['Font Preloading'] = fontPreload.length > 0;
    if (fontPreload.length === 0) recommendations.push('Preload critical fonts');
  }

  // 6. Check Hero Image Preload
  const heroPreload = document.querySelector('link[rel="preload"][href*="hero-bg"]');
  results['Hero Image Preloaded'] = !!heroPreload;
  if (!heroPreload) recommendations.push('Preload hero background image');

  // 7. Measure Load Times
  const paintEntries = performance.getEntriesByType('paint');
  const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
  const fcp = fcpEntry ? fcpEntry.startTime : 0;

  const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
  const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;

  // Calculate TBT (simplified - sum of long tasks)
  const longTasks = performance.getEntriesByType('longtask') as PerformanceEntry[];
  const tbt = longTasks.reduce((total, task) => total + (task.duration || 0), 0);

  // Calculate CLS
  const layoutShifts = performance.getEntriesByType('layout-shift') as any[];
  const cls = layoutShifts
    .filter(entry => !entry.hadRecentInput)
    .reduce((total, entry) => total + (entry.value || 0), 0);

  const loadTimes = {
    FCP: fcp,
    LCP: lcp,
    TBT: tbt,
    CLS: cls
  };

  console.log('\n📈 Load Time Metrics:');
  console.log(`First Contentful Paint: ${Math.round(loadTimes.FCP)}ms ${loadTimes.FCP < 1400 ? '✅' : '⚠️'} (Target: <1400ms)`);
  console.log(`Largest Contentful Paint: ${Math.round(loadTimes.LCP)}ms ${loadTimes.LCP < 2400 ? '✅' : '⚠️'} (Target: <2400ms)`);
  console.log(`Total Blocking Time: ${Math.round(loadTimes.TBT)}ms ${loadTimes.TBT < 400 ? '✅' : '⚠️'} (Target: <400ms)`);
  console.log(`Cumulative Layout Shift: ${loadTimes.CLS.toFixed(3)} ${loadTimes.CLS < 0.1 ? '✅' : '⚠️'} (Target: <0.1)`);

  // 8. Connection Info (Egypt specific)
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  let connectionInfo = null;
  
  if (connection) {
    connectionInfo = {
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false
    };

    console.log('\n🌍 Egyptian Connection Info:');
    console.log(`Effective Type: ${connectionInfo.effectiveType}`);
    console.log(`Downlink: ${connectionInfo.downlink} Mbps`);
    console.log(`RTT: ${connectionInfo.rtt}ms`);
    console.log(`Save Data: ${connectionInfo.saveData ? 'Enabled' : 'Disabled'}`);
  }

  // 9. Validation Summary
  console.log('\n✅ Optimization Checks:');
  Object.entries(results).forEach(([check, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${check}`);
  });

  if (recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    recommendations.forEach(rec => console.log(`• ${rec}`));
  }

  // 10. Egypt Workflow Specific Checks
  const checkEgyptWorkflow = () => {
    const criticalRoutes = [
      '/fabricator-workflow',
      '/egyptian-project-wizard',
      '/fabricator/tuning-studio-no-dxf'
    ];
    
    const prefetchedRoutes = prefetchLinks
      .map(link => link.getAttribute('href'))
      .filter(Boolean) as string[];
    
    const missingPrefetches = criticalRoutes.filter(
      route => !prefetchedRoutes.some(prefetch => prefetch?.includes(route))
    );
    
    if (missingPrefetches.length > 0) {
      console.log('\n⚠️ Missing prefetches for Egypt workflow:');
      missingPrefetches.forEach(route => console.log(`• ${route}`));
    } else {
      console.log('\n✅ All critical Egypt workflow routes are prefetched');
    }
  };

  checkEgyptWorkflow();

  // 11. Service Worker Status Check
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration) {
        console.log('\n✅ Service Worker Status:');
        console.log(`Active: ${registration.active ? 'Yes' : 'No'}`);
        console.log(`Installing: ${registration.installing ? 'Yes' : 'No'}`);
        console.log(`Waiting: ${registration.waiting ? 'Yes' : 'No'}`);
        console.log(`Scope: ${registration.scope}`);
      } else {
        console.log('\n⚠️ Service Worker not registered yet');
      }
    }).catch(() => {
      console.log('\n⚠️ Could not check Service Worker status');
    });
  }

  // 12. Performance Score Calculation
  const calculateScore = () => {
    let score = 0;
    
    // FCP score (25 points)
    if (loadTimes.FCP < 1400) score += 25;
    else if (loadTimes.FCP < 2000) score += 15;
    else if (loadTimes.FCP < 3000) score += 5;
    
    // LCP score (25 points)
    if (loadTimes.LCP < 2400) score += 25;
    else if (loadTimes.LCP < 4000) score += 15;
    else if (loadTimes.LCP < 6000) score += 5;
    
    // TBT score (25 points)
    if (loadTimes.TBT < 400) score += 25;
    else if (loadTimes.TBT < 600) score += 15;
    else if (loadTimes.TBT < 800) score += 5;
    
    // CLS score (25 points)
    if (loadTimes.CLS < 0.1) score += 25;
    else if (loadTimes.CLS < 0.25) score += 15;
    else if (loadTimes.CLS < 0.5) score += 5;
    
    return score;
  };

  const performanceScore = calculateScore();
  console.log('\n📊 Performance Score:');
  console.log(`${performanceScore}/100 ${performanceScore >= 75 ? '✅ Excellent' : performanceScore >= 50 ? '⚠️ Good' : '❌ Needs Improvement'}`);

  console.log('\n' + '='.repeat(50));
  console.log('Phase 1 Validation Complete');
  
  return {
    results,
    loadTimes,
    recommendations,
    connection: connectionInfo
  };
};

// Export for easy access in console
if (typeof window !== 'undefined') {
  (window as any).validateAlmonaPerformance = validatePhase1Optimizations;
  
  // Auto-run in development mode
  const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
  if (isDev) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        console.log('\n💡 Tip: Run validateAlmonaPerformance() in console for detailed validation');
      }, 2000);
    });
  }
}


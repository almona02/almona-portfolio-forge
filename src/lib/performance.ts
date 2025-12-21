
// Performance monitoring setup
// Note: web-vitals v3+ uses onCLS, onINP, etc. instead of getCLS, getFID
// FID was deprecated and replaced with INP (Interaction to Next Paint) in v3+
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Send to your analytics service
  console.log('Performance Metric:', metric);

  // Example: Send to Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    try {
      (window as any).gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      });
    } catch (error) {
      // Silently fail - analytics might be blocked by privacy extensions
      console.debug('Analytics blocked or unavailable:', error.message);
    }
  }
}

// Performance budget monitoring
const performanceBudget: Record<string, number> = {
  FCP: 1800, // 1.8s
  LCP: 2500, // 2.5s
  INP: 200,  // 200ms (replaces FID)
  CLS: 0.15, // 0.15 (relaxed from 0.1 for dev variance)
  TTFB: 800  // 800ms
};

// Enhanced performance budget checking with alerts
function checkPerformanceBudget(metric: any) {
  const budget = performanceBudget[metric.name];
  if (budget && metric.value > budget) {
    const percentage = ((metric.value / budget) * 100).toFixed(1);
    console.warn(
      `[Performance] ⚠️ Budget exceeded for ${metric.name}: ${metric.value.toFixed(2)} > ${budget} (${percentage}% over budget)`
    );
    
    // Send alert to analytics
    sendToAnalytics({
      name: `${metric.name}BudgetExceeded`,
      value: percentage,
      id: `${metric.name}-budget-alert`
    });
  } else if (budget) {
    // Log success for budget compliance
    const percentage = (metric.value / budget) * 100;
    if (percentage < 80) {
      console.log(`[Performance] ✓ ${metric.name} within budget: ${metric.value.toFixed(2)} < ${budget} (${percentage.toFixed(1)}% of budget)`);
    }
  }
}

// Performance budget for Fabricator-specific metrics
// Used in checkPerformanceBudget for custom metrics
export const fabricatorPerformanceBudget: Record<string, number> = {
  FabricatorLoadTime: 3000, // 3 seconds
  FabricatorInventoryLoad: 2000, // 2 seconds
  FabricatorProjectLoad: 1500, // 1.5 seconds
  FabricatorOptimization: 5000, // 5 seconds
};

// Helper to check Fabricator-specific budgets
export function checkFabricatorBudget(metricName: string, value: number) {
  const budget = fabricatorPerformanceBudget[metricName];
  if (budget && value > budget) {
    const percentage = ((value / budget) * 100).toFixed(1);
    console.warn(
      `[Performance] ⚠️ Fabricator budget exceeded for ${metricName}: ${value.toFixed(2)}ms > ${budget}ms (${percentage}% over budget)`
    );
    return false;
  }
  return true;
}

// Fabricator-specific performance metrics
export interface FabricatorMetrics {
  loadTime: number;
  workspaceReadyTime: number;
  inventoryLoadTime?: number;
  projectLoadTime?: number;
  optimizationTime?: number;
}

// Track Fabricator component mount and initialization
export function trackFabricatorLoadTime() {
  if (typeof performance !== 'undefined') {
    performance.mark('fabricator-load-start');
    console.log('[Performance] Fabricator load tracking started');
  }
}

// Track when workspace becomes interactive
export function markFabricatorReady() {
  if (typeof performance !== 'undefined') {
    performance.mark('fabricator-ready');
    
    // Measure total load time
    try {
      performance.measure('fabricator-load', 'fabricator-load-start', 'fabricator-ready');
      const measure = performance.getEntriesByName('fabricator-load')[0] as PerformanceMeasure;
      
      if (measure) {
        const loadTime = measure.duration;
        console.log(`[Performance] Fabricator load time: ${loadTime.toFixed(2)}ms`);

        // Send to analytics
        const rating = loadTime < 3000 ? 'good' : loadTime < 5000 ? 'needs-improvement' : 'poor';
        sendToAnalytics({
          name: 'FabricatorLoadTime',
          value: loadTime,
          id: 'fabricator-load-measure',
          rating
        });

        // Check against budget (3 seconds target)
        if (loadTime > 3000) {
          console.warn(`[Performance] ⚠️ Fabricator load time exceeded budget: ${loadTime.toFixed(2)}ms > 3000ms`);
          checkPerformanceBudget({
            name: 'FabricatorLoadTime',
            value: loadTime
          });
        }
      }
    } catch (error) {
      console.warn('[Performance] Failed to measure Fabricator load time:', error);
    }
  }
}

// Track workspace-specific operations
export function trackWorkspaceOperation(operation: string, _startMark?: string) {
  if (typeof performance === 'undefined') return;
  
  const markName = `fabricator-${operation}-start`;
  performance.mark(markName);
  
  return {
    end: () => {
      const endMark = `fabricator-${operation}-end`;
      performance.mark(endMark);
      
      try {
        const measureName = `fabricator-${operation}`;
        performance.measure(measureName, markName, endMark);
        const measure = performance.getEntriesByName(measureName)[0] as PerformanceMeasure;
        
        if (measure) {
          const duration = measure.duration;
          console.log(`[Performance] ${operation} took ${duration.toFixed(2)}ms`);
          
          sendToAnalytics({
            name: `Fabricator${operation.charAt(0).toUpperCase() + operation.slice(1)}`,
            value: duration,
            id: `fabricator-${operation}-measure`
          });
        }
      } catch (error) {
        console.warn(`[Performance] Failed to measure ${operation}:`, error);
      }
    }
  };
}

// Track inventory load time
export function trackInventoryLoad() {
  return trackWorkspaceOperation('inventory-load');
}

// Track project load time
export function trackProjectLoad() {
  return trackWorkspaceOperation('project-load');
}

// Track optimization calculation time
export function trackOptimization() {
  return trackWorkspaceOperation('optimization');
}

// Bundle size monitoring with detailed reporting
export interface BundleInfo {
  name: string;
  size: number;
  sizeKB: number;
  sizeMB: number;
  transferSize: number;
  transferSizeKB: number;
  duration: number;
  type: 'initial' | 'chunk' | 'vendor' | 'fabricator';
}

export function monitorBundleSize(): BundleInfo[] {
  if (typeof performance === 'undefined' || !('getEntriesByType' in performance)) {
    return [];
  }

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const jsResources = resources.filter(r => 
    r.name.includes('.js') && 
    (r.transferSize > 0 || r.decodedBodySize > 0)
  );

  const bundleInfo: BundleInfo[] = [];
  let totalSize = 0;
  let totalTransferSize = 0;

  jsResources.forEach(resource => {
    const size = resource.decodedBodySize || 0;
    const transferSize = resource.transferSize || 0;
    const sizeKB = size / 1024;
    const transferSizeKB = transferSize / 1024;
    
    // Determine bundle type
    let type: BundleInfo['type'] = 'chunk';
    if (resource.name.includes('index') || resource.name.includes('main')) {
      type = 'initial';
    } else if (resource.name.includes('vendor') || resource.name.includes('react-vendor') || resource.name.includes('ui-vendor')) {
      type = 'vendor';
    } else if (resource.name.includes('fabricator')) {
      type = 'fabricator';
    } else if (resource.name.includes('ui-icons-lucide')) {
      type = 'vendor'; // Icon libraries are vendor chunks
    }

    const info: BundleInfo = {
      name: resource.name.split('/').pop() || resource.name,
      size,
      sizeKB,
      sizeMB: sizeKB / 1024,
      transferSize,
      transferSizeKB,
      duration: resource.duration,
      type
    };

    bundleInfo.push(info);
    totalSize += size;
    totalTransferSize += transferSize;

    // Log bundle info
    console.log(`[Performance] Bundle: ${info.name} - ${info.sizeKB.toFixed(2)}KB (${info.transferSizeKB.toFixed(2)}KB transferred) - ${info.type}`);

    // Alert on large bundles (>500KB target to reduce noise for vendor chunks)
    // Icon libraries can be larger, so use a higher threshold (800KB) for them
    const isIconLibrary = resource.name.includes('ui-icons-lucide') || resource.name.includes('lucide-react');
    const threshold = isIconLibrary ? 800 * 1024 : 500 * 1024;
    if (transferSize > threshold) {
      console.warn(`[Performance] ⚠️ Large bundle detected: ${info.name} - ${info.transferSizeKB.toFixed(2)}KB (exceeds ${(threshold / 1024).toFixed(0)}KB target)`);
    }
  });

  // Summary
  const totalSizeKB = totalSize / 1024;
  const totalTransferSizeKB = totalTransferSize / 1024;
  console.log(`[Performance] Bundle Summary: ${bundleInfo.length} bundles, ${totalSizeKB.toFixed(2)}KB total (${totalTransferSizeKB.toFixed(2)}KB transferred)`);

  // Check total bundle size budget (relaxed to 5MB for heavy 3D apps)
  if (totalTransferSize > 5000 * 1024) { 
    console.warn(`[Performance] ⚠️ Total bundle size exceeds budget: ${totalTransferSizeKB.toFixed(2)}KB > 5000KB`);
  }

  // Send summary to analytics
  sendToAnalytics({
    name: 'BundleSize',
    value: totalTransferSizeKB,
    id: 'bundle-size-summary'
  });

  return bundleInfo;
}

// Initialize performance monitoring
export function initializePerformanceMonitoring() {
  // Monitor Core Web Vitals
  // web-vitals v3+ API: onCLS, onINP, etc. instead of getCLS, getFID
  onCLS((metric) => {
    sendToAnalytics(metric);
    checkPerformanceBudget(metric);
  });

  onINP((metric) => {
    sendToAnalytics(metric);
    checkPerformanceBudget(metric);
  });

  onFCP((metric) => {
    sendToAnalytics(metric);
    checkPerformanceBudget(metric);
  });

  onLCP((metric) => {
    sendToAnalytics(metric);
    checkPerformanceBudget(metric);
  });

  onTTFB((metric) => {
    sendToAnalytics(metric);
    checkPerformanceBudget(metric);
  });

  // Monitor bundle sizes after page load
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const bundles = monitorBundleSize();
        
        // Log Fabricator-specific bundles if any
        const fabricatorBundles = bundles.filter(b => b.type === 'fabricator');
        if (fabricatorBundles.length > 0) {
          const fabricatorTotal = fabricatorBundles.reduce((sum, b) => sum + b.transferSizeKB, 0);
          console.log(`[Performance] Fabricator bundles: ${fabricatorBundles.length} bundles, ${fabricatorTotal.toFixed(2)}KB total`);
          
          if (fabricatorTotal > 200) {
            console.warn(`[Performance] ⚠️ Fabricator bundle size exceeds target: ${fabricatorTotal.toFixed(2)}KB > 200KB`);
          }
        }
      }, 1000); // Delay to ensure all resources loaded
    });
  }
}

// Auto-initialize in production
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  initializePerformanceMonitoring();
}

// ============================================================================
// Component-Level Performance Monitoring
// ============================================================================

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  component?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

  /**
   * Track a performance metric
   */
  track(metric: string, value: number, component?: string) {
    const data: PerformanceMetric = {
      name: metric,
      value,
      timestamp: Date.now(),
      component,
    };

    this.metrics.push(data);

    // Log to console in development
    if (import.meta.env.DEV) {
      const emoji = value > 100 ? '⚠️' : '✅';
      console.log(
        `${emoji} [Performance] ${component || 'App'}: ${metric} = ${value.toFixed(2)}ms`
      );
    }

    // Send to analytics in production
    if (import.meta.env.PROD && typeof window !== 'undefined') {
      this.sendToAnalytics(data);
    }
  }

  /**
   * Send metrics to analytics
   */
  private sendToAnalytics(metric: PerformanceMetric) {
    // Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      try {
        (window as any).gtag('event', 'performance_metric', {
          metric_name: metric.name,
          metric_value: metric.value,
          component: metric.component || 'unknown',
          app_version: this.APP_VERSION,
          timestamp: metric.timestamp,
        });
      } catch (error) {
        // Silently fail - analytics might be blocked by privacy extensions
        console.debug('Analytics blocked or unavailable:', error.message);
      }
    }

    // Custom analytics endpoint (if configured)
    if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
      fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      }).catch(() => {
        // Silently fail if analytics endpoint is unavailable
      });
    }
  }

  /**
   * Track Core Web Vitals
   */
  trackWebVitals() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // First Contentful Paint (FCP)
    try {
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.track('fcp', entry.startTime);
        }
      });
    } catch (e) {
      // FCP not available
    }

    // Largest Contentful Paint (LCP)
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.track('lcp', lastEntry.renderTime || lastEntry.loadTime);
      });
      try {
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        // Fallback for browsers that don't support new format
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      }
    } catch (e) {
      // LCP not supported
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.track('cls', clsValue);
      });
      try {
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        // Fallback for browsers that don't support new format
        observer.observe({ entryTypes: ['layout-shift'] });
      }
    } catch (e) {
      // CLS not supported
    }
  }

  /**
   * Get all tracked metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Analytics utility functions for graceful error handling
export const analyticsUtils = {
  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return !(
      localStorage.getItem('disable-analytics') === 'true' ||
      navigator.doNotTrack === '1' ||
      window.location.hostname === 'localhost'
    );
  },

  /**
   * Enable analytics
   */
  enable(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('disable-analytics');
      console.log('Analytics enabled');
    }
  },

  /**
   * Disable analytics
   */
  disable(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('disable-analytics', 'true');
      console.log('Analytics disabled');
    }
  },

  /**
   * Safe gtag wrapper that won't throw if analytics is blocked
   */
  gtag(...args: any[]): void {
    if (typeof window !== 'undefined' && (window as any).gtag && this.isEnabled()) {
      try {
        (window as any).gtag(...args);
      } catch (error) {
        // Silently fail - analytics might be blocked
        console.debug('Analytics blocked or unavailable');
      }
    }
  }
};

// Auto-track Web Vitals on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    performanceMonitor.trackWebVitals();
  });
}
import { useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
}

interface PerformanceMonitoringOptions {
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  enableReporting?: boolean;
  reportUrl?: string;
}

export function usePerformanceMonitoring(options: PerformanceMonitoringOptions = {}) {
  const { onMetricsUpdate, enableReporting = false, reportUrl } = options;

  const reportMetrics = useCallback(async (metrics: PerformanceMetrics) => {
    if (!enableReporting || !reportUrl) return;

    try {
      await fetch(reportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          ...metrics
        })
      });
    } catch (error) {
      console.warn('Failed to report performance metrics:', error);
    }
  }, [enableReporting, reportUrl]);

  const measureLCP = useCallback(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { element?: Element };
      
      if (lastEntry) {
        const lcp = lastEntry.startTime;
        const metrics = { lcp };
        
        onMetricsUpdate?.(metrics);
        reportMetrics(metrics);
        
        console.log('LCP:', lcp, 'ms');
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    
    return () => observer.disconnect();
  }, [onMetricsUpdate, reportMetrics]);

  const measureFID = useCallback(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        const fid = entry.processingStart - entry.startTime;
        const metrics = { fid };
        
        onMetricsUpdate?.(metrics);
        reportMetrics(metrics);
        
        console.log('FID:', fid, 'ms');
      });
    });

    observer.observe({ entryTypes: ['first-input'] });
    
    return () => observer.disconnect();
  }, [onMetricsUpdate, reportMetrics]);

  const measureCLS = useCallback(() => {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      const metrics = { cls: clsValue };
      onMetricsUpdate?.(metrics);
      reportMetrics(metrics);
      
      console.log('CLS:', clsValue);
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    
    return () => observer.disconnect();
  }, [onMetricsUpdate, reportMetrics]);

  const measureFCP = useCallback(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          const fcp = entry.startTime;
          const metrics = { fcp };
          
          onMetricsUpdate?.(metrics);
          reportMetrics(metrics);
          
          console.log('FCP:', fcp, 'ms');
        }
      });
    });

    observer.observe({ entryTypes: ['paint'] });
    
    return () => observer.disconnect();
  }, [onMetricsUpdate, reportMetrics]);

  const measureTTFB = useCallback(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry: any) => {
        if (entry.responseStart > 0) {
          const ttfb = entry.responseStart - entry.requestStart;
          const metrics = { ttfb };
          
          onMetricsUpdate?.(metrics);
          reportMetrics(metrics);
          
          console.log('TTFB:', ttfb, 'ms');
        }
      });
    });

    observer.observe({ entryTypes: ['navigation'] });
    
    return () => observer.disconnect();
  }, [onMetricsUpdate, reportMetrics]);

  const measureCustomMetric = useCallback((name: string, startTime: number) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Custom metric ${name}:`, duration, 'ms');
    
    // Report custom metric
    if (enableReporting && reportUrl) {
      reportMetrics({ [name]: duration } as PerformanceMetrics);
    }
  }, [enableReporting, reportUrl, reportMetrics]);

  useEffect(() => {
    const cleanupFunctions = [
      measureLCP(),
      measureFID(),
      measureCLS(),
      measureFCP(),
      measureTTFB()
    ].filter(Boolean);

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup?.());
    };
  }, [measureLCP, measureFID, measureCLS, measureFCP, measureTTFB]);

  return {
    measureCustomMetric
  };
}

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string) {
  const startTime = performance.now();
  
  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    console.log(`${componentName} render time:`, renderTime, 'ms');
    
    // Report slow renders
    if (renderTime > 16) { // More than one frame at 60fps
      console.warn(`Slow render detected in ${componentName}:`, renderTime, 'ms');
    }
  });
}

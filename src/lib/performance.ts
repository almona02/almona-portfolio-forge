// Performance monitoring and optimization utilities
import React from 'react';
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

// Performance budget thresholds
export const PERFORMANCE_BUDGET = {
  FCP: 1800, // First Contentful Paint - 1.8s
  LCP: 2500, // Largest Contentful Paint - 2.5s
  INP: 200,  // Interaction to Next Paint - 200ms
  CLS: 0.1,  // Cumulative Layout Shift - 0.1
  TTFB: 800  // Time to First Byte - 800ms
} as const;

// Performance metrics storage
interface PerformanceMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  navigationType: string;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Monitor Core Web Vitals
    onCLS(this.handleMetric.bind(this));
    onINP(this.handleMetric.bind(this));
    onFCP(this.handleMetric.bind(this));
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));

    // Monitor additional performance metrics
    this.observeNavigationTiming();
    this.observeResourceTiming();
    this.observeLongTasks();
  }

  private handleMetric(metric: any) {
    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      timestamp: Date.now()
    };

    this.metrics.push(performanceMetric);
    this.checkPerformanceBudget(performanceMetric);
    this.sendToAnalytics(performanceMetric);
  }

  private checkPerformanceBudget(metric: PerformanceMetric) {
    const budget = PERFORMANCE_BUDGET[metric.name as keyof typeof PERFORMANCE_BUDGET];
    
    if (budget && metric.value > budget) {
      console.warn(
        `🚨 Performance budget exceeded for ${metric.name}: ${metric.value.toFixed(2)} > ${budget}`
      );
      
      // Send alert to monitoring service
      this.sendPerformanceAlert(metric, budget);
    }
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // Send to Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', metric.name, {
        event_category: 'Web Vitals',
      event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      });
    }

    // Send to custom analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Performance Metric', {
        metric: metric.name,
        value: metric.value,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType
      });
    }
  }

  private sendPerformanceAlert(metric: PerformanceMetric, budget: number) {
    // Send to monitoring service (e.g., Sentry, DataDog, etc.)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureMessage(
        `Performance budget exceeded: ${metric.name}`,
        'warning'
      );
    }
  }

  private observeNavigationTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            console.log('Navigation timing:', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              totalTime: navEntry.loadEventEnd - navEntry.fetchStart
            });
          }
        }
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    }
  }

  private observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Log slow resources
          if (resourceEntry.duration > 1000) {
            console.warn('Slow resource detected:', {
              name: resourceEntry.name,
              duration: resourceEntry.duration,
              size: resourceEntry.transferSize
            });
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    }
  }

  private observeLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.warn('Long task detected:', {
            duration: entry.duration,
            startTime: entry.startTime
          });
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.push(observer);
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getMetricByName(name: string): PerformanceMetric | undefined {
    return this.metrics.find(metric => metric.name === name);
  }

  public getAverageMetric(name: string): number {
    const metrics = this.metrics.filter(metric => metric.name === name);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }

  public cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Performance optimization utilities
export class PerformanceOptimizer {
  /**
   * Debounce function for performance optimization
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function for performance optimization
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Preload critical resources
   */
  static preloadResource(href: string, as: string, crossorigin?: string) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (crossorigin) link.crossOrigin = crossorigin;
    document.head.appendChild(link);
  }

  /**
   * Prefetch resources for next page
   */
  static prefetchResource(href: string) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }

  /**
   * Preconnect to external domains
   */
  static preconnect(domain: string) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    document.head.appendChild(link);
  }

  /**
   * Optimize images with lazy loading and WebP support
   */
  static optimizeImage(img: HTMLImageElement, src: string, fallback?: string) {
    // Check WebP support
    const webpSupported = this.supportsWebP();
    const optimizedSrc = webpSupported && src.includes('.jpg') 
      ? src.replace('.jpg', '.webp') 
      : src;

    img.src = optimizedSrc;
    img.loading = 'lazy';
    img.decoding = 'async';

    if (fallback) {
      img.onerror = () => {
        img.src = fallback;
      };
    }
  }

  /**
   * Check WebP support
   */
  private static supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Measure function execution time
   */
  static measureTime<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }

  /**
   * Create performance mark
   */
  static mark(name: string) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }
  }

  /**
   * Measure between two marks
   */
  static measure(name: string, startMark: string, endMark?: string) {
    if ('performance' in window && 'measure' in performance) {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }
    }
  }
}

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = React.useState<PerformanceMetric[]>([]);

  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    metrics,
    getMetric: (name: string) => performanceMonitor.getMetricByName(name),
    getAverage: (name: string) => performanceMonitor.getAverageMetric(name)
  };
}

// Initialize performance monitoring
export function initializePerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    // Preconnect to external domains
    PerformanceOptimizer.preconnect('https://fonts.googleapis.com');
    PerformanceOptimizer.preconnect('https://fonts.gstatic.com');
    
    // Mark page load start
    PerformanceOptimizer.mark('page-load-start');
    
    // Mark page load end when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        PerformanceOptimizer.mark('page-load-end');
        PerformanceOptimizer.measure('page-load-time', 'page-load-start', 'page-load-end');
      });
    } else {
      PerformanceOptimizer.mark('page-load-end');
      PerformanceOptimizer.measure('page-load-time', 'page-load-start', 'page-load-end');
    }
  }
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  initializePerformanceMonitoring();
}

export default performanceMonitor;
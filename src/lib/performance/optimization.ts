/**
 * Performance Optimization Module
 * 
 * This module provides comprehensive performance optimization utilities
 * including bundle analysis, caching strategies, and Core Web Vitals monitoring.
 */

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkInfo[];
  assets: AssetInfo[];
  recommendations: OptimizationRecommendation[];
}

export interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize: number;
  modules: ModuleInfo[];
}

export interface ModuleInfo {
  name: string;
  size: number;
  gzippedSize: number;
  type: 'js' | 'css' | 'image' | 'font' | 'other';
}

export interface AssetInfo {
  name: string;
  size: number;
  type: string;
  url: string;
  priority: 'high' | 'medium' | 'low';
}

export interface OptimizationRecommendation {
  type: 'bundle-split' | 'lazy-load' | 'compress' | 'cache' | 'preload' | 'remove-unused';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedSavings: number; // in bytes
}

export interface CoreWebVitals {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  tti: number; // Time to Interactive
}

export interface PerformanceBudget {
  metric: string;
  budget: number;
  current: number;
  unit: string;
  status: 'pass' | 'warning' | 'fail';
}

export interface CacheStrategy {
  type: 'memory' | 'disk' | 'cdn' | 'service-worker';
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum cache size in bytes
  enabled: boolean;
}

class PerformanceOptimizer {
  private bundleAnalysis: BundleAnalysis | null = null;
  private coreWebVitals: CoreWebVitals | null = null;
  private performanceBudgets: PerformanceBudget[] = [];
  private cacheStrategies: Map<string, CacheStrategy> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializePerformanceBudgets();
    this.initializeCacheStrategies();
    this.startPerformanceMonitoring();
  }

  private initializePerformanceBudgets(): void {
    this.performanceBudgets = [
      {
        metric: 'First Contentful Paint',
        budget: 1800,
        current: 0,
        unit: 'ms',
        status: 'pass'
      },
      {
        metric: 'Largest Contentful Paint',
        budget: 2500,
        current: 0,
        unit: 'ms',
        status: 'pass'
      },
      {
        metric: 'First Input Delay',
        budget: 100,
        current: 0,
        unit: 'ms',
        status: 'pass'
      },
      {
        metric: 'Cumulative Layout Shift',
        budget: 0.1,
        current: 0,
        unit: '',
        status: 'pass'
      },
      {
        metric: 'Time to First Byte',
        budget: 600,
        current: 0,
        unit: 'ms',
        status: 'pass'
      },
      {
        metric: 'Time to Interactive',
        budget: 3800,
        current: 0,
        unit: 'ms',
        status: 'pass'
      },
      {
        metric: 'Bundle Size',
        budget: 500000, // 500KB
        current: 0,
        unit: 'bytes',
        status: 'pass'
      },
      {
        metric: 'Image Size',
        budget: 100000, // 100KB per image
        current: 0,
        unit: 'bytes',
        status: 'pass'
      }
    ];
  }

  private initializeCacheStrategies(): void {
    // Memory cache for API responses
    this.cacheStrategies.set('api-responses', {
      type: 'memory',
      ttl: 300, // 5 minutes
      maxSize: 10 * 1024 * 1024, // 10MB
      enabled: true
    });

    // Disk cache for static assets
    this.cacheStrategies.set('static-assets', {
      type: 'disk',
      ttl: 86400, // 24 hours
      maxSize: 100 * 1024 * 1024, // 100MB
      enabled: true
    });

    // CDN cache for images
    this.cacheStrategies.set('images', {
      type: 'cdn',
      ttl: 604800, // 7 days
      maxSize: 500 * 1024 * 1024, // 500MB
      enabled: true
    });

    // Service Worker cache for app shell
    this.cacheStrategies.set('app-shell', {
      type: 'service-worker',
      ttl: 3600, // 1 hour
      maxSize: 50 * 1024 * 1024, // 50MB
      enabled: true
    });
  }

  private startPerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor Core Web Vitals
    this.observeCoreWebVitals();
    
    // Monitor resource loading
    this.observeResourceLoading();
    
    // Monitor navigation timing
    this.observeNavigationTiming();
    
    // Monitor long tasks
    this.observeLongTasks();
  }

  private observeCoreWebVitals(): void {
    // First Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            this.updateCoreWebVital('fcp', fcpEntry.startTime);
          }
        });
        try {
          fcpObserver.observe({ type: 'paint', buffered: true });
        } catch (e) {
          // Fallback for browsers that don't support new format
          fcpObserver.observe({ entryTypes: ['paint'] });
        }
        this.observers.push(fcpObserver);
      } catch (error) {
        console.warn('FCP observer not supported:', error);
      }

      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.updateCoreWebVital('lcp', lastEntry.startTime);
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.processingStart && entry.startTime) {
              const fid = entry.processingStart - entry.startTime;
              this.updateCoreWebVital('fid', fid);
            }
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }

      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.updateCoreWebVital('cls', clsValue);
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }
    }
  }

  private observeResourceLoading(): void {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.analyzeResource(entry as PerformanceResourceTiming);
          });
        });
        try {
          resourceObserver.observe({ type: 'resource', buffered: true });
        } catch (e) {
          // Fallback for browsers that don't support new format
          resourceObserver.observe({ entryTypes: ['resource'] });
        }
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  }

  private observeNavigationTiming(): void {
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            const navEntry = entry as PerformanceNavigationTiming;
            this.updateCoreWebVital('ttfb', navEntry.responseStart - navEntry.requestStart);
            this.updateCoreWebVital('tti', navEntry.domContentLoadedEventEnd - navEntry.navigationStart);
          });
        });
        try {
          navObserver.observe({ type: 'navigation', buffered: true });
        } catch (e) {
          // Fallback for browsers that don't support new format
          navObserver.observe({ entryTypes: ['navigation'] });
        }
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }
    }
  }

  private observeLongTasks(): void {
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            console.warn(`Long task detected: ${entry.duration}ms`);
            // Report to analytics or alert system
          });
        });
        try {
          longTaskObserver.observe({ type: 'longtask', buffered: true });
        } catch (e) {
          // Fallback for browsers that don't support new format
          longTaskObserver.observe({ entryTypes: ['longtask'] });
        }
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }
  }

  private updateCoreWebVital(metric: keyof CoreWebVitals, value: number): void {
    if (!this.coreWebVitals) {
      this.coreWebVitals = {
        fcp: 0,
        lcp: 0,
        fid: 0,
        cls: 0,
        ttfb: 0,
        tti: 0
      };
    }
    
    this.coreWebVitals[metric] = value;
    
    // Update performance budget
    const budget = this.performanceBudgets.find(b => 
      b.metric.toLowerCase().includes(metric.replace(/([A-Z])/g, ' $1').toLowerCase())
    );
    
    if (budget) {
      budget.current = value;
      budget.status = this.evaluateBudgetStatus(budget);
    }
  }

  private analyzeResource(entry: PerformanceResourceTiming): void {
    const resourceType = this.getResourceType(entry.name);
    const size = entry.transferSize || 0;
    
    // Check against performance budgets
    if (resourceType === 'image') {
      const imageBudget = this.performanceBudgets.find(b => b.metric === 'Image Size');
      if (imageBudget && size > imageBudget.budget) {
        console.warn(`Large image detected: ${entry.name} (${size} bytes)`);
      }
    }
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js': return 'script';
      case 'css': return 'stylesheet';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'svg': return 'image';
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'otf': return 'font';
      default: return 'other';
    }
  }

  private evaluateBudgetStatus(budget: PerformanceBudget): 'pass' | 'warning' | 'fail' {
    const ratio = budget.current / budget.budget;
    if (ratio <= 0.8) return 'pass';
    if (ratio <= 1.0) return 'warning';
    return 'fail';
  }

  // Public API Methods
  public getCoreWebVitals(): CoreWebVitals | null {
    return this.coreWebVitals;
  }

  public getPerformanceBudgets(): PerformanceBudget[] {
    return this.performanceBudgets;
  }

  public getFailedBudgets(): PerformanceBudget[] {
    return this.performanceBudgets.filter(budget => budget.status === 'fail');
  }

  public getWarningBudgets(): PerformanceBudget[] {
    return this.performanceBudgets.filter(budget => budget.status === 'warning');
  }

  public analyzeBundle(): Promise<BundleAnalysis> {
    return new Promise((resolve) => {
      // Simulate bundle analysis
      const analysis: BundleAnalysis = {
        totalSize: 1024000, // 1MB
        gzippedSize: 256000, // 256KB
        chunks: [
          {
            name: 'main',
            size: 512000,
            gzippedSize: 128000,
            modules: [
              { name: 'react', size: 45000, gzippedSize: 15000, type: 'js' },
              { name: 'react-dom', size: 38000, gzippedSize: 12000, type: 'js' },
              { name: 'lodash', size: 25000, gzippedSize: 8000, type: 'js' }
            ]
          },
          {
            name: 'vendor',
            size: 256000,
            gzippedSize: 64000,
            modules: [
              { name: 'chart.js', size: 120000, gzippedSize: 30000, type: 'js' },
              { name: 'three.js', size: 136000, gzippedSize: 34000, type: 'js' }
            ]
          }
        ],
        assets: [
          { name: 'main.css', size: 50000, type: 'css', url: '/assets/main.css', priority: 'high' },
          { name: 'hero.jpg', size: 150000, type: 'image', url: '/images/hero.jpg', priority: 'high' }
        ],
        recommendations: [
          {
            type: 'bundle-split',
            priority: 'high',
            description: 'Split vendor bundle into smaller chunks',
            impact: 'Reduce initial bundle size by 30%',
            effort: 'medium',
            estimatedSavings: 76800
          },
          {
            type: 'lazy-load',
            priority: 'medium',
            description: 'Implement lazy loading for images',
            impact: 'Improve initial page load time',
            effort: 'low',
            estimatedSavings: 150000
          }
        ]
      };

      this.bundleAnalysis = analysis;
      resolve(analysis);
    });
  }

  public getBundleAnalysis(): BundleAnalysis | null {
    return this.bundleAnalysis;
  }

  public getOptimizationRecommendations(): OptimizationRecommendation[] {
    if (!this.bundleAnalysis) return [];
    return this.bundleAnalysis.recommendations;
  }

  public getCacheStrategy(type: string): CacheStrategy | undefined {
    return this.cacheStrategies.get(type);
  }

  public updateCacheStrategy(type: string, strategy: CacheStrategy): void {
    this.cacheStrategies.set(type, strategy);
  }

  public enableCache(type: string): boolean {
    const strategy = this.cacheStrategies.get(type);
    if (strategy) {
      strategy.enabled = true;
      return true;
    }
    return false;
  }

  public disableCache(type: string): boolean {
    const strategy = this.cacheStrategies.get(type);
    if (strategy) {
      strategy.enabled = false;
      return true;
    }
    return false;
  }

  public getCacheStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.cacheStrategies.forEach((strategy, type) => {
      stats[type] = {
        enabled: strategy.enabled,
        ttl: strategy.ttl,
        maxSize: strategy.maxSize,
        type: strategy.type
      };
    });

    return stats;
  }

  public preloadResource(url: string, type: 'script' | 'style' | 'image' | 'font'): void {
    if (typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    
    if (type === 'font') {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
  }

  public prefetchResource(url: string): void {
    if (typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }

  public optimizeImages(): void {
    // Implement image optimization strategies
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // Add loading="lazy" if not present
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      
      // Add decoding="async" for better performance
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
    });
  }

  public generatePerformanceReport(): string {
    const report = {
      coreWebVitals: this.coreWebVitals,
      performanceBudgets: this.performanceBudgets,
      bundleAnalysis: this.bundleAnalysis,
      cacheStrategies: Object.fromEntries(this.cacheStrategies),
      recommendations: this.getOptimizationRecommendations(),
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(report, null, 2);
  }

  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// Export utility functions
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const getPerformanceScore = (coreWebVitals: CoreWebVitals): number => {
  let score = 100;
  
  // FCP scoring (0-100)
  if (coreWebVitals.fcp > 3000) score -= 30;
  else if (coreWebVitals.fcp > 1800) score -= 15;
  
  // LCP scoring (0-100)
  if (coreWebVitals.lcp > 4000) score -= 30;
  else if (coreWebVitals.lcp > 2500) score -= 15;
  
  // FID scoring (0-100)
  if (coreWebVitals.fid > 300) score -= 20;
  else if (coreWebVitals.fid > 100) score -= 10;
  
  // CLS scoring (0-100)
  if (coreWebVitals.cls > 0.25) score -= 20;
  else if (coreWebVitals.cls > 0.1) score -= 10;
  
  return Math.max(0, score);
};

export const getPerformanceGrade = (score: number): string => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

// Performance Monitor - Gold-Tier UX Optimization
// Ensures 60fps animations, monitors bundle size, tracks Core Web Vitals

// import { Hardener } from '../error/Hardener';

// Performance metrics interface
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  bundleSize: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  interactionToNextPaint: number;
  animationFrameDrops: number;
  longTasks: number;
}

// Performance thresholds (gold-tier standards)
export interface PerformanceThresholds {
  targetFps: number;
  maxFrameTime: number; // ms
  maxBundleSize: number; // bytes
  maxLCP: number; // ms
  maxFID: number; // ms
  maxCLS: number; // score
  maxINP: number; // ms
  maxLongTasks: number;
}

// Performance alert levels
export enum PerformanceAlertLevel {
  GOOD = 'good',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

// Performance alert interface
export interface PerformanceAlert {
  id: string;
  level: PerformanceAlertLevel;
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  timestamp: number;
  message: string;
}

// Monitor configuration
export interface PerformanceMonitorConfig {
  enabled: boolean;
  sampleRate: number; // How often to sample (ms)
  alertThresholds: Partial<PerformanceThresholds>;
  enableWebVitals: boolean;
  enableMemoryMonitoring: boolean;
  enableBundleAnalysis: boolean;
  enableAnimationMonitoring: boolean;
}

// Monitor callbacks
export interface PerformanceMonitorCallbacks {
  onAlert?: (alert: PerformanceAlert) => void;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  onThresholdExceeded?: (metric: keyof PerformanceMetrics, value: number, threshold: number) => void;
}

// Main Performance Monitor class
export class PerformanceMonitor {
  private config: PerformanceMonitorConfig;
  private callbacks: PerformanceMonitorCallbacks;
  // private hardener: Hardener;

  // Monitoring state
  private isMonitoring = false;
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private alerts: PerformanceAlert[] = [];
  private sampleInterval: NodeJS.Timeout | null = null;

  // Animation monitoring
  private animationFrameCount = 0;
  private lastFrameTime = 0;
  private frameDrops = 0;

  // Memory monitoring
  private memoryObserver: PerformanceObserver | null = null;

  // Web Vitals observers
  private webVitalsObservers: PerformanceObserver[] = [];

  // Bundle analysis
  private bundleSize = 0;

  constructor(
    config: Partial<PerformanceMonitorConfig> = {},
    callbacks: PerformanceMonitorCallbacks = {}
  ) {
    this.config = {
      enabled: true,
      sampleRate: 1000, // 1 second
      alertThresholds: {},
      enableWebVitals: true,
      enableMemoryMonitoring: true,
      enableBundleAnalysis: true,
      enableAnimationMonitoring: true,
      ...config,
    };

    this.callbacks = callbacks;
    // this.hardener = new Hardener({ enableLogging: true });
    // Hardener logging enabled by default
    console.log('PerformanceMonitor initialized');

    // Initialize metrics
    this.metrics = {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      bundleSize: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      interactionToNextPaint: 0,
      animationFrameDrops: 0,
      longTasks: 0,
    };

    // Default thresholds (gold-tier standards)
    this.thresholds = {
      targetFps: 60,
      maxFrameTime: 16.67, // ~60fps
      maxBundleSize: 500 * 1024, // 500KB
      maxLCP: 2500, // 2.5s
      maxFID: 100, // 100ms
      maxCLS: 0.1, // 0.1 score
      maxINP: 200, // 200ms
      maxLongTasks: 0,
      ...this.config.alertThresholds,
    };
  }

  // Start monitoring
  start(): void {
    if (this.isMonitoring || !this.config.enabled) return;

    this.isMonitoring = true;
    console.log('PerformanceMonitor: Starting monitoring');

    // Start sampling
    this.startSampling();

    // Initialize Web Vitals monitoring
    if (this.config.enableWebVitals) {
      this.initializeWebVitals();
    }

    // Initialize memory monitoring
    if (this.config.enableMemoryMonitoring) {
      this.initializeMemoryMonitoring();
    }

    // Initialize animation monitoring
    if (this.config.enableAnimationMonitoring) {
      this.initializeAnimationMonitoring();
    }

    // Analyze bundle size
    if (this.config.enableBundleAnalysis) {
      this.analyzeBundleSize();
    }
  }

  // Stop monitoring
  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    console.log('PerformanceMonitor: Stopping monitoring');

    // Clear intervals
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }

    // Disconnect observers
    this.memoryObserver?.disconnect();
    this.webVitalsObservers.forEach(observer => observer.disconnect());
    this.webVitalsObservers = [];

    // Reset animation monitoring
    this.animationFrameCount = 0;
    this.lastFrameTime = 0;
    this.frameDrops = 0;
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get active alerts
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  // Clear alerts
  clearAlerts(): void {
    this.alerts = [];
  }

  // Check if performance is within thresholds
  isWithinThresholds(): boolean {
    return (
      this.metrics.fps >= this.thresholds.targetFps * 0.9 && // 90% of target FPS
      this.metrics.frameTime <= this.thresholds.maxFrameTime * 1.2 && // 120% of max frame time
      this.metrics.bundleSize <= this.thresholds.maxBundleSize &&
      this.metrics.largestContentfulPaint <= this.thresholds.maxLCP &&
      this.metrics.firstInputDelay <= this.thresholds.maxFID &&
      this.metrics.cumulativeLayoutShift <= this.thresholds.maxCLS &&
      this.metrics.interactionToNextPaint <= this.thresholds.maxINP &&
      this.metrics.longTasks <= this.thresholds.maxLongTasks
    );
  }

  // Get performance score (0-100)
  getPerformanceScore(): number {
    const metrics = [
      { value: this.metrics.fps, target: this.thresholds.targetFps, weight: 0.2 },
      { value: this.metrics.frameTime, target: this.thresholds.maxFrameTime, invert: true, weight: 0.2 },
      { value: this.metrics.bundleSize, target: this.thresholds.maxBundleSize, invert: true, weight: 0.15 },
      { value: this.metrics.largestContentfulPaint, target: this.thresholds.maxLCP, invert: true, weight: 0.15 },
      { value: this.metrics.firstInputDelay, target: this.thresholds.maxFID, invert: true, weight: 0.1 },
      { value: this.metrics.cumulativeLayoutShift, target: this.thresholds.maxCLS, invert: true, weight: 0.1 },
      { value: this.metrics.interactionToNextPaint, target: this.thresholds.maxINP, invert: true, weight: 0.1 },
    ];

    let totalScore = 0;

    for (const metric of metrics) {
      let score = 0;

      if (metric.invert) {
        // Lower values are better
        score = Math.max(0, Math.min(100, (metric.target / metric.value) * 100));
      } else {
        // Higher values are better
        score = Math.max(0, Math.min(100, (metric.value / metric.target) * 100));
      }

      totalScore += score * metric.weight;
    }

    return Math.round(totalScore);
  }

  // Private methods

  private startSampling(): void {
    this.sampleInterval = setInterval(() => {
      this.updateMetrics();
      this.checkThresholds();
      this.callbacks.onMetricsUpdate?.(this.metrics);
    }, this.config.sampleRate);
  }

  private updateMetrics(): void {
    // Update FPS and frame time
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.metrics.frameTime = frameTime;
      this.metrics.fps = Math.round(1000 / frameTime);
    }
    this.lastFrameTime = now;

    // Update animation frame drops
    if (this.metrics.frameTime > this.thresholds.maxFrameTime) {
      this.frameDrops++;
    }
    this.metrics.animationFrameDrops = this.frameDrops;

    // Update memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;
    }

    // Update bundle size (if available)
    this.metrics.bundleSize = this.bundleSize;
  }

  private checkThresholds(): void {
    const checks = [
      { metric: 'fps' as keyof PerformanceMetrics, value: this.metrics.fps, threshold: this.thresholds.targetFps, higher: true },
      { metric: 'frameTime' as keyof PerformanceMetrics, value: this.metrics.frameTime, threshold: this.thresholds.maxFrameTime, higher: false },
      { metric: 'bundleSize' as keyof PerformanceMetrics, value: this.metrics.bundleSize, threshold: this.thresholds.maxBundleSize, higher: false },
      { metric: 'largestContentfulPaint' as keyof PerformanceMetrics, value: this.metrics.largestContentfulPaint, threshold: this.thresholds.maxLCP, higher: false },
      { metric: 'firstInputDelay' as keyof PerformanceMetrics, value: this.metrics.firstInputDelay, threshold: this.thresholds.maxFID, higher: false },
      { metric: 'cumulativeLayoutShift' as keyof PerformanceMetrics, value: this.metrics.cumulativeLayoutShift, threshold: this.thresholds.maxCLS, higher: false },
      { metric: 'interactionToNextPaint' as keyof PerformanceMetrics, value: this.metrics.interactionToNextPaint, threshold: this.thresholds.maxINP, higher: false },
      { metric: 'longTasks' as keyof PerformanceMetrics, value: this.metrics.longTasks, threshold: this.thresholds.maxLongTasks, higher: false },
    ];

    for (const check of checks) {
      let exceeded = false;

      if (check.higher) {
        exceeded = check.value < check.threshold;
      } else {
        exceeded = check.value > check.threshold;
      }

      if (exceeded) {
        const alert: PerformanceAlert = {
          id: `alert_${check.metric}_${Date.now()}`,
          level: this.getAlertLevel(check.metric, check.value, check.threshold),
          metric: check.metric,
          value: check.value,
          threshold: check.threshold,
          timestamp: Date.now(),
          message: this.getAlertMessage(check.metric, check.value, check.threshold),
        };

        this.alerts.push(alert);
        this.callbacks.onAlert?.(alert);
        this.callbacks.onThresholdExceeded?.(check.metric, check.value, check.threshold);
      }
    }

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  private getAlertLevel(
    _metric: keyof PerformanceMetrics,
    value: number,
    threshold: number
  ): PerformanceAlertLevel {
    const ratio = Math.abs(value - threshold) / threshold;

    if (ratio > 0.5) return PerformanceAlertLevel.CRITICAL;
    if (ratio > 0.2) return PerformanceAlertLevel.WARNING;
    return PerformanceAlertLevel.GOOD;
  }

  private getAlertMessage(
    _metric: keyof PerformanceMetrics,
    value: number,
    threshold: number
  ): string {
    const formattedValue = this.formatMetricValue(_metric, value);
    const formattedThreshold = this.formatMetricValue(_metric, threshold);

    return `${_metric}: ${formattedValue} exceeds threshold ${formattedThreshold}`;
  }

  private formatMetricValue(metric: keyof PerformanceMetrics, value: number): string {
    switch (metric) {
      case 'fps':
        return `${value} fps`;
      case 'frameTime':
      case 'largestContentfulPaint':
      case 'firstInputDelay':
      case 'interactionToNextPaint':
        return `${value.toFixed(2)}ms`;
      case 'bundleSize':
        return `${(value / 1024).toFixed(1)}KB`;
      case 'cumulativeLayoutShift':
        return value.toFixed(3);
      case 'memoryUsage':
        return `${(value / 1024 / 1024).toFixed(1)}MB`;
      default:
        return value.toString();
    }
  }

  private initializeWebVitals(): void {
    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.largestContentfulPaint = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.webVitalsObservers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.webVitalsObservers.push(fidObserver);

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cumulativeLayoutShift = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.webVitalsObservers.push(clsObserver);

      // Interaction to Next Paint
      const inpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.interactionToNextPaint = entry.duration;
        });
      });
      inpObserver.observe({ entryTypes: ['event'] });
      this.webVitalsObservers.push(inpObserver);

    } catch (error) {
      console.warn('PerformanceMonitor: Failed to initialize Web Vitals', error);
    }
  }

  private initializeMemoryMonitoring(): void {
    try {
      this.memoryObserver = new PerformanceObserver((list) => {
        // Monitor long tasks (>50ms)
        const entries = list.getEntries();
        this.metrics.longTasks = entries.length;
      });
      this.memoryObserver.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('PerformanceMonitor: Failed to initialize memory monitoring', error);
    }
  }

  private initializeAnimationMonitoring(): void {
    const monitorFrame = (_timestamp: number) => {
      this.animationFrameCount++;

      if (this.isMonitoring) {
        requestAnimationFrame(monitorFrame);
      }
    };

    requestAnimationFrame(monitorFrame);
  }

  private analyzeBundleSize(): void {
    // Estimate bundle size from performance timing
    // In a real implementation, this would analyze the actual bundle
    try {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let totalSize = 0;

      resources.forEach(resource => {
        if (resource.transferSize) {
          totalSize += resource.transferSize;
        }
      });

      this.bundleSize = totalSize;
    } catch (error) {
      console.warn('PerformanceMonitor: Failed to analyze bundle size', error);
    }
  }
}

// Utility functions for performance monitoring

export const performanceUtils = {
  /**
   * Measure function execution time
   */
  measureExecutionTime<T>(
    fn: () => T,
    label: string = 'execution'
  ): { result: T; duration: number } {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    console.log(`Performance: ${label} took ${duration.toFixed(2)}ms`);
    return { result, duration };
  },

  /**
   * Create a performance marker
   */
  mark(label: string): void {
    if ('mark' in performance) {
      performance.mark(label);
    }
  },

  /**
   * Measure between two marks
   */
  measure(startMark: string, endMark: string, label?: string): number | null {
    if ('measure' in performance) {
      try {
        performance.measure(label || `${startMark}-to-${endMark}`, startMark, endMark);
        const measures = performance.getEntriesByName(label || `${startMark}-to-${endMark}`);
        const lastMeasure = measures[measures.length - 1];
        return lastMeasure.duration;
      } catch (error) {
        console.warn('Performance: Failed to measure', error);
        return null;
      }
    }
    return null;
  },

  /**
   * Check if device is low-end
   */
  isLowEndDevice(): boolean {
    const connection = (navigator as any).connection;
    if (connection) {
      return connection.effectiveType === 'slow-2g' ||
             connection.effectiveType === '2g' ||
             connection.saveData === true;
    }

    // Fallback: check device memory
    const deviceMemory = (navigator as any).deviceMemory;
    if (deviceMemory && deviceMemory < 4) {
      return true;
    }

    // Fallback: check hardware concurrency
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      return true;
    }

    return false;
  },

  /**
   * Get recommended animation settings based on device
   */
  getRecommendedAnimationSettings() {
    const isLowEnd = performanceUtils.isLowEndDevice();

    return {
      duration: isLowEnd ? 200 : 150, // ms
      easing: 'ease-out',
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      transform3d: !isLowEnd, // Use transform3d on capable devices
    };
  },
};

// Singleton instance
export const globalPerformanceMonitor = new PerformanceMonitor({
  enabled: true,
  sampleRate: 1000,
  enableWebVitals: true,
  enableMemoryMonitoring: true,
  enableBundleAnalysis: true,
  enableAnimationMonitoring: true,
});

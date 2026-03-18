// Advanced Performance Monitoring and Analytics System
// Tracks feature usage, performance metrics, and user satisfaction

import { supabase } from '@/lib/supabase';
import React from 'react';

// Performance Metrics Interface
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  category: 'loading' | 'interaction' | 'api' | 'render' | 'memory';
  page?: string;
  user_id?: string;
  session_id: string;
  device_info: DeviceInfo;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  viewportSize: string;
  connectionType: string;
  memoryInfo?: MemoryInfo;
  isOnline: boolean;
  isMobile: boolean;
  isPWA: boolean;
}

export interface FeatureUsageMetric {
  feature_name: string;
  action: string;
  user_id: string;
  session_id: string;
  timestamp: Date;
  context: Record<string, unknown>;
  success: boolean;
  error_message?: string;
  performance_data: {
    duration: number;
    memory_delta: number;
    network_requests: number;
  };
}

export interface UserSatisfactionMetric {
  page: string;
  rating: number; // 1-5 scale
  feedback?: string;
  user_id: string;
  timestamp: Date;
  context: {
    feature_used?: string;
    task_completed: boolean;
    time_on_page: number;
    interactions_count: number;
  };
}

// Core Performance Monitoring Service
class PerformanceMonitoringService {
  private sessionId: string;
  private startTime: number;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private featureUsage: FeatureUsageMetric[] = [];
  private observer: PerformanceObserver | null = null;
  private _isMonitoring = false;
  // Track if tables exist to avoid repeated 404 errors
  private featureUsageTableExists: boolean | null = null;
  private satisfactionTableExists: boolean | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.initializeMonitoring();
  }

  // Initialize performance monitoring
  private initializeMonitoring() {
    if (typeof window === 'undefined') return;

    // Core Web Vitals monitoring
    this.initializeCoreWebVitals();
    
    // Custom performance metrics
    this.initializeCustomMetrics();
    
    // User interaction tracking
    this.initializeInteractionTracking();
    
    // Memory usage monitoring
    this.initializeMemoryMonitoring();
    
    // Network performance monitoring
    this.initializeNetworkMonitoring();

    this._isMonitoring = true;
  }

  private initializeCoreWebVitals() {
    // First Contentful Paint (FCP)
    this.observePerformanceEntry('first-contentful-paint', (entry) => {
      this.recordMetric('FCP', entry.startTime, 'ms', 'loading');
    });

    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entry) => {
      this.recordMetric('LCP', entry.startTime, 'ms', 'loading');
    });

    // First Input Delay (FID)
    this.observePerformanceEntry('first-input', (entry) => {
      const fid = entry.processingStart - entry.startTime;
      this.recordMetric('FID', fid, 'ms', 'interaction');
    });

    // Cumulative Layout Shift (CLS)
    this.observePerformanceEntry('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        this.recordMetric('CLS', entry.value, 'score', 'render');
      }
    });
  }

  private initializeCustomMetrics() {
    // Time to Interactive (TTI)
    this.measureTimeToInteractive();
    
    // Bundle Loading Time
    this.measureBundleLoadTime();
    
    // Database Query Performance
    this.measureDatabasePerformance();
    
    // AI Response Time
    this.measureAIResponseTime();
  }

  private initializeInteractionTracking() {
    // Click tracking with performance impact
    document.addEventListener('click', (event) => {
      const startTime = performance.now();
      
      requestAnimationFrame(() => {
        const duration = performance.now() - startTime;
        this.recordInteraction('click', event.target as Element, duration);
      });
    });

    // Form interactions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.recordInteraction('form_submit', form, 0, { form_id: form.id });
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.recordMetric('page_hidden', Date.now() - this.startTime, 'ms', 'interaction');
      } else {
        this.recordMetric('page_visible', Date.now(), 'timestamp', 'interaction');
      }
    });
  }

  private initializeMemoryMonitoring() {
    const perf = performance as Performance & { memory?: MemoryInfo };
    if (perf.memory) {
      setInterval(() => {
        const memory = perf.memory!;
        this.recordMetric('heap_used', memory.usedJSHeapSize, 'bytes', 'memory');
        this.recordMetric('heap_total', memory.totalJSHeapSize, 'bytes', 'memory');
        this.recordMetric('heap_limit', memory.jsHeapSizeLimit, 'bytes', 'memory');
      }, 30000); // Every 30 seconds
    }
  }

  private initializeNetworkMonitoring() {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const firstArg = args[0];
      const url = typeof firstArg === 'string' ? firstArg : (firstArg instanceof Request ? firstArg.url : String(firstArg));
      
      // Skip monitoring for non-critical endpoints that may not exist
      const isNonCriticalEndpoint = url.includes('feature_usage_metrics') || url.includes('user_satisfaction_metrics');
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        // For non-critical endpoints with 404, don't record metrics or log errors
        if (isNonCriticalEndpoint && response.status === 404) {
          return response; // Return silently for non-critical 404s
        }
        
        this.recordMetric('api_request', duration, 'ms', 'api', {
          url: args[0],
          status: response.status,
          success: response.ok
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        // For non-critical endpoints, don't record metrics or throw errors
        if (isNonCriticalEndpoint) {
          // Return a mock response to prevent error propagation
          return new Response(null, { status: 404, statusText: 'Not Found' });
        }
        
        this.recordMetric('api_request', duration, 'ms', 'api', {
          url: args[0],
          error: error instanceof Error ? error.message : String(error),
          success: false
        });
        throw error;
      }
    };
  }

  // Observe specific performance entries
  private observePerformanceEntry(
    entryType: string,
    callback: (entry: PerformanceEntry & { processingStart?: number; hadRecentInput?: boolean; value?: number }) => void
  ) {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(callback);
        });
        
        // Use new API format for supported entry types
        try {
          observer.observe({ type: entryType, buffered: true });
        } catch {
          // Fallback to old format for entry types that don't support new API
          try {
            observer.observe({ entryTypes: [entryType] });
          } catch (e2) {
            console.warn(`Failed to observe ${entryType}:`, e2);
          }
        }
      } catch (error) {
        console.warn(`Failed to observe ${entryType}:`, error);
      }
    }
  }

  // Record performance metric
  public recordMetric(
    name: string, 
    value: number, 
    unit: string, 
    category: PerformanceMetric['category'],
    _additionalContext?: Record<string, unknown>
  ) {
    const metric: PerformanceMetric = {
      id: `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      value,
      unit,
      timestamp: new Date(),
      category,
      page: window.location.pathname,
      session_id: this.sessionId,
      device_info: this.getDeviceInfo()
    };

    // Store locally
    const categoryMetrics = this.metrics.get(category) || [];
    categoryMetrics.push(metric);
    this.metrics.set(category, categoryMetrics);

    // Send to analytics if critical metric
    if (this.isCriticalMetric(name, value, unit)) {
      this.sendToAnalytics(metric);
    }
  }

  // Record feature usage
  public recordFeatureUsage(
    featureName: string,
    action: string,
    success: boolean,
    context?: Record<string, unknown>,
    errorMessage?: string
  ) {
    const usage: FeatureUsageMetric = {
      feature_name: featureName,
      action,
      user_id: this.getCurrentUserId(),
      session_id: this.sessionId,
      timestamp: new Date(),
      context: context || {},
      success,
      error_message: errorMessage,
      performance_data: this.getPerformanceSnapshot()
    };

    this.featureUsage.push(usage);

    // Send to database for business analytics
    this.sendFeatureUsageToDatabase(usage);
  }

  // Record user satisfaction
  public recordUserSatisfaction(
    page: string,
    rating: number,
    feedback?: string,
    context?: UserSatisfactionMetric['context']
  ) {
    const satisfaction: UserSatisfactionMetric = {
      page,
      rating,
      feedback,
      user_id: this.getCurrentUserId(),
      timestamp: new Date(),
      context: context || {
        task_completed: true,
        time_on_page: Date.now() - this.startTime,
        interactions_count: this.getInteractionCount()
      }
    };

    void this.sendSatisfactionToDatabase(satisfaction);
  }

  // Measure specific operations
  public measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    return operation().then(
      (result) => {
        const duration = performance.now() - startTime;
        const memoryDelta = this.getMemoryUsage() - startMemory;
        
        this.recordMetric(`${operationName}_duration`, duration, 'ms', 'api');
        this.recordMetric(`${operationName}_memory`, memoryDelta, 'bytes', 'memory');
        
        return result;
      },
      (error) => {
        const duration = performance.now() - startTime;
        this.recordMetric(`${operationName}_error`, duration, 'ms', 'api');
        throw error;
      }
    );
  }

  // Get performance summary
  public getPerformanceSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {};

    this.metrics.forEach((metrics, category) => {
      summary[category] = {
        count: metrics.length,
        latest: metrics[metrics.length - 1],
        average: metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length
      };
    });

    return {
      session_id: this.sessionId,
      session_duration: Date.now() - this.startTime,
      metrics: summary,
      feature_usage_count: this.featureUsage.length,
      device_info: this.getDeviceInfo()
    };
  }

  // Helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      connectionType: this.getConnectionType(),
      memoryInfo: (performance as Performance & { memory?: MemoryInfo }).memory,
      isOnline: navigator.onLine,
      isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
      isPWA: window.matchMedia('(display-mode: standalone)').matches
    };
  }

  private getConnectionType(): string {
    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string };
      mozConnection?: { effectiveType?: string };
      webkitConnection?: { effectiveType?: string };
    };
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
    return connection?.effectiveType ?? 'unknown';
  }

  private getCurrentUserId(): string {
    // In a real implementation, get from auth context
    return 'anonymous';
  }

  private getMemoryUsage(): number {
    return (performance as Performance & { memory?: MemoryInfo }).memory?.usedJSHeapSize ?? 0;
  }

  private getInteractionCount(): number {
    return this.metrics.get('interaction')?.length || 0;
  }

  private getPerformanceSnapshot() {
    return {
      duration: Date.now() - this.startTime,
      memory_delta: this.getMemoryUsage(),
      network_requests: this.metrics.get('api')?.length || 0
    };
  }

  private isCriticalMetric(name: string, value: number, _unit: string): boolean {
    const criticalThresholds = {
      'FCP': 1800, // 1.8s
      'LCP': 2500, // 2.5s  
      'FID': 100,  // 100ms
      'CLS': 0.1   // 0.1 score
    } as Record<string, number>;

    return name in criticalThresholds && value > criticalThresholds[name];
  }

  private recordInteraction(type: string, element: Element, duration: number, context?: Record<string, unknown>) {
    this.recordMetric(`interaction_${type}`, duration, 'ms', 'interaction', {
      element_tag: element.tagName,
      element_id: element.id,
      element_class: element.className,
      ...context
    });
  }

  private measureTimeToInteractive() {
    // Simplified TTI measurement
    setTimeout(() => {
      const tti = performance.now();
      this.recordMetric('TTI', tti, 'ms', 'loading');
    }, 0);
  }

  private measureBundleLoadTime() {
    window.addEventListener('load', () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      this.recordMetric('bundle_load_time', loadTime, 'ms', 'loading');
    });
  }

  private measureDatabasePerformance() {
    // Monitor Supabase query performance
    // This would be integrated with your Supabase client
  }

  private measureAIResponseTime() {
    // Monitor AI chatbot response times
    // This would be integrated with your AI service calls
  }

  private sendToAnalytics(metric: PerformanceMetric): void {
    try {
      const win = window as Window & { gtag?: (a: string, b: string, c: Record<string, unknown>) => void };
      if (typeof window !== 'undefined' && win.gtag) {
        win.gtag('event', 'performance_metric', {
          custom_parameter: metric.name,
          value: metric.value,
          custom_parameter_2: metric.unit
        });
      }
    } catch (error) {
      // Silently fail - analytics might be blocked by privacy extensions
      console.debug('Analytics blocked or unavailable:', error instanceof Error ? error.message : String(error));
    }
  }

  private sendFeatureUsageToDatabase(usage: FeatureUsageMetric): void {
    // Skip if we've detected the table doesn't exist
    if (this.featureUsageTableExists === false) {
      return;
    }

    // Defer to avoid blocking critical rendering
    const sendAsync = async () => {
      try {
        const { error } = await supabase.from('feature_usage_metrics').insert({
          feature_name: usage.feature_name,
          action: usage.action,
          user_id: usage.user_id,
          session_id: usage.session_id,
          timestamp: usage.timestamp.toISOString(),
          context: usage.context,
          success: usage.success,
          error_message: usage.error_message,
          performance_data: usage.performance_data
        });
        
        if (error) {
          // Check for 404 or table not found errors
          if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('404') || error.code === 'PGRST116') {
            // Table doesn't exist - mark as false to skip future attempts
            this.featureUsageTableExists = false;
            return;
          }
          // For other errors, assume table exists but there was a different issue
          this.featureUsageTableExists = true;
        } else {
          // Success - table exists
          this.featureUsageTableExists = true;
        }
      } catch (_error) {
        // Silently fail - table may not exist in all environments
        // Mark as false to skip future attempts
        this.featureUsageTableExists = false;
      }
    };
    
    // Use requestIdleCallback if available, otherwise setTimeout
    const win = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number };
    if (typeof window !== 'undefined' && win.requestIdleCallback) {
      win.requestIdleCallback(() => { void sendAsync(); }, { timeout: 5000 });
    } else {
      setTimeout(() => { void sendAsync(); }, 0);
    }
  }

  private async sendSatisfactionToDatabase(satisfaction: UserSatisfactionMetric) {
    // Skip if we've detected the table doesn't exist
    if (this.satisfactionTableExists === false) {
      return;
    }

    try {
      const { error } = await supabase.from('user_satisfaction_metrics').insert({
        page: satisfaction.page,
        rating: satisfaction.rating,
        feedback: satisfaction.feedback,
        user_id: satisfaction.user_id,
        timestamp: satisfaction.timestamp.toISOString(),
        context: satisfaction.context
      });
      
      if (error) {
        // Check for 404 or table not found errors
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('404') || error.code === 'PGRST116') {
          // Table doesn't exist - mark as false to skip future attempts
          this.satisfactionTableExists = false;
          return;
        }
        // For other errors, assume table exists
        this.satisfactionTableExists = true;
      } else {
        // Success - table exists
        this.satisfactionTableExists = true;
      }
    } catch (_error) {
      // Silently fail - mark as false to skip future attempts
      this.satisfactionTableExists = false;
    }
  }

  // Cleanup
  public stopMonitoring() {
    this._isMonitoring = false;
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// React hooks for performance monitoring
export const usePerformanceMonitoring = () => {
  const [monitoring] = React.useState(() => new PerformanceMonitoringService());
  
  React.useEffect(() => {
    return () => monitoring.stopMonitoring();
  }, [monitoring]);

  const measureOperation = React.useCallback(
    <T>(name: string, operation: () => Promise<T>) => 
      monitoring.measureOperation(name, operation),
    [monitoring]
  );

  const recordFeatureUsage = React.useCallback(
    (feature: string, action: string, success: boolean, context?: Record<string, unknown>, error?: string) =>
      monitoring.recordFeatureUsage(feature, action, success, context, error),
    [monitoring]
  );

  const recordSatisfaction = React.useCallback(
    (rating: number, feedback?: string) => {
      const page = window.location.pathname;
      monitoring.recordUserSatisfaction(page, rating, feedback);
    },
    [monitoring]
  );

  const getPerformanceSummary = React.useCallback(
    () => monitoring.getPerformanceSummary(),
    [monitoring]
  );

  return {
    measureOperation,
    recordFeatureUsage,
    recordSatisfaction,
    getPerformanceSummary
  };
};

// Performance monitoring service instance
export const performanceMonitor = new PerformanceMonitoringService();

// Utility functions
export const trackFeatureUsage = (feature: string, action: string) => {
  performanceMonitor.recordFeatureUsage(feature, action, true);
};

export const trackError = (feature: string, action: string, error: string) => {
  performanceMonitor.recordFeatureUsage(feature, action, false, {}, error);
};

export default performanceMonitor;

// Advanced Performance Monitoring and Analytics System
// Tracks feature usage, performance metrics, and user satisfaction

import React from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

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
  context: Record<string, any>;
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
  private isMonitoring = false;

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

    this.isMonitoring = true;
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
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
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
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        this.recordMetric('api_request', duration, 'ms', 'api', {
          url: args[0],
          status: response.status,
          success: response.ok
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.recordMetric('api_request', duration, 'ms', 'api', {
          url: args[0],
          error: error.message,
          success: false
        });
        throw error;
      }
    };
  }

  // Observe specific performance entries
  private observePerformanceEntry(entryType: string, callback: (entry: any) => void) {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(callback);
        });
        
        observer.observe({ entryTypes: [entryType] });
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
    additionalContext?: Record<string, any>
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
    context?: Record<string, any>,
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

    this.sendSatisfactionToDatabase(satisfaction);
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
  public getPerformanceSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

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
      memoryInfo: (performance as any).memory,
      isOnline: navigator.onLine,
      isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
      isPWA: window.matchMedia('(display-mode: standalone)').matches
    };
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  private getCurrentUserId(): string {
    // In a real implementation, get from auth context
    return 'anonymous';
  }

  private getMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
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

  private isCriticalMetric(name: string, value: number, unit: string): boolean {
    const criticalThresholds = {
      'FCP': 1800, // 1.8s
      'LCP': 2500, // 2.5s  
      'FID': 100,  // 100ms
      'CLS': 0.1   // 0.1 score
    };

    return name in criticalThresholds && value > criticalThresholds[name];
  }

  private recordInteraction(type: string, element: Element, duration: number, context?: any) {
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

  private async sendToAnalytics(metric: PerformanceMetric) {
    try {
      // Send to your analytics service (Google Analytics, Mixpanel, etc.)
      if (window.gtag) {
        window.gtag('event', 'performance_metric', {
          custom_parameter: metric.name,
          value: metric.value,
          custom_parameter_2: metric.unit
        });
      }
    } catch (error) {
      console.warn('Failed to send analytics:', error);
    }
  }

  private async sendFeatureUsageToDatabase(usage: FeatureUsageMetric) {
    try {
      await supabase.from('feature_usage_metrics').insert({
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
    } catch (error) {
      console.warn('Failed to record feature usage:', error);
    }
  }

  private async sendSatisfactionToDatabase(satisfaction: UserSatisfactionMetric) {
    try {
      await supabase.from('user_satisfaction_metrics').insert({
        page: satisfaction.page,
        rating: satisfaction.rating,
        feedback: satisfaction.feedback,
        user_id: satisfaction.user_id,
        timestamp: satisfaction.timestamp.toISOString(),
        context: satisfaction.context
      });
    } catch (error) {
      console.warn('Failed to record satisfaction:', error);
    }
  }

  // Cleanup
  public stopMonitoring() {
    this.isMonitoring = false;
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
    (feature: string, action: string, success: boolean, context?: any, error?: string) =>
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
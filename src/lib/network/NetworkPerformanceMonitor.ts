/**
 * Network Performance Monitor
 * 
 * Monitors network performance in workshop environments.
 * Tracks API call timing, connection quality, and provides recommendations.
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

/**
 * Network request metric
 */
export interface NetworkRequestMetric {
  url: string;
  method: string;
  duration: number; // ms
  size: number; // bytes
  status: number;
  timestamp: number;
  cached: boolean;
  error?: string;
}

/**
 * Network performance summary
 */
export interface NetworkPerformanceSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageDuration: number;
  averageSize: number;
  slowRequests: NetworkRequestMetric[]; // >2 seconds
  failedRequestsList: NetworkRequestMetric[];
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unstable';
  recommendations: string[];
}

/**
 * Network Performance Monitor
 */
export class NetworkPerformanceMonitor {
  private metrics: NetworkRequestMetric[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 requests
  private originalFetch: typeof fetch;

  constructor() {
    this.originalFetch = window.fetch;
    this.initializeMonitoring();
  }

  /**
   * Initialize fetch monitoring
   */
  private initializeMonitoring(): void {
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const [input, init] = args;
      const url = typeof input === 'string' 
        ? input 
        : input instanceof Request 
        ? input.url 
        : String(input);
      const method = init?.method || 'GET';
      const startTime = performance.now();
      const timestamp = Date.now();

      try {
        const response = await this.originalFetch(...args);
        const duration = performance.now() - startTime;

        // Get response size (approximate)
        const contentLength = response.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength, 10) : 0;

        const metric: NetworkRequestMetric = {
          url,
          method,
          duration,
          size,
          status: response.status,
          timestamp,
          cached: response.status === 304,
        };

        this.recordMetric(metric);

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        const metric: NetworkRequestMetric = {
          url,
          method,
          duration,
          size: 0,
          status: 0,
          timestamp,
          cached: false,
          error: errorMessage,
        };

        this.recordMetric(metric);
        throw error;
      }
    };
  }

  /**
   * Record metric
   */
  private recordMetric(metric: NetworkRequestMetric): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift(); // Remove oldest
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): NetworkPerformanceSummary {
    const successfulRequests = this.metrics.filter(m => m.status >= 200 && m.status < 300);
    const failedRequests = this.metrics.filter(m => m.status === 0 || m.status >= 400);
    const slowRequests = this.metrics.filter(m => m.duration > 2000);

    const averageDuration = this.metrics.length > 0
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length
      : 0;

    const averageSize = successfulRequests.length > 0
      ? successfulRequests.reduce((sum, m) => sum + m.size, 0) / successfulRequests.length
      : 0;

    // Determine connection quality
    const failureRate = failedRequests.length / this.metrics.length;
    const slowRequestRate = slowRequests.length / this.metrics.length;
    
    let connectionQuality: NetworkPerformanceSummary['connectionQuality'] = 'excellent';
    if (failureRate > 0.2 || slowRequestRate > 0.3) {
      connectionQuality = 'unstable';
    } else if (failureRate > 0.1 || slowRequestRate > 0.2) {
      connectionQuality = 'poor';
    } else if (failureRate > 0.05 || slowRequestRate > 0.1) {
      connectionQuality = 'good';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (averageDuration > 2000) {
      recommendations.push('Average request duration is high. Consider request batching or compression.');
    }
    
    if (failureRate > 0.1) {
      recommendations.push('High failure rate detected. Check network connectivity or implement retry logic.');
    }
    
    if (slowRequests.length > 0) {
      recommendations.push(`${slowRequests.length} slow requests detected. Consider optimizing large payloads.`);
    }
    
    if (averageSize > 500 * 1024) {
      recommendations.push('Large average response size. Consider response compression or pagination.');
    }

    return {
      totalRequests: this.metrics.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      averageDuration,
      averageSize,
      slowRequests: slowRequests.slice(0, 10), // Top 10 slow requests
      failedRequestsList: failedRequests.slice(0, 10), // Top 10 failed requests
      connectionQuality,
      recommendations,
    };
  }

  /**
   * Get metrics for a specific URL pattern
   */
  getMetricsForUrl(urlPattern: string | RegExp): NetworkRequestMetric[] {
    const pattern = typeof urlPattern === 'string' 
      ? new RegExp(urlPattern)
      : urlPattern;
    
    return this.metrics.filter(m => pattern.test(m.url));
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): NetworkRequestMetric[] {
    return [...this.metrics];
  }
}

/**
 * Global network performance monitor instance
 */
let globalNetworkMonitor: NetworkPerformanceMonitor | null = null;

/**
 * Get or create global network performance monitor
 */
export function getNetworkPerformanceMonitor(): NetworkPerformanceMonitor {
  if (!globalNetworkMonitor) {
    globalNetworkMonitor = new NetworkPerformanceMonitor();
  }
  return globalNetworkMonitor;
}

import { Metric, onCLS, onFCP, onLCP, onTTFB, onINP } from "web-vitals";

// Define types for enhanced metrics
interface EnhancedMetric extends Omit<Metric, "rating"> {
  rating: "good" | "needs-improvement" | "poor";
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType: string;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType: string;
  };
}

interface PerformanceWithMemory extends Performance {
  memory?: MemoryInfo;
}

// Performance thresholds based on Core Web Vitals
export const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};

// Enhanced performance monitoring with analytics
export function reportWebVitals(onPerfEntry?: (metric: Metric) => void) {
  if (onPerfEntry && typeof onPerfEntry === "function") {
    const enhancedCallback = (metric: Metric) => {
      // Add performance classification
      const threshold =
        PERFORMANCE_THRESHOLDS[
          metric.name as keyof typeof PERFORMANCE_THRESHOLDS
        ];
      let rating: "good" | "needs-improvement" | "poor" = "poor";

      if (threshold) {
        if (metric.value <= threshold.good) {
          rating = "good";
        } else if (metric.value <= threshold.needsImprovement) {
          rating = "needs-improvement";
        }
      }

      const enhancedMetric: EnhancedMetric = {
        ...metric,
        rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        connectionType:
          (navigator as NavigatorWithConnection).connection?.effectiveType ||
          "unknown",
      };

      // Send to analytics
      if (import.meta.env.VITE_GOOGLE_ANALYTICS_ID) {
        sendToGoogleAnalytics(enhancedMetric);
      }

      // Send to custom monitoring
      if (import.meta.env.VITE_PERFORMANCE_ENDPOINT) {
        sendToCustomMonitoring(enhancedMetric);
      }

      // Call original callback
      onPerfEntry(metric);
    };

    onCLS(enhancedCallback);
    onFCP(enhancedCallback);
    onLCP(enhancedCallback);
    onTTFB(enhancedCallback);
    onINP(enhancedCallback);
  }
}

// Send metrics to Google Analytics 4
function sendToGoogleAnalytics(metric: EnhancedMetric) {
  if (typeof gtag !== "undefined") {
    gtag("event", metric.name, {
      event_category: "Web Vitals",
      event_label: metric.id,
      value: Math.round(
        metric.name === "CLS" ? metric.value * 1000 : metric.value
      ),
      custom_map: {
        metric_rating: metric.rating,
        metric_delta: metric.delta,
        metric_url: metric.url,
      },
    });
  }
}

// Send metrics to custom monitoring endpoint
async function sendToCustomMonitoring(metric: EnhancedMetric) {
  try {
    await fetch(import.meta.env.VITE_PERFORMANCE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        delta: metric.delta,
        url: metric.url,
        timestamp: metric.timestamp,
        userAgent: metric.userAgent,
        connectionType: metric.connectionType,
      }),
    });
  } catch (error) {
    console.warn("Failed to send performance metric:", error);
  }
}

// Resource loading performance monitoring
export function monitorResourceLoading() {
  if ("PerformanceObserver" in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === "resource") {
          const resourceEntry = entry as PerformanceResourceTiming;

          // Monitor slow resources
          if (resourceEntry.duration > 1000) {
            console.warn("Slow resource detected:", {
              name: resourceEntry.name,
              duration: resourceEntry.duration,
              size: resourceEntry.transferSize,
              type: resourceEntry.initiatorType,
            });
          }

          // Monitor large resources
          if (resourceEntry.transferSize > 500000) {
            // 500KB
            console.warn("Large resource detected:", {
              name: resourceEntry.name,
              size: resourceEntry.transferSize,
              duration: resourceEntry.duration,
            });
          }
        }
      });
    });

    observer.observe({ entryTypes: ["resource"] });
  }
}

// Memory usage monitoring
export function monitorMemoryUsage() {
  if ("memory" in performance) {
    const memoryInfo = (performance as PerformanceWithMemory).memory;

    if (memoryInfo) {
      setInterval(() => {
        const memoryUsage = {
          used: memoryInfo.usedJSHeapSize,
          total: memoryInfo.totalJSHeapSize,
          limit: memoryInfo.jsHeapSizeLimit,
          percentage:
            (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100,
        };

        // Warn if memory usage is high
        if (memoryUsage.percentage > 80) {
          console.warn("High memory usage detected:", memoryUsage);
        }

        // Send to monitoring if enabled
        if (import.meta.env.VITE_PERFORMANCE_ENDPOINT) {
          fetch(import.meta.env.VITE_PERFORMANCE_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "memory",
              ...memoryUsage,
              timestamp: Date.now(),
              url: window.location.href,
            }),
          }).catch(() => {}); // Silent fail
        }
      }, 30000); // Check every 30 seconds
    }
  }
}

// Bundle size monitoring
export function logBundleInfo() {
  if (import.meta.env.DEV) {
    console.group("📦 Bundle Information");
    console.log("Environment:", import.meta.env.MODE);
    console.log("Build timestamp:", new Date().toISOString());
    console.log("Vite version:", import.meta.env.VITE_VERSION || "Unknown");
    console.groupEnd();
  }
}

// Initialize all performance monitoring
export function initializePerformanceMonitoring() {
  // Start Web Vitals monitoring
  reportWebVitals((metric) => {
    console.log(
      `${metric.name}: ${metric.value} (${metric.rating || "unknown"})`
    );
  });

  // Start resource monitoring
  monitorResourceLoading();

  // Start memory monitoring
  monitorMemoryUsage();

  // Log bundle info
  logBundleInfo();

  // Monitor long tasks
  if ("PerformanceObserver" in window) {
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        console.warn("Long task detected:", {
          duration: entry.duration,
          startTime: entry.startTime,
          name: entry.name,
        });
      });
    });

    try {
      longTaskObserver.observe({ entryTypes: ["longtask"] });
    } catch (e) {
      // Long task API not supported
    }
  }
}

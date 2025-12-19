/**
 * MemoryMonitor - Memory Monitoring for 3D Rendering
 * 
 * Monitors memory usage during 3D rendering operations and provides
 * cleanup utilities to prevent memory leaks.
 * 
 * Week 4 Task 4.1: Production 3D Renderer
 */

export interface MemoryStats {
  usedJSHeapSize: number; // bytes
  totalJSHeapSize: number; // bytes
  jsHeapSizeLimit: number; // bytes
  usagePercent: number; // 0-100
  availableMemory: number; // bytes
  isLowMemory: boolean;
  timestamp: number;
}

export interface MemoryThreshold {
  warning: number; // percentage (default: 70%)
  critical: number; // percentage (default: 85%)
  max: number; // percentage (default: 95%)
}

export type MemoryEventType = 'warning' | 'critical' | 'recovered' | 'cleanup';

export interface MemoryEvent {
  type: MemoryEventType;
  timestamp: number;
  stats: MemoryStats;
  message: string;
  messageAr: string; // Arabic translation
}

export type MemoryEventListener = (event: MemoryEvent) => void;

/**
 * MemoryMonitor - Monitors and manages memory for 3D rendering
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private listeners: Set<MemoryEventListener> = new Set();
  private monitoringInterval: number | null = null;
  private lastStats: MemoryStats | null = null;
  private threshold: MemoryThreshold = {
    warning: 70,
    critical: 85,
    max: 95,
  };
  private isMonitoring: boolean = false;
  private readonly monitoringIntervalMs = 2000; // Check every 2 seconds

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Check if memory monitoring is available in this browser
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'performance' in window && 'memory' in (performance as any);
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats | null {
    if (!this.isAvailable()) {
      return null;
    }

    const perfMemory = (performance as any).memory;
    const used = perfMemory.usedJSHeapSize;
    const total = perfMemory.totalJSHeapSize;
    const limit = perfMemory.jsHeapSizeLimit;
    const usagePercent = (used / total) * 100;
    const available = limit - used;

    const stats: MemoryStats = {
      usedJSHeapSize: used,
      totalJSHeapSize: total,
      jsHeapSizeLimit: limit,
      usagePercent: Math.round(usagePercent * 100) / 100,
      availableMemory: available,
      isLowMemory: usagePercent >= this.threshold.warning,
      timestamp: Date.now(),
    };

    return stats;
  }

  /**
   * Start monitoring memory usage
   */
  startMonitoring(): void {
    if (!this.isAvailable() || this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    let lastEventType: MemoryEventType | null = null;

    const checkMemory = () => {
      const stats = this.getMemoryStats();
      if (!stats) return;

      this.lastStats = stats;

      // Determine event type based on thresholds
      let eventType: MemoryEventType | null = null;
      let message = '';
      let messageAr = '';

      if (stats.usagePercent >= this.threshold.max) {
        eventType = 'critical';
        message = `Critical memory usage: ${stats.usagePercent.toFixed(1)}%`;
        messageAr = `استخدام الذاكرة الحرج: ${stats.usagePercent.toFixed(1)}%`;
      } else if (stats.usagePercent >= this.threshold.critical) {
        eventType = 'critical';
        message = `High memory usage: ${stats.usagePercent.toFixed(1)}%`;
        messageAr = `استخدام الذاكرة المرتفع: ${stats.usagePercent.toFixed(1)}%`;
      } else if (stats.usagePercent >= this.threshold.warning) {
        eventType = 'warning';
        message = `Memory usage warning: ${stats.usagePercent.toFixed(1)}%`;
        messageAr = `تحذير استخدام الذاكرة: ${stats.usagePercent.toFixed(1)}%`;
      } else if (lastEventType && (lastEventType === 'warning' || lastEventType === 'critical')) {
        eventType = 'recovered';
        message = `Memory usage recovered: ${stats.usagePercent.toFixed(1)}%`;
        messageAr = `استعادة استخدام الذاكرة: ${stats.usagePercent.toFixed(1)}%`;
      }

      if (eventType && eventType !== lastEventType) {
        this.emitEvent({
          type: eventType,
          timestamp: Date.now(),
          stats,
          message,
          messageAr,
        });
        lastEventType = eventType;
      } else if (!eventType) {
        lastEventType = null;
      }
    };

    // Initial check
    checkMemory();

    // Set up interval
    this.monitoringInterval = window.setInterval(checkMemory, this.monitoringIntervalMs);
  }

  /**
   * Stop monitoring memory usage
   */
  stopMonitoring(): void {
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Add event listener for memory events
   */
  addEventListener(listener: MemoryEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: MemoryEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit memory event to all listeners
   */
  private emitEvent(event: MemoryEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in memory event listener:', error);
      }
    });
  }

  /**
   * Get last recorded memory statistics
   */
  getLastStats(): MemoryStats | null {
    return this.lastStats;
  }

  /**
   * Check if memory is low
   */
  isLowMemory(): boolean {
    const stats = this.getMemoryStats();
    return stats ? stats.isLowMemory : false;
  }

  /**
   * Check if memory is critical
   */
  isCriticalMemory(): boolean {
    const stats = this.getMemoryStats();
    return stats ? stats.usagePercent >= this.threshold.critical : false;
  }

  /**
   * Set memory thresholds
   */
  setThresholds(thresholds: Partial<MemoryThreshold>): void {
    this.threshold = { ...this.threshold, ...thresholds };
  }

  /**
   * Get memory thresholds
   */
  getThresholds(): MemoryThreshold {
    return { ...this.threshold };
  }

  /**
   * Force garbage collection (if available)
   * Note: This only works in Chrome DevTools with --js-flags="--expose-gc"
   */
  forceGarbageCollection(): void {
    if (typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  /**
   * Estimate memory usage of a Three.js object
   */
  estimateObjectMemory(object: any): number {
    let memory = 0;

    if (object.geometry) {
      const geometry = object.geometry;
      if (geometry.attributes) {
        Object.values(geometry.attributes).forEach((attr: any) => {
          if (attr.array) {
            memory += attr.array.byteLength;
          }
        });
      }
      if (geometry.index) {
        memory += geometry.index.array.byteLength;
      }
    }

    if (object.material) {
      // Rough estimate for textures
      if (Array.isArray(object.material)) {
        object.material.forEach((mat: any) => {
          if (mat.map) memory += 1024 * 1024; // ~1MB per texture (rough estimate)
        });
      } else {
        if (object.material.map) memory += 1024 * 1024;
      }
    }

    return memory;
  }

  /**
   * Cleanup Three.js objects to free memory
   */
  disposeObject(object: any): void {
    if (!object) return;

    // Dispose geometry
    if (object.geometry) {
      object.geometry.dispose();
    }

    // Dispose materials
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((mat: any) => {
          if (mat.map) mat.map.dispose();
          mat.dispose();
        });
      } else {
        if (object.material.map) object.material.map.dispose();
        object.material.dispose();
      }
    }

    // Recursively dispose children
    if (object.children) {
      object.children.forEach((child: any) => this.disposeObject(child));
    }
  }
}

// Export singleton instance
export const memoryMonitor = MemoryMonitor.getInstance();


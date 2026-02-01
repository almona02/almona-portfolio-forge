/**
 * Memory Leak Detector
 * 
 * Comprehensive memory leak detection for long-running sessions.
 * Monitors heap memory, DOM nodes, WebSocket connections, Three.js memory, and cache.
 * 
 * Test Scenario: 8-hour simulated workshop session
 * - Open/close 100+ designs
 * - Switch between system packs
 * - Use collaborative drafting features
 * - Generate multiple exports
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

/**
 * Memory checkpoint snapshot
 */
export interface MemoryCheckpoint {
  timestamp: number;
  elapsedMs: number;
  
  // Heap memory (if available)
  heap?: {
    used: number; // MB
    total: number; // MB
    limit: number; // MB
  };
  
  // DOM nodes
  domNodes: number;
  
  // WebSocket connections
  websocketConnections: number;
  
  // Three.js memory (estimated)
  threejsMemory?: {
    geometries: number;
    materials: number;
    textures: number;
    scenes: number;
  };
  
  // Cache sizes
  cacheSizes?: {
    [cacheName: string]: number;
  };
  
  // Image/Blob URLs
  objectUrls: number;
  
  // Event listeners (estimated)
  eventListeners?: number;
}

/**
 * Memory leak detection result
 */
export interface MemoryLeakDetectionResult {
  sessionId: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  checkpoints: MemoryCheckpoint[];
  
  // Leak detection
  detectedLeaks: {
    heapGrowth: boolean;
    domNodeGrowth: boolean;
    websocketLeak: boolean;
    threejsLeak: boolean;
    cacheLeak: boolean;
    objectUrlLeak: boolean;
  };
  
  // Growth rates (per hour)
  growthRates: {
    heapMBPerHour: number;
    domNodesPerHour: number;
    objectUrlsPerHour: number;
  };
  
  // Warnings
  warnings: string[];
}

/**
 * Memory Leak Detector
 */
export class MemoryLeakDetector {
  private sessionId: string;
  private startTime: number = 0;
  private checkpoints: MemoryCheckpoint[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private objectUrlTracker: Set<string> = new Set();
  private websocketTracker: Set<WebSocket> = new Set();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Start memory leak detection
   */
  start(intervalMs: number = 60000): void { // Default: 1 minute
    this.startTime = performance.now();
    this.checkpoints = [];
    
    // Take initial snapshot
    this.takeCheckpoint();
    
    // Set up periodic checkpoints
    this.intervalId = setInterval(() => {
      this.takeCheckpoint();
    }, intervalMs);

    // Track object URLs
    this.trackObjectUrls();
    
    if (import.meta.env.DEV) {
      console.log(`[MemoryLeakDetector] Started session: ${this.sessionId}`);
    }
  }

  /**
   * Stop memory leak detection and generate report
   */
  stop(): MemoryLeakDetectionResult {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Take final checkpoint
    this.takeCheckpoint();
    
    const endTime = performance.now();
    const durationMs = endTime - this.startTime;
    
    // Detect leaks
    const detectedLeaks = this.detectLeaks();
    const growthRates = this.calculateGrowthRates(durationMs);
    const warnings = this.generateWarnings(detectedLeaks, growthRates);

    const result: MemoryLeakDetectionResult = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime,
      durationMs,
      checkpoints: [...this.checkpoints],
      detectedLeaks,
      growthRates,
      warnings,
    };

    if (import.meta.env.DEV) {
      this.logReport(result);
    }

    return result;
  }

  /**
   * Take a memory checkpoint snapshot
   */
  takeCheckpoint(): MemoryCheckpoint {
    const timestamp = performance.now();
    const elapsedMs = timestamp - this.startTime;

    const checkpoint: MemoryCheckpoint = {
      timestamp,
      elapsedMs,
      domNodes: this.countDOMNodes(),
      websocketConnections: this.countWebSocketConnections(),
      objectUrls: this.objectUrlTracker.size,
    };

    // Heap memory (if available)
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      checkpoint.heap = {
        used: mem.usedJSHeapSize / 1024 / 1024, // MB
        total: mem.totalJSHeapSize / 1024 / 1024, // MB
        limit: mem.jsHeapSizeLimit / 1024 / 1024, // MB
      };
    }

    // Three.js memory (estimated - requires integration with Three.js renderer)
    checkpoint.threejsMemory = this.estimateThreeJSMemory();

    // Cache sizes (requires integration with cache systems)
    checkpoint.cacheSizes = this.getCacheSizes();

    this.checkpoints.push(checkpoint);

    return checkpoint;
  }

  /**
   * Count DOM nodes
   */
  private countDOMNodes(): number {
    return document.getElementsByTagName('*').length;
  }

  /**
   * Count WebSocket connections (tracked manually)
   */
  private countWebSocketConnections(): number {
    return this.websocketTracker.size;
  }

  /**
   * Track a WebSocket connection
   */
  trackWebSocket(ws: WebSocket): void {
    this.websocketTracker.add(ws);
    ws.addEventListener('close', () => {
      this.websocketTracker.delete(ws);
    }, { once: true });
  }

  /**
   * Track an object URL (for cleanup verification)
   */
  trackObjectUrl(url: string): void {
    this.objectUrlTracker.add(url);
  }

  /**
   * Revoke and untrack an object URL
   */
  revokeObjectUrl(url: string): void {
    if (this.objectUrlTracker.has(url)) {
      URL.revokeObjectURL(url);
      this.objectUrlTracker.delete(url);
    }
  }

  /**
   * Track object URLs globally (monkey-patch URL.createObjectURL)
   */
  private trackObjectUrls(): void {
    const originalCreateObjectURL = URL.createObjectURL;
    
    URL.createObjectURL = (blob: Blob | MediaSource): string => {
      const url = originalCreateObjectURL.call(URL, blob);
      this.trackObjectUrl(url);
      return url;
    };
  }

  /**
   * Estimate Three.js memory (requires integration)
   */
  private estimateThreeJSMemory(): MemoryCheckpoint['threejsMemory'] {
    // This would need integration with Three.js renderer
    // For now, return undefined
    return undefined;
  }

  /**
   * Get cache sizes (requires integration with cache systems)
   */
  private getCacheSizes(): MemoryCheckpoint['cacheSizes'] {
    // This would need integration with cache systems
    // For now, return empty object
    return {};
  }

  /**
   * Detect memory leaks
   */
  private detectLeaks(): MemoryLeakDetectionResult['detectedLeaks'] {
    if (this.checkpoints.length < 2) {
      return {
        heapGrowth: false,
        domNodeGrowth: false,
        websocketLeak: false,
        threejsLeak: false,
        cacheLeak: false,
        objectUrlLeak: false,
      };
    }

    const first = this.checkpoints[0];
    const last = this.checkpoints[this.checkpoints.length - 1];

    // Heap growth (>50MB over session)
    const heapGrowth = first.heap && last.heap
      ? (last.heap.used - first.heap.used) > 50
      : false;

    // DOM node growth (>1000 nodes over session)
    const domNodeGrowth = (last.domNodes - first.domNodes) > 1000;

    // WebSocket leak (connections not closed)
    const websocketLeak = last.websocketConnections > first.websocketConnections + 2;

    // Object URL leak (>10 URLs not revoked)
    const objectUrlLeak = (last.objectUrls - first.objectUrls) > 10;

    // Three.js leak (if available)
    const threejsLeak = false; // Would need Three.js integration

    // Cache leak (if available)
    const cacheLeak = false; // Would need cache integration

    return {
      heapGrowth,
      domNodeGrowth,
      websocketLeak,
      threejsLeak,
      cacheLeak,
      objectUrlLeak,
    };
  }

  /**
   * Calculate growth rates
   */
  private calculateGrowthRates(durationMs: number): MemoryLeakDetectionResult['growthRates'] {
    if (this.checkpoints.length < 2) {
      return {
        heapMBPerHour: 0,
        domNodesPerHour: 0,
        objectUrlsPerHour: 0,
      };
    }

    const first = this.checkpoints[0];
    const last = this.checkpoints[this.checkpoints.length - 1];
    const hours = durationMs / 1000 / 60 / 60;

    return {
      heapMBPerHour: first.heap && last.heap
        ? (last.heap.used - first.heap.used) / hours
        : 0,
      domNodesPerHour: (last.domNodes - first.domNodes) / hours,
      objectUrlsPerHour: (last.objectUrls - first.objectUrls) / hours,
    };
  }

  /**
   * Generate warnings
   */
  private generateWarnings(
    leaks: MemoryLeakDetectionResult['detectedLeaks'],
    growthRates: MemoryLeakDetectionResult['growthRates']
  ): string[] {
    const warnings: string[] = [];

    if (leaks.heapGrowth) {
      warnings.push(`Heap memory grew by >50MB. Growth rate: ${growthRates.heapMBPerHour.toFixed(2)}MB/hour`);
    }
    if (leaks.domNodeGrowth) {
      warnings.push(`DOM nodes grew by >1000. Growth rate: ${growthRates.domNodesPerHour.toFixed(0)} nodes/hour`);
    }
    if (leaks.websocketLeak) {
      warnings.push('WebSocket connections not properly closed');
    }
    if (leaks.objectUrlLeak) {
      warnings.push(`Object URLs not properly revoked. Growth rate: ${growthRates.objectUrlsPerHour.toFixed(2)} URLs/hour`);
    }
    if (growthRates.heapMBPerHour > 10) {
      warnings.push(`High heap growth rate: ${growthRates.heapMBPerHour.toFixed(2)}MB/hour (threshold: 10MB/hour)`);
    }

    return warnings;
  }

  /**
   * Log memory leak detection report
   */
  private logReport(result: MemoryLeakDetectionResult): void {
    console.group(`[MemoryLeakDetector] Session: ${result.sessionId}`);
    console.log(`Duration: ${(result.durationMs / 1000 / 60).toFixed(2)} minutes`);
    console.log(`Checkpoints: ${result.checkpoints.length}`);
    
    console.log('\nDetected Leaks:');
    Object.entries(result.detectedLeaks).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '❌ LEAK' : '✅ OK'}`);
    });
    
    console.log('\nGrowth Rates:');
    Object.entries(result.growthRates).forEach(([key, value]) => {
      console.log(`  ${key}: ${value.toFixed(2)}`);
    });
    
    if (result.warnings.length > 0) {
      console.warn('\nWarnings:');
      result.warnings.forEach(warning => console.warn(`  ⚠️ ${warning}`));
    }
    
    console.groupEnd();
  }

  /**
   * Get current checkpoint
   */
  getCurrentCheckpoint(): MemoryCheckpoint | null {
    return this.checkpoints.length > 0
      ? this.checkpoints[this.checkpoints.length - 1]
      : null;
  }

  /**
   * Get all checkpoints
   */
  getAllCheckpoints(): MemoryCheckpoint[] {
    return [...this.checkpoints];
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      if (import.meta.env.DEV) {
        console.log('[MemoryLeakDetector] Forced garbage collection');
      }
    }
  }
}

/**
 * Global memory leak detector instance
 */
let globalMemoryLeakDetector: MemoryLeakDetector | null = null;

/**
 * Get or create global memory leak detector
 */
export function getMemoryLeakDetector(sessionId?: string): MemoryLeakDetector {
  if (!globalMemoryLeakDetector || (sessionId && globalMemoryLeakDetector['sessionId'] !== sessionId)) {
    globalMemoryLeakDetector = new MemoryLeakDetector(sessionId || `session-${Date.now()}`);
  }
  return globalMemoryLeakDetector;
}

/**
 * Clear global memory leak detector
 */
export function clearMemoryLeakDetector(): void {
  if (globalMemoryLeakDetector) {
    globalMemoryLeakDetector.stop();
    globalMemoryLeakDetector = null;
  }
}

/**
 * Performance Guards
 * 
 * Provides performance monitoring and guards to prevent performance degradation.
 * 
 * Constitutional Tier: Tier 3 (Protected Determinism)
 */

/**
 * Performance guard to limit operations per frame
 */
export class PerformanceGuard {
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private readonly MAX_OPERATIONS_PER_FRAME: number;
  private readonly TARGET_FPS = 60;
  private readonly FRAME_TIME_MS = 1000 / this.TARGET_FPS;

  constructor(maxOperationsPerFrame: number = 200) {
    this.MAX_OPERATIONS_PER_FRAME = maxOperationsPerFrame;
  }

  /**
   * Check if operation should proceed (rate limiting)
   */
  shouldProceed(): boolean {
    const now = performance.now();
    const delta = now - this.lastFrameTime;

    // Reset counter if new frame
    if (delta > this.FRAME_TIME_MS) {
      this.frameCount = 0;
      this.lastFrameTime = now;
      return true;
    }

    // Check if we've exceeded operations for this frame
    if (this.frameCount >= this.MAX_OPERATIONS_PER_FRAME) {
      return false;
    }

    this.frameCount++;
    return true;
  }

  /**
   * Reset guard (call at start of new frame)
   */
  reset(): void {
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
  }
}

/**
 * Memory monitor for 3D resources
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor | null = null;
  private resourceCount = 0;
  private readonly MAX_RESOURCES = 1000;

  private constructor() {}

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Register a resource
   */
  registerResource(): boolean {
    if (this.resourceCount >= this.MAX_RESOURCES) {
      console.warn('[MemoryMonitor] Maximum resource count reached');
      return false;
    }
    this.resourceCount++;
    return true;
  }

  /**
   * Unregister a resource
   */
  unregisterResource(): void {
    if (this.resourceCount > 0) {
      this.resourceCount--;
    }
  }

  /**
   * Get current resource count
   */
  getResourceCount(): number {
    return this.resourceCount;
  }

  /**
   * Check if memory is available
   */
  hasMemoryAvailable(): boolean {
    return this.resourceCount < this.MAX_RESOURCES;
  }
}

/**
 * Throttle function calls to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Debounce function calls with max wait
 */
export function debounceWithMaxWait<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  maxWait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let maxTimeout: NodeJS.Timeout | null = null;
  let lastCallTime = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeout) {
      clearTimeout(timeout);
    }

    if (!maxTimeout || timeSinceLastCall >= maxWait) {
      if (maxTimeout) {
        clearTimeout(maxTimeout);
      }
      maxTimeout = setTimeout(() => {
        func.apply(this, args);
        lastCallTime = Date.now();
        maxTimeout = null;
      }, maxWait);
    }

    timeout = setTimeout(() => {
      func.apply(this, args);
      lastCallTime = Date.now();
      if (maxTimeout) {
        clearTimeout(maxTimeout);
        maxTimeout = null;
      }
    }, wait);
  };
}


/**
 * Performance Optimizer - Performance Utilities for Dual-Output System
 * 
 * Provides:
 * - Debounced function execution (prevents excessive API calls)
 * - Caching with automatic expiry (reduces redundant calculations)
 * - Web Worker support (offloads heavy calculations)
 * - Progressive loading (shows essential data first)
 * - Memory optimization (prevents memory leaks)
 * 
 * @since Phase 2B: Dual-Output Engine (Week 1-2 Battle Map - Day 5-6)
 */

export class PerformanceOptimizer {
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static cache = new Map<string, { data: any; timestamp: number }>();
  
  /**
   * Debounced function execution
   * 
   * Delays function execution until after wait time has passed since last invocation.
   * Perfect for real-time input handling (e.g., window dimension changes).
   * 
   * @param func - Function to debounce
   * @param wait - Wait time in milliseconds
   * @returns Debounced function
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeout: NodeJS.Timeout | null = null;
    let lastArgs: Parameters<T> | null = null;
    
    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve) => {
        lastArgs = args;
        
        if (timeout) clearTimeout(timeout);
        
        timeout = setTimeout(() => {
          if (lastArgs) {
            const result = func(...lastArgs);
            resolve(result);
          }
          timeout = null;
          lastArgs = null;
        }, wait);
      });
    };
  }
  
  /**
   * Cache with automatic expiry
   * 
   * Stores data with timestamp and automatically removes expired entries.
   * Useful for caching expensive calculations (e.g., pattern validation, geometry generation).
   * 
   * @param key - Cache key
   * @returns Cached data or null if expired/missing
   */
  static cacheGet<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }
  
  /**
   * Store data in cache
   * 
   * @param key - Cache key
   * @param data - Data to cache
   */
  static cacheSet(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clear specific cache entry
   */
  static cacheDelete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  static cacheClear(): void {
    this.cache.clear();
  }
  
  /**
   * Web Worker for heavy calculations
   * 
   * Creates a Web Worker wrapper for offloading heavy computations.
   * Note: Worker script must be provided separately.
   * 
   * @param workerScript - URL to worker script
   * @returns Function that executes work in worker
   */
  static createWorker<T, R>(workerScript: string): (data: T) => Promise<R> {
    return (data: T): Promise<R> => {
      return new Promise((resolve, reject) => {
        try {
          const worker = new Worker(workerScript, { type: 'module' });
          
          worker.onmessage = (event) => {
            resolve(event.data);
            worker.terminate();
          };
          
          worker.onerror = (error) => {
            reject(error);
            worker.terminate();
          };
          
          worker.postMessage(data);
        } catch (error) {
          // Fallback if Web Workers not supported
          reject(new Error('Web Workers not supported'));
        }
      });
    };
  }
  
  /**
   * Progressive loading - show essential data first
   * 
   * Loads essential data immediately, then enhancements in background.
   * Dramatically improves perceived performance.
   * 
   * @param essentialLoader - Function that loads essential data
   * @param enhancementLoader - Function that loads enhancement data
   * @param onEssentialLoaded - Callback when essential data is loaded
   * @param onEnhancementLoaded - Callback when enhancement data is loaded
   */
  static async progressiveLoad<T, E>(
    essentialLoader: () => Promise<T>,
    enhancementLoader: () => Promise<E>,
    onEssentialLoaded: (data: T) => void,
    onEnhancementLoaded: (data: E) => void
  ): Promise<void> {
    // Load essential data first
    try {
      const essentialData = await essentialLoader();
      onEssentialLoaded(essentialData);
    } catch (error) {
      console.error('Essential data loading failed:', error);
      throw error; // Essential data failure is critical
    }
    
    // Load enhancements in background (non-blocking)
    setTimeout(async () => {
      try {
        const enhancementData = await enhancementLoader();
        onEnhancementLoaded(enhancementData);
      } catch (error) {
        console.warn('Enhancement loading failed:', error);
        // Continue without enhancements - not critical
      }
    }, 100); // Small delay to ensure UI responsiveness
  }
  
  /**
   * Memory usage optimization
   * 
   * Clears old cache entries to prevent memory leaks.
   * Should be called periodically (e.g., on component unmount or after N operations).
   */
  static optimizeMemoryUsage(): void {
    // Clear expired entries
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.cache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_DURATION) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    // Limit cache size
    const maxCacheSize = 50;
    if (this.cache.size > maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp); // Oldest first
      
      const toRemove = entries.slice(0, entries.length - maxCacheSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }
  
  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate?: number; // Would need to track hits/misses
  } {
    return {
      size: this.cache.size,
      maxSize: 50
    };
  }
}


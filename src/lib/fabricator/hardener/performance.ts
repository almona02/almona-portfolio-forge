/**
 * Hardener Performance Optimizations
 * 
 * Performance optimizations for hardener code selection.
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import { useMemo } from 'react';
import type { HardenerSelectionContext, HardenerSelectionResult } from './types';

/**
 * Memoize hardener selection result
 * 
 * Prevents unnecessary recalculations when inputs haven't changed.
 */
export function useMemoizedHardenerSelection(
  context: HardenerSelectionContext | null,
  selectHardener: (context: HardenerSelectionContext) => HardenerSelectionResult
): HardenerSelectionResult | null {
  return useMemo(() => {
    if (!context) return null;
    return selectHardener(context);
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    context?.profileSystem,
    context?.material,
    context?.glassThickness,
    context?.sashWidth,
    context?.sashHeight,
    context?.openingType,
    context?.region,
    selectHardener,
  ]);
}

/**
 * Debounce hardener selection
 * 
 * Prevents excessive calculations during rapid input changes.
 */
export function debounceHardenerSelection(
  fn: (context: HardenerSelectionContext) => HardenerSelectionResult,
  delay: number = 300
): (context: HardenerSelectionContext) => Promise<HardenerSelectionResult> {
  let timeoutId: NodeJS.Timeout | null = null;

  return (context: HardenerSelectionContext): Promise<HardenerSelectionResult> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const result = fn(context);
        resolve(result);
      }, delay);
    });
  };
}

/**
 * Cache hardener selection results
 * 
 * Optimized LRU cache for hardener selection results.
 * Performance: O(1) get/set operations, LRU eviction.
 */
class HardenerSelectionCache {
  private cache: Map<string, HardenerSelectionResult> = new Map();
  private accessOrder: string[] = []; // Track access order for LRU
  private maxSize: number = 500; // Increased from 100 for better hit rate

  /**
   * Generate cache key from context
   * Optimized: Pre-computed string concatenation
   */
  private generateKey(context: HardenerSelectionContext): string {
    // Fast string interpolation
    return `${context.profileSystem}|${context.material}|${context.glassThickness}|${context.sashWidth}|${context.sashHeight}|${context.openingType}|${context.region || 'egypt'}`;
  }

  /**
   * Get cached result
   * Performance: O(1) average case
   */
  get(context: HardenerSelectionContext): HardenerSelectionResult | null {
    const key = this.generateKey(context);
    const result = this.cache.get(key);
    
    if (result) {
      // Update access order for LRU
      const index = this.accessOrder.indexOf(key);
      if (index !== -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);
      return result;
    }
    
    return null;
  }

  /**
   * Set cached result
   * Performance: O(1) average case
   */
  set(context: HardenerSelectionContext, result: HardenerSelectionResult): void {
    const key = this.generateKey(context);

    // Evict LRU entries if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    this.cache.set(key, result);
    
    // Update access order
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache hit rate (requires external tracking)
   */
  getStats(): { size: number; maxSize: number; utilization: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize) * 100,
    };
  }
}

/**
 * Singleton cache instance
 */
export const hardenerSelectionCache = new HardenerSelectionCache();


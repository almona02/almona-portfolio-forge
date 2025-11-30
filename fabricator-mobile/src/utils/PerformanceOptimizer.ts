/**
 * Performance Optimizer for Mobile App
 * Handles image loading, caching, and performance optimizations
 */

import { Image } from 'react-native';

export interface ImageCacheEntry {
  uri: string;
  loaded: boolean;
  timestamp: number;
}

class PerformanceOptimizer {
  private imageCache: Map<string, ImageCacheEntry> = new Map();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Optimize image loading with progressive loading and caching
   */
  async optimizeImageLoading(imageUris: string[]): Promise<void> {
    // Preload images in background
    const preloadPromises = imageUris
      .slice(0, 10) // Limit concurrent preloads
      .map(uri => this.preloadImage(uri));

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Preload a single image
   */
  private async preloadImage(uri: string): Promise<void> {
    if (this.imageCache.has(uri)) {
      const entry = this.imageCache.get(uri)!;
      // Check if cache is still valid
      if (Date.now() - entry.timestamp < this.CACHE_TTL) {
        return; // Already cached and valid
      }
    }

    try {
      await Image.prefetch(uri);
      this.addToCache(uri);
    } catch (error) {
      console.warn(`Failed to preload image: ${uri}`, error);
    }
  }

  /**
   * Add image to cache
   */
  private addToCache(uri: string): void {
    // Remove oldest entries if cache is full
    if (this.imageCache.size >= this.MAX_CACHE_SIZE) {
      const oldestEntry = Array.from(this.imageCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this.imageCache.delete(oldestEntry[0]);
    }

    this.imageCache.set(uri, {
      uri,
      loaded: true,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if image is cached
   */
  isImageCached(uri: string): boolean {
    const entry = this.imageCache.get(uri);
    if (!entry) return false;

    // Check if cache is still valid
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.imageCache.delete(uri);
      return false;
    }

    return entry.loaded;
  }

  /**
   * Clear image cache
   */
  clearImageCache(): void {
    this.imageCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.imageCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0, // Would need to track hits/misses for accurate rate
    };
  }

  /**
   * Optimize list rendering with virtualization hints
   */
  getOptimizedListProps(itemCount: number): {
    initialNumToRender: number;
    maxToRenderPerBatch: number;
    windowSize: number;
    removeClippedSubviews: boolean;
  } {
    return {
      initialNumToRender: Math.min(10, itemCount),
      maxToRenderPerBatch: 10,
      windowSize: 5,
      removeClippedSubviews: true,
    };
  }

  /**
   * Debounce function calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        func(...args);
      }, wait);
    };
  }

  /**
   * Throttle function calls
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * Batch operations for better performance
   */
  async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 10
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }

    return results;
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

/**
 * Optimize image loading for remnant images
 */
export const optimizeImageLoading = (imageUris: string[]): Promise<void> => {
  return performanceOptimizer.optimizeImageLoading(imageUris);
};

/**
 * Check if image is cached
 */
export const isImageCached = (uri: string): boolean => {
  return performanceOptimizer.isImageCached(uri);
};

/**
 * Get optimized list props for FlatList
 */
export const getOptimizedListProps = (itemCount: number) => {
  return performanceOptimizer.getOptimizedListProps(itemCount);
};


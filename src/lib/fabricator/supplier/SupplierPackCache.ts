/**
 * Supplier Pack Cache - Performance Optimization
 * 
 * Caches supplier pack suggestions and validation results for performance.
 * 
 * @since Phase 2: Precision Upgrade Plan (January 2026)
 */

import type { SystemPack, WindowUnit } from '@/types/fabricator';
import type { ProfileSuggestionsResult, Tier3ValidationResult } from './types';

/**
 * Cache key generator
 */
function generateCacheKey(
  windowUnitId: string,
  systemPackId: string | null,
  supplierPackId?: string
): string {
  return `${windowUnitId}:${systemPackId || 'none'}:${supplierPackId || 'none'}`;
}

/**
 * Supplier Pack Cache
 * 
 * LRU cache for supplier pack suggestions and validations.
 */
export class SupplierPackCache {
  private suggestionsCache: Map<string, ProfileSuggestionsResult> = new Map();
  private validationCache: Map<string, Tier3ValidationResult> = new Map();
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Get cached suggestions
   */
  getSuggestions(
    windowUnit: WindowUnit,
    systemPack: SystemPack | null,
    supplierPackId?: string
  ): ProfileSuggestionsResult | undefined {
    const key = generateCacheKey(windowUnit.id, systemPack?.id || null, supplierPackId);
    return this.suggestionsCache.get(key);
  }

  /**
   * Set cached suggestions
   */
  setSuggestions(
    windowUnit: WindowUnit,
    systemPack: SystemPack | null,
    supplierPackId: string | undefined,
    suggestions: ProfileSuggestionsResult
  ): void {
    const key = generateCacheKey(windowUnit.id, systemPack?.id || null, supplierPackId);
    
    // LRU eviction
    if (this.suggestionsCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.suggestionsCache.keys().next().value;
      this.suggestionsCache.delete(firstKey);
    }
    
    this.suggestionsCache.set(key, suggestions);
  }

  /**
   * Get cached validation
   */
  getValidation(
    profileId: string,
    windowUnit: WindowUnit,
    systemPack: SystemPack | null
  ): Tier3ValidationResult | undefined {
    const key = `${profileId}:${windowUnit.id}:${systemPack?.id || 'none'}`;
    return this.validationCache.get(key);
  }

  /**
   * Set cached validation
   */
  setValidation(
    profileId: string,
    windowUnit: WindowUnit,
    systemPack: SystemPack | null,
    validation: Tier3ValidationResult
  ): void {
    const key = `${profileId}:${windowUnit.id}:${systemPack?.id || 'none'}`;
    
    // LRU eviction
    if (this.validationCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.validationCache.keys().next().value;
      this.validationCache.delete(firstKey);
    }
    
    this.validationCache.set(key, validation);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.suggestionsCache.clear();
    this.validationCache.clear();
  }

  /**
   * Clear cache for specific window unit
   */
  clearForWindowUnit(windowUnitId: string): void {
    for (const key of this.suggestionsCache.keys()) {
      if (key.startsWith(`${windowUnitId}:`)) {
        this.suggestionsCache.delete(key);
      }
    }
    for (const key of this.validationCache.keys()) {
      if (key.includes(`:${windowUnitId}:`)) {
        this.validationCache.delete(key);
      }
    }
  }
}

/**
 * Singleton instance
 */
export const supplierPackCache = new SupplierPackCache();


/**
 * Unit Tests for GoldTierPerformanceMonitor
 * 
 * Tests performance metrics tracking and statistics.
 * 
 * @since Gold Tier Phase 1, Task 1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GoldTierPerformanceMonitor } from '../PerformanceMonitor';

describe('GoldTierPerformanceMonitor', () => {
  beforeEach(() => {
    GoldTierPerformanceMonitor.clear();
  });

  describe('record', () => {
    it('should record performance metric', () => {
      GoldTierPerformanceMonitor.record('test-operation', 10.5);
      
      const stats = GoldTierPerformanceMonitor.getStats('test-operation');
      expect(stats.count).toBe(1);
      expect(stats.avgMs).toBe(10.5);
    });

    it('should record metric with metadata', () => {
      GoldTierPerformanceMonitor.record('test-operation', 15, { systemId: 'test-1' });
      
      const stats = GoldTierPerformanceMonitor.getStats('test-operation');
      expect(stats.count).toBe(1);
    });

    it('should record success/failure status', () => {
      GoldTierPerformanceMonitor.record('test-operation', 10, undefined, true);
      GoldTierPerformanceMonitor.record('test-operation', 20, undefined, false, 'Error message');
      
      const stats = GoldTierPerformanceMonitor.getStats('test-operation');
      expect(stats.count).toBe(2);
      expect(stats.successRate).toBe(0.5);
    });

    it('should limit metrics to MAX_METRICS', () => {
      // Record more than MAX_METRICS
      for (let i = 0; i < 1001; i++) {
        GoldTierPerformanceMonitor.record('test-operation', i);
      }
      
      const stats = GoldTierPerformanceMonitor.getStats('test-operation');
      expect(stats.count).toBeLessThanOrEqual(1000);
    });
  });

  describe('getStats', () => {
    it('should return zero stats for empty metrics', () => {
      const stats = GoldTierPerformanceMonitor.getStats();
      
      expect(stats.count).toBe(0);
      expect(stats.avgMs).toBe(0);
      expect(stats.minMs).toBe(0);
      expect(stats.maxMs).toBe(0);
    });

    it('should calculate correct statistics', () => {
      GoldTierPerformanceMonitor.record('test', 10);
      GoldTierPerformanceMonitor.record('test', 20);
      GoldTierPerformanceMonitor.record('test', 30);
      
      const stats = GoldTierPerformanceMonitor.getStats('test');
      
      expect(stats.count).toBe(3);
      expect(stats.avgMs).toBe(20);
      expect(stats.minMs).toBe(10);
      expect(stats.maxMs).toBe(30);
    });

    it('should calculate p95 and p99 percentiles', () => {
      // Record 100 metrics
      for (let i = 1; i <= 100; i++) {
        GoldTierPerformanceMonitor.record('test', i);
      }
      
      const stats = GoldTierPerformanceMonitor.getStats('test');
      
      expect(stats.p95Ms).toBeGreaterThanOrEqual(95);
      expect(stats.p99Ms).toBeGreaterThanOrEqual(99);
    });

    it('should filter by operation name', () => {
      GoldTierPerformanceMonitor.record('operation1', 10);
      GoldTierPerformanceMonitor.record('operation2', 20);
      
      const stats1 = GoldTierPerformanceMonitor.getStats('operation1');
      const stats2 = GoldTierPerformanceMonitor.getStats('operation2');
      
      expect(stats1.count).toBe(1);
      expect(stats2.count).toBe(1);
      expect(stats1.avgMs).toBe(10);
      expect(stats2.avgMs).toBe(20);
    });
  });

  describe('Cache Hit Rate', () => {
    it('should track cache hits and misses', () => {
      GoldTierPerformanceMonitor.recordCacheHit();
      GoldTierPerformanceMonitor.recordCacheHit();
      GoldTierPerformanceMonitor.recordCacheMiss();
      
      const hitRate = GoldTierPerformanceMonitor.getCacheHitRate();
      expect(hitRate).toBeCloseTo(0.667, 2); // 2/3 = 0.667
    });

    it('should return 0 for no cache operations', () => {
      const hitRate = GoldTierPerformanceMonitor.getCacheHitRate();
      expect(hitRate).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all metrics', () => {
      GoldTierPerformanceMonitor.record('test', 10);
      GoldTierPerformanceMonitor.clear();
      
      const stats = GoldTierPerformanceMonitor.getStats();
      expect(stats.count).toBe(0);
    });
  });

  describe('export', () => {
    it('should export all metrics', () => {
      GoldTierPerformanceMonitor.record('test', 10, { metadata: 'test' });
      
      const exported = GoldTierPerformanceMonitor.export();
      expect(exported.length).toBe(1);
      expect(exported[0].operation).toBe('test');
      expect(exported[0].durationMs).toBe(10);
    });

    it('should return a copy, not reference', () => {
      GoldTierPerformanceMonitor.record('test', 10);
      
      const exported1 = GoldTierPerformanceMonitor.export();
      const exported2 = GoldTierPerformanceMonitor.export();
      
      expect(exported1).not.toBe(exported2);
    });
  });

  describe('getRecentMetrics', () => {
    it('should return recent metrics', () => {
      for (let i = 1; i <= 20; i++) {
        GoldTierPerformanceMonitor.record('test', i);
      }
      
      const recent = GoldTierPerformanceMonitor.getRecentMetrics(10);
      expect(recent.length).toBe(10);
      expect(recent[0].durationMs).toBe(11); // Last 10 (11-20)
    });
  });
});


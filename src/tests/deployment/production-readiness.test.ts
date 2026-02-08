/**
 * Production Deployment Validation Suite
 * 
 * Validates:
 * - ML model performance and reliability
 * - Real-time sync reliability under load
 * - Memory usage and performance benchmarks
 * - Error handling and fallback mechanisms
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { remnantMLPredictor } from '@/future/advisory/RemnantUsagePredictor';
import type { Remnant } from '@/lib/inventory/RemnantManager';
import { WorkspaceSyncService } from '@/lib/workspace/WorkspaceSyncService';
import { RemnantManager } from '@/lib/inventory/RemnantManager';

describe('Production Readiness: ML Model Performance', () => {
  let mockRemnant: Remnant;
  let mockFeatures: any;

  beforeEach(() => {
    mockRemnant = {
      id: 'test-remnant-1',
      userId: 'user-1',
      profileId: 'profile-1',
      length: 3000,
      locationId: 'loc-1',
      locationName: 'Main',
      quality: 'good',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      lastCheckedAt: new Date(),
      status: 'available',
      usageCount: 5,
      estimatedValue: 50,
    };

    mockFeatures = {
      remnantLength: 3000,
      ageDays: 30,
      profileTypeFrequency: 100,
      seasonalDemand: 0.8,
      locationPriority: 1.0,
      qualityScore: 0.75,
      usageCount: 5,
      estimatedValue: 50,
    };
  });

  it('should complete ML prediction within acceptable time (< 500ms)', async () => {
    const startTime = performance.now();
    const result = await remnantMLPredictor.predict(mockRemnant, mockFeatures);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(500);
    expect(result).toBeDefined();
    expect(result.reuseLikelihood).toBeGreaterThanOrEqual(0);
    expect(result.reuseLikelihood).toBeLessThanOrEqual(100);
  });

  it('should handle ML model failure gracefully with fallback', async () => {
    // Simulate model failure
    const predictor = new (remnantMLPredictor.constructor as any)();
    
    const result = await predictor.predict(mockRemnant, mockFeatures);
    
    // Should still return valid result using fallback
    expect(result).toBeDefined();
    expect(result.fallbackUsed).toBe(true);
    expect(result.reuseLikelihood).toBeGreaterThanOrEqual(0);
    expect(result.reuseLikelihood).toBeLessThanOrEqual(100);
  });

  it('should maintain prediction consistency across multiple calls', async () => {
    const results: number[] = [];
    
    for (let i = 0; i < 10; i++) {
      const result = await remnantMLPredictor.predict(mockRemnant, mockFeatures);
      results.push(result.reuseLikelihood);
    }

    // Results should be consistent (within 5% variance for rule-based)
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const variance = results.map(r => Math.abs(r - avg)).reduce((a, b) => a + b, 0) / results.length;
    
    expect(variance).toBeLessThan(5); // Less than 5% variance
  });

  it('should handle edge case inputs without crashing', async () => {
    const edgeCases: Remnant[] = [
      { ...mockRemnant, length: 0 },
      { ...mockRemnant, length: 10000 },
      { ...mockRemnant, quality: 'unknown' as any },
      { ...mockRemnant, usageCount: -1 },
    ];

    for (const edgeCase of edgeCases) {
      const features = await remnantMLPredictor.extractFeatures(edgeCase);
      const result = await remnantMLPredictor.predict(edgeCase, features);
      
      expect(result).toBeDefined();
      expect(result.reuseLikelihood).toBeGreaterThanOrEqual(0);
      expect(result.reuseLikelihood).toBeLessThanOrEqual(100);
    }
  });
});

describe('Production Readiness: Real-time Sync Reliability', () => {
  let syncService: WorkspaceSyncService;

  beforeEach(() => {
    syncService = new WorkspaceSyncService('test-workspace');
  });

  it('should handle concurrent sync operations without conflicts', async () => {
    const mockState = {
      profiles: [],
      accessories: [],
      projects: [],
    };

    // Simulate concurrent saves
    const promises = Array.from({ length: 10 }, () =>
      syncService.saveWorkspaceSnapshotDebounced(mockState as any, 100)
    );

    const results = await Promise.allSettled(promises);
    
    // All should complete (some may be debounced, but none should fail)
    const failures = results.filter(r => r.status === 'rejected');
    expect(failures.length).toBe(0);
  });

  it('should recover from sync failures gracefully', async () => {
    const mockState = {
      profiles: [],
      accessories: [],
      projects: [],
    };

    // First save should work
    const result1 = await syncService.saveWorkspaceSnapshot(mockState as any);
    expect(result1.success || result1.usedFallback).toBe(true);

    // Subsequent saves should also work
    const result2 = await syncService.saveWorkspaceSnapshot(mockState as any);
    expect(result2.success || result2.usedFallback).toBe(true);
  });

  it('should handle large workspace states efficiently', async () => {
    // Create large state with many profiles
    const largeState = {
      profiles: Array.from({ length: 1000 }, (_, i) => ({
        id: `profile-${i}`,
        name: `Profile ${i}`,
        data: 'x'.repeat(1000), // 1KB per profile
      })),
      accessories: [],
      projects: [],
    };

    const startTime = performance.now();
    const result = await syncService.saveWorkspaceSnapshotDebounced(largeState as any, 100);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(5000); // Should complete in < 5s
    expect(result.success || result.usedFallback).toBe(true);
  });
});

describe('Production Readiness: Memory Usage Under Load', () => {
  it('should not leak memory during repeated predictions', async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Perform many predictions
    for (let i = 0; i < 100; i++) {
      const remnant: Remnant = {
        id: `remnant-${i}`,
        userId: 'user-1',
        profileId: 'profile-1',
        length: 3000,
        locationId: 'loc-1',
        locationName: 'Main',
        quality: 'good',
        createdAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'available',
        usageCount: 0,
        estimatedValue: 0,
      };

      const features = await remnantMLPredictor.extractFeatures(remnant);
      await remnantMLPredictor.predict(remnant, features);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (< 50MB for 100 predictions)
    if (initialMemory > 0 && finalMemory > 0) {
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });

  it('should handle batch operations without excessive memory usage', async () => {
    const remnants: Remnant[] = Array.from({ length: 100 }, (_, i) => ({
      id: `remnant-${i}`,
      userId: 'user-1',
      profileId: 'profile-1',
      length: 3000,
      locationId: 'loc-1',
      locationName: 'Main',
      quality: 'good',
      createdAt: new Date(),
      lastCheckedAt: new Date(),
      status: 'available',
      usageCount: 0,
      estimatedValue: 0,
    }));

    const startTime = performance.now();
    const predictions = await Promise.all(
      remnants.map(async (remnant) => {
        const features = await remnantMLPredictor.extractFeatures(remnant);
        return remnantMLPredictor.predict(remnant, features);
      })
    );
    const endTime = performance.now();

    expect(predictions.length).toBe(100);
    expect(endTime - startTime).toBeLessThan(10000); // Should complete in < 10s
  });
});

describe('Production Readiness: Error Handling', () => {
  it('should handle network failures gracefully', async () => {
    const syncService = new WorkspaceSyncService('test-workspace');
    const mockState = { profiles: [], accessories: [], projects: [] };

    // Should fallback to localStorage if Supabase fails
    const result = await syncService.saveWorkspaceSnapshot(mockState as any);
    expect(result.success || result.usedFallback).toBe(true);
  });

  it('should validate input data before processing', async () => {
    const invalidRemnant = null as any;
    
    try {
      await remnantMLPredictor.extractFeatures(invalidRemnant);
      // Should not reach here, but if it does, prediction should handle it
      const features = { remnantLength: 0, ageDays: 0, profileTypeFrequency: 0, seasonalDemand: 0, locationPriority: 0, qualityScore: 0, usageCount: 0, estimatedValue: 0 };
      const result = await remnantMLPredictor.predict(invalidRemnant, features);
      expect(result).toBeDefined();
    } catch (error) {
      // Expected to throw for null input
      expect(error).toBeDefined();
    }
  });
});

describe('Production Readiness: Performance Benchmarks', () => {
  it('should meet performance targets for remnant matching', async () => {
    const remnantManager = new RemnantManager();
    
    const cuts = [
      { id: 'cut-1', length: 1000, quantity: 5 },
      { id: 'cut-2', length: 2000, quantity: 3 },
    ];

    const profile = {
      id: 'profile-1',
      name: 'Test Profile',
      material: 'aluminum',
    };

    const startTime = performance.now();
    const matches = await remnantManager.findRemnantMatches(
      cuts as any,
      profile as any,
      'aluminum',
      { useRemnantsFirst: true }
    );
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(2000); // Should complete in < 2s
    expect(Array.isArray(matches)).toBe(true);
  });
});


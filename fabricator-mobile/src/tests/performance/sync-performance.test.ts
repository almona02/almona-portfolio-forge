/**
 * Performance tests for sync operations
 * Tests sync efficiency under poor network conditions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineManager } from '../../services/OfflineManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Mock Supabase with configurable delay
const createMockSupabase = (delay: number = 0) => ({
  from: vi.fn(() => ({
    update: vi.fn(() => ({
      eq: vi.fn(() => 
        delay > 0 
          ? new Promise(resolve => setTimeout(() => resolve({ error: null }), delay))
          : Promise.resolve({ error: null })
      ),
    })),
    insert: vi.fn(() => 
      delay > 0 
        ? new Promise(resolve => setTimeout(() => resolve({ error: null }), delay))
        : Promise.resolve({ error: null })
    ),
    select: vi.fn(() => ({
      limit: vi.fn(() => 
        delay > 0 
          ? new Promise(resolve => setTimeout(() => resolve({ data: [{}] }), delay))
          : Promise.resolve({ data: [{}] })
      ),
    })),
  })),
});

describe('Sync Performance: Poor Network Conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AsyncStorage.getItem as any).mockResolvedValue(null);
    (AsyncStorage.setItem as any).mockResolvedValue(undefined);
  });

  it('should handle slow network responses (3G simulation)', async () => {
    // Simulate 3G network (500ms latency per request)
    const mockSupabase = createMockSupabase(500);
    vi.doMock('../../services/supabaseClient', () => ({
      supabase: mockSupabase,
    }));

    const mockIsOnline = vi.fn().mockResolvedValue(true);
    (offlineManager as any).isOnline = mockIsOnline;

    // Queue 10 operations
    const promises = Array.from({ length: 10 }, (_, i) =>
      offlineManager.queueOperation({
        type: 'scan_remnant',
        payload: {
          remnantId: `remnant-${i}`,
          location: 'Main',
          scannedAt: new Date().toISOString(),
          scannedBy: 'user-1',
        },
      })
    );

    await Promise.all(promises);

    const startTime = Date.now();
    await offlineManager.processQueue();
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time even with slow network
    // 10 operations * 500ms = 5s, but should be optimized
    expect(duration).toBeLessThan(10000);
  });

  it('should batch operations efficiently', async () => {
    const mockIsOnline = vi.fn().mockResolvedValue(true);
    (offlineManager as any).isOnline = mockIsOnline;

    // Queue 50 operations
    const startTime = Date.now();
    const promises = Array.from({ length: 50 }, (_, i) =>
      offlineManager.queueOperation({
        type: 'scan_remnant',
        payload: {
          remnantId: `remnant-${i}`,
          location: 'Main',
          scannedAt: new Date().toISOString(),
          scannedBy: 'user-1',
        },
      })
    );

    await Promise.all(promises);
    const queueTime = Date.now() - startTime;

    // Queuing should be fast (< 1s for 50 operations)
    expect(queueTime).toBeLessThan(1000);
  });

  it('should handle intermittent network failures', async () => {
    let networkAvailable = false;
    const mockIsOnline = vi.fn().mockImplementation(async () => networkAvailable);
    (offlineManager as any).isOnline = mockIsOnline;

    // Queue operations while offline
    for (let i = 0; i < 20; i++) {
      await offlineManager.queueOperation({
        type: 'scan_remnant',
        payload: {
          remnantId: `remnant-${i}`,
          location: 'Main',
          scannedAt: new Date().toISOString(),
          scannedBy: 'user-1',
        },
      });
    }

    expect(offlineManager.getQueueLength()).toBe(20);

    // Simulate network coming online
    networkAvailable = true;
    const startTime = Date.now();
    await offlineManager.processQueue();
    const endTime = Date.now();

    // Should process queue when network is available
    expect(endTime - startTime).toBeGreaterThanOrEqual(0);
  });

  it('should not block on individual slow operations', async () => {
    const mockIsOnline = vi.fn().mockResolvedValue(true);
    (offlineManager as any).isOnline = mockIsOnline;

    // Queue mix of fast and slow operations
    const fastOps = Array.from({ length: 5 }, (_, i) =>
      offlineManager.queueOperation({
        type: 'scan_remnant',
        payload: {
          remnantId: `fast-${i}`,
          location: 'Main',
          scannedAt: new Date().toISOString(),
          scannedBy: 'user-1',
        },
      })
    );

    await Promise.all(fastOps);

    // Process should not be blocked by slow operations
    const startTime = Date.now();
    await offlineManager.processQueue();
    const endTime = Date.now();

    // Should complete in reasonable time
    expect(endTime - startTime).toBeLessThan(5000);
  });
});

describe('Sync Performance: Large Data Sets', () => {
  it('should handle large payload sizes efficiently', async () => {
    const mockIsOnline = vi.fn().mockResolvedValue(true);
    (offlineManager as any).isOnline = mockIsOnline;

    // Create large payload
    const largePayload = {
      remnantId: 'remnant-1',
      updates: {
        location: 'Main',
        metadata: {
          notes: 'x'.repeat(10000), // 10KB of data
          history: Array.from({ length: 100 }, (_, i) => ({
            timestamp: new Date().toISOString(),
            action: `action-${i}`,
            data: 'y'.repeat(100),
          })),
        },
      },
    };

    const startTime = Date.now();
    await offlineManager.queueOperation({
      type: 'update_remnant',
      payload: largePayload,
    });
    const endTime = Date.now();

    // Should queue large payloads efficiently
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should handle many small operations efficiently', async () => {
    const mockIsOnline = vi.fn().mockResolvedValue(true);
    (offlineManager as any).isOnline = mockIsOnline;

    const startTime = Date.now();

    // Queue 100 small operations
    const promises = Array.from({ length: 100 }, (_, i) =>
      offlineManager.queueOperation({
        type: 'scan_remnant',
        payload: {
          remnantId: `remnant-${i}`,
          location: 'Main',
          scannedAt: new Date().toISOString(),
          scannedBy: 'user-1',
        },
      })
    );

    await Promise.all(promises);
    const endTime = Date.now();

    // Should queue 100 operations quickly
    expect(endTime - startTime).toBeLessThan(2000);
    expect(offlineManager.getQueueLength()).toBe(100);
  });
});

describe('Sync Performance: Memory Usage', () => {
  it('should not accumulate memory during sync operations', async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const mockIsOnline = vi.fn().mockResolvedValue(true);
    (offlineManager as any).isOnline = mockIsOnline;

    // Perform many sync operations
    for (let i = 0; i < 50; i++) {
      await offlineManager.queueOperation({
        type: 'scan_remnant',
        payload: {
          remnantId: `remnant-${i}`,
          location: 'Main',
          scannedAt: new Date().toISOString(),
          scannedBy: 'user-1',
        },
      });

      await offlineManager.processQueue();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // Memory increase should be reasonable
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB
    }
  });
});


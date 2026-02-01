
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PositionStateSyncService } from '../PositionStateSyncService';

// Mock IndexedDB
const { mockSaveState, mockLoadState } = vi.hoisted(() => {
    return {
        mockSaveState: vi.fn(),
        mockLoadState: vi.fn()
    };
});

vi.mock('../IndexedDBStore', () => {
    return {
        IndexedDBStore: vi.fn().mockImplementation(() => ({
            init: vi.fn(),
            saveState: mockSaveState,
            loadState: mockLoadState,
            deleteState: vi.fn(),
            addAuditEntry: vi.fn(),
            getAuditLog: vi.fn(),
        })),
    };
});

describe('Degraded Mode', () => {
  let service: PositionStateSyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PositionStateSyncService();
    // Allow retries to be fast
    (service as any).BASE_RETRY_DELAY = 1;
  });

  it('should enter degraded mode if persistence fails repeatedly', async () => {
    const data = { 
        poseId: 'fail-test', 
        mode: 'smartdraw' as const, 
        state: { val: 1 },
        metadata: {
            hash: 'abc', 
            override: true,
            tier: 'Tier 3',
            compliance: 'AICS',
            deterministic: true,
            timestamp: new Date().toISOString(),
            operation: 'UPDATE',
            requiresHumanValidation: false
        }
    };
    
    // Mock saveToUnifiedStore logic failure directly on service instance?
    // saveToUnifiedStore is private.
    // simpler to mock idbStore to fail and assume LS fails (or mock window.localStorage if needed)
    // But PositionStateSyncService checks window.localStorage.
    // If we run in vitest environment: jsdom, localStorage exists.
    
    // Let's spy on saveToUnifiedStore directly
    vi.spyOn(service as any, 'saveToUnifiedStore').mockRejectedValue(new Error('Persistence failed'));
    
    // Mock event emitter to verify degraded event
    const emitSpy = vi.spyOn(service as any, 'emitRealityOSEvent').mockResolvedValue(undefined);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Should NOT throw
    // Using private method access
    const result = await (service as any).saveToUnifiedStoreWithRetry(data);
    
    // Should return result (memory only)
    expect(result).toBe(data);
    
    // Should have set degraded mode flag
    expect((service as any).isDegradedMode).toBe(true);
    
    // Should have emitted degraded event
    expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'SYSTEM_DEGRADED',
        reason: 'PERSISTENCE_FAILURE'
    }));
  });

  it('should skip persistence attempts if already in degraded mode', async () => {
      // Manually set degraded mode
      (service as any).isDegradedMode = true;
      
      const data = { 
        poseId: 'skip-test', 
        mode: 'smartdraw' as const, 
        state: { val: 1 },
        metadata: { 
            hash: 'abc',
            tier: 'Tier 3',
            compliance: 'AICS',
            deterministic: true,
            timestamp: new Date().toISOString(),
            operation: 'UPDATE',
            requiresHumanValidation: false
        }
      };
      
      // We spy on the internal saveToUnifiedStore. 
      // In the implementation, saveToUnifiedStoreWithRetry calls saveToUnifiedStore.
      // And saveToUnifiedStore catches error and returns if degraded.
      // So we make saveToUnifiedStore throw error.
      const saveSpy = vi.spyOn(service as any, 'saveToUnifiedStore');
      // We want to simulate the behavior INSIDE saveToUnifiedStore throwing.
      // But we can't easily mock "half" of the function.
      // So we will rely on the fact that if we Mock saveToUnifiedStore to Throw,
      // Then WithRetry will see it fail.
      
      // WAIT. My implementation modification was:
      /*
        private async saveToUnifiedStore(data) {
           try { ... } catch (e) {
               if (this.isDegradedMode) return data;
               throw e;
           }
        }
      */
      
      // So if I spy on saveToUnifiedStore and allow it to run original?
      // No, running original requires dependencies.
      // If I spy and mockImplementation?
      // If I mockImplementation to Throw, then the `catch` block INSIDE saveToUnifiedStore is BYPASSED (because the mock replaces the WHOLE method).
      // So checking `isDegradedMode` inside `saveToUnifiedStore` won't happen if I mock `saveToUnifiedStore`.
      
      // Correct approach:
      // Mock the dependencies of saveToUnifiedStore (IDB and LS).
      // 1. Mock IDB (already done via module mock).
      mockSaveState.mockRejectedValue(new Error('IDB Fail'));
      
      // 2. Mock LocalStorage
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new Error('LS Fail');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Call retry wrapper
      const result = await (service as any).saveToUnifiedStoreWithRetry(data);
      
      expect(result).toBe(data);
      // Logic: 
      // saveToUnifiedStoreWithRetry calls saveToUnifiedStore.
      // saveToUnifiedStore calls IDB -> fails.
      // saveToUnifiedStore calls LS -> fails.
      // saveToUnifiedStore catches -> checks isDegradedMode (true) -> returns data.
      // saveToUnifiedStoreWithRetry gets success -> returns.
      // Total attempts = 1 (no retry loop).
      
      // We can verify attempts by spying on IDB call count
      expect(mockSaveState).toHaveBeenCalledTimes(1); 
  });
});

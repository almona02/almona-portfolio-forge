
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PositionStateSyncService } from '../PositionStateSyncService';

// Mock Worker class
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  
  postMessage(msg: any) {
    const { action, id, data } = msg; // { data, action, id }
    
    if (action === 'computeHash') {
        // Simulate async work
        setTimeout(() => {
            if (this.onmessage) {
                // Return a fake hash
                this.onmessage({
                   data: {
                       id,
                       hash: 'worker-computed-hash-' + data.length,
                       success: true
                   }
                } as MessageEvent);
            }
        }, 10);
    }
  }
  
  terminate() {}
}

// Global mock
global.Worker = MockWorker as any;

describe('Web Worker Hash Computation', () => {
  let service: PositionStateSyncService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    service = new PositionStateSyncService();
  });

  it('should use worker for large states', async () => {
    // Create large state (>100KB)
    const largeString = 'x'.repeat(1024 * 105);
    const largeState = { data: largeString };
    
    // Access private method computeStateHashWorker via public or protected exposure?
    // Actually we can just test 'computeStateHashCached' with large state.
    // However, 'computeStateHashCached' is private. syncStateWithGuarantees calls it.
    
    // We can spy on the global Worker constructor to see if it was called.
    // However, vitest spyOn might cause issues with class constructors.
    // We can rely on the output hash containing the worker signature.
    
    // Check output
    const hash = await (service as any).computeStateHashCached(largeState);
    
    expect(hash).toContain('worker-computed-hash');
  });

  it('should fallback to main thread for small states', async () => {
    // Small state
    const smallState = { data: 'small' };
    
    const workerSpy = vi.spyOn(global, 'Worker');
    
    const hash = await (service as any).computeStateHashCached(smallState);
    
    // Worker should NOT be called for small states (unless already init logic changes)
    // Actually initWorker is called inside computeStateHashWorker which is only called if > threshold.
    expect(workerSpy).not.toHaveBeenCalled();
    
    // Should be real SHA256 (hex string)
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

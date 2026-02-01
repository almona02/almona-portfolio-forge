
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeadLetterQueue } from '../DeadLetterQueue';
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
            addAuditEntry: vi.fn().mockResolvedValue(undefined),
            getAuditLog: vi.fn(),
        })),
    };
});

describe('DeadLetterQueue', () => {
  it('should push items and limit size', () => {
    const queue = new DeadLetterQueue();
    // Use any cast to access private property if needed, but getItems() wraps it
    
    // Add 1100 items (limit 1000)
    for (let i = 0; i < 1100; i++) {
        queue.push({ id: i }, 'error');
    }
    
    const items = queue.getItems();
    expect(items.length).toBe(1000);
    expect(items[0].event.id).toBe(100); // 0-99 dropped
  });

  it('should retry items', async () => {
    const queue = new DeadLetterQueue();
    queue.push({ id: 1 }, 'error');
    queue.push({ id: 2 }, 'error');
    
    const handler = vi.fn().mockResolvedValue(undefined);
    const count = await queue.retryAll(handler);
    
    expect(count).toBe(2);
    expect(queue.getItems().length).toBe(0);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should re-queue failed retries', async () => {
    const queue = new DeadLetterQueue();
    queue.push({ id: 1 }, 'error');
    
    const handler = vi.fn().mockRejectedValue(new Error('Fail again'));
    const count = await queue.retryAll(handler);
    
    expect(count).toBe(0);
    expect(queue.getItems().length).toBe(1);
    expect(queue.getItems()[0].retryCount).toBe(2);
  });
});

describe('PositionStateSyncService DLQ Integration', () => {
    let service: PositionStateSyncService;
    
    beforeEach(() => {
        vi.clearAllMocks();
        service = new PositionStateSyncService();
        // Set queue size small for testing flush
        (service as any).AUDIT_BATCH_SIZE = 2; 
    });
    
    it('should capture failed audit log flushes in DLQ', async () => {
        // Mock localStorage to fail
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('[]');
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('Disk full');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        // Log entries to trigger flush
        await (service as any).logToConstitutionalAudit({ type: 'TEST1' });
        await (service as any).logToConstitutionalAudit({ type: 'TEST2' });
        
        // Force flush via timeout or manual trigger if exposed?
        // logToConstitutionalAudit logic: pushes to batch. If batch >= size, flushes.
        // I set batch size to 2 (if I can override readonly property).
        // TS readonly can be overridden with cast.
        // Actually, logToConstitutionalAudit calls flushAuditBatch if batch full.
        
        // Wait for flush promise if it's async inside?
        // logToConstitutionalAudit is async and awaits flushAuditBatch.
        
        // The DLQ should have items
        expect(service.deadLetterQueue.getItems().length).toBe(2);
        const item = service.deadLetterQueue.getItems()[0];
        expect(item.event.type).toBe('TEST1');
        expect(item.error).toContain('Disk full');
    });
});


import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PositionStateSyncService } from '../PositionStateSyncService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index]),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Audit Log Rotation', () => {
  let service: PositionStateSyncService;
  
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    service = new PositionStateSyncService();
    // Access private properties/methods via any cast for testing
  });

  it('should rotate audit log when size exceeds limit', async () => {
    // Fill with 1001 entries
    const entries = Array(1001).fill({ type: 'TEST', timestamp: new Date().toISOString() });
    
    // Manually set existing log
    localStorageMock.setItem(
      'constitutional-audit-log', 
      JSON.stringify(entries)
    );
    
    // Simulate flush triggering rotation
    // We need to bypass private access restriction ideally, or trigger public method
    // Since logToConstitutionalAudit is private, we can trigger it via a public method that logs
    // E.g. saveSyncStateWithGuarantees logs events. 
    // OR we can just unit test the private methods by casting to any (common in TS testing for internals)
    
    // Accessing private method for test clarity
    await (service as any).flushAuditBatch(); // Flush empty batch might not trigger rotation logic if logic is based on batch length?
    
    // Wait, the logic is:
    // auditLog.push(...batch);
    // if (auditLog.length > limit) rotate
    
    // So if batch is empty, it reads auditLog (1001), checks length (1001 > 1000), and rotates.
    // However, flushAuditBatch returns early if batch is empty.
    // So I need to add at least 1 item to batch.
    
    // Add item to batch queue
    (service as any).auditBatchQueue.push({ type: 'TRIGGER' });
    
    await (service as any).flushAuditBatch();
    
    // Check if rotation happened
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/constitutional-audit-log-archive-\d{4}-/),
        expect.stringContaining('TEST')
    );
    
    // Active log should be reset to empty array
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'constitutional-audit-log',
        JSON.stringify([])
    );
  });

  it('should prune old archives', async () => {
    // Seed 6 archives
    const dates = [
        '2025-01-01', '2025-01-02', '2025-01-03', 
        '2025-01-04', '2025-01-05', '2025-01-06'
    ];
    
    dates.forEach(date => {
        localStorageMock.setItem(
            `constitutional-audit-log-archive-${date}`, 
            JSON.stringify([{ date }])
        );
    });
    
    // Trigger prune
    (service as any).pruneAuditArchives();
    
    // Should remove oldest (2025-01-01)
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('constitutional-audit-log-archive-2025-01-01');
    
    // Newest should remain
    expect(localStorageMock.getItem('constitutional-audit-log-archive-2025-01-06')).toBeTruthy();
  });
});

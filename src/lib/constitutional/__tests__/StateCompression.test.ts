
import pako from 'pako';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PositionStateSyncService } from '../PositionStateSyncService';

// Mock IndexedDB
const { mockSaveState, mockLoadState } = vi.hoisted(() => {
    return {
        mockSaveState: vi.fn(),
        mockLoadState: vi.fn()
    };
});

// Setup default implementations
mockSaveState.mockResolvedValue(undefined);
mockLoadState.mockResolvedValue(null);

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

describe('State Compression', () => {
  let service: PositionStateSyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PositionStateSyncService();
  });

  it('should compress state larger than 10KB', async () => {
    const largeString = 'x'.repeat(10241); // > 10KB
    const state = { poseId: 'test', mode: 'smartdraw', state: { data: largeString } };
    
    // Using private method access via any
    await (service as any).saveToUnifiedStore(state);
    
    expect(mockSaveState).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
            metadata: expect.objectContaining({ compression: 'gzip' })
        })
    );
    
    // Verify payload is actually compressed (string)
    const savedCall = mockSaveState.mock.calls[0][1];
    expect(typeof savedCall.state).toBe('string');
    // Basic base64 check
    expect(savedCall.state).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });

  it('should NOT compress state smaller than 10KB', async () => {
    const smallState = { poseId: 'test', mode: 'smartdraw', state: { data: 'small' } };
    
    await (service as any).saveToUnifiedStore(smallState);
    
    expect(mockSaveState).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
            metadata: expect.objectContaining({ compression: undefined }),
            state: { data: 'small' }
        })
    );
  });

  it('should decompress loaded state', async () => {
    const largeString = 'x'.repeat(10241);
    const jsonStr = JSON.stringify({ data: largeString });
    const compressed = pako.deflate(jsonStr);
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(compressed)));
    
    const loadedState = {
        poseId: 'test',
        mode: 'smartdraw',
        state: base64, // Saved as compressed string
        metadata: { compression: 'gzip' }
    };
    
    mockLoadState.mockResolvedValue(loadedState);
    
    const result = await (service as any).loadFromUnifiedStore('test', 'smartdraw');
    
    expect(result.state).toEqual({ data: largeString });
    expect(result.metadata.compression).toBeUndefined(); // Flag removed after decompression
  });
  
  it('should handle decompression failure gracefully', async () => {
    const corruptedState = {
        poseId: 'test',
        mode: 'smartdraw',
        state: 'not-valid-base64-or-gzip',
        metadata: { compression: 'gzip' }
    };
    
    mockLoadState.mockResolvedValue(corruptedState);
    
    // Mock console to suppress error logs
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = await (service as any).loadFromUnifiedStore('test', 'smartdraw');
    
    // Should return corrupted state as is
    expect(result.state).toBe('not-valid-base64-or-gzip');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Decompression failed'), expect.anything());
  });
});

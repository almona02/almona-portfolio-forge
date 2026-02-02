
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PositionStateSyncService } from '../PositionStateSyncService';

// Mock IndexedDBStore
vi.mock('../IndexedDBStore', () => {
    return {
        IndexedDBStore: vi.fn().mockImplementation(() => ({
            init: vi.fn(),
            saveState: vi.fn().mockResolvedValue(undefined),
            loadState: vi.fn().mockResolvedValue(null),
            deleteState: vi.fn(),
            addAuditEntry: vi.fn().mockResolvedValue(undefined),
            getAuditLog: vi.fn().mockResolvedValue([]),
        })),
    };
});

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
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('IndexedDB Migration', () => {
  let service: PositionStateSyncService;
  let mockIdbStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    service = new PositionStateSyncService();
    mockIdbStore = (service as any).idbStore;
  });

  it('should save to IndexedDB as primary', async () => {
    const state = { poseId: 'test-pose', mode: 'smartdraw', state: { x: 1 } };
    
    // Call public syncStateWithGuarantees which calls saveToUnifiedStore
    // We mock validate/computeHash to succeed quickly?
    // Or just call private saveToUnifiedStore directly via cast
    
    await (service as any).saveToUnifiedStore(state);
    
    expect(mockIdbStore.saveState).toHaveBeenCalled();
  });

  it('should fallback to localStorage if IndexedDB save fails', async () => {
    mockIdbStore.saveState.mockRejectedValue(new Error('IDB Error'));
    
    const state = { poseId: 'test-pose', mode: 'smartdraw', state: { x: 1 } };
    await (service as any).saveToUnifiedStore(state);
    
    expect(mockIdbStore.saveState).toHaveBeenCalled();
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should load from IndexedDB if available', async () => {
    const state = { poseId: 'test-pose', mode: 'smartdraw', state: { x: 1 }, version: 1 };
    mockIdbStore.loadState.mockResolvedValue(state);
    
    const result = await (service as any).loadFromUnifiedStore('test-pose', 'smartdraw');
    
    expect(result).toEqual(state);
    expect(localStorageMock.getItem).not.toHaveBeenCalled(); // Shouldn't check LS if IDB has it?
    // Actually implementation might check cache first.
    // Assuming cache empty.
  });

  it('should fallback to localStorage if IndexedDB missing/fails', async () => {
    mockIdbStore.loadState.mockResolvedValue(null);
    
    const state = { poseId: 'test-pose', mode: 'smartdraw', state: { x: 1 }, version: 1 };
    const key = (service as any).getStorageKey('test-pose', 'smartdraw');
    localStorageMock.setItem(key, JSON.stringify(state));
    
    const result = await (service as any).loadFromUnifiedStore('test-pose', 'smartdraw');
    
    expect(result).toEqual(state);
    // Should opportunisticly save to IDB (migration)
    expect(mockIdbStore.saveState).toHaveBeenCalledWith(key, expect.objectContaining(state));
  });
});

import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBOMCalculation } from '../useBOMCalculation';

// Mock Worker
class MockWorker {
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
  postMessage: (message: any) => void;
  terminate: () => void;

  constructor() {
    this.postMessage = vi.fn((message) => {
       // Simulate async response
       setTimeout(() => {
           if (this.onmessage) {
               // Echo back success with dummy result
               this.onmessage({
                   data: {
                       jobId: message.jobId,
                       status: 'success',
                       result: {
                           profiles: [],
                           glazing: [],
                           hardware: [],
                           cost: {
                               materialCost: 100,
                               laborCost: 50,
                               hardwareCost: 20,
                               glazingCost: 30,
                               accessoriesCost: 10,
                               totalCost: 210
                           }
                       }
                   }
               } as MessageEvent);
           }
       }, 50);
    });
    this.terminate = vi.fn();
  }
}

// Global scope mock
const originalWorker = global.Worker;

describe('useBOMCalculation', () => {
  beforeEach(() => {
    global.Worker = MockWorker as any;
  });

  afterEach(() => {
    global.Worker = originalWorker;
    vi.clearAllMocks();
  });

  it('should initialize in idle state', () => {
    const { result } = renderHook(() => useBOMCalculation());
    expect(result.current.isCalculating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle calculation success', async () => {
    const { result } = renderHook(() => useBOMCalculation());

    const mockUnit: WindowUnit = { id: 'u1', overallWidth: 1000, overallHeight: 1000, systemPackId: 'pack1' } as any;
    const mockPattern: EgyptianPattern = { id: 'p1' } as any;
    const mockSystemPack: SystemPack = { id: 'pack1' } as any;

    let calculationPromise: Promise<any>;

    act(() => {
        calculationPromise = result.current.calculateBOM(mockUnit, mockPattern, mockSystemPack);
    });

    expect(result.current.isCalculating).toBe(true);

    await waitFor(() => expect(result.current.isCalculating).toBe(false));

    const res = await calculationPromise!;
    expect(res.cost.totalCost).toBe(210);
    expect(result.current.error).toBeNull();
  });
});

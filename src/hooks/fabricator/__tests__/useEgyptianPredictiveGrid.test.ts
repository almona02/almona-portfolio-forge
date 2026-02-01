import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEgyptianPredictiveGrid } from '../useEgyptianPredictiveGrid';

describe('useEgyptianPredictiveGrid', () => {
  it('should not predict if grid is locked', async () => {
    const { result } = renderHook(() => useEgyptianPredictiveGrid({
      width: 1000,
      height: 2000,
      windowType: 'sliding',
      isGridLocked: true
    }));

    // Wait for debounce period (500ms) plus buffer
    await new Promise(r => setTimeout(r, 600));

    expect(result.current.suggestedGrid).toBeNull();
    expect(result.current.isPredicting).toBe(false);
  });

  it('should predict 2-panel sliding for small widths', async () => {
    const { result } = renderHook(() => useEgyptianPredictiveGrid({
      width: 1500, // < 2200mm limit
      height: 2000,
      windowType: 'sliding',
      isGridLocked: false
    }));

    expect(result.current.isPredicting).toBe(true);

    await waitFor(() => {
        expect(result.current.suggestedGrid).not.toBeNull();
    }, { timeout: 1000 });

    expect(result.current.suggestedGrid?.cols).toBe(2);
    expect(result.current.predictionReason).toContain('2-panel');
  });

  it('should predict 3-panel sliding for medium widths', async () => {
    const { result } = renderHook(() => useEgyptianPredictiveGrid({
      width: 2500, // Between 2200 and 3200
      height: 2000,
      windowType: 'sliding',
      isGridLocked: false
    }));

    await waitFor(() => {
        expect(result.current.suggestedGrid?.cols).toBe(3);
    }, { timeout: 1000 });
  });

  it('should predict 4-panel sliding for large widths', async () => {
    const { result } = renderHook(() => useEgyptianPredictiveGrid({
      width: 3500, // > 3200
      height: 2000,
      windowType: 'sliding',
      isGridLocked: false
    }));

    await waitFor(() => {
        expect(result.current.suggestedGrid?.cols).toBe(4);
    }, { timeout: 1000 });
  });

  it('should apply 1:2:1 symmetry for 3-panel sliding windows', async () => {
    const { result } = renderHook(() => useEgyptianPredictiveGrid({
      width: 2500, // Trigger 3-panel logic
      height: 2000,
      windowType: 'sliding',
      isGridLocked: false
    }));

    await waitFor(() => {
        expect(result.current.suggestedGrid?.cols).toBe(3);
        // Verify default [1,1,1] is replaced by [1,2,1]
        expect(result.current.suggestedGrid?.colWidths).toEqual([1, 2, 1]);
        expect(result.current.predictionReason).toContain('1:2:1');
    }, { timeout: 1000 });
  });

  it('should debounce rapid changes', async () => {
    vi.useFakeTimers();
    
    const { result, rerender } = renderHook(
        (props) => useEgyptianPredictiveGrid(props),
        { initialProps: { width: 1000, height: 2000, windowType: 'sliding', isGridLocked: false } }
    );

    expect(result.current.isPredicting).toBe(true);

    // Change immediately
    rerender({ width: 1100, height: 2000, windowType: 'sliding', isGridLocked: false });
    rerender({ width: 1200, height: 2000, windowType: 'sliding', isGridLocked: false });

    // Should still be predicting and no result yet
    expect(result.current.suggestedGrid).toBeNull();

    // Fast forward
    act(() => {
        vi.advanceTimersByTime(600);
    });

    expect(result.current.suggestedGrid).not.toBeNull();
    expect(result.current.isPredicting).toBe(false);

    vi.useRealTimers();
  });
});

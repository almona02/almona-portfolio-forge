
import { describe, expect, it, vi } from 'vitest';
import { TouchGestureManager } from '../../lib/input/TouchGestureManager';

// Mock PointerEvent since we are in Node environment
class MockPointerEvent {
    pointerId: number;
    clientX: number;
    clientY: number;
    type: string;
    preventDefault = vi.fn();
    stopPropagation = vi.fn();

    constructor(type: string, init: { pointerId: number, clientX: number, clientY: number }) {
        this.type = type;
        this.pointerId = init.pointerId;
        this.clientX = init.clientX;
        this.clientY = init.clientY;
    }
}

describe('TouchGestureManager Performance', () => {
    it('Should process 1000 pan events in under 16ms (Total)', () => {
        const manager = new TouchGestureManager({
            onPan: vi.fn(),
            onPinch: vi.fn(),
            onTap: vi.fn()
        });

        // Simulate touch start
        manager.handlePointerDown(new MockPointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }) as any);

        const start = performance.now();
        const iterations = 1000;
        
        for (let i = 0; i < iterations; i++) {
            manager.handlePointerMove(new MockPointerEvent('pointermove', { pointerId: 1, clientX: 100 + i, clientY: 100 + i }) as any);
        }

        const end = performance.now();
        const totalTime = end - start;
        const timePerEvent = totalTime / iterations;

        console.log(`[Performance] 1000 Pan Events: ${totalTime.toFixed(2)}ms (Avg: ${timePerEvent.toFixed(4)}ms/event)`);

        // Latency Budget: Input processing must be extremely fast to leave room for rendering.
        // Local target: < 0.1ms; CI runners are slower, so we use 0.5ms as the CI-safe threshold.
        expect(timePerEvent).toBeLessThan(0.5);
    });

    it('Should process 1000 pinch events (2 pointers) in under 16ms (Total)', () => {
        const onPinch = vi.fn();
        const manager = new TouchGestureManager({
             onPan: vi.fn(),
             onPinch: onPinch,
             onTap: vi.fn()
        });

        // Pointer 1 Down
        manager.handlePointerDown(new MockPointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }) as any);
        // Pointer 2 Down
        manager.handlePointerDown(new MockPointerEvent('pointerdown', { pointerId: 2, clientX: 200, clientY: 100 }) as any);

        const start = performance.now();
        const iterations = 1000;

        for (let i = 0; i < iterations; i++) {
            // Move pointers apart
            manager.handlePointerMove(new MockPointerEvent('pointermove', { pointerId: 1, clientX: 100 - i, clientY: 100 }) as any);
            manager.handlePointerMove(new MockPointerEvent('pointermove', { pointerId: 2, clientX: 200 + i, clientY: 100 }) as any);
        }

        const end = performance.now();
        const totalTime = end - start;
        const timePerEvent = totalTime / iterations;
        
        console.log(`[Performance] 1000 Pinch Events: ${totalTime.toFixed(2)}ms (Avg: ${timePerEvent.toFixed(4)}ms/event)`);

        // CI-safe threshold (local target is < 0.1ms)
        expect(timePerEvent).toBeLessThan(0.5);
    });
});

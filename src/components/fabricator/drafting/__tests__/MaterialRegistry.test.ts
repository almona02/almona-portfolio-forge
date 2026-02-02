
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OptimizedCanvasManager } from '../OptimizedCanvasManager';
import { ProfileRegistry } from '../services/ProfileRegistry';

describe('Phase 1: Material Awareness', () => {
    
    beforeEach(() => {
        // Mock canvas context for tests
        HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
            scale: vi.fn(),
            clearRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            arc: vi.fn(),
            closePath: vi.fn(),
            strokeRect: vi.fn(),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
        }) as any;
        
        // Mock requestAnimationFrame
        global.requestAnimationFrame = vi.fn((cb) => {
            setTimeout(cb, 0);
            return 1;
        }) as any;
        
        global.cancelAnimationFrame = vi.fn();
    });
    
    describe('ProfileRegistry', () => {
        it('should be a singleton', () => {
            const instance1 = ProfileRegistry.getInstance();
            const instance2 = ProfileRegistry.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should have Alumil M9660 system', () => {
            const system = ProfileRegistry.getInstance().getSystem('alumil_m9660');
            expect(system).toBeDefined();
            expect(system?.manufacturer).toBe('Alumil');
            expect(system?.specs.profileDepth).toBe(56);
        });

        it('should retrieve specs correctly', () => {
            const specs = ProfileRegistry.getInstance().getSpecs('alumil_m9660');
            expect(specs?.glazingPocket.depth).toBe(15);
        });
    });

    describe('OptimizedCanvasManager Integration', () => {
        it('should instantiate without errors', () => {
            const container = document.createElement('div');
            const manager = new OptimizedCanvasManager(container, {
                x: 0, y: 0, width: 1000, height: 800, scale: 1
            });
            expect(manager).toBeDefined();
        });

        it('should have activeSystemId initialized', () => {
             const container = document.createElement('div');
             const manager = new OptimizedCanvasManager(container, {
                 x: 0, y: 0, width: 1000, height: 800, scale: 1
             });
             // Access private/protected property via any cast for testing
             expect((manager as any).activeSystemId).toBeDefined();
             expect((manager as any).activeSystemId).toBe('alumil_m9660');
        });
    });
});

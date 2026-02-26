import { WindowUnit } from '@/types/fabricator';
import { describe, expect, it, vi } from 'vitest';
import { generateModelGeometries } from './windowGeometry';

// Mock Three.js constructs to avoid canvas dependency
vi.mock('three', async () => {
    const actual = await vi.importActual('three');
    return {
        ...actual,
        BufferGeometry: class {
            translate = vi.fn();
            dispose = vi.fn();
            attributes = {
                position: { count: 10 }
            };
        },
        BoxGeometry: class {
            translate = vi.fn();
            dispose = vi.fn();
            attributes = {
                position: { count: 10 }
            };
        },
        ExtrudeGeometry: class {
            translate = vi.fn();
            dispose = vi.fn();
            attributes = {
                position: { count: 10 }
            };
        },
        Shape: class {},
        Path: class {
            moveTo = vi.fn();
            lineTo = vi.fn();
            absellipse = vi.fn();
        },
        Vector2: class {
            constructor(x: number, y: number) { this.x = x; this.y = y; }
            x = 0; y = 0;
            clone() { return this; }
        },
        Vector3: class {
            constructor(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
            x = 0; y = 0; z = 0;
            set = vi.fn();
        },
        Matrix4: class {
            makeTranslation = vi.fn().mockReturnThis();
            makeRotationX = vi.fn().mockReturnThis();
            makeRotationY = vi.fn().mockReturnThis();
            makeRotationZ = vi.fn().mockReturnThis();
            setPosition = vi.fn().mockReturnThis();
            multiplyMatrices = vi.fn().mockReturnThis();
            copy = vi.fn().mockReturnThis();
        }
    };
});

describe('Apex Engine V6: Grid Integration', () => {
    const baseWindow: WindowUnit = {
        id: 'test-window',
        overallWidth: 1000,
        overallHeight: 1000,
        components: [],
        type: 'fixed_window',
        grid: {
            rows: 1,
            cols: 1,
            cells: [{ id: 'c1', row: 0, col: 0, type: 'fixed' }]
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    it('should NOT generate muntins for 1x1 grid', () => {
        const geometry = generateModelGeometries(baseWindow);
        expect(geometry.muntins).toBeDefined();
        // Should be empty array
        expect(Array.isArray(geometry.muntins)).toBe(true);
        expect((geometry.muntins as any[]).length).toBe(0);
    });

    it('should generate 1 mullion for 2x1 grid', () => {
        const gridWindow: WindowUnit = {
            ...baseWindow,
            grid: {
                rows: 1,
                cols: 2, // 2 columns -> 1 mullion
                cells: [
                   { id: 'c1', row: 0, col: 0, type: 'fixed' },
                   { id: 'c2', row: 0, col: 1, type: 'fixed' }
                ],
                colWidths: [500, 500]
            }
        };

        const geometry = generateModelGeometries(gridWindow);
        expect(Array.isArray(geometry.muntins)).toBe(true);
        
        // Should have 1 vertical mullion
        expect((geometry.muntins as any[]).length).toBeGreaterThanOrEqual(1);
    });

    it('should generate 1 transom for 1x2 grid', () => {
        const gridWindow: WindowUnit = {
            ...baseWindow,
            grid: {
                rows: 2, // 2 rows -> 1 transom
                cols: 1,
                cells: [
                   { id: 'c1', row: 0, col: 0, type: 'fixed' },
                   { id: 'c2', row: 1, col: 0, type: 'fixed' }
                ],
                rowHeights: [500, 500]
            }
        };

        const geometry = generateModelGeometries(gridWindow);
        expect(Array.isArray(geometry.muntins)).toBe(true);
        
        // Should have 1 horizontal transom
        expect((geometry.muntins as any[]).length).toBeGreaterThanOrEqual(1);
    });

    it('should generate cross mullions for 2x2 grid', () => {
        const gridWindow: WindowUnit = {
            ...baseWindow,
            grid: {
                rows: 2,
                cols: 2,
                cells: [
                   { id: 'c1', row: 0, col: 0, type: 'fixed' },
                   { id: 'c2', row: 0, col: 1, type: 'fixed' },
                   { id: 'c3', row: 1, col: 0, type: 'fixed' },
                   { id: 'c4', row: 1, col: 1, type: 'fixed' }
                ],
                colWidths: [500, 500],
                rowHeights: [500, 500]
            }
        };

        const geometry = generateModelGeometries(gridWindow);
        // Expect 1 vertical + 1 horizontal = 2 elements
        expect((geometry.muntins as any[]).length).toBeGreaterThanOrEqual(2);
    });

    it('should honor colSpan and avoid duplicated overlapped cells', () => {
        const spannedWindow: WindowUnit = {
            ...baseWindow,
            grid: {
                rows: 1,
                cols: 2,
                cells: [
                    { id: 'c1', row: 0, col: 0, colSpan: 2, type: 'sash' },
                    { id: 'c2-covered', row: 0, col: 1, type: 'fixed' }
                ],
                colWidths: [1, 1]
            }
        };

        const geometry = generateModelGeometries(spannedWindow);
        expect(geometry.sashes.length).toBe(1);
        expect(geometry.fixedGlass.length).toBe(0);
    });

    it('should NOT generate automatic muntins if presetId is present', () => {
        const presetWindow: WindowUnit = {
            ...baseWindow,
            presetId: 'egyptian-slider-01', // Has preset!
            grid: {
                rows: 1,
                cols: 2,
                cells: [
                   { id: 'c1', row: 0, col: 0, type: 'fixed' },
                   { id: 'c2', row: 0, col: 1, type: 'fixed' }
                ]
            }
        };

        const geometry = generateModelGeometries(presetWindow);
        expect((geometry.muntins as any[]).length).toBe(0);
    });
});


import { describe, expect, it } from 'vitest';
import { SmartMeasureLogic } from '../tools/SmartMeasureLogic';
import type { Rectangle } from '../types/drafting';

describe('Phase 2: Smart Measuring Logic', () => {
    // Mock Rectangle: 1000x2200 window starting at 0,0
    const rect: Rectangle = { x: 0, y: 0, width: 1000, height: 2200, type: 'casement' };
    
    // Alumil M9660 Specs:
    // Frame Depth: 56mm
    // Glazing Pocket: 15mm depth, 5mm clearance
    // Glass Overlap = 15 - 5 = 10mm
    const systemId = 'alumil_m9660';

    it('should calculate Outer measurements (Masonry)', () => {
        const points = SmartMeasureLogic.getSnapPoints(rect, 'outer', systemId);
        // Expect corners
        expect(points.length).toBeGreaterThanOrEqual(4);
        expect(points[0]).toEqual({ x: 0, y: 0 });
        expect(points[2]).toEqual({ x: 1000, y: 2200 }); // Bottom Right
    });

    it('should calculate Inner measurements (Daylight)', () => {
        const points = SmartMeasureLogic.getSnapPoints(rect, 'inner', systemId);
        // Frame Depth is 56mm
        // Left should be 0 + 56 = 56
        // Top should be 0 + 56 = 56
        expect(points[0]).toEqual({ x: 56, y: 56 });
        
        // Right should be 1000 - 56 = 944
        expect(points[1].x).toBe(944);
    });

    it('should calculate Glass measurements (Glazing Pocket)', () => {
        const points = SmartMeasureLogic.getSnapPoints(rect, 'glass', systemId);
        // Daylight Left is 56.
        // Glass Overlap is 10mm (15 depth - 5 clearance).
        // Glass should start at 56 - 10 = 46.
        
        expect(points[0].x).toBe(46);
        expect(points[0].y).toBe(46);
        
        // Daylight Right is 944.
        // Glass Right should be 944 + 10 = 954.
        expect(points[1].x).toBe(954);
    });

    it('should snap to standard Egyptian dimensions', () => {
        // 2095 -> Should snap to 2100 (Door Height)
        expect(SmartMeasureLogic.snapToStandardDimension(2095)).toBe(2100);
        
        // 1205 -> Should snap to 1200 (Window Height)
        expect(SmartMeasureLogic.snapToStandardDimension(1205)).toBe(1200);
        
        // 1215 -> Outside 10mm tolerance -> null
        expect(SmartMeasureLogic.snapToStandardDimension(1215)).toBeNull();
    });
});

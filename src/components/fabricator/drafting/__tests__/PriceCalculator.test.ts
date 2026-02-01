
import { describe, expect, it } from 'vitest';
import { PriceCalculator } from '../services/PriceCalculator';
import type { Rectangle } from '../types/drafting';

describe('Phase 1: Pricing Engine', () => {
    // Mock 1m x 1m Casement Window
    const rect: Rectangle = { x: 0, y: 0, width: 1000, height: 1000, type: 'casement' };
    const systemId = 'alumil_m9660';

    it('should calculate aluminum cost correctly', () => {
        const result = PriceCalculator.calculate([rect], systemId);
        
        // Perimeter = (1 + 1) * 2 = 4m
        // Weight/m for Alumil M9660 = 1.2 kg/m
        // Total Weight = 4 * 1.2 = 4.8 kg
        expect(result.aluminum.weightKg).toBeCloseTo(4.8, 1);
        
        // Price/kg = 180 EGP
        // AL Cost = 4.8 * 180 = 864
        expect(result.aluminum.cost).toBeCloseTo(864, 0);
    });

    it('should calculate glass cost correctly', () => {
        const result = PriceCalculator.calculate([rect], systemId);
        
        // Frame Depth = 56mm. Deduction = 112mm.
        // Glass W = 1000 - 112 = 888mm = 0.888m
        // Glass Area = 0.888 * 0.888 = ~0.788 m2
        expect(result.glass.areaM2).toBeCloseTo(0.79, 1);
        
        // Glass Price = 800 EGP/m2
        // Glass Cost = 0.788 * 800 = 630.4
        expect(result.glass.cost).toBeGreaterThan(600);
    });

    it('should include hardware cost for sash', () => {
        const result = PriceCalculator.calculate([rect], systemId);
        // 1 sash = 1 kit
        expect(result.hardware.count).toBe(1);
        expect(result.hardware.cost).toBeGreaterThan(0);
    });
    
    it('should exclude hardware cost for fixed', () => {
        const fixedRect = { ...rect, type: 'fixed' as const };
        const result = PriceCalculator.calculate([fixedRect], systemId);
        expect(result.hardware.count).toBe(0);
        expect(result.hardware.cost).toBe(0);
    });
});

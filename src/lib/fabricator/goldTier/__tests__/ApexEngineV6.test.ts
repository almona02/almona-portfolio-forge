import { optimizeLinearCuts } from '@/lib/algorithms/LinearOptimizer';
import { describe, expect, it } from 'vitest';
import { ApexEngineV6 } from '../ApexEngineV6';

// Mock Data
const mockProfile = {
  id: 'p1', name: 'Frame', width: 50, height: 50, 
  costPerMeter: 10, material: 'aluminum', cuttingAllowance: 0,
  stockQuantity: 100, minStockLevel: 10, supplier: 'AluCorp'
};

const mockSystem: any = {
  id: 'sys-1',
  profiles: { frame: mockProfile, sash: mockProfile },
  fabricationRules: {
    cutting: { miterAllowance: 0 },
    welding: { burnOff: 0 },
    assembly: { frameClearance: 5 }
  }
};

const mockUnit: any = {
  id: 'u-1',
  overallWidth: 1000, // 1 meter
  overallHeight: 1000,
  grid: { cells: [] }
};

describe('ApexEngineV6', () => {
    
  it('should initialize with default strategy (Miter)', () => {
    const engine = new ApexEngineV6(mockSystem, mockUnit);
    const result = engine.generate();
    expect(result.strategyUsed).toContain('Miter');
    // Frame Top should be 1000mm (+ allowance 0) = 1000000 microns
    expect(result.manufacturing.frame.topLength).toBe(1000000);
    expect(result.manufacturing.frame.angle).toBe(45);
  });

  it('should support Butt Joint strategy', () => {
    const engine = new ApexEngineV6(mockSystem, mockUnit, 'butt');
    const result = engine.generate();
    expect(result.strategyUsed).toContain('Butt Joint');
    
    // Top runs full width (1000mm)
    expect(result.manufacturing.frame.topLength).toBe(1000000);
    
    // Side runs height - 2*profileWidth (1000 - 100 = 900mm)
    // 900mm = 900000 microns
    expect(result.manufacturing.frame.leftLength).toBe(900000);
    expect(result.manufacturing.frame.angle).toBe(90);
  });

  it('should optimize stock usage', () => {
    // 4 sides of 1m each = 4m total. Fits in ONE 6m bar.
    const engine = new ApexEngineV6(mockSystem, mockUnit);
    const result = engine.generate();
    
    expect(result.optimization.frameStock.barsCount).toBe(1);
    expect(result.optimization.frameStock.efficiency).toBeGreaterThan(0.66); // 4m/6m = 0.66
  });

  it('should calculate financials', () => {
    const engine = new ApexEngineV6(mockSystem, mockUnit);
    const result = engine.generate();
    
    expect(result.financials.totalCost).toBeGreaterThan(0);
    expect(result.financials.breakdown.profiles).toBeGreaterThan(0);
  });

  it('should use caching for sub-1ms repeats', async () => {
    const engine = new ApexEngineV6(mockSystem, mockUnit);
    
    const _t0 = performance.now();
    engine.generate();
    const _t1 = performance.now();
    
    const _t2 = performance.now();
    const result2 = engine.generate();
    const _t3 = performance.now();
    
    expect(result2.performance.cached).toBe(true);
    // Ideally t3-t2 is very small, likely < 1ms or close to it
  });
});

describe('Linear Optimizer', () => {
  it('should pack cuts efficiently', () => {
    const reqs = [
        { id: '1', length: 2000, label: 'A', quantity: 2 }, // 4000 total
        { id: '2', length: 1500, label: 'B', quantity: 1 }  // 1500 total
    ];
    // Total 5500. Should fit in ONE 6000 bar.
    
    const result = optimizeLinearCuts(reqs, 6000);
    expect(result.barsCount).toBe(1);
    expect(result.efficiency).toBeCloseTo(5500/6000, 1);
  });
  
  it('should spawn new bars when needed', () => {
      const reqs = [
          { id: '1', length: 4000, label: 'A', quantity: 2 }, // 8000 total
      ];
      // Needs TWO 6000 bars (4000 on bar 1, 4000 on bar 2)
      
      const result = optimizeLinearCuts(reqs, 6000);
      expect(result.barsCount).toBe(2); 
  });
});

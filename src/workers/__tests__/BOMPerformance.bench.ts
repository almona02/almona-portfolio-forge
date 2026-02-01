import { CostCalculator } from '@/lib/fabricator/bom/CostCalculator';
import { EgyptianPricingEngine } from '@/lib/fabricator/bom/EgyptianPricingEngine';
import { GlassBOMCalculator } from '@/lib/fabricator/bom/GlassBOMCalculator';
import { ProfileBOMCalculator } from '@/lib/fabricator/bom/ProfileBOMCalculator';
import { EgyptianPattern, SystemPack, WindowUnit } from '@/types/fabricator';
import { bench, describe, expect, it } from 'vitest';

// Mock data setup
const mockSystemPack: SystemPack = {
  meta: { id: 'test-system', name: 'Test System', description: 'Test', version: '1.0' },
  profiles: [],
  hardware: [],
  pricing: {},
  constraints: { maxSashWeight: 100, maxSashWidth: 1000, maxSashHeight: 2000 }
};

const mockWindowUnit: WindowUnit = {
  id: 'test-unit',
  name: 'Test Unit',
  width: 2000, // Large unit
  height: 2000,
  quantity: 1,
  type: 'casement',
  components: [],
  hardware: [],
  grid: { rows: 2, cols: 2, cells: [] }
};

const mockPattern: EgyptianPattern = {
  id: 'custom',
  name: 'Custom',
  defaultWidth: 1000,
  defaultHeight: 1000,
  type: 'casement',
  category: 'window'
};

// Initialize calculators
const profileCalc = new ProfileBOMCalculator();
const glassCalc = new GlassBOMCalculator();
const pricingEngine = new EgyptianPricingEngine();
const _costCalc = new CostCalculator(pricingEngine);

describe('BOM Calculation Performance', () => {
  
  const calculateFullBOM = async () => {
    const profiles = await profileCalc.calculateProfileBOM(mockWindowUnit, mockPattern, mockSystemPack);
    const glazing = await glassCalc.calculateGlassBOM(mockWindowUnit, mockPattern);
    const _hardware = []; // Simplified
    
    // Simulate cost calculation
    const _basicProfiles = profiles.map(p => ({...p, cost: p.length * 0.1})); 
    
    // We are benchmarking the core logic, not the worker overhead here, 
    // as Vitest benchmark runs on the main thread mostly. 
    // This establishes the baseline computation cost.
    return { profiles, glazing };
  };

  bench('BOM Core Calculation (Heavy Load)', async () => {
    await calculateFullBOM();
  }, { time: 1000 });

  it('maintains deterministic output (Golden Master Mock)', async () => {
    const result1 = await calculateFullBOM();
    const result2 = await calculateFullBOM();
    
    const hash1 = JSON.stringify(result1);
    const hash2 = JSON.stringify(result2);
    
    expect(hash1).toBe(hash2);
  });
});

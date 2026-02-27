import { EGYPTIAN_PATTERNS } from '@/data/egyptian-window-patterns';
import { CostCalculator } from '@/lib/fabricator/bom/CostCalculator';
import { EgyptianPricingEngine } from '@/lib/fabricator/bom/EgyptianPricingEngine';
import { GlassBOMCalculator } from '@/lib/fabricator/bom/GlassBOMCalculator';
import { ProfileBOMCalculator } from '@/lib/fabricator/bom/ProfileBOMCalculator';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { bench, describe, expect, it } from 'vitest';

// Mock data setup - use real pattern for type safety
const mockPattern = EGYPTIAN_PATTERNS[0];

const mockSystemPack: SystemPack = {
  meta: {
    id: 'test-system',
    name: 'Test System',
    brands: ['Test'],
    regions: ['global'],
  },
  windowSystemSpec: {},
  id: 'test-system',
  profiles: [],
};

const mockWindowUnit: WindowUnit = {
  id: 'test-unit',
  orderNumber: 'ORD-001',
  posNumber: 'POS-001',
  type: 'casement',
  components: [],
  overallWidth: 2000,
  overallHeight: 2000,
  color: '#ffffff',
  glazing: { type: 'single', thickness: 6 },
  hardware: [],
  status: 'design',
  optimization: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  grid: {
    rows: 2,
    cols: 2,
    cells: [
      { id: '0-0', row: 0, col: 0, type: 'sash' },
      { id: '0-1', row: 0, col: 1, type: 'sash' },
      { id: '1-0', row: 1, col: 0, type: 'sash' },
      { id: '1-1', row: 1, col: 1, type: 'sash' },
    ],
  },
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

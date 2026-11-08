/**
 * SystemPricingService provenance attach — Supabase mocked, no database.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ row: null as any }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: mocks.row, error: mocks.row ? null : { code: 'PGRST116' } })),
    }),
  },
}));

vi.mock('@/lib/currencyExchange', () => ({
  convertCurrency: vi.fn((amount: number) => Promise.resolve({ amount })),
}));

import { systemPricingService } from './SystemPricingService';

const provenance = {
  version: 6,
  updatedBy: 'user-1',
  updatedAt: '2026-11-06T00:00:00.000Z',
  source: 'admin_catalog',
  note: null,
  currency: 'EGP',
};

const pricing = {
  currency: 'EGP',
  aluminumPricePerKg: 120,
  profilePrices: { FR60: 45 },
  hardware: { '0707': 30 },
  glazingTypes: [{ id: 'double', name: 'Double', pricePerSquareMeter: 900 }],
  gaskets: {},
  initialized: true,
};

describe('provenance attach', () => {
  beforeEach(() => {
    systemPricingService.clearCache();
    mocks.row = null;
  });

  it('returns pricing with stamped provenance', async () => {
    mocks.row = { specifications: { system_pricing: pricing, system_pricing_provenance: provenance } };
    const result = await systemPricingService.getSystemPricingWithProvenance('p1', 'pack-1');
    expect(result?.provenance).toEqual(provenance);
    expect(result?.pricing.currency).toBe('EGP');
  });

  it('attaches provenance to hardware price results', async () => {
    mocks.row = { specifications: { system_pricing: pricing, system_pricing_provenance: provenance } };
    const result = await systemPricingService.calculateHardwarePrice('0707', 2, 'pack-1', 'p2');
    expect(result.source).toBe('system_pricing');
    expect(result.price).toBe(60);
    expect(result.provenance).toEqual(provenance);
  });

  it('attaches provenance to profile and glazing results', async () => {
    mocks.row = { specifications: { system_pricing: pricing, system_pricing_provenance: provenance } };
    const profile = { id: 'p3', costPerMeter: 0 } as any;
    const profileResult = await systemPricingService.calculateProfilePrice('FR60', 1, 'pack-1', profile);
    expect(profileResult.provenance).toEqual(provenance);
    const glazingResult = await systemPricingService.calculateGlazingPrice('double', 1, 'pack-1', 'p3b');
    expect(glazingResult.provenance).toEqual(provenance);
  });

  it('yields null provenance for legacy rows without breaking pricing', async () => {
    mocks.row = { specifications: { system_pricing: pricing } };
    const result = await systemPricingService.getSystemPricingWithProvenance('p4', 'pack-1');
    expect(result?.pricing.currency).toBe('EGP');
    expect(result?.provenance).toBeNull();
  });

  it('returns null when no pricing is configured', async () => {
    mocks.row = { specifications: {} };
    await expect(systemPricingService.getSystemPricingWithProvenance('p5', 'pack-1')).resolves.toBeNull();
  });
});

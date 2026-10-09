import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CALUMINIUM_PS_PRICING_EVIDENCE,
  MissingOrExpiredPriceError,
  assertPricingEvidenceCurrent,
  requireHardwareUnitPriceEgp,
  requireProfileCostPerMeterEgp,
} from './psPricingEvidence';

describe('CALUMINIUM PS dated pricing evidence', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes positive EGP/m for sliding ledger members', () => {
    expect(requireProfileCostPerMeterEgp('PS-6601-FRAME')).toBe(185);
    expect(requireProfileCostPerMeterEgp('PS-6601-TRACK')).toBe(110);
    expect(requireHardwareUnitPriceEgp('ps_sliding_roller')).toBe(15);
  });

  it('resolves legacy FRAME-60 / SASH-60 BOM codes to priced PS members', () => {
    expect(requireProfileCostPerMeterEgp('FRAME-60')).toBe(185);
    expect(requireProfileCostPerMeterEgp('SASH-60')).toBe(165);
    expect(requireProfileCostPerMeterEgp('MULLION-60')).toBe(310);
  });

  it('fails loudly on missing profile price', () => {
    expect(() => requireProfileCostPerMeterEgp('PS-DOES-NOT-EXIST')).toThrow(
      MissingOrExpiredPriceError,
    );
  });

  it('fails loudly when evidence is expired', () => {
    expect(() => assertPricingEvidenceCurrent(CALUMINIUM_PS_PRICING_EVIDENCE, '2027-01-02')).toThrow(
      /expired/i,
    );
  });

  it('fails loudly when evidence is not yet effective', () => {
    expect(() => assertPricingEvidenceCurrent(CALUMINIUM_PS_PRICING_EVIDENCE, '2026-09-30')).toThrow(
      /not yet effective/i,
    );
  });

  it('records provenance fields', () => {
    expect(CALUMINIUM_PS_PRICING_EVIDENCE.currency).toBe('EGP');
    expect(CALUMINIUM_PS_PRICING_EVIDENCE.source.kind).toBe('workshop_schedule');
    expect(CALUMINIUM_PS_PRICING_EVIDENCE.source.reference.length).toBeGreaterThan(20);
    expect(CALUMINIUM_PS_PRICING_EVIDENCE.effectiveDate).toBe('2026-10-01');
    expect(CALUMINIUM_PS_PRICING_EVIDENCE.expiresAt).toBe('2027-01-01');
  });

  it('lists sliding handle/lock as provisional positive EGP (never 0.00)', async () => {
    const { isCaluminiumPsHardwarePriceProvisional, isCaluminiumPsHardwarePriceTbd } =
      await import('./psPricingEvidence');
    expect(isCaluminiumPsHardwarePriceProvisional('ps_sliding_handle')).toBe(true);
    expect(isCaluminiumPsHardwarePriceProvisional('ps_sliding_lock')).toBe(true);
    expect(isCaluminiumPsHardwarePriceTbd('ps_sliding_handle')).toBe(false);
    expect(requireHardwareUnitPriceEgp('ps_sliding_handle')).toBe(40);
    expect(requireHardwareUnitPriceEgp('ps_sliding_lock')).toBe(60);
  });

  it('prefers positive pack kit unit_price as admin override for provisional kits', async () => {
    const { resolveBomHardwareUnitPrice } = await import(
      '@/lib/fabricator/bom/requirePricedCost'
    );
    const overridden = resolveBomHardwareUnitPrice('caluminium-ps', 'ps_sliding_handle', 75);
    expect(overridden).toEqual({
      status: 'priced',
      unitPriceEgp: 75,
      priceStatus: 'admin_override',
    });
    const sameAsEvidence = resolveBomHardwareUnitPrice('caluminium-ps', 'ps_sliding_handle', 40);
    expect(sameAsEvidence).toEqual({
      status: 'priced',
      unitPriceEgp: 40,
      priceStatus: 'provisional',
    });
  });
});

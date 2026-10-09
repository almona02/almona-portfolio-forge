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
});

import { describe, expect, it } from 'vitest';
import {
  HARDENER_APPLICABILITY_SEED,
  packRequiresHardener,
} from './HardenerApplicability';

describe('HardenerApplicability', () => {
  it('fail-closes for unknown packs and empty ids', () => {
    expect(packRequiresHardener(null)).toBe(true);
    expect(packRequiresHardener('')).toBe(true);
    expect(packRequiresHardener('caluminium-ps')).toBe(true);
  });

  it('does not honor name-based %-no-hardener loopholes', () => {
    expect(packRequiresHardener('evil-no-hardener')).toBe(true);
    expect(packRequiresHardener('customer-no-hardener')).toBe(true);
  });

  it('honors versioned seed metadata for estimate/sandbox packs only', () => {
    expect(packRequiresHardener('sandbox-no-hardener')).toBe(false);
    expect(packRequiresHardener('estimate-manual')).toBe(false);
    expect(HARDENER_APPLICABILITY_SEED.every((r) => r.applicabilityVersion >= 1)).toBe(true);
    expect(
      HARDENER_APPLICABILITY_SEED.every((r) => Object.keys(r.evidence).length >= 2),
    ).toBe(true);
  });

  it('uses highest applicability version when records conflict', () => {
    const rows = [
      {
        systemPackId: 'custom-pack',
        requiresHardener: false,
        applicabilityVersion: 1,
        reason: 'temporary na',
        evidence: { kind: 'estimate_only', source: 'test' },
      },
      {
        systemPackId: 'custom-pack',
        requiresHardener: true,
        applicabilityVersion: 2,
        reason: 'restored requirement after catalogue update',
        evidence: { kind: 'catalogue', source: 'test' },
      },
    ];
    expect(packRequiresHardener('custom-pack', rows)).toBe(true);
  });
});

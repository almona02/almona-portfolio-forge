import { describe, expect, it } from 'vitest';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import {
  CALUMINIUM_PS_PRICING_EVIDENCE,
  MissingOrExpiredPriceError,
} from '@/data/profileSystems/egyptian/caluminium/psPricingEvidence';
import { ProfileBOMCalculator } from './ProfileBOMCalculator';
import { HardwareBOMCalculator } from './HardwareBOMCalculator';
import { requireBomProfileCostPerMeter } from './requirePricedCost';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { Profile, WindowUnit } from '@/types/fabricator';

describe('caluminium-ps sliding BOM completeness', () => {
  const calculator = new ProfileBOMCalculator();
  const hardwareCalc = new HardwareBOMCalculator();

  const pattern = {
    id: 'sliding-2s-ps',
    name: 'Sliding 2 Sash',
    type: 'sliding',
    openingMechanism: { type: 'sliding' },
    gridSpec: {
      rows: 1,
      cols: 2,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sash' },
        { id: '0-1', row: 0, col: 1, type: 'sash' },
      ],
      colWidths: [1, 1],
      rowHeights: [1],
    },
  } as unknown as EgyptianPattern;

  const unit = {
    id: 'wu-ps',
    overallWidth: 1400,
    overallHeight: 1500,
    type: 'sliding',
    systemPackId: 'caluminium-ps',
    grid: pattern.gridSpec,
  } as unknown as WindowUnit;

  it('emits ≥5 priced profile lines including sash, interlock, track', async () => {
    const profiles = await calculator.calculateProfileBOM(unit, pattern, CALUMINIUM_PS_PACK);
    const priced = profiles.filter((line) => (line.cost ?? 0) > 0);
    expect(priced.length).toBeGreaterThanOrEqual(5);

    const codes = profiles.map((p) => p.profileCode);
    expect(codes.some((c) => String(c).includes('FRAME'))).toBe(true);
    expect(codes.some((c) => String(c).includes('SASH'))).toBe(true);
    expect(codes.some((c) => String(c).includes('INTERLOCK'))).toBe(true);
    expect(codes.some((c) => String(c).includes('TRACK'))).toBe(true);

    expect(profiles.some((p) => p.role === 'interlock')).toBe(true);
    expect(profiles.some((p) => p.role === 'track')).toBe(true);
    expect(profiles.every((p) => !String(p.profileCode).startsWith('SASH-60'))).toBe(true);
  });

  it('uses pack sliding roller kit in hardware schedule', async () => {
    const hardware = await hardwareCalc.calculateHardwareBOM(unit, pattern, CALUMINIUM_PS_PACK);
    const roller = hardware.find((h) => h.category === 'roller');
    expect(roller).toBeDefined();
    expect(roller!.supplierCode).toBe('ps_sliding_roller');
    expect(roller!.metadata?.unitPriceEgp).toBe(
      CALUMINIUM_PS_PRICING_EVIDENCE.hardware.ps_sliding_roller,
    );
  });

  it('fails loudly on missing profile price (never 0.00)', () => {
    expect(() =>
      requireBomProfileCostPerMeter('caluminium-ps', {
        id: 'PS-MISSING-PRICE',
        costPerMeter: 0,
      }),
    ).toThrow(MissingOrExpiredPriceError);
  });

  it('stamps dated pricing provenance on the pack', () => {
    const meta = (
      CALUMINIUM_PS_PACK.windowSystemSpec as {
        catalog_metadata?: { pricing_evidence?: { effectiveDate?: string; currency?: string } };
      }
    ).catalog_metadata?.pricing_evidence;
    expect(meta?.currency).toBe('EGP');
    expect(meta?.effectiveDate).toBe(CALUMINIUM_PS_PRICING_EVIDENCE.effectiveDate);
  });

  it('enriches saved components with missing sliding track/interlock (ledger path)', async () => {
    const frame = CALUMINIUM_PS_PACK.profiles.find((p: Profile) => p.profileRole === 'frame');
    const sash = CALUMINIUM_PS_PACK.profiles.find((p: Profile) =>
      String(p.profileRole || '').includes('sash'),
    );
    expect(frame && sash).toBeTruthy();

    const savedUnit = {
      ...unit,
      type: 'sliding_window_2sash',
      components: [
        {
          id: 'c-frame',
          type: 'frame',
          profile: frame!,
          cuttingLengths: [1400, 1500, 1400, 1500],
          quantity: 1,
        },
        {
          id: 'c-sash',
          type: 'sash',
          profile: sash!,
          cuttingLengths: [700, 700, 1500, 1500, 700, 700, 1500, 1500],
          quantity: 2,
        },
      ],
    } as unknown as WindowUnit;

    const profiles = await calculator.calculateProfileBOM(savedUnit, pattern, CALUMINIUM_PS_PACK);
    expect(profiles.some((p) => p.role === 'interlock')).toBe(true);
    expect(profiles.some((p) => p.role === 'track')).toBe(true);
    expect(profiles.some((p) => String(p.profileCode).includes('TRACK'))).toBe(true);
  });
});

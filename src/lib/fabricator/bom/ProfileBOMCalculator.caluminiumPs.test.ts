import { describe, expect, it } from 'vitest';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import { ProfileBOMCalculator } from './ProfileBOMCalculator';
import { HardwareBOMCalculator } from './HardwareBOMCalculator';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowUnit } from '@/types/fabricator';

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
    expect(roller!.metadata?.unitPriceEgp).toBe(15);
  });
});

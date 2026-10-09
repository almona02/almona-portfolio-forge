/**
 * Saved-component re-BOM must match generated-design cut counts.
 * Regression: catalogue track uses profileRole screen_track + bomRole track —
 * enrichment must not append a second track (+2 cuts).
 */
import { describe, expect, it } from 'vitest';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { Profile, WindowComponent, WindowUnit } from '@/types/fabricator';
import { ProfileBOMCalculator } from './ProfileBOMCalculator';
import { assessBOMQualification, countRequiredProfilePieces } from './bomQualification';

const identity = {
  ownerUserId: 'owner',
  projectId: 'project',
  positionId: 'pose',
  source: 'v2' as const,
  revision: 1,
};

const pattern = {
  id: 'sliding-2s-parity',
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

function packProfile(matcher: (p: Profile) => boolean): Profile {
  const found = CALUMINIUM_PS_PACK.profiles?.find(matcher);
  if (!found) throw new Error('Missing pack profile for parity fixture');
  return found;
}

describe('ProfileBOMCalculator saved ↔ generated ledger parity', () => {
  const calculator = new ProfileBOMCalculator();

  it('full saved sliding components (incl. screen_track) re-BOM to required 23 cuts', async () => {
    const baseUnit = {
      id: 'wu-parity',
      overallWidth: 1200,
      overallHeight: 1400,
      type: 'sliding_window_2sash',
      systemPackId: 'caluminium-ps',
      grid: pattern.gridSpec,
    } as unknown as WindowUnit;

    const generated = await calculator.calculateProfileBOM(baseUnit, pattern, CALUMINIUM_PS_PACK);
    const generatedCuts = generated.reduce((n, p) => n + p.cuttingLengths.length, 0);
    const required = countRequiredProfilePieces(baseUnit, pattern);
    expect(generatedCuts).toBe(required);
    expect(required).toBe(23);

    const frame = packProfile((p) => p.profileRole === 'frame');
    const sash = packProfile((p) => String(p.profileRole || '').includes('sash'));
    const interlock = packProfile((p) => p.profileRole === 'interlock');
    const track = packProfile((p) => p.id === 'PS-6601-TRACK' || p.profileRole === 'screen_track');
    const bead = packProfile((p) => p.profileRole === 'glazing_bead');

    expect(track.profileRole).toBe('screen_track');
    expect(track.specifications?.bomRole).toBe('track');

    const byRole = (role: string) =>
      generated.find((p) => p.role === role || (role === 'track' && p.role === 'screen_track'));

    const components = [
      {
        id: 'c-frame',
        type: 'frame',
        profile: frame,
        cuttingLengths: [...(byRole('frame')?.cuttingLengths ?? [1200, 1400, 1200, 1400])],
        quantity: 1,
      },
      {
        id: 'c-sash',
        type: 'sash',
        profile: sash,
        cuttingLengths: [...(byRole('sash')?.cuttingLengths ?? Array(8).fill(500))],
        quantity: 2,
      },
      {
        id: 'c-interlock',
        type: 'interlock',
        profile: interlock,
        cuttingLengths: [...(byRole('interlock')?.cuttingLengths ?? [1200])],
        quantity: 1,
      },
      {
        id: 'c-track',
        type: 'track',
        profile: track,
        cuttingLengths: [...(byRole('track')?.cuttingLengths ?? [1100, 1100])],
        quantity: 2,
      },
      {
        id: 'c-bead',
        type: 'glazing_bead',
        profile: bead,
        cuttingLengths: [...(byRole('glazing_bead')?.cuttingLengths ?? Array(8).fill(400))],
        quantity: 1,
      },
    ] as unknown as WindowComponent[];

    const savedUnit = { ...baseUnit, components } as unknown as WindowUnit;
    const rebom = await calculator.calculateProfileBOM(savedUnit, pattern, CALUMINIUM_PS_PACK);
    const rebomCuts = rebom.reduce((n, p) => n + p.cuttingLengths.length, 0);

    expect(rebomCuts).toBe(required);
    expect(rebomCuts).toBe(generatedCuts);

    const trackRows = rebom.filter(
      (p) => p.role === 'track' || p.role === 'screen_track' || String(p.profileCode).includes('TRACK'),
    );
    const trackCuts = trackRows.reduce((n, p) => n + p.cuttingLengths.length, 0);
    expect(trackCuts).toBe(2);

    const qualification = assessBOMQualification(savedUnit, pattern, rebom, {
      identity,
      catalogueVersion: 'fixture-catalogue',
      ruleVersion: 'fixture-rules',
    });
    expect(qualification.status).toBe('qualified');
    expect(qualification.unplacedPieceCount).toBe(0);
    expect(qualification.reasons).toEqual([]);
  });
});

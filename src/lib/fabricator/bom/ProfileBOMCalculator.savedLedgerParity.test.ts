/**
 * Saved-component re-BOM must match generated-design cut counts.
 * Regression: catalogue track uses profileRole screen_track + bomRole track —
 * enrichment must not append a second track (+2 cuts).
 */
import { describe, expect, it } from 'vitest';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { Profile, WindowUnit } from '@/types/fabricator';
import { bomMatchesPhysicalDesign } from '@/lib/fabricator/validation/WorkflowValidator';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
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

    const track = packProfile((p) => p.id === 'PS-6601-TRACK' || p.profileRole === 'screen_track');
    expect(track.profileRole).toBe('screen_track');
    expect(track.specifications?.bomRole).toBe('track');

    // Save nominal design occurrences, not BOM lengths which already include allowances.
    const components = await calculator.resolvePhysicalDesignComponents(baseUnit, pattern, CALUMINIUM_PS_PACK);
    expect(components.some(c => c.profile.id === track.id)).toBe(true);

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

  it('frame-only saved components enrich sash + sliding subsystems to required 23 cuts', async () => {
    const baseUnit = {
      id: 'wu-frame-only',
      overallWidth: 1200,
      overallHeight: 1400,
      type: 'sliding_window_2sash',
      systemPackId: 'caluminium-ps',
      grid: pattern.gridSpec,
    } as unknown as WindowUnit;

    const frame = packProfile((p) => p.profileRole === 'frame');
    const frameOnly = {
      ...baseUnit,
      components: [
        {
          id: 'c-frame-a',
          type: 'frame',
          profile: frame,
          cuttingLengths: [1200],
          quantity: 1,
        },
        {
          id: 'c-frame-b',
          type: 'frame',
          profile: frame,
          cuttingLengths: [1400],
          quantity: 1,
        },
        {
          id: 'c-frame-c',
          type: 'frame',
          profile: frame,
          cuttingLengths: [1200],
          quantity: 1,
        },
        {
          id: 'c-frame-d',
          type: 'frame',
          profile: frame,
          cuttingLengths: [1400],
          quantity: 1,
        },
      ],
    } as unknown as WindowUnit;

    const profiles = await calculator.calculateProfileBOM(frameOnly, pattern, CALUMINIUM_PS_PACK);
    const cuts = profiles.reduce((n, p) => n + p.cuttingLengths.length, 0);
    const required = countRequiredProfilePieces(frameOnly, pattern);

    expect(required).toBe(23);
    expect(cuts).toBe(23);
    expect(profiles.some((p) => p.role === 'sash')).toBe(true);
    expect(profiles.some((p) => p.role === 'interlock')).toBe(true);
    expect(profiles.some((p) => p.role === 'track' || p.role === 'screen_track')).toBe(true);
    expect(profiles.some((p) => p.role === 'glazing_bead')).toBe(true);

    const qualification = assessBOMQualification(frameOnly, pattern, profiles, {
      identity,
      catalogueVersion: 'fixture-catalogue',
      ruleVersion: 'fixture-rules',
    });
    expect(qualification.status).toBe('qualified');
    expect(qualification.reasons).toEqual([]);

    // Optimize gate: regenerated physical design must match BOM cuts (not frame-only).
    const physicalDesign = await calculator.resolvePhysicalDesignComponents(
      frameOnly,
      pattern,
      CALUMINIUM_PS_PACK,
    );
    const aligned = { ...frameOnly, components: physicalDesign };
    const alignedBom = await calculator.calculateProfileBOM(aligned, pattern, CALUMINIUM_PS_PACK);
    expect(
      bomMatchesPhysicalDesign({ profiles: alignedBom } as CompleteBOM, aligned),
    ).toBe(true);
    expect(bomMatchesPhysicalDesign({ profiles } as CompleteBOM, frameOnly)).toBe(false);
  });
  it('rejects partial saved cuts even when a sash is present', async () => {
    const unit = {
      id: 'wu-partial-sash', overallWidth: 1200, overallHeight: 1400,
      type: 'sliding_window_2sash', systemPackId: 'caluminium-ps', grid: pattern.gridSpec,
      components: [{ id: 'partial-sash', type: 'sash',
        profile: packProfile(p => String(p.profileRole).includes('sash')),
        quantity: 1, cuttingLengths: [500], angles: [45] }],
    } as unknown as WindowUnit;
    await expect(calculator.resolvePhysicalDesignComponents(unit, pattern, CALUMINIUM_PS_PACK))
      .rejects.toThrow('Saved sliding cuts do not match the design');
  });

  it('rejects a same-count substituted cut instead of silently overwriting authored components', async () => {
    const unit = {
      id: 'wu-wrong-length', overallWidth: 1200, overallHeight: 1400,
      type: 'sliding_window_2sash', systemPackId: 'caluminium-ps', grid: pattern.gridSpec,
      components: [],
    } as unknown as WindowUnit;
    const components = await calculator.resolvePhysicalDesignComponents(unit, pattern, CALUMINIUM_PS_PACK);
    const sash = components.find(c => c.type === 'sash');
    expect(sash).toBeDefined();
    const changed = components.map(c => c === sash
      ? { ...c, cuttingLengths: c.cuttingLengths.map((length, index) => index === 0 ? length + 17 : length) }
      : c);
    await expect(calculator.resolvePhysicalDesignComponents({ ...unit, components: changed }, pattern, CALUMINIUM_PS_PACK))
      .rejects.toThrow('Saved sliding cuts do not match the design');
    expect(changed).not.toEqual(components);
  });

});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DOWIN_LAYOUT_FAMILIES,
  dowinPositionMultiset,
  groupPositionsByLayout,
  reportMultisetMismatch,
  type DowinSourceReference,
} from './dowinSourceMultiset';

const fixtureDir = resolve(process.cwd(), 'src/tests/fixtures/dowin-deceuninck70');

function loadReference(): DowinSourceReference {
  return JSON.parse(
    readFileSync(resolve(fixtureDir, 'all-saved-profile-cut-reference.json'), 'utf8'),
  ) as DowinSourceReference;
}

describe('DoWin Deceuninck 70 evidence fixtures (AICS-001)', () => {
  const ref = loadReference();

  it('preserves 11 source identities and 197 profile pieces across 5 layout families', () => {
    expect(ref.positions).toHaveLength(11);
    const pieces = ref.positions.reduce(
      (sum, p) => sum + p.cuts.reduce((a, c) => a + (c.quantity || 0), 0),
      0,
    );
    expect(pieces).toBe(197);
    const byLayout = groupPositionsByLayout(ref.positions);
    expect(Object.keys(byLayout).sort()).toEqual([...DOWIN_LAYOUT_FAMILIES].sort());
    expect(byLayout['double casement with structural mullion']).toHaveLength(7);
  });

  it('keeps exact family multisets identical across the seven double-casement captures', () => {
    const doubles = ref.positions.filter(
      (p) => p.layout === 'double casement with structural mullion',
    );
    const baseline = dowinPositionMultiset(doubles[0]);
    expect(baseline).toHaveLength(21);
    for (const position of doubles.slice(1)) {
      const report = reportMultisetMismatch(baseline, dowinPositionMultiset(position), {
        leftLabel: doubles[0].key,
        rightLabel: position.key,
      });
      expect(report.matched, JSON.stringify(report)).toBe(true);
    }
  });

  it('reports exact mismatches without bending source expectations', () => {
    const control = ref.positions.find((p) => p.key === 'control');
    const single = ref.positions.find((p) => p.key === 'e1');
    expect(control && single).toBeTruthy();
    const report = reportMultisetMismatch(
      dowinPositionMultiset(control!),
      dowinPositionMultiset(single!),
      { leftLabel: 'control', rightLabel: 'e1' },
    );
    expect(report.matched).toBe(false);
    expect(report.leftCount).toBe(13);
    expect(report.rightCount).toBe(12);
    expect(report.missingInRight.length + report.extraInRight.length).toBeGreaterThan(0);
    // Source counts stay as captured — reporter must not mutate fixtures.
    expect(control!.n).toBe(13);
    expect(single!.n).toBe(12);
  });

  it('separates material-BOM claims from profile schedules (profile-only fixture)', () => {
    for (const position of ref.positions) {
      for (const cut of position.cuts) {
        expect(cut.profileCode).toMatch(/^Deceuninck-/);
        expect(cut).not.toHaveProperty('glassSku');
        expect(cut).not.toHaveProperty('steelLengthMm');
        expect(cut).not.toHaveProperty('hardwareSku');
      }
    }
  });

  it('marks fabricator generator parity as unmatched until engine recipe exits (explicit)', () => {
    // Evidence boundary: capture is complete; Fabricator profile parity is not_run.
    // Do not invent generator lengths to force green.
    const register = readFileSync(resolve(fixtureDir, 'saved-position-register.csv'), 'utf8');
    expect(register).toContain('fabricatorParity');
    expect(register.match(/not_run/g)?.length).toBe(11);
    const generatorMultiset: string[] = []; // not yet wired to Deceuninck authority
    for (const position of ref.positions) {
      const report = reportMultisetMismatch(dowinPositionMultiset(position), generatorMultiset, {
        leftLabel: `source:${position.key}`,
        rightLabel: 'fabricator:generator',
      });
      expect(report.matched).toBe(false);
      expect(report.missingInRight.length).toBe(report.leftCount);
    }
  });
});

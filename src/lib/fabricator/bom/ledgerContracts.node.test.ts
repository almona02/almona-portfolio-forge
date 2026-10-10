/**
 * Ledger contract suite — runnable via `npm run test:ledger` (node:test + vite-node).
 * Does not depend on broken Vitest/Storybook describe.config.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowComponent, WindowUnit } from '@/types/fabricator';
import {
  assertLedgerMultisetParity,
  designFingerprint,
  designFingerprintFromWindowUnit,
  ledgerCutMultiset,
  ledgerMultisetsEqual,
  mergeComponentsForSave,
  sha256HexSync,
} from './preserveCutLedger';
import {
  reconcilePoseCutLedger,
  resolveExpectedDesignLedger,
  savedLedgerNeedsMaterialize,
} from './ledgerParity';
import { ProfileBOMCalculator } from './ProfileBOMCalculator';
import { optimizeProjectEstimate } from '@/lib/fabricator/production/ProjectOptimizationEstimate';

const pattern = {
  id: 'sliding-2s',
  name: 'Sliding 2',
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

const baseDesign = {
  overallWidth: 1200,
  overallHeight: 1400,
  type: 'sliding_window_2sash',
  systemPackId: 'caluminium-ps',
  presetId: 'sliding-2s',
  grid: pattern.gridSpec,
};

function cuts(
  profileId: string,
  lengths: number[],
  angles: number[] = lengths.map(() => 45),
): WindowComponent {
  return {
    id: `c-${profileId}`,
    type: 'frame',
    profile: { id: profileId } as WindowComponent['profile'],
    cuttingLengths: lengths,
    angles,
  } as WindowComponent;
}

describe('AICS-001 cut-ledger contracts', () => {
  it('browser SHA-256 matches Node createHash on shared vectors', () => {
    const vectors = [
      '',
      'a',
      'almona-design-fingerprint',
      JSON.stringify({ overallWidth: 1200, overallHeight: 1400, grid: null }),
    ];
    for (const text of vectors) {
      const node = createHash('sha256').update(text, 'utf8').digest('hex');
      assert.equal(sha256HexSync(text), node, `vector mismatch for ${JSON.stringify(text)}`);
    }
    const fp = designFingerprint(baseDesign);
    const payload = {
      grid: {
        cells: [
          { col: 0, id: '0-0', row: 0, type: 'sash' },
          { col: 1, id: '0-1', row: 0, type: 'sash' },
        ],
        colWidths: [1, 1],
        cols: 2,
        rowHeights: [1],
        rows: 1,
      },
      overallHeight: 1400,
      overallWidth: 1200,
      presetId: 'sliding-2s',
      systemPackId: 'caluminium-ps',
      type: 'sliding_window_2sash',
    };
    assert.equal(fp, createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex'));
  });

  it('pricing-only empty write preserves complete ledger when fingerprint unchanged', () => {
    const ledger = [cuts('PS-FRAME', [1200, 1400, 1200, 1400])];
    const fp = designFingerprintFromWindowUnit(baseDesign);
    const merged = mergeComponentsForSave({
      incoming: [],
      existing: ledger,
      incomingDesignFingerprint: fp,
      existingDesignFingerprint: fp,
    });
    assert.equal(merged.invalidated, false);
    assert.equal(merged.clearOptimization, false);
    assert.deepEqual(merged.components, ledger);
    assert.equal(merged.designFingerprint, fp);
  });

  it('dimension change with empty incoming invalidates ledger and optimization', () => {
    const ledger = [cuts('PS-FRAME', [1200, 1400, 1200, 1400])];
    const merged = mergeComponentsForSave({
      incoming: [],
      existing: ledger,
      incomingDesignFingerprint: designFingerprintFromWindowUnit({ ...baseDesign, overallWidth: 1800 }),
      existingDesignFingerprint: designFingerprintFromWindowUnit(baseDesign),
    });
    assert.equal(merged.invalidated, true);
    assert.equal(merged.clearOptimization, true);
    assert.equal(merged.components.length, 0);
    assert.equal(merged.designFingerprint, null);
  });

  it('grid/layout fingerprint change invalidates preserved ledger', () => {
    const ledger = [cuts('PS-FRAME', [1200, 1400])];
    const nextGrid = {
      ...pattern.gridSpec,
      cols: 3,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sash' },
        { id: '0-1', row: 0, col: 1, type: 'sash' },
        { id: '0-2', row: 0, col: 2, type: 'sash' },
      ],
      colWidths: [1, 1, 1],
    };
    assert.notEqual(
      designFingerprintFromWindowUnit(baseDesign),
      designFingerprintFromWindowUnit({ ...baseDesign, grid: nextGrid }),
    );
    const merged = mergeComponentsForSave({
      incoming: [],
      existing: ledger,
      incomingDesignFingerprint: designFingerprintFromWindowUnit({ ...baseDesign, grid: nextGrid }),
      existingDesignFingerprint: designFingerprintFromWindowUnit(baseDesign),
    });
    assert.equal(merged.invalidated, true);
    assert.equal(merged.components.length, 0);
  });

  it('intentional clear empties ledger even when fingerprint matches', () => {
    const ledger = [cuts('PS-FRAME', [1200, 1400])];
    const fp = designFingerprintFromWindowUnit(baseDesign);
    const merged = mergeComponentsForSave({
      incoming: [],
      existing: ledger,
      incomingDesignFingerprint: fp,
      existingDesignFingerprint: fp,
      intentionalClear: true,
    });
    assert.equal(merged.components.length, 0);
    assert.equal(merged.invalidated, true);
    assert.equal(merged.clearOptimization, true);
  });

  it('exact multiset rejects missing, duplicate, substituted, wrong length/angle/quantity', () => {
    const expected = [cuts('PS-FRAME', [1200, 1400], [45, 45])];
    assert.throws(
      () => assertLedgerMultisetParity([cuts('PS-FRAME', [1200], [45])], expected, { poseLabel: 'Pose 1', revision: 2 }),
      /Pose 1 revision 2: cut ledger multiset mismatch/,
    );
    assert.throws(
      () => assertLedgerMultisetParity([cuts('PS-FRAME', [1200, 1400, 1200], [45, 45, 45])], expected, { poseLabel: 'Pose 1', revision: 2 }),
      /multiset mismatch/,
    );
    assert.throws(
      () => assertLedgerMultisetParity([cuts('PS-SASH', [1200, 1400], [45, 45])], expected, { poseLabel: 'Pose 1', revision: 2 }),
      /multiset mismatch/,
    );
    assert.throws(
      () => assertLedgerMultisetParity([cuts('PS-FRAME', [1210, 1400], [45, 45])], expected, { poseLabel: 'Pose 1', revision: 2 }),
      /multiset mismatch/,
    );
    assert.throws(
      () => assertLedgerMultisetParity([cuts('PS-FRAME', [1200, 1400], [90, 45])], expected, { poseLabel: 'Pose 1', revision: 2 }),
      /multiset mismatch/,
    );
    assert.equal(ledgerMultisetsEqual(expected, expected), true);
  });

  it('resolveExpectedDesignLedger regenerates from design and ignores stale saved components', async () => {
    const unit = {
      id: 'pose-1',
      posNumber: '1',
      revision: 3,
      ...baseDesign,
      components: [],
    } as unknown as WindowUnit;
    const at1200 = await new ProfileBOMCalculator().resolveCanonicalDesignLedger(
      unit,
      pattern,
      CALUMINIUM_PS_PACK,
    );
    const drifted = { ...unit, overallWidth: 1800, components: at1200 } as WindowUnit;
    const expected = await resolveExpectedDesignLedger(drifted, pattern, CALUMINIUM_PS_PACK);
    assert.equal(ledgerMultisetsEqual(at1200, expected), false);
    assert.equal(savedLedgerNeedsMaterialize(at1200, expected), true);
    // Preferring saved components must NOT be used for expected baseline:
    const wrongBaseline = await new ProfileBOMCalculator().resolveCanonicalDesignLedger(
      drifted,
      pattern,
      CALUMINIUM_PS_PACK,
    );
    assert.equal(
      ledgerMultisetsEqual(at1200, wrongBaseline),
      true,
      'resolveCanonicalDesignLedger still prefers saved — expected path must strip components',
    );
  });

  it('reconcile rejects same-count dimension drift with revision-bound message', async () => {
    const unit = {
      id: 'pose-2',
      posNumber: '2',
      revision: 4,
      ...baseDesign,
      components: [],
    } as unknown as WindowUnit;
    const at1200 = await new ProfileBOMCalculator().resolveCanonicalDesignLedger(
      unit,
      pattern,
      CALUMINIUM_PS_PACK,
    );
    await assert.rejects(
      () =>
        reconcilePoseCutLedger({
          position: { ...unit, overallWidth: 1800, components: at1200 },
          pattern,
          pack: CALUMINIUM_PS_PACK,
          revision: 4,
        }),
      /Pose 2 revision 4: cut ledger multiset mismatch/,
    );
  });

  it('BOM required pieces, saved ledger, and optimizer agree for a regenerated design', async () => {
    const unit = {
      id: 'pose-opt',
      posNumber: '3',
      revision: 1,
      ...baseDesign,
      quantity: 2,
      components: [],
    } as unknown as WindowUnit;
    const expected = await resolveExpectedDesignLedger(unit, pattern, CALUMINIUM_PS_PACK);
    const withLedger = { ...unit, components: expected };
    await reconcilePoseCutLedger({
      position: withLedger,
      pattern,
      pack: CALUMINIUM_PS_PACK,
      revision: 1,
    });
    const estimate = optimizeProjectEstimate([withLedger], [CALUMINIUM_PS_PACK]);
    const placed = estimate.groups.reduce(
      (s, g) => s + g.result.stockUsed.reduce((a, b) => a + b.cuts.length, 0),
      0,
    );
    const designCuts = ledgerCutMultiset(expected).length * (unit.quantity ?? 1);
    assert.equal(estimate.pieces, designCuts);
    assert.equal(placed, designCuts);
    assert.equal(estimate.pieces - placed, 0);
    assert.ok(estimate.pieces > 0);
  });
});

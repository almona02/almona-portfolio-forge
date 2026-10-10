/**
 * Authoritative ledger-contract suite for merge evidence (`npm run test:ledger`).
 * Mirrors src/lib/fabricator/bom/ledgerContracts.node.test.ts without Vitest.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { CALUMINIUM_PS_PACK } from '../src/data/profileSystems/egyptian/caluminium/ps.ts';
import {
  assertLedgerMultisetParity,
  designFingerprint,
  designFingerprintFromWindowUnit,
  ledgerCutMultiset,
  ledgerMultisetsEqual,
  mergeComponentsForSave,
  sha256HexSync,
} from '../src/lib/fabricator/bom/preserveCutLedger.ts';
import {
  reconcilePoseCutLedger,
  resolveExpectedDesignLedger,
  savedLedgerNeedsMaterialize,
} from '../src/lib/fabricator/bom/ledgerParity.ts';
import { ProfileBOMCalculator } from '../src/lib/fabricator/bom/ProfileBOMCalculator.ts';
import { optimizeProjectEstimate } from '../src/lib/fabricator/production/ProjectOptimizationEstimate.ts';

const pattern = {
  id: 'sliding-2s',
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
};
const baseDesign = {
  overallWidth: 1200,
  overallHeight: 1400,
  type: 'sliding_window_2sash',
  systemPackId: 'caluminium-ps',
  presetId: 'sliding-2s',
  grid: pattern.gridSpec,
};
function cuts(profileId, lengths, angles = lengths.map(() => 45)) {
  return {
    id: `c-${profileId}`,
    type: 'frame',
    profile: { id: profileId },
    cuttingLengths: lengths,
    angles,
  };
}

let passed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log('PASS', name);
  } catch (err) {
    console.error('FAIL', name, err.message || err);
    process.exitCode = 1;
  }
}

await check('browser SHA-256 matches Node createHash vectors', () => {
  for (const text of ['', 'a', 'almona-design-fingerprint', JSON.stringify({ overallWidth: 1200 })]) {
    assert.equal(sha256HexSync(text), createHash('sha256').update(text, 'utf8').digest('hex'));
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

await check('pricing-only preserve complete ledger', () => {
  const ledger = [cuts('PS-FRAME', [1200, 1400, 1200, 1400])];
  const fp = designFingerprintFromWindowUnit(baseDesign);
  const merged = mergeComponentsForSave({
    incoming: [],
    existing: ledger,
    incomingDesignFingerprint: fp,
    existingDesignFingerprint: fp,
  });
  assert.equal(merged.invalidated, false);
  assert.deepEqual(merged.components, ledger);
});

await check('dimension change invalidates ledger+optimization', () => {
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
});

await check('grid layout fingerprint change invalidates', () => {
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
});

await check('intentional clear', () => {
  const fp = designFingerprintFromWindowUnit(baseDesign);
  const merged = mergeComponentsForSave({
    incoming: [],
    existing: [cuts('PS-FRAME', [1200, 1400])],
    incomingDesignFingerprint: fp,
    existingDesignFingerprint: fp,
    intentionalClear: true,
  });
  assert.equal(merged.components.length, 0);
  assert.equal(merged.invalidated, true);
});

await check('multiset rejects missing/duplicate/substituted/wrong length/angle', () => {
  const expected = [cuts('PS-FRAME', [1200, 1400], [45, 45])];
  assert.throws(() => assertLedgerMultisetParity([cuts('PS-FRAME', [1200], [45])], expected, { poseLabel: 'Pose 1', revision: 2 }));
  assert.throws(() => assertLedgerMultisetParity([cuts('PS-FRAME', [1200, 1400, 1200], [45, 45, 45])], expected, { poseLabel: 'Pose 1', revision: 2 }));
  assert.throws(() => assertLedgerMultisetParity([cuts('PS-SASH', [1200, 1400], [45, 45])], expected, { poseLabel: 'Pose 1', revision: 2 }));
  assert.throws(() => assertLedgerMultisetParity([cuts('PS-FRAME', [1210, 1400], [45, 45])], expected, { poseLabel: 'Pose 1', revision: 2 }));
  assert.throws(() => assertLedgerMultisetParity([cuts('PS-FRAME', [1200, 1400], [90, 45])], expected, { poseLabel: 'Pose 1', revision: 2 }));
  assert.equal(ledgerMultisetsEqual(expected, expected), true);
});

await check('expected ledger regenerates ignoring stale saved components', async () => {
  const unit = { id: 'pose-1', posNumber: '1', revision: 3, ...baseDesign, components: [] };
  const at1200 = await new ProfileBOMCalculator().resolveCanonicalDesignLedger(unit, pattern, CALUMINIUM_PS_PACK);
  const drifted = { ...unit, overallWidth: 1800, components: at1200 };
  const expected = await resolveExpectedDesignLedger(drifted, pattern, CALUMINIUM_PS_PACK);
  assert.equal(ledgerMultisetsEqual(at1200, expected), false);
  assert.equal(savedLedgerNeedsMaterialize(at1200, expected), true);
});

await check('reconcile rejects same-count dimension drift', async () => {
  const unit = { id: 'pose-2', posNumber: '2', revision: 4, ...baseDesign, components: [] };
  const at1200 = await new ProfileBOMCalculator().resolveCanonicalDesignLedger(unit, pattern, CALUMINIUM_PS_PACK);
  await assert.rejects(
    () => reconcilePoseCutLedger({
      position: { ...unit, overallWidth: 1800, components: at1200 },
      pattern,
      pack: CALUMINIUM_PS_PACK,
      revision: 4,
    }),
    /Pose 2 revision 4: cut ledger multiset mismatch/,
  );
});

await check('BOM / saved ledger / optimizer exact agreement', async () => {
  const unit = { id: 'pose-opt', posNumber: '3', revision: 1, ...baseDesign, quantity: 2, components: [] };
  const expected = await resolveExpectedDesignLedger(unit, pattern, CALUMINIUM_PS_PACK);
  const withLedger = { ...unit, components: expected };
  await reconcilePoseCutLedger({ position: withLedger, pattern, pack: CALUMINIUM_PS_PACK, revision: 1 });
  const estimate = optimizeProjectEstimate([withLedger], [CALUMINIUM_PS_PACK]);
  const placed = estimate.groups.reduce((s, g) => s + g.result.stockUsed.reduce((a, b) => a + b.cuts.length, 0), 0);
  const designCuts = ledgerCutMultiset(expected).length * unit.quantity;
  assert.equal(estimate.pieces, designCuts);
  assert.equal(placed, designCuts);
  assert.equal(placed - designCuts, 0);
});

console.log(`passed ${passed} ledger contract checks`);
if (process.exitCode) process.exit(process.exitCode);

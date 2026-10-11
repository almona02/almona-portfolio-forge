/**
 * vite-node fallback when vitest describe.config is broken.
 * Mirrors preserveCutLedger.test.ts + ledgerParity.test.ts critical cases.
 */
import assert from 'node:assert/strict';
import { CALUMINIUM_PS_PACK } from '../src/data/profileSystems/egyptian/caluminium/ps.ts';
import {
  assertLedgerMultisetParity,
  designFingerprintFromWindowUnit,
  ledgerCutMultiset,
  ledgerMultisetsEqual,
  mergeComponentsForSave,
} from '../src/lib/fabricator/bom/preserveCutLedger.ts';
import { reconcilePoseCutLedger, savedLedgerNeedsMaterialize } from '../src/lib/fabricator/bom/ledgerParity.ts';
import { ProfileBOMCalculator } from '../src/lib/fabricator/bom/ProfileBOMCalculator.ts';

function cuts(profileId, lengths, angles = lengths.map(() => 45)) {
  return {
    id: `c-${profileId}`,
    type: 'frame',
    profile: { id: profileId },
    cuttingLengths: lengths,
    angles,
  };
}

const baseDesign = {
  overallWidth: 1200,
  overallHeight: 1400,
  type: 'sliding_window_2sash',
  systemPackId: 'caluminium-ps',
  presetId: 'sliding-2s',
  grid: {
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

const ledger = [cuts('PS-FRAME', [1200, 1400, 1200, 1400])];
let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS', name);
  } catch (err) {
    console.error('FAIL', name, err.message || err);
    process.exitCode = 1;
  }
}
async function checkAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log('PASS', name);
  } catch (err) {
    console.error('FAIL', name, err.message || err);
    process.exitCode = 1;
  }
}

check('multiset keys', () => {
  assert.deepEqual(ledgerCutMultiset([cuts('PS-FRAME', [1200, 1400], [45, 45]), cuts('PS-SASH', [800], [90])]), [
    'PS-FRAME|1200.000|45',
    'PS-FRAME|1400.000|45',
    'PS-SASH|800.000|90',
  ]);
});

check('same-count dimension fingerprint change', () => {
  const a = designFingerprintFromWindowUnit(baseDesign);
  const b = designFingerprintFromWindowUnit({ ...baseDesign, overallWidth: 1800 });
  assert.notEqual(a, b);
});

check('grid fingerprint change', () => {
  const a = designFingerprintFromWindowUnit(baseDesign);
  const b = designFingerprintFromWindowUnit({
    ...baseDesign,
    grid: {
      ...baseDesign.grid,
      cols: 3,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sash' },
        { id: '0-1', row: 0, col: 1, type: 'sash' },
        { id: '0-2', row: 0, col: 2, type: 'sash' },
      ],
      colWidths: [1, 1, 1],
    },
  });
  assert.notEqual(a, b);
});

check('pricing-only preserve', () => {
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
});

check('dimension change invalidates', () => {
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

check('profile substitution multiset', () => {
  assert.equal(
    ledgerMultisetsEqual([cuts('PS-FRAME', [1200, 1400])], [cuts('PS-SASH', [1200, 1400])]),
    false,
  );
  assert.throws(() =>
    assertLedgerMultisetParity(
      [cuts('PS-FRAME', [1200, 1400])],
      [cuts('PS-SASH', [1200, 1400])],
      { poseLabel: 'Pose 2', revision: 3 },
    ));
});

check('intentional clear', () => {
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
});

const pattern = {
  id: 'sliding-2s',
  type: 'sliding',
  openingMechanism: { type: 'sliding' },
  gridSpec: baseDesign.grid,
};

await checkAsync('reconcile matching design ledger', async () => {
  const unit = {
    id: 'pose-1',
    posNumber: '1',
    revision: 7,
    ...baseDesign,
    components: [],
  };
  const expected = await new ProfileBOMCalculator().resolveCanonicalDesignLedger(
    unit,
    pattern,
    CALUMINIUM_PS_PACK,
  );
  await reconcilePoseCutLedger({
    position: { ...unit, components: expected },
    pattern,
    pack: CALUMINIUM_PS_PACK,
    revision: 7,
  });
  assert.equal(savedLedgerNeedsMaterialize(expected, expected), false);
});

await checkAsync('reconcile rejects same-count dimension drift', async () => {
  const unit = {
    id: 'pose-2',
    posNumber: '2',
    revision: 4,
    ...baseDesign,
    components: [],
  };
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

console.log(`passed ${passed} checks`);
if (process.exitCode) process.exit(process.exitCode);

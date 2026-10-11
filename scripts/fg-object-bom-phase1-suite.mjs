/**
 * Object BOM Phase 1 suite (fixtures → opening/SKU/invalidation → select-only).
 * vite-node runner — avoids broken Vitest/Storybook describe.config.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DOWIN_LAYOUT_FAMILIES,
  dowinPositionMultiset,
  groupPositionsByLayout,
  reportMultisetMismatch,
} from '../src/lib/fabricator/bom/dowinSourceMultiset.ts';
import { assertResolvedSku, componentSkuRef } from '../src/lib/fabricator/bom/componentSkuRef.ts';
import { countOperativeLeaves, leafOpeningOp } from '../src/lib/fabricator/bom/leafOpening.ts';
import { HardwareBOMCalculator } from '../src/lib/fabricator/bom/HardwareBOMCalculator.ts';
import {
  designFingerprint,
  semanticRevisionDigest,
} from '../src/lib/fabricator/bom/preserveCutLedger.ts';
import { resolveEstimatePattern } from '../src/lib/fabricator/bom/resolveEstimatePattern.ts';
import {
  buildOccurrenceId,
  occurrenceFromPrimitiveIndex,
} from '../src/lib/fabricator/assembly/occurrenceIdentity.ts';
import {
  cycleCellOpeningType,
  cycleGridCellOpening,
} from '../src/lib/fabricator/drawing/cycleCellOpeningType.ts';

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

const fixtureDir = resolve('src/tests/fixtures/dowin-deceuninck70');
const ref = JSON.parse(
  readFileSync(resolve(fixtureDir, 'all-saved-profile-cut-reference.json'), 'utf8'),
);

await check('fixtures: 11 positions / 197 pieces / 5 families', () => {
  assert.equal(ref.positions.length, 11);
  const pieces = ref.positions.reduce(
    (sum, p) => sum + p.cuts.reduce((a, c) => a + (c.quantity || 0), 0),
    0,
  );
  assert.equal(pieces, 197);
  const byLayout = groupPositionsByLayout(ref.positions);
  assert.deepEqual(Object.keys(byLayout).sort(), [...DOWIN_LAYOUT_FAMILIES].sort());
  assert.equal(byLayout['double casement with structural mullion'].length, 7);
});

await check('fixtures: double-casement multisets identical across 7 captures', () => {
  const doubles = ref.positions.filter(
    (p) => p.layout === 'double casement with structural mullion',
  );
  const baseline = dowinPositionMultiset(doubles[0]);
  assert.equal(baseline.length, 21);
  for (const position of doubles.slice(1)) {
    const report = reportMultisetMismatch(baseline, dowinPositionMultiset(position), {
      leftLabel: doubles[0].key,
      rightLabel: position.key,
    });
    assert.equal(report.matched, true, JSON.stringify(report));
  }
});

await check('fixtures: mismatch report does not bend source counts', () => {
  const control = ref.positions.find((p) => p.key === 'control');
  const single = ref.positions.find((p) => p.key === 'e1');
  const report = reportMultisetMismatch(
    dowinPositionMultiset(control),
    dowinPositionMultiset(single),
    { leftLabel: 'control', rightLabel: 'e1' },
  );
  assert.equal(report.matched, false);
  assert.equal(report.leftCount, 13);
  assert.equal(report.rightCount, 12);
  assert.equal(control.n, 13);
  assert.equal(single.n, 12);
});

await check('fixtures: fabricator generator parity explicitly unmatched', () => {
  const register = readFileSync(resolve(fixtureDir, 'saved-position-register.csv'), 'utf8');
  assert.match(register, /fabricatorParity/);
  assert.equal(register.match(/not_run/g)?.length, 11);
  const generatorMultiset = [];
  for (const position of ref.positions) {
    const report = reportMultisetMismatch(dowinPositionMultiset(position), generatorMultiset, {
      leftLabel: `source:${position.key}`,
      rightLabel: 'fabricator:generator',
    });
    assert.equal(report.matched, false);
    assert.equal(report.missingInRight.length, report.leftCount);
  }
});

await check('opening: casement sash grid is not sliding', () => {
  const pattern = resolveEstimatePattern({
    id: 'c2',
    type: 'casement',
    overallWidth: 1000,
    overallHeight: 1500,
    grid: {
      rows: 1,
      cols: 2,
      cells: [
        { id: '0', row: 0, col: 0, type: 'sash', openingDirection: 'left' },
        { id: '1', row: 0, col: 1, type: 'sash', openingDirection: 'right' },
      ],
    },
  });
  assert.equal(pattern.type, 'casement');
  assert.equal(pattern.openingMechanism?.type, 'casement');
  assert.equal(pattern.mullions.length, 1);
});

await check('opening: mixed fixed/side-hung resolves with mullion', () => {
  const pattern = resolveEstimatePattern({
    id: 'mixed',
    type: 'casement',
    overallWidth: 1000,
    overallHeight: 1500,
    grid: {
      rows: 1,
      cols: 2,
      cells: [
        { id: '0', row: 0, col: 0, type: 'fixed' },
        { id: '1', row: 0, col: 1, type: 'sash', openingDirection: 'right' },
      ],
    },
  });
  assert.equal(pattern.openingMechanism?.type, 'casement');
  assert.equal(pattern.gridSpec.cells[0].type, 'fixed');
  assert.equal(pattern.gridSpec.cells[1].type, 'sash');
});

await check('opening: explicit sliding type still uses sliding recipe', () => {
  const pattern = resolveEstimatePattern({
    id: 'sl',
    type: 'sliding_window_2sash',
    overallWidth: 1200,
    overallHeight: 1400,
    grid: {
      rows: 1,
      cols: 2,
      cells: [
        { id: '0', row: 0, col: 0, type: 'sash' },
        { id: '1', row: 0, col: 1, type: 'sash' },
      ],
    },
  });
  assert.equal(pattern.type, 'sliding');
  assert.equal(pattern.mullions.length, 0);
});

await check('SKU refs fail-closed when unresolved', () => {
  const missing = componentSkuRef({ category: 'handle' });
  assert.equal(missing.unresolved, true);
  assert.throws(() => assertResolvedSku(missing, 'handle'), /unresolved/);
  assert.equal(leafOpeningOp({ type: 'sash', openingDirection: 'left' }), 'side-hung');
  assert.equal(countOperativeLeaves([{ type: 'fixed' }, { type: 'sash' }]), 1);
});

await check('hinges scale by sash count', async () => {
  const calc = new HardwareBOMCalculator();
  const pack = {};
  const oneUnit = {
    id: 's1',
    type: 'casement',
    overallWidth: 1000,
    overallHeight: 1500,
    grid: {
      rows: 1,
      cols: 1,
      cells: [{ id: '0', row: 0, col: 0, type: 'sash', openingDirection: 'left' }],
    },
  };
  const twoUnit = {
    ...oneUnit,
    id: 's2',
    grid: {
      rows: 1,
      cols: 2,
      cells: [
        { id: '0', row: 0, col: 0, type: 'sash', openingDirection: 'left' },
        { id: '1', row: 0, col: 1, type: 'sash', openingDirection: 'right' },
      ],
    },
  };
  const one = await calc.calculateHardwareBOM(oneUnit, resolveEstimatePattern(oneUnit), pack);
  const two = await calc.calculateHardwareBOM(twoUnit, resolveEstimatePattern(twoUnit), pack);
  const h1 = one.find((h) => h.category === 'hinge')?.quantity ?? 0;
  const h2 = two.find((h) => h.category === 'hinge')?.quantity ?? 0;
  assert.ok(h1 > 0);
  assert.equal(h2, h1 * 2);
});

await check('semantic digest invalidates on glazing/hardware/handing/rule', () => {
  const base = {
    overallWidth: 1000,
    overallHeight: 1500,
    type: 'casement',
    systemPackId: 'pack-a',
    presetId: '',
    grid: {
      rows: 1,
      cols: 1,
      cells: [{ id: '0', row: 0, col: 0, type: 'sash', openingDirection: 'left' }],
    },
    glazing: { type: 'double', thickness: 24 },
    hardware: [{ id: 'h1', supplierCode: 'HANDLE-A', quantity: 1 }],
  };
  const a = designFingerprint(base);
  assert.notEqual(designFingerprint({ ...base, glazing: { type: 'triple' } }), a);
  assert.notEqual(
    designFingerprint({
      ...base,
      hardware: [{ id: 'h1', supplierCode: 'HANDLE-B', quantity: 1 }],
    }),
    a,
  );
  assert.notEqual(
    designFingerprint({
      ...base,
      grid: {
        rows: 1,
        cols: 1,
        cells: [{ id: '0', row: 0, col: 0, type: 'sash', openingDirection: 'right' }],
      },
    }),
    a,
  );
  assert.notEqual(semanticRevisionDigest({ ...base, ruleVersion: 'r1' }), a);
  assert.notEqual(
    semanticRevisionDigest({ ...base, ruleVersion: 'r2' }),
    semanticRevisionDigest({ ...base, ruleVersion: 'r1' }),
  );
});

await check('select-only: cycle is explicit helper; occurrence IDs stable', () => {
  const fixed = { id: '0', row: 0, col: 0, type: 'fixed' };
  const next = cycleCellOpeningType(fixed);
  assert.equal(next.type, 'sash');
  const cells = cycleGridCellOpening([fixed, { id: '1', row: 0, col: 1, type: 'fixed' }], '1');
  assert.equal(cells[0].type, 'fixed');
  assert.equal(cells[1].type, 'sash');
  const id = buildOccurrenceId({
    positionId: 'pos-1',
    revision: 3,
    kind: 'sash',
    cellId: '0-1',
  });
  assert.equal(id, 'pos-1/r3/sash/cell:0-1');
  const fromPrimitive = occurrenceFromPrimitiveIndex({
    positionId: 'pos-1',
    revision: 3,
    kind: 'bead',
    primitiveIndex: 7,
    cellId: '0-1',
  });
  assert.match(fromPrimitive.id, /m:7/);
});

console.log(`passed ${passed} object-bom phase1 checks`);
if (process.exitCode) process.exit(process.exitCode);

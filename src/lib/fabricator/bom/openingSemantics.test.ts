import { describe, expect, it } from 'vitest';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { assertResolvedSku, componentSkuRef } from './componentSkuRef';
import { countOperativeLeaves, leafOpeningOp } from './leafOpening';
import { HardwareBOMCalculator } from './HardwareBOMCalculator';
import {
  designFingerprint,
  semanticRevisionDigest,
} from './preserveCutLedger';
import { resolveEstimatePattern } from './resolveEstimatePattern';

function sashGrid(sashes: number): WindowUnit {
  return {
    id: `s${sashes}`,
    type: 'casement',
    overallWidth: 1000,
    overallHeight: 1500,
    glazing: { type: 'double', thickness: 24 },
    hardware: [],
    grid: {
      rows: 1,
      cols: sashes,
      cells: Array.from({ length: sashes }, (_, i) => ({
        id: String(i),
        row: 0,
        col: i,
        type: 'sash' as const,
        openingDirection: i % 2 === 0 ? ('left' as const) : ('right' as const),
      })),
    },
  } as unknown as WindowUnit;
}

describe('opening semantics + SKU refs + invalidation (Phase 1)', () => {
  it('classifies per-leaf fixed vs side-hung', () => {
    expect(leafOpeningOp({ type: 'fixed' })).toBe('fixed');
    expect(leafOpeningOp({ type: 'sash', openingDirection: 'left' })).toBe('side-hung');
    expect(leafOpeningOp({ type: 'sash', openingDirection: 'top' })).toBe('top-hung');
    expect(leafOpeningOp({ type: 'sliding' })).toBe('sliding');
    expect(countOperativeLeaves([
      { type: 'fixed' },
      { type: 'sash', openingDirection: 'right' },
    ])).toBe(1);
  });

  it('keeps structured SKU refs fail-closed when unresolved', () => {
    const missing = componentSkuRef({ category: 'handle' });
    expect(missing.unresolved).toBe(true);
    expect(() => assertResolvedSku(missing, 'handle')).toThrow(/unresolved/);
    const ok = componentSkuRef({
      sku: 'HANDLE-01',
      kitId: 'kit-handle',
      category: 'handle',
      source: 'pack_hardware_kit',
    });
    expect(ok.unresolved).toBe(false);
    expect(() => assertResolvedSku(ok, 'handle')).not.toThrow();
  });

  it('scales casement hinges by sash count at equal height', async () => {
    const calc = new HardwareBOMCalculator();
    const pack = {} as SystemPack;
    const one = await calc.calculateHardwareBOM(sashGrid(1), resolveEstimatePattern(sashGrid(1)), pack);
    const two = await calc.calculateHardwareBOM(sashGrid(2), resolveEstimatePattern(sashGrid(2)), pack);
    const h1 = one.find((h) => h.category === 'hinge')?.quantity ?? 0;
    const h2 = two.find((h) => h.category === 'hinge')?.quantity ?? 0;
    expect(h1).toBeGreaterThan(0);
    expect(h2).toBe(h1 * 2);
  });

  it('invalidates semantic digest when glazing, hardware SKU, or leaf handing changes', () => {
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
    const glazingChanged = designFingerprint({
      ...base,
      glazing: { type: 'triple', thickness: 36 },
    });
    const hardwareChanged = designFingerprint({
      ...base,
      hardware: [{ id: 'h1', supplierCode: 'HANDLE-B', quantity: 1 }],
    });
    const handingChanged = designFingerprint({
      ...base,
      grid: {
        rows: 1,
        cols: 1,
        cells: [{ id: '0', row: 0, col: 0, type: 'sash', openingDirection: 'right' }],
      },
    });
    expect(glazingChanged).not.toBe(a);
    expect(hardwareChanged).not.toBe(a);
    expect(handingChanged).not.toBe(a);

    const withRule = semanticRevisionDigest({ ...base, ruleVersion: 'r1' });
    const ruleBumped = semanticRevisionDigest({ ...base, ruleVersion: 'r2' });
    expect(withRule).not.toBe(a);
    expect(ruleBumped).not.toBe(withRule);
  });
});

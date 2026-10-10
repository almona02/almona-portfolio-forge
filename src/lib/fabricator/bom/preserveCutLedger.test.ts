import { describe, expect, it } from 'vitest';
import type { WindowComponent, WindowUnit } from '@/types/fabricator';
import {
  assertLedgerMultisetParity,
  countLedgerCuts,
  designFingerprint,
  designFingerprintFromWindowUnit,
  ledgerCutMultiset,
  ledgerMultisetsEqual,
  mergeComponentsForSave,
  mergeSelectedPresetForSave,
  wouldClearPersistedLedger,
  withCutLedgerMeta,
} from './preserveCutLedger';

const frame = { id: 'PS-FRAME' };
const sash = { id: 'PS-SASH' };

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

const ledger = [cuts('PS-FRAME', [1200, 1400, 1200, 1400])];
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
} as unknown as WindowUnit;

describe('preserveCutLedger design fingerprint + multiset (AICS-001)', () => {
  it('counts cuts across components', () => {
    expect(countLedgerCuts(ledger)).toBe(4);
    expect(countLedgerCuts([])).toBe(0);
  });

  it('builds exact profile|length|angle multisets', () => {
    const a = [cuts('PS-FRAME', [1200, 1400], [45, 45]), cuts('PS-SASH', [800], [90])];
    expect(ledgerCutMultiset(a)).toEqual([
      'PS-FRAME|1200.000|45',
      'PS-FRAME|1400.000|45',
      'PS-SASH|800.000|90',
    ]);
  });

  it('detects same-count dimension changes via fingerprint', () => {
    const a = designFingerprintFromWindowUnit(baseDesign);
    const b = designFingerprintFromWindowUnit({ ...baseDesign, overallWidth: 1800 });
    expect(a).not.toBe(b);
    expect(ledgerMultisetsEqual(ledger, ledger)).toBe(true);
  });

  it('detects grid changes via fingerprint even when cut count could match', () => {
    const a = designFingerprintFromWindowUnit(baseDesign);
    const b = designFingerprintFromWindowUnit({
      ...baseDesign,
      grid: {
        ...baseDesign.grid!,
        cols: 3,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'sash' },
          { id: '0-1', row: 0, col: 1, type: 'sash' },
          { id: '0-2', row: 0, col: 2, type: 'sash' },
        ],
        colWidths: [1, 1, 1],
      },
    });
    expect(a).not.toBe(b);
  });

  it('preserves ledger on unchanged pricing-only save (empty incoming, same fingerprint)', () => {
    const fp = designFingerprintFromWindowUnit(baseDesign);
    const merged = mergeComponentsForSave({
      incoming: [],
      existing: ledger,
      incomingDesignFingerprint: fp,
      existingDesignFingerprint: fp,
    });
    expect(merged.components).toEqual(ledger);
    expect(merged.invalidated).toBe(false);
    expect(merged.clearOptimization).toBe(false);
    expect(merged.designFingerprint).toBe(fp);
  });

  it('invalidates ledger + optimization when dimensions change with empty incoming', () => {
    const oldFp = designFingerprintFromWindowUnit(baseDesign);
    const newFp = designFingerprintFromWindowUnit({ ...baseDesign, overallWidth: 1800 });
    const merged = mergeComponentsForSave({
      incoming: [],
      existing: ledger,
      incomingDesignFingerprint: newFp,
      existingDesignFingerprint: oldFp,
    });
    expect(merged.components).toEqual([]);
    expect(merged.invalidated).toBe(true);
    expect(merged.clearOptimization).toBe(true);
    expect(merged.designFingerprint).toBeNull();
  });

  it('accepts a regenerated ledger after profile substitution', () => {
    const oldFp = designFingerprintFromWindowUnit(baseDesign);
    const newFp = designFingerprintFromWindowUnit({
      ...baseDesign,
      systemPackId: 'caluminium-ps-alt',
    });
    const next = [cuts('PS-6601-FRAME', [1200, 1400, 1200, 1400])];
    const merged = mergeComponentsForSave({
      incoming: next,
      existing: ledger,
      incomingDesignFingerprint: newFp,
      existingDesignFingerprint: oldFp,
    });
    expect(merged.components).toEqual(next);
    expect(merged.clearOptimization).toBe(true);
    expect(merged.designFingerprint).toBe(newFp);
    expect(ledgerMultisetsEqual(ledger, next)).toBe(false);
  });

  it('intentional clear empties ledger even when fingerprint matches', () => {
    const fp = designFingerprintFromWindowUnit(baseDesign);
    const merged = mergeComponentsForSave({
      incoming: [],
      existing: ledger,
      incomingDesignFingerprint: fp,
      existingDesignFingerprint: fp,
      intentionalClear: true,
    });
    expect(merged.components).toEqual([]);
    expect(merged.invalidated).toBe(true);
    expect(merged.clearOptimization).toBe(true);
  });

  it('assertLedgerMultisetParity catches same-count length substitution', () => {
    const saved = [cuts('PS-FRAME', [1200, 1400, 1200, 1400])];
    const expected = [cuts('PS-FRAME', [1210, 1400, 1200, 1400])];
    expect(() =>
      assertLedgerMultisetParity(saved, expected, { poseLabel: 'Pose 1', revision: 5 }),
    ).toThrow(/Pose 1 revision 5: cut ledger multiset mismatch/);
  });

  it('assertLedgerMultisetParity catches profile substitution at same counts', () => {
    const saved = [cuts(frame.id, [1200, 1400])];
    const expected = [cuts(sash.id, [1200, 1400])];
    expect(() =>
      assertLedgerMultisetParity(saved, expected, { poseLabel: 'Pose 2', revision: 3 }),
    ).toThrow(/missing PS-SASH/);
  });

  it('preserves selected_preset when omitted; allows explicit null clear', () => {
    expect(mergeSelectedPresetForSave(undefined, 'sliding-2s')).toBe('sliding-2s');
    expect(mergeSelectedPresetForSave(null, 'sliding-2s')).toBeNull();
  });

  it('stores and clears cutLedgerDesignFingerprint in position meta', () => {
    const fp = designFingerprint({ overallWidth: 1, overallHeight: 1, type: 'x', systemPackId: 'p' });
    expect(withCutLedgerMeta({ keep: true }, fp)).toEqual({
      keep: true,
      cutLedgerDesignFingerprint: fp,
    });
    expect(withCutLedgerMeta({ cutLedgerDesignFingerprint: fp, keep: true }, null)).toEqual({
      keep: true,
    });
  });

  it('wouldClearPersistedLedger remains a count-level signal for callers', () => {
    expect(wouldClearPersistedLedger([], ledger)).toBe(true);
    expect(wouldClearPersistedLedger(ledger, ledger)).toBe(false);
  });
});

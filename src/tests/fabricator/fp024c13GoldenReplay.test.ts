/**
 * FP-024C.13 — golden replay through the public Required Parts parity API.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeDowinParityLengths,
  deceuninck70zParityInput,
  sashHorizontalCutMm,
  sashVerticalCutMm,
} from '@/lib/fabricator/dowinParity/DowinParityLengthEngine';
import {
  evaluateFp024c13GoldenReplay,
  FP024C13_GOLDEN_CASES,
  FP024C13_PROFILE_CODES,
  fp024c13RowsForGroup,
} from '@/lib/fabricator/dowinParity/fp024c13GoldenReplay';
import {
  FP024C10_THREE_POINT_TABLE,
  FP024C12_BOUNDED_PARITY_WELD_RULE,
  FP024C13_GOLDEN_REPLAY_CLOSEOUT,
} from '@/lib/fabricator/dowinParity/optimizerStateProvenance';

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) collectTsFiles(full, acc);
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

describe('FP-024C.13 bounded parity golden replay closeout', () => {
  const replay = evaluateFp024c13GoldenReplay();

  it('replays every accepted golden case exactly through the public parity API', () => {
    expect(FP024C13_GOLDEN_CASES).toHaveLength(27);
    expect(replay.supportedCaseCount).toBe(27);
    expect(replay.passedCount).toBe(27);
    expect(replay.mismatchCount).toBe(0);
    expect(replay.status).toBe('PASS');
    expect(replay.rows.every((row) => row.verdict === 'PASS' && row.supported)).toBe(true);
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.goldenReplay).toBe('PASS');
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.boundedParityStage).toBe('COMPLETE');
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.deceuninck70MeasuredScope).toBe(
      'PROVEN_AND_IMPLEMENTED_IN_PARITY_ADAPTER'
    );
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.generalizedManufacturingFormula).toBe('UNPROVEN');
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.independentReview).toBe('ACCEPTED');
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.authoritativePhysicalLengthScore).toBe('7.5/10');
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.recommendedPhysicalLengthScore).toBe('7.5/10');
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.prRecommendation).toBe('KEEP_DRAFT_DO_NOT_MERGE');
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.prMergeBlocker).toBe('FP-027_UNRESOLVED');
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.prMergeBlockerIsFp024c).toBe(false);
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.furtherFp024cExperiments).toBe(false);
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.repositoryCheckpoint).toEqual({
      fp024c: 'COMPLETE_BOUNDED_PARITY_SCOPE',
      physicalLengthCorrectness: '7.5/10',
      fp027: 'OPEN_ROOT_CAUSE_UNPROVEN',
      pr32: 'KEEP_DRAFT_DO_NOT_MERGE',
      furtherFp024cExperiments: false,
    });
    expect(FP024C12_BOUNDED_PARITY_WELD_RULE.status).toBe('WIRED_PARITY_ADAPTER_ONLY');
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.wiredParityAdapterOnlyMeans).toContain(
      'Canonical Fabricator production does not consume it'
    );
  });

  it('matches the accepted C.10 three-point evidence set', () => {
    expect(FP024C10_THREE_POINT_TABLE).toHaveLength(9);
    for (const row of FP024C10_THREE_POINT_TABLE) {
      const family = row.profile as 'KASA' | 'KANAT' | 'CITA' | 'ORTA';
      const code = FP024C13_PROFILE_CODES[family];
      const weldMap = [
        [0, row.weld0RequiredPartsMm],
        [2, row.weld2RequiredPartsMm],
        [3, row.weld3RequiredPartsMm],
      ] as const;
      for (const [weld, expected] of weldMap) {
        const hit = FP024C13_GOLDEN_CASES.find(
          (c) =>
            c.fixture === row.fixture &&
            c.profileCode === code &&
            c.designReportLengthMm === row.reportLengthMm &&
            c.weldingWasteMm === weld
        );
        expect(hit?.expectedRequiredPartsMm).toBe(expected);
      }
    }
  });

  it('keeps ORTA unchanged at Weld 0/2/3 on both fixtures', () => {
    expect(replay.ortaNegativeControl).toBe('PASS');
    const orta = replay.rows.filter((row) => row.profileFamily === 'ORTA');
    expect(orta).toHaveLength(6);
    expect(orta.every((row) => row.actualRequiredPartsMm === row.designReportLengthMm)).toBe(true);
  });

  it('fails closed on unsupported authority without returning the input length', () => {
    expect(replay.failClosed.caseCount).toBe(16);
    expect(replay.failClosed.passCount).toBe(16);
    expect(replay.failClosed.failureCount).toBe(0);
    expect(replay.failClosed.status).toBe('PASS');
    expect(replay.failClosed.rows.every((row) => row.supported === false)).toBe(true);
    expect(replay.failClosed.rows.every((row) => row.authoritativeLengthMm === null)).toBe(true);
    expect(replay.noFallback.status).toBe('PASS');
    expect(replay.noFallback.missingAngleDoesNotDefaultTo45).toBe(true);
    expect(replay.noFallback.mixedAngleNotTreatedAsFortyFive).toBe(true);
    expect(replay.noFallback.weldOneNotExtrapolated).toBe(true);
    expect(replay.noFallback.substringSystemRejected).toBe(true);
    expect(replay.noFallback.aliasProfileRejected).toBe(true);
  });

  it('keeps sash packed math unreachable from the Required Parts API', () => {
    const packed = sashHorizontalCutMm(437, 7, { horizontalBasmaMm: 12, horizontalKaynakMm: 6 }, 3);
    expect(packed).toBe(444);
    expect(sashVerticalCutMm(1416, 7, { verticalBasmaMm: 16, verticalKaynakMm: 6 }, 3)).toBe(1427);
    expect(
      computeDowinParityLengths(deceuninck70zParityInput(437, 1416)).lines.find(
        (line) => line.category === 'sash_horizontal'
      )?.lengthMm
    ).toBe(444);
    const engine = readFileSync(
      resolve(process.cwd(), 'src/lib/fabricator/dowinParity/DowinParityLengthEngine.ts'),
      'utf8'
    );
    const helper = readFileSync(
      resolve(process.cwd(), 'src/lib/fabricator/dowinParity/evaluateDowinRequiredPartsWeldAdjustment.ts'),
      'utf8'
    );
    expect(engine).not.toContain('computeDowinRequiredPartsFromDesignReport(');
    expect(engine).not.toContain('evaluateDowinRequiredPartsWeldAdjustment(');
    expect(helper).not.toContain('sashHorizontalCutMm(');
    expect(helper).not.toContain('sashVerticalCutMm(');
    expect(helper).not.toContain('computeDowinParityLengths(');
    expect(helper).not.toMatch(/from ['"]@\/lib\/fabricator\/dowinParity\/DowinParityLengthEngine/);
    const sashStart = engine.indexOf('export function sashHorizontalCutMm');
    const computeStart = engine.indexOf('export function computeDowinParityLengths');
    const actualsStart = engine.indexOf('export function almonaParityActualsForAsdd');
    expect(engine.slice(sashStart, computeStart)).not.toContain(
      'computeDowinRequiredPartsFromDesignReport'
    );
    expect(engine.slice(computeStart, actualsStart)).not.toContain(
      'computeDowinRequiredPartsFromDesignReport'
    );
    expect(engine.slice(actualsStart)).not.toContain('computeDowinRequiredPartsFromDesignReport');
  });

  it('has no canonical production caller of the parity API', () => {
    const libRoot = resolve(process.cwd(), 'src/lib');
    const files = collectTsFiles(libRoot);
    const leaks: string[] = [];
    for (const file of files) {
      const normalized = file.replace(/\\/g, '/');
      if (normalized.includes('/dowinParity/')) continue;
      const source = readFileSync(file, 'utf8');
      if (source.includes('computeDowinRequiredPartsFromDesignReport')) {
        leaks.push(normalized);
      }
    }
    expect(leaks).toEqual([]);
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.authorityMatrix.canonicalProductionIntegration).toBe(
      'NONE'
    );
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.fp027.rootCause).toBe('UNPROVEN');
    expect(FP024C13_GOLDEN_REPLAY_CLOSEOUT.fp027.usedInReplay).toBe(false);
  });

  it('records group matrices for independent review', () => {
    const asdd3 = fp024c13RowsForGroup(replay.rows, 'A');
    const asdd0 = fp024c13RowsForGroup(replay.rows, 'B');
    const asdd2 = fp024c13RowsForGroup(replay.rows, 'C');
    const c53 = fp024c13RowsForGroup(replay.rows, 'D');
    const c50 = fp024c13RowsForGroup(replay.rows, 'E');
    const c52 = fp024c13RowsForGroup(replay.rows, 'F');
    expect(asdd3.map((r) => r.actualRequiredPartsMm)).toEqual([1003, 1503, 454, 1433, 1416]);
    expect(asdd0.map((r) => r.actualRequiredPartsMm)).toEqual([1000, 1500, 451, 1430, 1416]);
    expect(asdd2.map((r) => r.actualRequiredPartsMm)).toEqual([1002, 1502, 453, 1432, 1416]);
    expect(c53.map((r) => r.actualRequiredPartsMm)).toEqual([1203, 540, 1119, 1116]);
    expect(c50.map((r) => r.actualRequiredPartsMm)).toEqual([1200, 537, 1116, 1116]);
    expect(c52.map((r) => r.actualRequiredPartsMm)).toEqual([1202, 539, 1118, 1116]);
  });
});

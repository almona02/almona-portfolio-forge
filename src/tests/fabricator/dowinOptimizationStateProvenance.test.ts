/**
 * FP-024C.1 — optimizer-state provenance and failed baseline reset.
 * Diagnostic only. Does not authorize production formulas.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateKFactor } from '@/lib/fabricator/UPVCCuttingEngine';
import { resolveManufacturingSettings } from '@/lib/fabricator/ManufacturingSettings';
import {
  DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
  type ExternalBarPattern,
} from '@/lib/fabricator/barPackExternalReconciliation';
import { canonicalJson, fingerprintSha256 } from '@/lib/fabricator/dowinParity/canonicalFingerprint';
import {
  DOWIN_ASDD_BASELINE_REPRODUCTION_RUN,
  DOWIN_ASDD_BASELINE_RESET_RUN,
  DOWIN_ASDD_TRIM_CUT_10_BARS,
  DOWIN_ASDD_TRIM_CUT_10_RUN,
  DOWIN_ASDD_WELDING_WASTE_0_RUN,
  DOWIN_ASDD_SAW_THICKNESS_5_RUN,
  DOWIN_CALIBRATION_RUNS,
  DOWIN_COMPENSATION_TERM_AUTHORITY,
  asddEquivalentInputProvenance,
  assignmentSignaturesEqual,
  buildWeldingWasteIsolationFindings,
  classifyIsolationPackage,
  classifyProvenanceFreshStateExperiment,
  evaluateLengthLayerReset,
  evaluateOptimizerTopologyReproduction,
  freshOptimizerProvenance,
  identifyAsddAssignmentTopology,
  ingestOperatorCalibrationRun,
  isControlFixtureAuthorized,
  overallUtilizationPercent,
  topologyFingerprint,
  topologySignatureFromBars,
  type DowinCalibrationRun,
} from '@/lib/fabricator/dowinParity/dowinCompensationEvidence';
import {
  compareOptimizerInputFingerprints,
  FP024C1_MIN_FRESH_RUNS_FOR_CONSISTENCY,
} from '@/lib/fabricator/dowinParity/optimizerStateProvenance';

function sourceOf(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

function provenanceRun(
  fixtureId: string,
  bars: readonly ExternalBarPattern[],
  provenance: ReturnType<typeof asddEquivalentInputProvenance>
): DowinCalibrationRun {
  return {
    ...DOWIN_ASDD_BASELINE_REPRODUCTION_RUN,
    fixtureId,
    parentFixtureId: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.fixtureId,
    runKind: 'OPTIMIZATION_STATE_PROVENANCE_AUDIT',
    isolationVariable: 'optimizationStateProvenance',
    designName: fixtureId,
    bars,
    optimizerProvenance: provenance,
  };
}

function equivalent(overrides: Parameters<typeof asddEquivalentInputProvenance>[3] = {}) {
  return asddEquivalentInputProvenance(
    DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.pieces,
    DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.bars,
    DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.observedSettings,
    overrides
  );
}

describe('FP-024C.1 optimization state provenance', () => {
  it('keeps Test 2 packed/machine PROVEN for this fixture without general formula authority', () => {
    const findings = buildWeldingWasteIsolationFindings(
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN,
      DOWIN_ASDD_WELDING_WASTE_0_RUN
    );
    expect(findings.find((f) => f.id === 'kasa-kanat-packed')?.classification).toBe('PROVEN EFFECT');
    expect(findings.find((f) => f.id === 'kasa-kanat-machine')?.classification).toBe('PROVEN EFFECT');
    expect(classifyIsolationPackage(findings)).toBe('CONDITIONAL');
    expect(
      DOWIN_COMPENSATION_TERM_AUTHORITY.filter((t) => t.authority === 'PROVEN').map((t) => t.term)
    ).toEqual([
      'Welding Waste on asdd 45° KASA/KANAT packed length',
      'Welding Waste on asdd 45° KASA/KANAT DC-600 machine length',
    ]);
    expect(DOWIN_COMPENSATION_TERM_AUTHORITY.every((t) => t.proposedForFp024c === false)).toBe(true);
  });

  it('keeps Test 3 remainder AMBIGUOUS/UNPROVEN and Test 4 remainder AMBIGUOUS after failed reset', () => {
    expect(
      DOWIN_COMPENSATION_TERM_AUTHORITY.find((t) => t.term === 'Saw Thickness on asdd KASA remainder')
        ?.authority
    ).toBe('UNPROVEN');
    expect(DOWIN_ASDD_SAW_THICKNESS_5_RUN.observedSettings.sawThicknessMm).toBe(5);
    expect(DOWIN_ASDD_TRIM_CUT_10_RUN.observedSettings.trimCutMm).toBe(10);
    expect(identifyAsddAssignmentTopology(DOWIN_ASDD_TRIM_CUT_10_RUN.bars)).toBe('LATER_TEST3_4');
    expect(identifyAsddAssignmentTopology(DOWIN_ASDD_BASELINE_RESET_RUN.bars)).toBe('LATER_TEST3_4');
  });

  it('splits reset: machine length recovered, optimizer topology failed', () => {
    const length = evaluateLengthLayerReset(
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN,
      DOWIN_ASDD_BASELINE_RESET_RUN
    );
    const topology = evaluateOptimizerTopologyReproduction(
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.bars,
      DOWIN_ASDD_BASELINE_RESET_RUN.bars
    );
    expect(length.verdict).toBe('REPRODUCED');
    expect(topology).toBe('REPRODUCTION_FAILED');
    expect(DOWIN_ASDD_BASELINE_RESET_RUN.lengthLayerVerdict).toBe('REPRODUCED');
    expect(DOWIN_ASDD_BASELINE_RESET_RUN.topologyVerdict).toBe('REPRODUCTION_FAILED');
    expect(DOWIN_ASDD_BASELINE_RESET_RUN.reproductionVerdict).toBe('REPRODUCTION_FAILED');
  });

  it('does not treat machine-output identity as optimizer-topology identity', () => {
    expect(DOWIN_ASDD_BASELINE_RESET_RUN.provenance).toContain(
      'machine-output identity, not optimizer-remainder identity'
    );
    expect(
      assignmentSignaturesEqual(
        DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.bars,
        DOWIN_ASDD_BASELINE_RESET_RUN.bars
      )
    ).toBe(false);
  });

  it('classifies missing provenance and reused results as AMBIGUOUS', () => {
    const incomplete = provenanceRun(
      'fresh-incomplete',
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.bars,
      freshOptimizerProvenance({
        projectId: null,
        designId: null,
        geometrySnapshot: null,
        requiredPartsSnapshot: null,
        stockSnapshot: null,
        offcutRemnantSnapshot: null,
        settingsSnapshot: null,
      })
    );
    expect(classifyProvenanceFreshStateExperiment([incomplete]).verdict).toBe('AMBIGUOUS');

    const reused = provenanceRun(
      'reopened-only',
      DOWIN_ASDD_TRIM_CUT_10_BARS,
      equivalent({ solveKind: 'REOPENED_REUSED', solveDisposition: 'REUSED' })
    );
    expect(classifyProvenanceFreshStateExperiment([reused]).verdict).toBe('AMBIGUOUS');
    expect(classifyProvenanceFreshStateExperiment(DOWIN_CALIBRATION_RUNS).verdict).toBe(
      'PENDING_OPERATOR_RUN'
    );
  });

  it('treats same utilization or same total remainder with different assignment as different topology', () => {
    expect(
      assignmentSignaturesEqual(DOWIN_ASDD_EXTERNAL_BAR_PATTERNS, DOWIN_ASDD_TRIM_CUT_10_BARS)
    ).toBe(false);
    expect(
      Math.abs(
        overallUtilizationPercent(DOWIN_ASDD_EXTERNAL_BAR_PATTERNS) -
          overallUtilizationPercent(DOWIN_ASDD_TRIM_CUT_10_BARS)
      )
    ).toBeLessThan(1);

    const redistributed: ExternalBarPattern[] = [
      ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS.slice(0, 3),
      { ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[3], remainingMm: 1000 },
      { ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[4], remainingMm: 5366 },
    ];
    const originalRemaining = DOWIN_ASDD_EXTERNAL_BAR_PATTERNS.reduce(
      (s, b) => s + b.remainingMm * b.applicationCount,
      0
    );
    const redistributedRemaining = redistributed.reduce(
      (s, b) => s + b.remainingMm * b.applicationCount,
      0
    );
    expect(redistributedRemaining).toBe(originalRemaining);
    expect(assignmentSignaturesEqual(DOWIN_ASDD_EXTERNAL_BAR_PATTERNS, redistributed)).toBe(false);
  });

  it('ignores result UUID and timestamp when comparing topology', () => {
    const renamed = DOWIN_ASDD_EXTERNAL_BAR_PATTERNS.map((bar, i) => ({
      ...bar,
      id: `uuid-${i}-${Date.now()}`,
    }));
    expect(assignmentSignaturesEqual(DOWIN_ASDD_EXTERNAL_BAR_PATTERNS, renamed)).toBe(true);
    const a = topologyFingerprint(DOWIN_ASDD_EXTERNAL_BAR_PATTERNS);
    const b = topologyFingerprint(renamed);
    expect(a).toBe(b);
    const sig = topologySignatureFromBars(DOWIN_ASDD_EXTERNAL_BAR_PATTERNS);
    expect(sig.find((s) => s.profileCode === 'Deceuninck-KASA-70')?.stockBarId).toBe(
      'asdd-frame-kasa-6000'
    );
    expect(canonicalJson({ remainingMm: 965, timestampIso: 'x' })).toContain('timestampIso');
  });

  it('classifies proven input fingerprint difference as HIDDEN_INPUT_DIFFERENCE', () => {
    const a = provenanceRun('fresh-a', DOWIN_ASDD_EXTERNAL_BAR_PATTERNS, equivalent());
    const differentStock = asddEquivalentInputProvenance(
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.pieces,
      DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.observedSettings,
      {
        optimizationResultId: 'fresh-b',
        stockSnapshot: [
          {
            profileCode: 'Deceuninck-KASA-70',
            stockLengthMm: 6500,
            ordinal: 0,
            quantity: 9,
          },
        ],
      }
    );
    expect(compareOptimizerInputFingerprints(a.optimizerProvenance, differentStock)).toBe('DIFFERENT');
    const b = provenanceRun('fresh-b', DOWIN_ASDD_EXTERNAL_BAR_PATTERNS, differentStock);
    expect(classifyProvenanceFreshStateExperiment([a, b]).verdict).toBe('HIDDEN_INPUT_DIFFERENCE');
  });

  it('classifies repeated fresh equivalent runs with differing topology as nondeterminism', () => {
    const a = provenanceRun('fresh-a', DOWIN_ASDD_EXTERNAL_BAR_PATTERNS, equivalent({ optimizationResultId: 'a' }));
    const b = provenanceRun(
      'fresh-b',
      DOWIN_ASDD_TRIM_CUT_10_BARS,
      equivalent({ optimizationResultId: 'b' })
    );
    expect(classifyProvenanceFreshStateExperiment([a, b]).verdict).toBe(
      'OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING'
    );
  });

  it('does not call one fresh run consistent and requires three for ALTERNATIVE', () => {
    expect(FP024C1_MIN_FRESH_RUNS_FOR_CONSISTENCY).toBe(3);
    const one = provenanceRun('fresh-a', DOWIN_ASDD_TRIM_CUT_10_BARS, equivalent());
    const oneLater = classifyProvenanceFreshStateExperiment([one]);
    expect(oneLater.verdict).toBe('AMBIGUOUS');
    expect(oneLater.note).toContain('cannot claim repeatability');

    const threeLater = [1, 2, 3].map((n) =>
      provenanceRun(
        `fresh-${n}`,
        DOWIN_ASDD_TRIM_CUT_10_BARS,
        equivalent({ optimizationResultId: `fresh-result-${n}` })
      )
    );
    expect(classifyProvenanceFreshStateExperiment(threeLater).verdict).toBe(
      'ALTERNATIVE_OPTIMIZER_SOLUTION'
    );
  });

  it('requires genuinely fresh state plus proven-identical inputs for PERSISTED_STATE_EFFECT_PROVEN', () => {
    const reused = provenanceRun(
      'reused-later',
      DOWIN_ASDD_TRIM_CUT_10_BARS,
      equivalent({
        solveKind: 'REOPENED_REUSED',
        solveDisposition: 'REUSED',
        optimizationResultId: 'reused-result',
      })
    );
    const fresh = provenanceRun(
      'fresh-original',
      DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
      equivalent({ optimizationResultId: 'fresh-result' })
    );
    expect(compareOptimizerInputFingerprints(reused.optimizerProvenance, fresh.optimizerProvenance)).toBe(
      'IDENTICAL'
    );
    expect(classifyProvenanceFreshStateExperiment([reused, fresh]).verdict).toBe(
      'PERSISTED_STATE_EFFECT_PROVEN'
    );
    expect(
      classifyProvenanceFreshStateExperiment([fresh, DOWIN_ASDD_BASELINE_RESET_RUN]).verdict
    ).toBe('AMBIGUOUS');
  });

  it('keeps the 90° CONTROL_FIXTURE gated while FP-024C.1 is unresolved', () => {
    expect(isControlFixtureAuthorized()).toBe(false);
    const fresh = provenanceRun('fresh-original', DOWIN_ASDD_EXTERNAL_BAR_PATTERNS, equivalent());
    expect(isControlFixtureAuthorized([...DOWIN_CALIBRATION_RUNS, fresh])).toBe(false);
  });

  it('does not mutate ManufacturingSettings, barPackAccounting, or production cut lengths', () => {
    const before = resolveManufacturingSettings();
    classifyProvenanceFreshStateExperiment(DOWIN_CALIBRATION_RUNS);
    topologyFingerprint(DOWIN_ASDD_EXTERNAL_BAR_PATTERNS);
    fingerprintSha256({ unit: 'mm', remainingMm: 965 });
    const after = resolveManufacturingSettings();
    expect(after).toEqual(before);

    expect(sourceOf('src/lib/fabricator/barPackAccounting.ts')).toContain('kerf_after_each_piece');
    expect(sourceOf('src/lib/fabricator/barPackAccounting.ts')).not.toMatch(/packedLength\s*=\s*nominalLength\s*\+\s*3/);
    expect(sourceOf('src/lib/fabricator/ManufacturingSettings.ts')).not.toMatch(/Date\.now\s*\(/);
    expect(sourceOf('src/lib/fabricator/UPVCCuttingEngine.ts')).not.toMatch(/packedLength\s*=\s*nominalLength\s*\+\s*3/);
    expect(sourceOf('src/lib/fabricator/UPVCCuttingEngine.ts')).not.toMatch(/\+\s*7\s*\*\s*piece/);
    const k = calculateKFactor({
      profileWidthMm: 70,
      wallThicknessMm: 2.5,
      miterAngleDegrees: 45,
    });
    expect(k).toBeGreaterThan(0);
  });

  it('rejects ingest of a reused result and still does not authorize 90°', () => {
    const hashes = {
      generalSettingsScreenshot: 's',
      designPreview: 'a',
      assemblyLabels: 'b',
      optimization: 'c',
      mdb: 'm',
    };
    const reused = ingestOperatorCalibrationRun(DOWIN_ASDD_BASELINE_REPRODUCTION_RUN, {
      runId: 'fresh-clone-reopened',
      timestampIso: '2026-09-10T21:00:00.000Z',
      generalSettingsScreenshotNote: 'Weld 3 / Saw 4 / Trim 0',
      changedSettingNote: null,
      controlFixtureNote: null,
      changedSetting: null,
      sourceHashesSha256: hashes,
      mdbGenerated: true,
      isolationVariable: 'optimizationStateProvenance',
      observedSettings: { ...DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.observedSettings },
      widthMm: 1000,
      heightMm: 1500,
      profileSystem: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.profileSystem,
      pieces: [...DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.pieces],
      bars: [...DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.bars],
      optimizerProvenance: equivalent({ solveKind: 'REOPENED_REUSED', solveDisposition: 'REOPENED' }),
    });
    expect(reused.ok).toBe(false);
    expect(isControlFixtureAuthorized()).toBe(false);
  });
});

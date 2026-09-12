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
import {
  CanonicalEvidenceError,
  canonicalJson,
  fingerprintSha256,
  optimizerInputFingerprintSha256,
} from '@/lib/fabricator/dowinParity/canonicalFingerprint';
import {
  DOWIN_ASDD_BASELINE_REPRODUCTION_RUN,
  DOWIN_ASDD_BASELINE_RESET_RUN,
  DOWIN_ASDD_TRIM_CUT_10_BARS,
  DOWIN_ASDD_TRIM_CUT_10_RUN,
  DOWIN_ASDD_WELDING_WASTE_0_RUN,
  DOWIN_ASDD_SAW_THICKNESS_5_RUN,
  DOWIN_CALIBRATION_RUNS,
  DOWIN_COMPENSATION_TERM_AUTHORITY,
  DOWIN_FP024C1_FRESH_A_RUN,
  asddEquivalentInputProvenance,
  assignmentSignaturesEqual,
  buildWeldingWasteIsolationFindings,
  classifyIsolationPackage,
  classifyProvenanceFreshStateExperiment,
  evaluateLengthLayerReset,
  evaluateOptimizerTopologyReproduction,
  freshOptimizerProvenance,
  identifyAsddAssignmentTopology,
  ALMONA_REPRODUCIBILITY_SURFACES,
  evaluateFreshRunIntake,
  isClearScreenNotFreshness,
  ingestOperatorCalibrationRun,
  isControlFixtureAuthorized,
  overallUtilizationPercent,
  topologyFingerprint,
  topologySignatureFromBars,
  type DowinCalibrationRun,
} from '@/lib/fabricator/dowinParity/dowinCompensationEvidence';
import {
  compareOptimizerInputFingerprints,
  FP024C1_FRESH_RUN_IDS,
  FP024C1_MIN_FRESH_RUNS_FOR_CONSISTENCY,
  FP024C1_MIN_FRESH_RUNS_FOR_NONDETERMINISM,
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
      'AMBIGUOUS'
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

  it('classifies repeated fresh equivalent runs with differing topology as AMBIGUOUS until Fresh A/B/C exist', () => {
    const a = provenanceRun('fresh-a', DOWIN_ASDD_EXTERNAL_BAR_PATTERNS, equivalent({ optimizationResultId: 'a' }));
    const b = provenanceRun(
      'fresh-b',
      DOWIN_ASDD_TRIM_CUT_10_BARS,
      equivalent({ optimizationResultId: 'b' })
    );
    expect(FP024C1_MIN_FRESH_RUNS_FOR_NONDETERMINISM).toBe(3);
    expect(classifyProvenanceFreshStateExperiment([a, b]).verdict).toBe('AMBIGUOUS');
    const c = provenanceRun(
      'fresh-c',
      DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
      equivalent({ optimizationResultId: 'c' })
    );
    expect(classifyProvenanceFreshStateExperiment([a, b, c]).verdict).toBe(
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

  it('treats REOPENED and REUSED as not fresh, independently', () => {
    const reopened = provenanceRun(
      'reopened-only',
      DOWIN_ASDD_TRIM_CUT_10_BARS,
      equivalent({ solveKind: 'REOPENED_REUSED', solveDisposition: 'REOPENED' })
    );
    const reusedOnly = provenanceRun(
      'reused-only',
      DOWIN_ASDD_TRIM_CUT_10_BARS,
      equivalent({ solveKind: 'REOPENED_REUSED', solveDisposition: 'REUSED' })
    );
    expect(classifyProvenanceFreshStateExperiment([reopened]).verdict).toBe('AMBIGUOUS');
    expect(classifyProvenanceFreshStateExperiment([reusedOnly]).verdict).toBe('AMBIGUOUS');
  });

  it('does not treat Clear Screen as fresh-state proof', () => {
    expect(
      isClearScreenNotFreshness({
        runId: 'FP024C1_FRESH_A',
        projectId: 'fresh-project',
        designId: 'fresh-design',
        clearScreenClaimedFresh: true,
      })
    ).toBe(true);
    expect(
      isClearScreenNotFreshness({
        runId: 'asdd',
        projectId: 'asdasd',
        designId: '100001',
      })
    ).toBe(true);
    const hashes = {
      generalSettingsScreenshot: 's',
      designPreview: 'a',
      assemblyLabels: 'b',
      optimization: 'c',
      mdb: 'm',
    };
    const cleared = ingestOperatorCalibrationRun(DOWIN_ASDD_BASELINE_REPRODUCTION_RUN, {
      runId: 'FP024C1_FRESH_A',
      timestampIso: '2026-09-10T21:00:00.000Z',
      generalSettingsScreenshotNote: 'Clear Screen then Optimize',
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
      optimizerProvenance: equivalent({ runId: 'FP024C1_FRESH_A' }),
      freshSlot: 'A',
      clearScreenClaimedFresh: true,
    });
    expect(cleared.ok).toBe(false);
    if (!cleared.ok) {
      expect(cleared.reasons.some((r) => r.includes('Clear Screen'))).toBe(true);
    }
  });

  it('classifies changed required-parts, offcut, and settings fingerprints as DIFFERENT', () => {
    const base = equivalent();
    const parts = asddEquivalentInputProvenance(
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.pieces,
      DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.observedSettings,
      {
        requiredPartsSnapshot: [
          {
            physicalCutId: 'other',
            sourceCutId: 'other',
            externalPieceId: 'other',
            role: 'frame',
            packedLengthMm: 1503,
            leftAngleDeg: 45,
            rightAngleDeg: 45,
            quantity: 1,
          },
        ],
      }
    );
    const offcut = asddEquivalentInputProvenance(
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.pieces,
      DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.observedSettings,
      {
        offcutRemnantSnapshot: [{ profileCode: 'Deceuninck-KASA-70', lengthMm: 500, quantity: 1 }],
      }
    );
    const settings = asddEquivalentInputProvenance(
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.pieces,
      DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
      {
        ...DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.observedSettings,
        remnantThresholdMm: 999,
      }
    );
    expect(compareOptimizerInputFingerprints(base, parts)).toBe('DIFFERENT');
    expect(compareOptimizerInputFingerprints(base, offcut)).toBe('DIFFERENT');
    expect(compareOptimizerInputFingerprints(base, settings)).toBe('DIFFERENT');
    expect(
      classifyProvenanceFreshStateExperiment([
        provenanceRun('fresh-a', DOWIN_ASDD_EXTERNAL_BAR_PATTERNS, base),
        provenanceRun('fresh-b', DOWIN_ASDD_EXTERNAL_BAR_PATTERNS, parts),
      ]).verdict
    ).toBe('HIDDEN_INPUT_DIFFERENCE');
  });

  it('never promotes incomplete fingerprints to IDENTICAL', () => {
    const complete = equivalent();
    const incomplete = {
      ...complete,
      geometryFingerprint: null,
      requiredPartsFingerprint: null,
      stockFingerprint: null,
      offcutRemnantFingerprint: null,
      settingsFingerprint: null,
    };
    expect(compareOptimizerInputFingerprints(complete, incomplete)).toBe('UNPROVEN');
    expect(compareOptimizerInputFingerprints(null, complete)).toBe('UNPROVEN');
  });

  it('treats same pieces with different bar grouping as different topology', () => {
    const original = DOWIN_ASDD_EXTERNAL_BAR_PATTERNS;
    const kanat = original[1];
    const regrouped: ExternalBarPattern[] = [
      original[0],
      { ...kanat, id: 'kanat-a', applicationCount: 1 },
      { ...kanat, id: 'kanat-b', applicationCount: 1 },
      original[2],
      original[3],
      original[4],
    ];
    expect(assignmentSignaturesEqual(original, regrouped)).toBe(false);
  });

  it('records Fresh A as measured without repeatability claims', () => {
    expect(FP024C1_FRESH_RUN_IDS).toEqual(['FP024C1_FRESH_A', 'FP024C1_FRESH_B', 'FP024C1_FRESH_C']);
    const fresh = DOWIN_CALIBRATION_RUNS.filter((r) =>
      (FP024C1_FRESH_RUN_IDS as readonly string[]).includes(r.fixtureId)
    );
    expect(fresh).toHaveLength(3);
    const a = fresh.find((r) => r.fixtureId === 'FP024C1_FRESH_A');
    expect(a).toBe(DOWIN_FP024C1_FRESH_A_RUN);
    expect(a?.status).toBe('MEASURED');
    expect(a?.optimizerProvenance?.solveDisposition).toBe('NEWLY_SOLVED');
    expect(a?.optimizerProvenance?.projectId).toBe('10002');
    expect(a?.optimizerProvenance?.designId).toBe('FRESH_A');
    expect(a?.optimizerProvenance?.productionPlanId).toBe('FRESH_A_PLAN');
    expect(identifyAsddAssignmentTopology(a!.bars)).toBe('OTHER');
    expect(identifyAsddAssignmentTopology(DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.bars)).toBe(
      'ORIGINAL_1B'
    );
    expect(identifyAsddAssignmentTopology(DOWIN_ASDD_BASELINE_RESET_RUN.bars)).toBe('LATER_TEST3_4');
    expect(
      assignmentSignaturesEqual(a!.bars, DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.bars)
    ).toBe(false);
    expect(assignmentSignaturesEqual(a!.bars, DOWIN_ASDD_TRIM_CUT_10_BARS)).toBe(false);
    const oneBEquivalent = asddEquivalentInputProvenance(
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.pieces,
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.bars,
      DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.observedSettings
    );
    expect(compareOptimizerInputFingerprints(a!.optimizerProvenance, oneBEquivalent)).toBe(
      'DIFFERENT'
    );
    expect(a?.optimizerProvenance?.geometryFingerprint).toBe(oneBEquivalent.geometryFingerprint);
    expect(a?.optimizerProvenance?.requiredPartsFingerprint).toBe(
      oneBEquivalent.requiredPartsFingerprint
    );
    expect(a?.optimizerProvenance?.settingsFingerprint).toBe(oneBEquivalent.settingsFingerprint);
    expect(a?.optimizerProvenance?.stockFingerprint).not.toBe(oneBEquivalent.stockFingerprint);
    expect(a?.optimizerProvenance?.offcutRemnantSnapshotId).toBe(
      'UNPROVEN-no-dedicated-remnant-ui'
    );
    expect(
      evaluateFreshRunIntake({
        runId: 'FP024C1_FRESH_A',
        timestampIso: a!.optimizerProvenance!.timestampIso,
        observedSettings: a!.observedSettings,
        widthMm: 1000,
        heightMm: 1500,
        profileSystem: a!.profileSystem,
        provenance: a!.optimizerProvenance,
        sourceHashes: a!.optimizerProvenance!.sourceHashesSha256 ?? {},
        freshSlot: 'A',
        mdbGenerated: true,
      }).ok
    ).toBe(true);
    expect(fresh.filter((r) => r.status === 'PENDING_OPERATOR_RUN')).toHaveLength(2);
    expect(classifyProvenanceFreshStateExperiment(DOWIN_CALIBRATION_RUNS).verdict).toBe(
      'AMBIGUOUS'
    );
    expect(isControlFixtureAuthorized()).toBe(false);
  });

  it('excludes timestamp and result IDs from optimizer-input fingerprints', () => {
    const a = equivalent({
      timestampIso: '2026-09-10T21:00:00.000Z',
      optimizationResultId: 'result-a',
    });
    const b = equivalent({
      timestampIso: '2026-09-11T00:00:00.000Z',
      optimizationResultId: 'result-b',
    });
    expect(compareOptimizerInputFingerprints(a, b)).toBe('IDENTICAL');
    expect(
      optimizerInputFingerprintSha256({
        timestampIso: 't1',
        optimizationResultId: 'r1',
        geometry: { widthMm: 1000, heightMm: 1500 },
      })
    ).toBe(
      optimizerInputFingerprintSha256({
        timestampIso: 't2',
        optimizationResultId: 'r2',
        geometry: { widthMm: 1000, heightMm: 1500 },
      })
    );
    expect(() => canonicalJson(undefined)).toThrow(CanonicalEvidenceError);
    expect(canonicalJson({ b: 1, a: null })).toBe('{"a":null,"b":1}');
  });

  it('records ALMONA reproducibility surfaces without mutating manufacturing settings', () => {
    expect(ALMONA_REPRODUCIBILITY_SURFACES.some((s) => s.defect === 'ALMONA_REPRODUCIBILITY_DEFECT')).toBe(
      true
    );
    expect(
      ALMONA_REPRODUCIBILITY_SURFACES.find((s) => s.fileLine.includes('OptimizationEngine.ts:203'))
        ?.classification
    ).toBe('RESULT_METADATA_ONLY');
    const before = resolveManufacturingSettings();
    evaluateFreshRunIntake({
      runId: 'FP024C1_FRESH_A',
      timestampIso: '2026-09-10T21:00:00.000Z',
      observedSettings: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.observedSettings,
      widthMm: 1000,
      heightMm: 1500,
      profileSystem: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.profileSystem,
      provenance: equivalent(),
      sourceHashes: {
        generalSettingsScreenshot: 's',
        designPreview: 'a',
        assemblyLabels: 'b',
        optimization: 'c',
        mdb: 'm',
      },
      mdbGenerated: true,
      freshSlot: 'A',
    });
    expect(resolveManufacturingSettings()).toEqual(before);
  });
});

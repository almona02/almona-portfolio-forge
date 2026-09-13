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
  DOWIN_FP024C3_RUN_A_RUN,
  DOWIN_FP024C3_RUN_B_RUN,
  DOWIN_FP024C3_RUN_C_RUN,
  DOWIN_FP024C_90_CONTROL_RUN,
  DOWIN_OBSERVED_SOLVER_STAGES,
  FP027_CONSERVATION_TRACE_LAYERS,
  FP027_E1_DEMAND1_NONORTA,
  FP027_E1_GENERATED_ROWS,
  FP027_E2_NONORTA_90,
  FP027_E2_GENERATED_ROWS,
  FP024C_90_CONTROL_COMPENSATION,
  FP024C_NINETY_CONTROL_DUAL_USE,
  FP024C_NINETY_CONTROL_SPEC,
  FP024C6_LENGTH_LAYER_SEMANTICS,
  FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION,
  FP024C8_WELD0_CONTROL_REPLICATION,
  FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE,
  FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR,
  FP024C10_THREE_POINT_TABLE,
  FP024C11_FORMULA_SCOPE_AUTHORIZATION,
  evaluateFormulaScopeAuthorization,
  evaluateWeldingWasteLayerCausality,
  evaluateTwoFixtureWeldCausality,
  evaluateCitaWeldCausalityFromExistingArtifacts,
  classifyWeldThreePointDeltas,
  evaluateWeldLinearityAcrossRows,
  FP027_90_CONTROL_CONSERVATION_OBSERVATION,
  evaluateControlFixtureAuthorization,
  evaluateIndependentNinetyControlFixtureSpec,
  evaluateDualUseVerdictFirewall,
  evaluateNinetyControlFixtureSelection,
  classifyNinetyControlCompensationLayers,
  FP024C1_CONTROLLED_REPEATABILITY_SUPERSESSION,
  FP024C3_EVIDENCE_CHECKPOINT,
  FP024C_90_CONTROL_AUTHORIZATION_CONTRACT,
  FP024C_90_CONTROL_STOCK_PROTOCOL,
  FP027_E3_BARS,
  FP027_E3_KASA_SPARE,
  FP027_E3_REQUIRED_PIECES,
  FP027_REQUIRED_PARTS_CONSERVATION_GATE,
  classifyRequiredVsPlanConservation,
  evaluateDemandOneNonOrtaFixture,
  evaluateNonOrtaNinetyDegreeFixture,
  STOCK_COMMIT_DIALOG_TRIGGER,
  barContentFingerprint,
  barSequenceFingerprint,
  compareBarTopology,
  DOWIN_BAR_STRIP_ORDER_IS_NOT_MACHINE_ORDER,
  observeOverproductionBeyondRequired,
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
  totalRemainingMm,
  totalStockMm,
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
import {
  FP024C3_ACTIVE_BASELINE,
  FP024C3_ACTIVE_BASELINE_VERSION,
  FP024C3_BASELINE_V1,
  FP024C3_BASELINE_V2,
  FP024C3_CONTROLLED_BASELINES,
  FP024C3_EQUIVALENCE_AXES,
  FP024C3_EXPECTED_PIECE_COUNT,
  FP024C3_FROZEN_WAREHOUSE_BASELINE,
  FP024C3_FROZEN_WAREHOUSE_BASELINE_V1,
  FP024C3_FROZEN_WAREHOUSE_BASELINE_V2,
  FP024C3_MEASURED_EQUIVALENCE_AXES,
  FP024C3_REQUIRED_RUN_COUNT,
  FP024C3_RUN_IDS,
  MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED,
  ORTA_ZERO_QTY_CONTROL_OBSERVABILITY,
  buildControlledEquivalenceMatrix,
  classifyControlledRepeatability,
  controlledBaselineOf,
  evaluateBaselineEquivalenceClaim,
  evaluateControlledFixtureSignature,
  evaluateControlledRunIntake,
  evaluateControlledStockPostcheck,
  fp024c3ControlledRuns,
  isFp024c3ControlledTriplicateComplete,
  observeWarehouseQtyVsOptimizerAvailability,
  verifyWarehouseImmutability,
  type ControlledRunEvidence,
  type WarehouseStockCard,
} from '@/lib/fabricator/dowinParity/dowinCompensationEvidence';

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

  it('does not let an unresolved FP-024C.1 verdict deadlock 90° readiness', () => {
    expect(classifyProvenanceFreshStateExperiment(DOWIN_CALIBRATION_RUNS).verdict).toBe(
      'AMBIGUOUS'
    );
    expect(isControlFixtureAuthorized()).toBe(true);
    const fresh = provenanceRun('fresh-original', DOWIN_ASDD_EXTERNAL_BAR_PATTERNS, equivalent());
    expect(isControlFixtureAuthorized([...DOWIN_CALIBRATION_RUNS, fresh])).toBe(true);
    expect(evaluateControlFixtureAuthorization().controlRunStatus).toBe('MEASURED');
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
    expect(isControlFixtureAuthorized()).toBe(true);
    expect(evaluateControlFixtureAuthorization().controlRunStatus).toBe('MEASURED');
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
    expect(isControlFixtureAuthorized()).toBe(true);
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

const CONTROLLED_PIECES = DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.pieces;

function controlledRun(
  runId: string,
  overrides: Partial<ControlledRunEvidence> = {}
): ControlledRunEvidence {
  return {
    runId,
    provenance: equivalent({ optimizationResultId: `result-${runId}` }),
    observedWarehouseStock: [...FP024C3_FROZEN_WAREHOUSE_BASELINE],
    offcutRemnantEvidence: 'UNPROVEN',
    stockWriteLogReview: 'NO_STOCK_WRITE_LOGGED',
    settingsScreenshotSha256: `settings-${runId}`,
    bars: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.bars,
    pieces: CONTROLLED_PIECES,
    ...overrides,
  };
}

function controlledTriplicate(
  overrides: Partial<ControlledRunEvidence>[] = []
): ControlledRunEvidence[] {
  return FP024C3_RUN_IDS.map((runId, index) => controlledRun(runId, overrides[index] ?? {}));
}

describe('FP-024C.3 controlled fresh-solve repeatability', () => {
  it('freezes baseline V2 as the active control baseline with ORTA at 100', () => {
    const quantities = Object.fromEntries(
      FP024C3_FROZEN_WAREHOUSE_BASELINE.map((card) => [card.profileCode, card.quantity])
    );
    expect(quantities['Deceuninck-CITA-20']).toBe(46);
    expect(quantities['Deceuninck-KANAT-70']).toBe(96);
    expect(quantities['Deceuninck-KASA-70']).toBe(13);
    expect(quantities['Deceuninck-ORTA-KAYIT-70']).toBe(100);
    expect(quantities['Deceuninck-KOSE-METAL-05']).toBe(100);
    expect(quantities['Deceuninck-KOSE-PLASTIK-01']).toBe(50);
    expect(quantities['Deceuninck-DESTEK-SACI-2.0MM']).toBe(15);
    expect(FP024C3_RUN_IDS).toEqual(['FP024C3_RUN_A', 'FP024C3_RUN_B', 'FP024C3_RUN_C']);
    expect(FP024C3_REQUIRED_RUN_COUNT).toBe(3);
    expect(FP024C3_ACTIVE_BASELINE_VERSION).toBe(2);
    expect(FP024C3_ACTIVE_BASELINE).toBe(FP024C3_BASELINE_V2);
    expect(FP024C3_FROZEN_WAREHOUSE_BASELINE).toBe(FP024C3_FROZEN_WAREHOUSE_BASELINE_V2);
  });

  it('keeps V1 and V2 distinct, with V1 historical-only and ORTA the sole delta', () => {
    expect(FP024C3_CONTROLLED_BASELINES.map((b) => b.baselineVersion)).toEqual([1, 2]);
    expect(FP024C3_BASELINE_V1.status).toBe('HISTORICAL_ONLY');
    expect(FP024C3_BASELINE_V2.status).toBe('ACTIVE');
    expect(FP024C3_BASELINE_V1.baselineReason).toBe('POST_FRESH_A_OPTIMIZATION_STOCK_WRITE');
    expect(FP024C3_BASELINE_V2.baselineReason).toBe('MANUAL_STOCK_CARD_EDIT_CONTAMINATED_V1');
    expect(FP024C3_BASELINE_V1.baselineSourceHash).toBe(
      'a1881bba3df98e15eb73adf3958a0fcc6d312cbbb1b025e5999f25db0ba8ae31'
    );
    expect(FP024C3_BASELINE_V2.baselineSourceHash).toBe(
      'c8626da5166731e393a74ae731b663410ef77f2bde2b05bcfa572531e6c32012'
    );
    expect(FP024C3_BASELINE_V1.baselineSourceHash).not.toBe(FP024C3_BASELINE_V2.baselineSourceHash);
    expect(controlledBaselineOf(1)).toBe(FP024C3_BASELINE_V1);
    expect(controlledBaselineOf(2)).toBe(FP024C3_BASELINE_V2);

    // V2 differs from V1 on exactly one card: ORTA 0 → 100.
    const v1 = new Map(
      FP024C3_FROZEN_WAREHOUSE_BASELINE_V1.map((c) => [`${c.profileCode}|${c.stockLengthMm}`, c])
    );
    const drifted = FP024C3_FROZEN_WAREHOUSE_BASELINE_V2.filter(
      (c) => v1.get(`${c.profileCode}|${c.stockLengthMm}`)?.quantity !== c.quantity
    );
    expect(drifted.map((c) => c.profileCode)).toEqual(['Deceuninck-ORTA-KAYIT-70']);
    expect(v1.get('Deceuninck-ORTA-KAYIT-70|6500')?.quantity).toBe(0);
    expect(drifted[0].quantity).toBe(100);

    // Cross-comparison is a mutation in both directions; neither is a PASS.
    expect(
      evaluateControlledStockPostcheck(
        [...FP024C3_FROZEN_WAREHOUSE_BASELINE_V1],
        FP024C3_FROZEN_WAREHOUSE_BASELINE_V2
      ).verdict
    ).toBe('STOCK_STATE_MUTATED');
    expect(
      evaluateControlledStockPostcheck(
        [...FP024C3_FROZEN_WAREHOUSE_BASELINE_V2],
        FP024C3_FROZEN_WAREHOUSE_BASELINE_V1
      ).verdict
    ).toBe('STOCK_STATE_MUTATED');
  });

  it('refuses a RUN_A equivalence claim against superseded baseline V1', () => {
    expect(evaluateBaselineEquivalenceClaim(2).claim).toBe('ALLOWED');
    const rejected = evaluateBaselineEquivalenceClaim(1);
    expect(rejected.claim).toBe('REJECTED_BASELINE_SUPERSEDED');
    expect(rejected.reason).toContain('HISTORICAL_ONLY');
    expect(rejected.reason).toContain('MANUAL_STOCK_CARD_EDIT_CONTAMINATED_V1');
    expect(evaluateBaselineEquivalenceClaim(3).claim).toBe('REJECTED_UNKNOWN_BASELINE');

    const intake = evaluateControlledRunIntake({
      run: controlledRun('FP024C3_RUN_A', { baselineVersion: 1 }),
      observedSettings: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.observedSettings,
      widthMm: 1000,
      heightMm: 1500,
      profileSystem: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.profileSystem,
      sourceHashes: {
        generalSettingsScreenshot: 'settings-FP024C3_RUN_A',
        designPreview: 'design-a',
        assemblyLabels: 'labels-a',
        optimization: 'report-a',
        machineExport: 'dw-a',
      },
      mdbGenerated: true,
    });
    expect(intake.ok).toBe(false);
    expect(intake.reasons.join(' ')).toContain('Baseline V1 is HISTORICAL_ONLY');

    const classified = classifyControlledRepeatability({
      runs: controlledTriplicate([{ baselineVersion: 1 }, {}, {}]),
    });
    expect(classified.verdict).toBe('BASELINE_SUPERSEDED');
    expect(classified.baselineVersion).toBe(2);
    expect(
      classifyControlledRepeatability({ runs: controlledTriplicate(), baselineVersion: 1 }).verdict
    ).toBe('BASELINE_SUPERSEDED');
  });

  it('accepts the exact V2 snapshot and rejects any later delta from it', () => {
    expect(evaluateControlledStockPostcheck([...FP024C3_FROZEN_WAREHOUSE_BASELINE_V2]).verdict).toBe(
      'PASS'
    );
    // ORTA 100 is now the accepted controlled value, not an anomaly.
    expect(
      FP024C3_FROZEN_WAREHOUSE_BASELINE_V2.find(
        (c) => c.profileCode === 'Deceuninck-ORTA-KAYIT-70'
      )?.quantity
    ).toBe(100);

    for (const delta of [-1, 1]) {
      const moved = FP024C3_FROZEN_WAREHOUSE_BASELINE_V2.map((card) =>
        card.profileCode === 'Deceuninck-ORTA-KAYIT-70'
          ? { ...card, quantity: card.quantity + delta }
          : { ...card }
      );
      expect(evaluateControlledStockPostcheck(moved).verdict).toBe('STOCK_STATE_MUTATED');
    }
    const consumed = FP024C3_FROZEN_WAREHOUSE_BASELINE_V2.map((card) =>
      card.profileCode === 'Deceuninck-KASA-70' ? { ...card, quantity: 12 } : { ...card }
    );
    const postRun = evaluateControlledStockPostcheck(consumed);
    expect(postRun.verdict).toBe('STOCK_STATE_MUTATED');
    expect(
      postRun.deltas.find((d) => d.profileCode === 'Deceuninck-KASA-70')?.deltaQuantity
    ).toBe(-1);
  });

  it('never lets log silence override a UI stock mismatch', () => {
    const mismatch = FP024C3_FROZEN_WAREHOUSE_BASELINE_V2.map((card) =>
      card.profileCode === 'Deceuninck-ORTA-KAYIT-70' ? { ...card, quantity: 0 } : { ...card }
    );
    // Exactly the FP-024C.3 failure: quantity moved, no stock-write log entry.
    const silent = verifyWarehouseImmutability({
      observedStock: mismatch,
      logReview: 'NO_STOCK_WRITE_LOGGED',
    });
    expect(silent.verdict).toBe('STOCK_STATE_MUTATED');
    expect(silent.uiVerdict).toBe('STOCK_STATE_MUTATED');
    expect(silent.reasons.join(' ')).toContain('log silence cannot override it');

    // A logged write is a mutation even when quantities currently match.
    expect(
      verifyWarehouseImmutability({
        observedStock: [...FP024C3_FROZEN_WAREHOUSE_BASELINE_V2],
        logReview: 'STOCK_WRITE_LOGGED',
      }).verdict
    ).toBe('STOCK_STATE_MUTATED');

    // An observed manual card edit is a mutation regardless of the log.
    expect(
      verifyWarehouseImmutability({
        observedStock: [...FP024C3_FROZEN_WAREHOUSE_BASELINE_V2],
        logReview: 'NO_STOCK_WRITE_LOGGED',
        manualStockCardEditObserved: true,
      }).verdict
    ).toBe('STOCK_STATE_MUTATED');

    expect(MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED.classification).toBe('PROVEN_FOR_OBSERVED_PATH');
    expect(MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED.doesNotGeneralize).toContain('Not generalized');
  });

  it('requires both sources before a controlled run may proceed', () => {
    expect(
      verifyWarehouseImmutability({
        observedStock: [...FP024C3_FROZEN_WAREHOUSE_BASELINE_V2],
        logReview: 'NO_STOCK_WRITE_LOGGED',
      }).verdict
    ).toBe('IMMUTABLE_VERIFIED');

    // UI match alone is not verification.
    const unreviewed = verifyWarehouseImmutability({
      observedStock: [...FP024C3_FROZEN_WAREHOUSE_BASELINE_V2],
      logReview: 'NOT_REVIEWED',
    });
    expect(unreviewed.verdict).toBe('UNPROVEN');
    expect(unreviewed.uiVerdict).toBe('PASS');
    expect(unreviewed.reasons.join(' ')).toContain('Both sources are required');

    expect(
      verifyWarehouseImmutability({ observedStock: null, logReview: 'NO_STOCK_WRITE_LOGGED' })
        .verdict
    ).toBe('UNPROVEN');

    const unreviewedTriplicate = classifyControlledRepeatability({
      runs: controlledTriplicate([{ stockWriteLogReview: 'NOT_REVIEWED' }, {}, {}]),
    });
    expect(unreviewedTriplicate.verdict).toBe('AMBIGUOUS');
    expect(unreviewedTriplicate.note).toContain('log silence alone is not verification');

    const proceeds = classifyControlledRepeatability({ runs: controlledTriplicate() });
    expect(proceeds.immutability.every((c) => c.verdict === 'IMMUTABLE_VERIFIED')).toBe(true);
    expect(proceeds.verdict).toBe('MEASURED_INPUT_REPEATABILITY_PROVEN');
  });

  it('fails closed on the post-run stock check', () => {
    expect(evaluateControlledStockPostcheck([...FP024C3_FROZEN_WAREHOUSE_BASELINE]).verdict).toBe(
      'PASS'
    );
    expect(evaluateControlledStockPostcheck(null).verdict).toBe('UNPROVEN');
    const partial = FP024C3_FROZEN_WAREHOUSE_BASELINE.slice(0, 3);
    expect(evaluateControlledStockPostcheck([...partial]).verdict).toBe('UNPROVEN');

    const deducted: WarehouseStockCard[] = FP024C3_FROZEN_WAREHOUSE_BASELINE.map((card) =>
      card.profileCode === 'Deceuninck-KASA-70' ? { ...card, quantity: 12 } : { ...card }
    );
    const mutated = evaluateControlledStockPostcheck(deducted);
    expect(mutated.verdict).toBe('STOCK_STATE_MUTATED');
    expect(
      mutated.deltas.find((delta) => delta.profileCode === 'Deceuninck-KASA-70')?.deltaQuantity
    ).toBe(-1);

    const remnantImported: WarehouseStockCard[] = [
      ...FP024C3_FROZEN_WAREHOUSE_BASELINE.map((card) => ({ ...card })),
      { profileCode: 'Deceuninck-CITA-20', stockLengthMm: 6160, quantity: 1 },
    ];
    const withRemnant = evaluateControlledStockPostcheck(remnantImported);
    expect(withRemnant.verdict).toBe('STOCK_STATE_MUTATED');
    expect(withRemnant.unexpectedCards).toEqual(['Deceuninck-CITA-20|6160']);
  });

  /**
   * Builds classifier evidence from an ingested controlled run. Every value is
   * measured: all three runs were verified byte-identical to baseline V2 both
   * before and after export, each with its own live re-read, and the whole
   * session log contains no stock-write line.
   */
  const CONTROLLED_CAPTURE_IDS: Record<string, string> = {
    FP024C3_RUN_A: 'runA-settings-20260913-004212',
    FP024C3_RUN_B: 'runB-settings-20260913-012655',
    FP024C3_RUN_C: 'runC-settings-20260913-145945',
  };

  const controlledRunFrom = (run: DowinCalibrationRun): ControlledRunEvidence => ({
    runId: run.fixtureId,
    provenance: run.optimizerProvenance ?? null,
    observedWarehouseStock: FP024C3_FROZEN_WAREHOUSE_BASELINE_V2,
    offcutRemnantEvidence: 'UNPROVEN',
    settingsScreenshotSha256: run.optimizerProvenance?.settingsSnapshotSha256 ?? null,
    settingsCaptureId: CONTROLLED_CAPTURE_IDS[run.fixtureId] ?? null,
    bars: run.bars,
    pieces: run.pieces,
    baselineVersion: 2,
    stockWriteLogReview: 'NO_STOCK_WRITE_LOGGED',
  });

  it('accepts independent settings captures that render byte-identically', () => {
    const runs = fp024c3ControlledRuns().map((run) => controlledRunFrom(run));
    // All three captures share a content hash because the page never changed.
    expect(new Set(runs.map((run) => run.settingsScreenshotSha256)).size).toBe(1);
    // Distinct capture identities, so this is pixel-level equality, not reuse.
    expect(new Set(runs.map((run) => run.settingsCaptureId)).size).toBe(3);
    expect(classifyControlledRepeatability({ runs }).measuredInputEquivalence).toBe('IDENTICAL');

    // Drop the capture identities and the same hashes must fail closed again.
    const reused = runs.map((run) => ({ ...run, settingsCaptureId: null }));
    expect(classifyControlledRepeatability({ runs: reused }).measuredInputEquivalence).toBe(
      'UNPROVEN'
    );
    // A single screenshot cited three times is still rejected.
    const sameCapture = runs.map((run) => ({ ...run, settingsCaptureId: 'one-screenshot' }));
    expect(classifyControlledRepeatability({ runs: sameCapture }).measuredInputEquivalence).toBe(
      'UNPROVEN'
    );
  });

  it('completes the controlled triplicate with three distinct fresh solves', () => {
    const controlled = fp024c3ControlledRuns();
    expect(controlled).toHaveLength(3);
    expect(controlled.every((run) => run.status === 'MEASURED')).toBe(true);
    expect(isFp024c3ControlledTriplicateComplete()).toBe(true);

    const runC = controlled.find((run) => run.fixtureId === 'FP024C3_RUN_C');
    expect(runC).toBe(DOWIN_FP024C3_RUN_C_RUN);
    expect(runC?.optimizerProvenance?.projectId).toBe('100005');
    expect(runC?.optimizerProvenance?.designId).toBe('RUN_C');
    expect(runC?.optimizerProvenance?.productionPlanId).toBe('RUN_C_PLAN');
    expect(runC?.bars).toHaveLength(5);

    // Every run is a genuinely separate solve: distinct identities throughout.
    const ids = controlled.map((run) => run.optimizerProvenance?.optimizationResultId);
    expect(new Set(ids).size).toBe(3);
    expect(new Set(controlled.map((run) => run.optimizerProvenance?.projectId)).size).toBe(3);
    expect(
      controlled.every((run) => run.optimizerProvenance?.solveDisposition === 'NEWLY_SOLVED')
    ).toBe(true);

    // A complete triplicate does NOT open the 90° control on its own.
    expect(
      evaluateControlFixtureAuthorization({ fixtureIndependentlySpecified: false }).authorized
    ).toBe(false);
    expect(isControlFixtureAuthorized()).toBe(true);
  });

  it('classifies the triplicate as nonrepeatable without claiming nondeterminism', () => {
    const a = DOWIN_FP024C3_RUN_A_RUN.bars;
    const b = DOWIN_FP024C3_RUN_B_RUN.bars;
    const c = DOWIN_FP024C3_RUN_C_RUN.bars;

    // C reproduces A exactly and still diverges from B on CITA only.
    expect(compareBarTopology(a, c).comparison).toBe('IDENTICAL');
    expect(barSequenceFingerprint(a)).toBe(barSequenceFingerprint(c));
    const bc = compareBarTopology(b, c);
    expect(bc.comparison).toBe('CONTENT_DIVERGENT');
    expect(bc.reasons.join(' ')).toContain('Deceuninck-CITA-20');
    expect(bc.reasons.join(' ')).not.toContain('Deceuninck-KANAT-70');

    // Two topologies over three solves, and utilization cannot tell them apart.
    expect(new Set([a, b, c].map((bars) => barSequenceFingerprint(bars))).size).toBe(2);
    for (const bars of [b, c]) {
      expect(overallUtilizationPercent(bars)).toBe(overallUtilizationPercent(a));
      expect(Math.abs(totalRemainingMm(bars) - totalRemainingMm(a))).toBeLessThan(0.005);
      expect(totalStockMm(bars)).toBe(totalStockMm(a));
    }

    // Ceiling: more than one topology under identical measured inputs, but the
    // offcut/remnant axis is UNPROVEN, so nondeterminism must NOT be claimed.
    const verdict = classifyControlledRepeatability({
      runs: fp024c3ControlledRuns().map((run) => controlledRunFrom(run)),
    });
    expect(verdict.runCount).toBe(3);
    expect(verdict.uniqueTopologyCount).toBe(2);
    expect(verdict.measuredInputEquivalence).toBe('IDENTICAL');
    expect(verdict.completeInputEquivalence).toBe('UNPROVEN');
    expect(verdict.verdict).toBe('NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS');
    expect(verdict.verdict).not.toBe('OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING');
    expect(verdict.fullDeterminismClaimAllowed).toBe(false);
    expect(verdict.immutability.every((check) => check.verdict === 'IMMUTABLE_VERIFIED')).toBe(
      true
    );
  });

  it('reproduces the required-parts conservation violation in all three runs', () => {
    const runs = [
      DOWIN_FP024C3_RUN_A_RUN,
      DOWIN_FP024C3_RUN_B_RUN,
      DOWIN_FP024C3_RUN_C_RUN,
    ];
    const observations = runs.map((run) =>
      observeOverproductionBeyondRequired({ bars: run.bars, pieces: run.pieces })
    );
    for (const observed of observations) {
      expect(observed.observation).toBe('OVERPRODUCTION_BEYOND_REQUIRED_QUANTITY');
      expect(observed.requiredPieceCount).toBe(FP024C3_EXPECTED_PIECE_COUNT);
      expect(observed.producedPieceCount).toBe(24);
      expect(observed.surplus).toEqual(observations[0].surplus);
    }
    expect(observations[0].surplus).toHaveLength(1);
    expect(observations[0].surplus[0]).toMatchObject({
      packedLengthMm: 1416,
      requiredQuantity: 1,
      producedQuantity: 4,
      surplusQuantity: 3,
      surplusLengthMm: 4248,
    });
  });

  it('refuses to treat the bar layout strip order as a topology axis', () => {
    expect(DOWIN_BAR_STRIP_ORDER_IS_NOT_MACHINE_ORDER.classification).toBe(
      'PROVEN_BY_DIRECT_COMPARISON'
    );
    expect(DOWIN_BAR_STRIP_ORDER_IS_NOT_MACHINE_ORDER.evidence.length).toBeGreaterThanOrEqual(3);

    // Order-only reshuffles never escalate to a divergence.
    const reordered = DOWIN_FP024C3_RUN_C_RUN.bars.map((bar) => ({
      ...bar,
      packedSegmentMm: [...bar.packedSegmentMm].reverse(),
    }));
    expect(compareBarTopology(DOWIN_FP024C3_RUN_C_RUN.bars, reordered).comparison).toBe(
      'ORDER_ONLY_DIFFERENCE'
    );
    // ...and the B/C divergence survives an order-insensitive comparison, so it
    // is not an artifact of presentation order.
    expect(barContentFingerprint(DOWIN_FP024C3_RUN_B_RUN.bars)).not.toBe(
      barContentFingerprint(DOWIN_FP024C3_RUN_C_RUN.bars)
    );
    expect(barContentFingerprint(DOWIN_FP024C3_RUN_A_RUN.bars)).toBe(
      barContentFingerprint(DOWIN_FP024C3_RUN_C_RUN.bars)
    );
  });

  it('keeps every controlled run identity distinct across the triplicate', () => {
    const controlled = fp024c3ControlledRuns();
    expect(controlled.map((run) => run.fixtureId)).toEqual([...FP024C3_RUN_IDS]);

    const byId = new Map(controlled.map((run) => [run.fixtureId, run]));
    expect(byId.get('FP024C3_RUN_A')?.optimizerProvenance?.projectId).toBe('100003');
    expect(byId.get('FP024C3_RUN_B')?.optimizerProvenance?.projectId).toBe('100004');
    expect(byId.get('FP024C3_RUN_C')?.optimizerProvenance?.projectId).toBe('100005');
    expect(byId.get('FP024C3_RUN_A')?.bars).toHaveLength(5);
    expect(byId.get('FP024C3_RUN_B')?.bars).toHaveLength(4);
    expect(byId.get('FP024C3_RUN_C')?.bars).toHaveLength(5);

    // Bar-count alone is not topology: A and C share a count AND a geometry,
    // while B differs — but a matching count would not have proven anything.
    expect(barSequenceFingerprint(byId.get('FP024C3_RUN_A')!.bars)).toBe(
      barSequenceFingerprint(byId.get('FP024C3_RUN_C')!.bars)
    );
    expect(barSequenceFingerprint(byId.get('FP024C3_RUN_B')!.bars)).not.toBe(
      barSequenceFingerprint(byId.get('FP024C3_RUN_A')!.bars)
    );

    // The within-run fingerprint embeds run-scoped piece ids, so it must never
    // be used to compare two runs: it separates even A from C.
    expect(topologyFingerprint(byId.get('FP024C3_RUN_A')!.bars)).not.toBe(
      topologyFingerprint(byId.get('FP024C3_RUN_C')!.bars)
    );
  });

  it('records the A/B topology divergence without claiming nondeterminism', () => {
    const a = DOWIN_FP024C3_RUN_A_RUN.bars;
    const b = DOWIN_FP024C3_RUN_B_RUN.bars;

    // Utilization, bar count and total remainder all hide the difference.
    expect(totalStockMm(a)).toBe(totalStockMm(b));
    expect(overallUtilizationPercent(a)).toBe(overallUtilizationPercent(b));
    expect(Math.abs(totalRemainingMm(a) - totalRemainingMm(b))).toBeLessThan(0.1);

    // The assignment does not.
    const compared = compareBarTopology(a, b);
    expect(compared.comparison).toBe('CONTENT_DIVERGENT');
    expect(compared.reasons.join(' ')).toContain('Deceuninck-CITA-20');
    expect(compared.reasons.join(' ')).not.toContain('Deceuninck-KASA-70');
    expect(assignmentSignaturesEqual(a, b)).toBe(false);

    // A pure re-ordering must never be reported as a divergence, because
    // RUN_A's within-bar sequence was not captured for KANAT and KASA.
    const reordered = a.map((bar) => ({
      ...bar,
      packedSegmentMm: [...bar.packedSegmentMm].reverse(),
    }));
    expect(compareBarTopology(a, reordered).comparison).toBe('ORDER_ONLY_DIFFERENCE');
    expect(barContentFingerprint(a)).toBe(barContentFingerprint(reordered));
    expect(compareBarTopology(a, null).comparison).toBe('UNPROVEN');

    // Two runs still cannot classify repeatability either way.
    expect(classifyControlledRepeatability({ runs: [] }).verdict).toBe(
      'CONTROLLED_REPEATABILITY_IN_PROGRESS'
    );
  });

  it('reproduces the over-production in RUN_B with an identical surplus signature', () => {
    const a = observeOverproductionBeyondRequired({
      bars: DOWIN_FP024C3_RUN_A_RUN.bars,
      pieces: DOWIN_FP024C3_RUN_A_RUN.pieces,
    });
    const b = observeOverproductionBeyondRequired({
      bars: DOWIN_FP024C3_RUN_B_RUN.bars,
      pieces: DOWIN_FP024C3_RUN_B_RUN.pieces,
    });
    expect(b.observation).toBe('OVERPRODUCTION_BEYOND_REQUIRED_QUANTITY');
    expect(b.requiredPieceCount).toBe(FP024C3_EXPECTED_PIECE_COUNT);
    expect(b.producedPieceCount).toBe(24);
    expect(b.surplus).toEqual(a.surplus);
    expect(b.surplus[0]).toMatchObject({
      packedLengthMm: 1416,
      requiredQuantity: 1,
      producedQuantity: 4,
      surplusLengthMm: 4248,
    });
  });

  it('keeps RUN_A out of the FP-024C.1 fresh-state comparison across baselines', () => {
    // Fresh A solved against V1-era stock (48/98/14/0); RUN_A against V2
    // (46/96/13/100). Comparing them would be a cross-baseline category error.
    expect(
      compareOptimizerInputFingerprints(
        DOWIN_FP024C1_FRESH_A_RUN.optimizerProvenance,
        DOWIN_FP024C3_RUN_A_RUN.optimizerProvenance
      )
    ).toBe('DIFFERENT');
    expect(classifyProvenanceFreshStateExperiment(DOWIN_CALIBRATION_RUNS).verdict).not.toBe(
      'HIDDEN_INPUT_DIFFERENCE'
    );
  });

  it('records RUN_A over-production against the required fixture', () => {
    const observed = observeOverproductionBeyondRequired({
      bars: DOWIN_FP024C3_RUN_A_RUN.bars,
      pieces: DOWIN_FP024C3_RUN_A_RUN.pieces,
    });
    expect(observed.observation).toBe('OVERPRODUCTION_BEYOND_REQUIRED_QUANTITY');
    expect(observed.requiredPieceCount).toBe(FP024C3_EXPECTED_PIECE_COUNT);
    expect(observed.producedPieceCount).toBe(24);
    expect(observed.surplus).toHaveLength(1);
    expect(observed.surplus[0]).toMatchObject({
      packedLengthMm: 1416,
      requiredQuantity: 1,
      producedQuantity: 4,
      surplusQuantity: 3,
      surplusLengthMm: 4248,
    });

    // Fresh A cut exactly what was required, so the observation is run-specific.
    expect(
      observeOverproductionBeyondRequired({
        bars: DOWIN_FP024C1_FRESH_A_RUN.bars,
        pieces: DOWIN_FP024C1_FRESH_A_RUN.pieces,
      }).observation
    ).toBe('NOT_OBSERVED');
    expect(
      observeOverproductionBeyondRequired({ bars: null, pieces: null }).observation
    ).toBe('UNPROVEN');
  });

  it('records the post-export dialog as the stock-write trigger without overclaiming', () => {
    expect(STOCK_COMMIT_DIALOG_TRIGGER.raisedBy).toContain('Send to Machine');
    expect(STOCK_COMMIT_DIALOG_TRIGGER.logsUserActionTag).toBe(false);
    expect(STOCK_COMMIT_DIALOG_TRIGGER.classification).toBe(
      'SUPPORTED_BY_CONTROLLED_COMPARISON'
    );
    // The Fresh A "Yes" was inferred, not observed. Keep that visible.
    expect(STOCK_COMMIT_DIALOG_TRIGGER.limitation).toContain('not directly observed');
    expect(DOWIN_OBSERVED_SOLVER_STAGES.seedExposed).toBe(false);
    expect(DOWIN_OBSERVED_SOLVER_STAGES.determinismDocumented).toBe(false);
    expect(DOWIN_OBSERVED_SOLVER_STAGES.stages.join(' ')).toContain('TAVLAMA');
  });

  it('opens FP-027 as forensics without naming a root cause or a divergence layer', () => {
    const gate = FP027_REQUIRED_PARTS_CONSERVATION_GATE;
    expect(gate.status).toBe('OPEN_FORENSICS_ONLY');
    expect(gate.fixImplemented).toBe(false);
    expect(gate.invariantImplemented).toBe(false);
    expect(gate.conservationViolation).toBe('REPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS');
    // The violation repeats; its cause does not follow from that.
    expect(gate.rootCause).toBe('UNPROVEN');
    expect(gate.firstDivergenceLayer).toBeNull();
    expect(gate.leadingHypothesisAuthority).toBe('CONSISTENT_WITH_ALL_OBSERVED_DATA');
    expect(gate.fillTheBarHypothesis).toBe('WEAKENED');
    expect(gate.simpleSpareCapacityGeneralization).toBe('NOT_SUPPORTED_BY_E3');
    expect(gate.nextSpecifiedExperiment).toBe('INDEPENDENT_REVIEW_ONLY');
    expect(gate.fixtureDiscriminatingPower).toBe('INSUFFICIENT');
    expect(gate.statement).toContain('root cause remains UNPROVEN');
    // Three identical outcomes are not a proof of determinism.
    expect(gate.notProven.join(' ')).toContain('do not mathematically exclude it');
    expect(gate.e3ClosesGate).toBe(false);
    expect(gate.e3AuthorizesFormulaChange).toBe(false);
    expect(gate.e3ProvesDemandInequality).toBe(false);
    const e1 = gate.discriminatingExperiments.find((e) => e.id === 'E1');
    const e2 = gate.discriminatingExperiments.find((e) => e.id === 'E2');
    expect(e1?.classification).toBe('E1_FIXTURE_NOT_OBTAINABLE_NATURALLY');
    expect(e1?.fixture).toContain('non-ORTA');
    expect(e1?.fixture).toContain('do not inject');
    expect(e2?.authorized).toBe(true);
    expect(e2?.executed).toBe(true);
    expect(e2?.classification).toBe('E2_FIXTURE_NOT_OBTAINABLE_NATURALLY');
    expect(e2?.fixture).toContain('non-ORTA 90');
    expect(e2?.fixture).toContain('Do not inject');
    expect(gate.e1ClosesGate).toBe(false);
    expect(gate.e2ClosesGate).toBe(false);
    expect(gate.e2AuthorizesNinetyControl).toBe(false);
    expect(gate.ninetyControlDualUseClassification).toBe('DUAL_USE_CONDITIONAL');
    expect(gate.ninetyControlDualUseAuthorizesControl).toBe(false);
    expect(gate.injectedSyntheticRowIsValidEvidence).toBe(false);
  });

  it('bounds the conservation divergence to the layers DoWin does not expose', () => {
    const layers = FP027_CONSERVATION_TRACE_LAYERS;
    const observed = layers.filter((l) => l.observable);
    const opaque = layers.filter((l) => !l.observable);

    // Every observable layer carries a measured count; no opaque layer may.
    expect(observed.every((l) => typeof l.observedCount === 'number')).toBe(true);
    expect(opaque.every((l) => l.observedCount === null)).toBe(true);
    expect(opaque.map((l) => l.layer)).toEqual([
      'COLUMN_GENERATION_PATTERNS',
      'MIP_DEMAND_CONSTRAINTS',
      'POST_MIP_ANNEALING',
    ]);

    const countAt = (layer: string) =>
      layers.find((l) => l.layer === layer)?.observedCount ?? null;
    expect(countAt('OPTIMIZATION_INPUT')).toBe(1);
    expect(countAt('CUTTING_PLAN_REPORT')).toBe(4);
    // Export writes the correct single piece, so the piece list is not the defect.
    expect(countAt('DC600_EXPORT')).toBe(1);

    const gate = FP027_REQUIRED_PARTS_CONSERVATION_GATE;
    const lower = layers.findIndex((l) => l.layer === gate.divergenceBoundedAfter);
    const upper = layers.findIndex((l) => l.layer === gate.divergenceBoundedAtOrBefore);
    expect(lower).toBeGreaterThanOrEqual(0);
    expect(upper).toBeGreaterThan(lower);
    // The bound must contain only opaque layers, or it would name a layer.
    expect(layers.slice(lower + 1, upper).every((l) => !l.observable)).toBe(true);
  });

  it('records ALMONA conservation as structural but unasserted', () => {
    const gate = FP027_REQUIRED_PARTS_CONSERVATION_GATE;
    expect(gate.almonaExposure).toBe('NOT_EXPOSED_BY_CONSTRUCTION');
    // Holding by construction is not the same as being guarded by a test.
    expect(gate.almonaInvariantAsserted).toBe(false);
    expect(gate.almonaNote).toContain('nowhere asserted');
  });

  it('classifies E3 as exact KASA conservation without closing FP-027', () => {
    const e3 = FP027_E3_KASA_SPARE;
    expect(e3.status).toBe('MEASURED');
    expect(e3.classification).toBe('EXACT_CONSERVATION');
    expect(e3.citaClassification).toBe('EXACT_CONSERVATION');
    expect(
      classifyRequiredVsPlanConservation({
        requiredCount: e3.requiredKasaCount,
        planCount: e3.planKasaCount,
      })
    ).toBe('EXACT_CONSERVATION');
    expect(
      classifyRequiredVsPlanConservation({
        requiredCount: e3.requiredCitaCount,
        planCount: e3.planCitaCount,
      })
    ).toBe('EXACT_CONSERVATION');
    expect(observeOverproductionBeyondRequired({
      bars: FP027_E3_BARS,
      pieces: FP027_E3_REQUIRED_PIECES,
    }).observation).toBe('NOT_OBSERVED');
    expect(e3.generalization).toBe('GENERALIZATION_NOT_SUPPORTED_BY_E3');
    expect(e3.crossProfileConservationViolation).toBe('NOT_OBSERVED');
    expect(e3.closesFp027).toBe(false);
    expect(e3.authorizesFormulaChange).toBe(false);
    expect(e3.provesDemandInequality).toBe(false);
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.status).toBe('OPEN_FORENSICS_ONLY');
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.rootCause).toBe('UNPROVEN');
  });

  it('refuses to let E3 exact conservation authorize formulas, 90°, or a >= constraint claim', () => {
    const gate = FP027_REQUIRED_PARTS_CONSERVATION_GATE;
    const e3 = gate.discriminatingExperiments.find((e) => e.id === 'E3');
    expect(e3?.executed).toBe(true);
    expect(e3?.classification).toBe('EXACT_CONSERVATION');
    expect(gate.e3AuthorizesFormulaChange).toBe(false);
    expect(gate.e3ProvesDemandInequality).toBe(false);
    expect(gate.e3ClosesGate).toBe(false);
    expect(gate.e3AuthorizesFormulaChange).toBe(false);
    expect(isControlFixtureAuthorized()).toBe(true);
    expect(STOCK_COMMIT_DIALOG_TRIGGER.id).toBe(
      'POST_EXPORT_STOCK_UPDATE_DIALOG_IS_THE_WRITE_TRIGGER'
    );
    // E3 conserved; that does not invert the A/B/C ORTA surplus.
    expect(gate.conservationViolation).toBe('REPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS');
    expect(classifyRequiredVsPlanConservation({ requiredCount: 1, planCount: 4 })).toBe(
      'OVERPRODUCTION'
    );
    expect(classifyRequiredVsPlanConservation({ requiredCount: null, planCount: 4 })).toBe(
      'UNPROVEN'
    );
  });

  it('records E1 as a natural-fixture failure and does not treat that as a solve', () => {
    const e1 = FP027_E1_DEMAND1_NONORTA;
    expect(e1.fixtureValid).toBe(false);
    expect(e1.solved).toBe(false);
    expect(e1.injectedRow).toBe(false);
    expect(e1.classification).toBe('E1_FIXTURE_NOT_OBTAINABLE_NATURALLY');
    expect(e1.closesFp027).toBe(false);
    expect(e1.authorizesFormulaChange).toBe(false);
    expect(e1.provesDemandInequality).toBe(false);
    expect(e1.physicalLengthScore).toBe('6.0/10');
    expect(e1.demand1Hypothesis).toBe('UNRESOLVED');
    expect(e1.isFailedExperiment).toBe(false);
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.e1IsFailedExperiment).toBe(false);
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.demand1Hypothesis).toBe('UNRESOLVED');
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.ortaSpecificHypothesis).toBe('STILL_LIVE');
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.ninetyDegreeHypothesis).toBe('STILL_LIVE');
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.rootCause).toBe('UNPROVEN');
    expect(e1.authorizesFormulaChange).toBe(false);
    expect(isControlFixtureAuthorized()).toBe(true);

    const discovered = evaluateDemandOneNonOrtaFixture(FP027_E1_GENERATED_ROWS);
    expect(discovered.fixtureValid).toBe(false);
    expect(discovered.classification).toBe('E1_FIXTURE_NOT_OBTAINABLE_NATURALLY');
    expect(discovered.profileCounts).toEqual({
      'Deceuninck-KASA-70': 4,
      'Deceuninck-KANAT-70': 4,
      'Deceuninck-CITA-20': 4,
    });
    expect(discovered.candidateProfile).toBeNull();

    // Even a lone non-ORTA row would be rejected as E1 evidence if it was injected.
    const fakeLoneKasa = evaluateDemandOneNonOrtaFixture([
      { profileCode: 'Deceuninck-KASA-70', quantity: 1 },
    ]);
    expect(fakeLoneKasa.fixtureValid).toBe(true);
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.injectedSyntheticRowIsValidEvidence).toBe(
      false
    );
    expect(e1.injectedRow).toBe(false);
  });

  it('records E2 as a natural-fixture failure and does not treat that as a solve', () => {
    const e2 = FP027_E2_NONORTA_90;
    expect(e2.fixtureValid).toBe(false);
    expect(e2.solved).toBe(false);
    expect(e2.injectedRow).toBe(false);
    expect(e2.anglesEdited).toBe(false);
    expect(e2.classification).toBe('E2_FIXTURE_NOT_OBTAINABLE_NATURALLY');
    expect(e2.closesFp027).toBe(false);
    expect(e2.authorizesFormulaChange).toBe(false);
    expect(e2.provesDemandInequality).toBe(false);
    expect(e2.authorizesNinetyControl).toBe(false);
    expect(e2.physicalLengthScore).toBe('6.0/10');
    expect(e2.ninetyDegreeHypothesis).toBe('UNRESOLVED');
    expect(e2.isFailedExperiment).toBe(false);
    expect(e2.onlyNinetyDegreeProfile).toBe('Deceuninck-ORTA-KAYIT-70');
    expect(e2.generatedRowCount).toBe(17);
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.e2IsFailedExperiment).toBe(false);
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.e2ClosesGate).toBe(false);
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.e2AuthorizesNinetyControl).toBe(false);
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.demand1Hypothesis).toBe('UNRESOLVED');
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.ortaSpecificHypothesis).toBe('STILL_LIVE');
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.ninetyDegreeHypothesis).toBe('STILL_LIVE');
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.rootCause).toBe('UNPROVEN');
    expect(e2.authorizesNinetyControl).toBe(false);
    expect(isControlFixtureAuthorized()).toBe(true);

    const discovered = evaluateNonOrtaNinetyDegreeFixture(FP027_E2_GENERATED_ROWS);
    expect(discovered.fixtureValid).toBe(false);
    expect(discovered.classification).toBe('E2_FIXTURE_NOT_OBTAINABLE_NATURALLY');
    expect(discovered.candidateProfile).toBeNull();
    expect(discovered.ninetyDegreeRows).toEqual([
      { profileCode: 'Deceuninck-ORTA-KAYIT-70', quantity: 1 },
    ]);

    // A manufactured non-ORTA 90/90 row would look valid to the detector
    // and still be rejected as evidence.
    const fakeKasaNinety = evaluateNonOrtaNinetyDegreeFixture([
      { profileCode: 'Deceuninck-KASA-70', leftAngleDeg: 90, rightAngleDeg: 90, quantity: 1 },
    ]);
    expect(fakeKasaNinety.fixtureValid).toBe(true);
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.injectedSyntheticRowIsValidEvidence).toBe(
      false
    );
    expect(e2.injectedRow).toBe(false);
    expect(evaluateNonOrtaNinetyDegreeFixture(null).classification).toBe('UNPROVEN');
  });

  it('keeps 90° dual-use conditional and does not merge verdict authority', () => {
    const dual = FP024C_NINETY_CONTROL_DUAL_USE;
    expect(dual.classification).toBe('DUAL_USE_CONDITIONAL');
    expect(dual.authorizesControl).toBe(false);
    expect(dual.targetingOrtaOneToFourIsUnsafe).toBe(true);
    expect(dual.passiveObservationAllowedAfterIndependentAuthorization).toBe(true);
    expect(dual.fp027RootCause).toBe('UNPROVEN');
    expect(dual.physicalLengthScore).toBe('6.0/10');
    expect(dual.formulaFreeze).toBe(true);
    expect(FP024C_NINETY_CONTROL_SPEC.geometryIndependentlySpecified).toBe(true);
    expect(FP024C_NINETY_CONTROL_SPEC.asddMullionIsThisControl).toBe(false);
    expect(FP024C_NINETY_CONTROL_SPEC.widthMm).toBe(1200);
    expect(FP024C_NINETY_CONTROL_SPEC.heightMm).toBe(1200);
    expect(FP024C_NINETY_CONTROL_SPEC.ortaDemandNaturallyEquals1).toBe(
      'NOT_AN_ACCEPTANCE_FIELD'
    );
    expect(FP024C_NINETY_CONTROL_SPEC.quantityConservationInOriginalAcceptanceGate).toBe(
      false
    );
    expect(FP024C_90_CONTROL_COMPENSATION.status).toBe('MEASURED');
    expect(FP024C_90_CONTROL_COMPENSATION.cannotCiteFp027Conservation).toBe(true);
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.status).toBe('MEASURED');
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.cannotCiteFp024cCompensation).toBe(
      true
    );
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.cannotCloseFp027).toBe(true);
    expect(evaluateNinetyControlFixtureSelection({ selectedToObserveOrtaSurplus: true })).toBe(
      'FIXTURE_SELECTION_BIAS'
    );
    expect(
      evaluateNinetyControlFixtureSelection({ selectedToObserveOrtaSurplus: false })
    ).toBe('COMPENSATION_PRIMARY');

    const sameHash = 'abc123';
    const conservationExactCompensationOpen = evaluateDualUseVerdictFirewall({
      compensationClassification: null,
      conservationClassification: 'EXACT_CONSERVATION',
      compensationArtifactSha256: sameHash,
      conservationArtifactSha256: sameHash,
    });
    expect(conservationExactCompensationOpen.artifactsShared).toBe(true);
    expect(conservationExactCompensationOpen.sharedHashImpliesSharedVerdict).toBe(false);
    expect(conservationExactCompensationOpen.compensationProvenBecauseConservationMatched).toBe(
      false
    );
    expect(conservationExactCompensationOpen.observedCompensation).toBeNull();
    expect(conservationExactCompensationOpen.fp027RootCause).toBe('UNPROVEN');

    const compensationNamedConservationOpen = evaluateDualUseVerdictFirewall({
      compensationClassification: 'WITHIN_FIXTURE_LAYERS',
      conservationClassification: 'UNPROVEN',
    });
    expect(compensationNamedConservationOpen.observedCompensation).toBe(
      'WITHIN_FIXTURE_LAYERS'
    );
    expect(compensationNamedConservationOpen.observedConservation).toBe('UNPROVEN');
    expect(compensationNamedConservationOpen.conservationProvenBecauseCompensationMatched).toBe(
      false
    );
    expect(compensationNamedConservationOpen.fp027RootCause).toBe('UNPROVEN');

    expect(isControlFixtureAuthorized()).toBe(true);
    expect(FP024C_90_CONTROL_COMPENSATION.status).toBe('MEASURED');
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.ninetyControlDualUseAuthorizesControl).toBe(
      false
    );
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.rootCause).toBe('UNPROVEN');
  });

  it('reconciles the 90° control gate to current scientific prerequisites (FP-024C.4)', () => {
    const catalog = evaluateControlFixtureAuthorization();
    expect(FP024C3_EVIDENCE_CHECKPOINT.accepted).toBe(true);
    expect(FP024C3_EVIDENCE_CHECKPOINT.verdict).toBe(
      'NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS'
    );
    expect(isFp024c3ControlledTriplicateComplete()).toBe(true);
    expect(catalog.blockers).toEqual([]);
    expect(catalog.authorized).toBe(true);
    expect(catalog.verdict).toBe('READY_FOR_OPERATOR_RUN');
    expect(catalog.controlRunStatus).toBe('MEASURED');
    expect(catalog.physicalLengthScore).toBe('6.0/10');
    expect(FP024C_90_CONTROL_COMPENSATION.status).toBe('MEASURED');
    expect(FP024C_NINETY_CONTROL_DUAL_USE.classification).toBe('DUAL_USE_CONDITIONAL');
    expect(FP024C_NINETY_CONTROL_DUAL_USE.classification).not.toBe('DUAL_USE_SAFE');
    expect(catalog.dualUseIsSafe).toBe(false);

    expect(FP024C1_CONTROLLED_REPEATABILITY_SUPERSESSION.status).toBe('SUPERSEDED_BY_FP024C3');
    expect(FP024C1_CONTROLLED_REPEATABILITY_SUPERSESSION.historicalEvidencePreserved).toBe(true);
    expect(FP024C1_CONTROLLED_REPEATABILITY_SUPERSESSION.cannotDeadlockControlAuthorization).toBe(
      true
    );
    const freshPending = DOWIN_CALIBRATION_RUNS.filter(
      (run) =>
        run.fixtureId === 'FP024C1_FRESH_B' || run.fixtureId === 'FP024C1_FRESH_C'
    );
    expect(freshPending).toHaveLength(2);
    expect(freshPending.every((run) => run.status === 'PENDING_OPERATOR_RUN')).toBe(true);
    expect(DOWIN_ASDD_BASELINE_RESET_RUN.reproductionVerdict).toBe('REPRODUCTION_FAILED');
    expect(classifyProvenanceFreshStateExperiment(DOWIN_CALIBRATION_RUNS).verdict).toBe(
      'AMBIGUOUS'
    );
    expect(catalog.supersededConditions).toEqual(
      FP024C_90_CONTROL_AUTHORIZATION_CONTRACT.supersededAsBlockers
    );
    expect(catalog.blockers).not.toContain('FP024C1_FRESH_B_C_MEASURED');
    expect(catalog.blockers).not.toContain('BASELINE_RESET_RECOVERS_1B_REMAINDERS');
    expect(catalog.fp027RootCauseBlocksCompensation).toBe(false);
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.rootCause).toBe('UNPROVEN');

    const targeting = evaluateControlFixtureAuthorization({
      fixtureIndependentlySpecified: true,
      fp027TargetingAuthorize: true,
    });
    expect(targeting.authorized).toBe(false);
    expect(targeting.fp027TargetingAuthorizedControl).toBe(false);
    expect(targeting.blockers).toContain('FP027_TARGETING_CANNOT_AUTHORIZE_FP024C_CONTROL');

    const specified = evaluateControlFixtureAuthorization({
      fixtureIndependentlySpecified: true,
      selectedToObserveOrtaSurplus: false,
    });
    expect(specified.blockers).not.toContain(
      'FP024C_90_CONTROL_FIXTURE_SPECIFIED_INDEPENDENTLY'
    );
    expect(specified.authorized).toBe(true);
    expect(specified.verdict).toBe('READY_FOR_OPERATOR_RUN');
    expect(specified.physicalLengthScore).toBe('6.0/10');
    expect(specified.controlRunStatus).toBe('MEASURED');
    expect(isControlFixtureAuthorized()).toBe(true);
    expect(FP024C_NINETY_CONTROL_SPEC.geometryIndependentlySpecified).toBe(true);

    expect(
      evaluateControlFixtureAuthorization({
        fixtureIndependentlySpecified: true,
        formulaFreeze: false,
      }).blockers
    ).toContain('PRODUCTION_FORMULAS_FROZEN');
    expect(
      evaluateControlFixtureAuthorization({
        fixtureIndependentlySpecified: true,
        stockMutationProtocolPresent: false,
      }).blockers
    ).toContain('STOCK_MUTATION_PROTOCOL_PRESENT');
    expect(FP024C_90_CONTROL_STOCK_PROTOCOL.stockUpdateResponse).toBe('NO');

    const firewall = evaluateDualUseVerdictFirewall({
      compensationClassification: 'WITHIN_FIXTURE_LAYERS',
      conservationClassification: 'OVERPRODUCTION',
      compensationArtifactSha256: 'same',
      conservationArtifactSha256: 'same',
    });
    expect(firewall.sharedHashImpliesSharedVerdict).toBe(false);
    expect(firewall.conservationProvenBecauseCompensationMatched).toBe(false);
    expect(firewall.compensationProvenBecauseConservationMatched).toBe(false);
    expect(firewall.fp027RootCause).toBe('UNPROVEN');
  });

  it('accepts the independent 1200×1200 90° fixture after the measured control (FP-024C.5)', () => {
    const catalog = evaluateIndependentNinetyControlFixtureSpec();
    expect(catalog.specifiedIndependently).toBe(true);
    expect(catalog.failures).toEqual([]);
    expect(FP024C_NINETY_CONTROL_SPEC.widthMm).toBe(1200);
    expect(FP024C_NINETY_CONTROL_SPEC.heightMm).toBe(1200);
    expect(FP024C_NINETY_CONTROL_SPEC.centeredVerticalMullion).toBe(true);
    expect(FP024C_NINETY_CONTROL_SPEC.requiredOrtaCount).toBeNull();
    expect(FP024C_NINETY_CONTROL_SPEC.requiredOrtaSurplus).toBe(false);
    expect(FP024C_NINETY_CONTROL_SPEC.expectedMullionNominalLengthMm).toBeNull();
    expect(FP024C_NINETY_CONTROL_SPEC.selectedForCompensationOnly).toBe(true);

    expect(evaluateIndependentNinetyControlFixtureSpec({ widthMm: 0, heightMm: 0 }).failures).toContain(
      'GEOMETRY_MUST_BE_1200x1200'
    );
    expect(
      evaluateIndependentNinetyControlFixtureSpec({ centeredVerticalMullion: false }).failures
    ).toContain('CENTERED_VERTICAL_MULLION_REQUIRED');
    expect(
      evaluateIndependentNinetyControlFixtureSpec({ selectedToObserveOrtaSurplus: true }).failures
    ).toContain('FP027_TARGETING_CANNOT_AUTHORIZE_FP024C_CONTROL');
    expect(
      evaluateIndependentNinetyControlFixtureSpec({ requiredOrtaCount: 1 }).failures
    ).toContain('REQUIRED_ORTA_COUNT_MUST_NOT_BE_ENCODED');
    expect(
      evaluateIndependentNinetyControlFixtureSpec({ requiredOrtaSurplus: true }).failures
    ).toContain('REQUIRED_ORTA_SURPLUS_MUST_NOT_BE_ENCODED');
    expect(
      evaluateIndependentNinetyControlFixtureSpec({ settingsFrozen: false }).failures
    ).toContain('SETTINGS_MUST_REMAIN_FROZEN');
    expect(
      evaluateIndependentNinetyControlFixtureSpec({ formulaFreeze: false }).failures
    ).toContain('PRODUCTION_FORMULAS_FROZEN');
    expect(
      evaluateIndependentNinetyControlFixtureSpec({ stockUpdateNo: false }).failures
    ).toContain('STOCK_UPDATE_MUST_BE_NO');
    expect(
      evaluateIndependentNinetyControlFixtureSpec({ authorityFirewallActive: false }).failures
    ).toContain('AUTHORITY_FIREWALL_REQUIRED');

    const ready = evaluateControlFixtureAuthorization();
    expect(ready.authorized).toBe(true);
    expect(ready.verdict).toBe('READY_FOR_OPERATOR_RUN');
    expect(ready.blockers).toEqual([]);
    expect(ready.controlRunStatus).toBe('MEASURED');
    expect(ready.physicalLengthScore).toBe('6.0/10');
    expect(FP024C_90_CONTROL_COMPENSATION.status).toBe('MEASURED');
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.status).toBe('MEASURED');
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.cannotAffectFixtureValidity).toBe(true);
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.cannotAuthorizeRerun).toBe(true);
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.cannotChangeGeometry).toBe(true);
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.rootCause).toBe('UNPROVEN');

    const surplusFirewall = evaluateDualUseVerdictFirewall({
      compensationClassification: null,
      conservationClassification: 'OVERPRODUCTION',
    });
    expect(surplusFirewall.compensationProvenBecauseConservationMatched).toBe(false);
    const lengthFirewall = evaluateDualUseVerdictFirewall({
      compensationClassification: 'OBSERVED_DELTA',
      conservationClassification: 'UNPROVEN',
    });
    expect(lengthFirewall.fp027RootCause).toBe('UNPROVEN');
  });

  it('records independent 90° control layers without promoting FP-027 (FP-024C.5 execute)', () => {
    expect(DOWIN_FP024C_90_CONTROL_RUN.status).toBe('MEASURED');
    expect(DOWIN_FP024C_90_CONTROL_RUN.widthMm).toBe(1200);
    expect(DOWIN_FP024C_90_CONTROL_RUN.heightMm).toBe(1200);
    expect(DOWIN_FP024C_90_CONTROL_RUN.optimizerProvenance?.solveDisposition).toBe(
      'NEWLY_SOLVED'
    );
    const ninety = DOWIN_FP024C_90_CONTROL_RUN.pieces.filter(
      (piece) => piece.leftAngleDeg === 90 && piece.rightAngleDeg === 90
    );
    const fortyFive = DOWIN_FP024C_90_CONTROL_RUN.pieces.filter(
      (piece) => piece.leftAngleDeg === 45 && piece.rightAngleDeg === 45
    );
    expect(ninety).toHaveLength(1);
    expect(fortyFive.length).toBeGreaterThanOrEqual(4);
    expect(ninety[0]?.expectedNominalLengthMm).toBe(1116);
    expect(ninety[0]?.expectedPackedSegmentMm).toBe(1116);
    expect(ninety[0]?.expectedMachineLengthMm).toBe(1116);
    expect(
      classifyNinetyControlCompensationLayers({
        nominalMm: 1116,
        packedMm: 1116,
        machineMm: 1116,
      }).classification
    ).toBe('NO_OBSERVED_COMPENSATION_ON_90_CONTROL');
    expect(FP024C_90_CONTROL_COMPENSATION.classification).toBe(
      'NO_OBSERVED_COMPENSATION_ON_90_CONTROL'
    );
    expect(FP024C_90_CONTROL_COMPENSATION.ninetyRequiredPartsToPacked).toBe('PROVEN');
    expect(FP024C_90_CONTROL_COMPENSATION.ninetyPackedToMachine).toBe('PROVEN');
    expect(FP024C_90_CONTROL_COMPENSATION.fortyFiveRequiredPartsToPacked).toBe('OBSERVED');
    expect(FP024C_90_CONTROL_COMPENSATION.fortyFivePackedToMachine).toBe('OBSERVED');
    expect(FP024C_90_CONTROL_COMPENSATION.fortyFiveDesignOrReportNominalToRequiredParts).toBe(
      'OBSERVED_PLUS_3_FOR_C5_FIXTURE'
    );
    expect(FP024C_90_CONTROL_COMPENSATION.ninetyDesignOrReportToRequiredParts).toBe(
      'OBSERVED_0_FOR_C5_FIXTURE'
    );
    expect(FP024C_90_CONTROL_COMPENSATION.fortyFiveDesignReportToPackedTwoFixtures).toBe(
      'OBSERVED_PLUS_3'
    );
    expect(FP024C_90_CONTROL_COMPENSATION.ninetyDesignReportToPackedTwoFixtures).toBe(
      'OBSERVED_0'
    );
    expect(FP024C_90_CONTROL_COMPENSATION.crossAngleCompensationSame).toBe(
      'REJECTED_BY_OBSERVATION'
    );
    expect(FP024C_90_CONTROL_COMPENSATION.crossAngleLayerComparison).toBe(
      'CROSS_ANGLE_LAYER_COMPARISON_SUPPORTED'
    );
    expect(FP024C_90_CONTROL_COMPENSATION.generalizedCompensationFormula).toBe('UNPROVEN');
    expect(FP024C_90_CONTROL_COMPENSATION.physicalLengthScore).toBe('6.0/10');
    expect(FP024C_90_CONTROL_COMPENSATION.authorizesFormulaChange).toBe(false);
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.classification).toBe('OVERPRODUCTION');
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.deltaCount).toBe(4);
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.cannotCloseFp027).toBe(true);
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.fp027RootCause).toBe('UNPROVEN');
    const shared = DOWIN_FP024C_90_CONTROL_RUN.optimizerProvenance?.sourceHashesSha256
      ?.machineExport;
    const firewall = evaluateDualUseVerdictFirewall({
      compensationClassification: FP024C_90_CONTROL_COMPENSATION.classification,
      conservationClassification: FP027_90_CONTROL_CONSERVATION_OBSERVATION.classification,
      compensationArtifactSha256: shared,
      conservationArtifactSha256: shared,
    });
    expect(firewall.artifactsShared).toBe(true);
    expect(firewall.sharedHashImpliesSharedVerdict).toBe(false);
    expect(firewall.compensationProvenBecauseConservationMatched).toBe(false);
    expect(firewall.conservationProvenBecauseCompensationMatched).toBe(false);
    expect(firewall.fp027RootCause).toBe('UNPROVEN');
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.rootCause).toBe('UNPROVEN');
  });

  it('ingests FP-024C.6 Design Preview layer without a new solve', () => {
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.status).toBe('ACCEPTED');
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.classification).toBe('LAYER_SEMANTICS_RECONCILED');
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.independentReview).toBe('ACCEPTED');
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.outcome).toBe('A');
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.artifactOnlyProtocolPreserved).toBe(true);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.projectDbId).toBe(9);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.designDbId).toBe(11);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.productionPlanDbId).toBe(7);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.optimizationRunDbId).toBe(13);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.newSolveCreated).toBe(false);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.newPlanCreated).toBe(false);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.stockUnchanged).toBe(true);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.doNotRerunDowin).toBe(true);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.doNotPatchFormulas).toBe(true);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.authorizesFormulaChange).toBe(false);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.physicalLengthScore).toBe('6.0/10');
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.asddDesignPreviewReport.kasaLengthMm).toBe(1000);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.asddDesignPreviewReport.ortaLengthMm).toBe(1416);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.controlLayers.designGeometryOuterMm.kasa).toBe(1200);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.controlLayers.designPreviewReportMm.kasa).toBe(1200);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.controlLayers.designPreviewReportMm.orta).toBe(1116);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.controlLayers.cutListPreviewMm.kasa).toBe(1203);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.controlLayers.requiredPartsMm.kasa).toBe(1203);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.controlLayers.packedPlanMm.kasa).toBe(1203);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.controlLayers.machineLengthMm.kasa).toBe(1203);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.controlLayers.machineFrameXYMm.kasa).toBe(1200);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.geometryToReportDeltaMm.kasa).toBe(0);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.reportToRequiredDeltaMm.kasa).toBe(3);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.requiredToPackedDeltaMm.kasa).toBe(0);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.packedToMachineDeltaMm.kasa).toBe(0);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.reportToRequiredDeltaMm.orta).toBe(0);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.requiredToPackedDeltaMm.orta).toBe(0);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.packedToMachineDeltaMm.orta).toBe(0);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.designPreviewPdf.status).toBe('EXPORTED');
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.designPreviewPdf.kasaLengthMm).toBe(1200);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.designPreviewPdf.ortaLengthMm).toBe(1116);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.designPreviewPdf.sha256).toBe(
      '2c2e558cba2016b2924266ba63768cd3ffe9e8bc2bba8d9b2880770d32c9e0f7'
    );
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.designPreviewPdf.licensedFileCommitted).toBe(false);
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.firstObserved1200To1203Transition).toBe(
      'DESIGN_REPORT_TO_REQUIRED_PARTS'
    );
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.authority.ninetyRequiredPartsToPacked).toBe('PROVEN');
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.authority.ninetyPackedToMachine).toBe('PROVEN');
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.authority.fortyFiveRequiredPartsToPacked).toBe(
      'OBSERVED'
    );
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.authority.fortyFivePackedToMachine).toBe('OBSERVED');
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.designPreviewExportAuthorizedByThisCheckpoint).toBe(
      true
    );
    expect(
      FP024C6_LENGTH_LAYER_SEMANTICS.authority.fortyFiveDesignOrReportNominalToRequiredParts
    ).toBe('OBSERVED_PLUS_3_FOR_C5_FIXTURE');
    expect(
      FP024C6_LENGTH_LAYER_SEMANTICS.authority.ninetyDesignOrReportToRequiredParts
    ).toBe('OBSERVED_0_FOR_C5_FIXTURE');
    expect(
      FP024C6_LENGTH_LAYER_SEMANTICS.authority.fortyFiveDesignReportToPackedTwoFixtures
    ).toBe('OBSERVED_PLUS_3');
    expect(
      FP024C6_LENGTH_LAYER_SEMANTICS.authority.ninetyDesignReportToPackedTwoFixtures
    ).toBe('OBSERVED_0');
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.reportToRequiredClassification).toBe(
      'DESIGN_REPORT_TO_REQUIRED_PARTS_DELTA_+3_OBSERVED_FOR_C5_FIXTURE'
    );
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.authority.sameCompensationAcrossAngles).toBe(
      'REJECTED_BY_OBSERVATION'
    );
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.authority.crossAngleLayerComparison).toBe(
      'CROSS_ANGLE_LAYER_COMPARISON_SUPPORTED'
    );
    expect(FP024C6_LENGTH_LAYER_SEMANTICS.authority.generalizedCompensationFormula).toBe(
      'UNPROVEN'
    );
    expect(FP024C_90_CONTROL_COMPENSATION.nextGate).toBe(
      'FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION'
    );
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.repeatability).toBe(
      'REPEATABLE_ACROSS_INDEPENDENT_GEOMETRY'
    );
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.thisFixtureSurplusDelta).toBe(4);
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.asddAndControlledSurplusDelta).toBe(3);
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.alwaysDuplicateToFour).toBe('WEAKENED');
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.fp027RootCause).toBe('UNPROVEN');
    expect(FP027_REQUIRED_PARTS_CONSERVATION_GATE.nextSpecifiedExperiment).toBe(
      'INDEPENDENT_REVIEW_ONLY'
    );
  });

  it('measures the asdd Weld=0 Required Parts boundary without authorizing a formula', () => {
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.status).toBe('ACCEPTED');
    expect(
      FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.protocol.discardedTodayWork1940Classification
    ).toBe('INVALID_FOR_CAUSAL_AUTHORITY');
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.doNotRerunDowin).toBe(true);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.doNotPatchFormulas).toBe(true);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.authorizesWeld0Rerun).toBe(false);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.authorizesFormulaChange).toBe(false);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.physicalLengthScore).toBe('6.0/10');
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.protocol.newSolveCreated).toBe(false);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.protocol.stockUnchanged).toBe(true);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.protocol.settings.weldingWasteMm).toBe(0);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.asddWeld3.kasa.DESIGN_REPORT).toBe(1000);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.asddWeld3.kasa.REQUIRED_PARTS).toBe(1003);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.asddWeld3.kasa.PACKED).toBe(1003);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.asddWeld0.kasa.PACKED).toBe(1000);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.asddWeld0.kasa.REQUIRED_PARTS).toBe(1000);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.asddWeld0.kanatHorizontal.REQUIRED_PARTS).toBe(
      451
    );
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.asddWeld0.kanatVertical.REQUIRED_PARTS).toBe(
      1430
    );
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.asddWeld3.orta.REQUIRED_PARTS).toBe(1416);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.asddWeld0.orta.REQUIRED_PARTS).toBe(1416);
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.weldMovesFortyFiveReportToPacked).toBe(
      'PROVEN_FOR_ASDD_FIXTURE'
    );
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.weld3To0EffectOn45ReportToPacked).toBe(
      'PROVEN_FOR_ASDD_FIXTURE'
    );
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.weld3To0EffectOn90ReportToPacked).toBe(
      'NO_OBSERVED_EFFECT_FOR_ASDD_FIXTURE'
    );
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.fortyFiveReportToPackedTwoFixtures).toBe(
      'OBSERVED_PLUS_3'
    );
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.ninetyReportToPackedTwoFixtures).toBe(
      'OBSERVED_0'
    );
    expect(
      FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.fortyFiveReportToRequiredPartsAtWeld0
    ).toBe('OBSERVED_0_FOR_ASDD_FIXTURE');
    expect(
      FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.ninetyReportToRequiredPartsAtWeld0
    ).toBe('OBSERVED_0_FOR_ASDD_FIXTURE');
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.weld0ReportToRequiredPartsDelta45).toBe(
      0
    );
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.weld0ReportToRequiredPartsDelta90).toBe(
      0
    );
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.weldMovesReportToRequiredParts).toBe(
      'PROVEN_FOR_ASDD_FIXTURE'
    );
    expect(
      FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.weld3To0EffectOn45ReportToRequiredParts
    ).toBe('PROVEN_FOR_ASDD_FIXTURE');
    expect(
      FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.weldCausesDesignReportToRequiredPartsPlus3
    ).toBe('PROVEN_FOR_ASDD_FIXTURE');
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.requiredPartsAtWeld0).toBe(
      'DELTA_0'
    );
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.weld0RequiredPartsLayer).toBe(
      'MEASURED'
    );
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.pairedWeld3To0BoundaryProof).toBe(
      true
    );
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.sameCompensationAcrossAngles).toBe(
      'REJECTED_BY_OBSERVATION'
    );
    expect(FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION.findings.generalizedCompensationFormula).toBe(
      'UNPROVEN'
    );
    const unmeasured = evaluateWeldingWasteLayerCausality({
      weld3Kasa: { designReportMm: 1000, requiredPartsMm: null, packedMm: 1003, machineMm: 1003 },
      weld0Kasa: { designReportMm: 1000, requiredPartsMm: null, packedMm: 1000, machineMm: 1000 },
      weld3Orta: { designReportMm: 1416, requiredPartsMm: null, packedMm: 1416, machineMm: 1416 },
      weld0Orta: { designReportMm: 1416, requiredPartsMm: null, packedMm: 1416, machineMm: 1416 },
    });
    expect(unmeasured.requiredPartsMeasuredAtBothWeldSettings).toBe(false);
    expect(unmeasured.weldMovesReportToRequiredParts).toBe('UNPROVEN');
    const mapped = evaluateWeldingWasteLayerCausality({
      weld3Kasa: { designReportMm: 1000, requiredPartsMm: 1003, packedMm: 1003, machineMm: 1003 },
      weld0Kasa: { designReportMm: 1000, requiredPartsMm: 1000, packedMm: 1000, machineMm: 1000 },
      weld3Orta: { designReportMm: 1416, requiredPartsMm: 1416, packedMm: 1416, machineMm: 1416 },
      weld0Orta: { designReportMm: 1416, requiredPartsMm: 1416, packedMm: 1416, machineMm: 1416 },
    });
    expect(mapped.designReportUnchanged).toBe(true);
    expect(mapped.fortyFiveReportToPackedDeltaAtWeld3Mm).toBe(3);
    expect(mapped.fortyFiveReportToPackedDeltaAtWeld0Mm).toBe(0);
    expect(mapped.fortyFiveReportToRequiredPartsDeltaAtWeld3Mm).toBe(3);
    expect(mapped.fortyFiveReportToRequiredPartsDeltaAtWeld0Mm).toBe(0);
    expect(mapped.ninetyReportToRequiredPartsDeltaAtWeld3Mm).toBe(0);
    expect(mapped.ninetyReportToRequiredPartsDeltaAtWeld0Mm).toBe(0);
    expect(mapped.weldMovesFortyFiveReportToPacked).toBe(true);
    expect(mapped.weldMovesNinetyReportToPacked).toBe(false);
    expect(mapped.requiredPartsMeasuredAtBothWeldSettings).toBe(true);
    expect(mapped.weldMovesReportToRequiredParts).toBe('PROVEN_FOR_ASDD_FIXTURE');
    expect(mapped.authorizesFormulaChange).toBe(false);
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.fp027RootCause).toBe('UNPROVEN');
  });

  it('replicates the Weld=0 Required Parts boundary on the C.5 fixture without a formula', () => {
    expect(FP024C8_WELD0_CONTROL_REPLICATION.status).toBe('ACCEPTED');
    expect(FP024C8_WELD0_CONTROL_REPLICATION.independentReviewOfFp024c7).toBe('ACCEPTED');
    expect(FP024C8_WELD0_CONTROL_REPLICATION.newSolveCreated).toBe(false);
    expect(FP024C8_WELD0_CONTROL_REPLICATION.stockUnchanged).toBe(true);
    expect(FP024C8_WELD0_CONTROL_REPLICATION.weldingWasteLeftAtPersistedZero).toBe(true);
    expect(FP024C8_WELD0_CONTROL_REPLICATION.existingPlan7AndRun13NotReusedAsFreshEvidence).toBe(
      true
    );
    expect(FP024C8_WELD0_CONTROL_REPLICATION.authorizesFormulaChange).toBe(false);
    expect(FP024C8_WELD0_CONTROL_REPLICATION.physicalLengthScore).toBe('6.0/10');
    expect(FP024C8_WELD0_CONTROL_REPLICATION.protocol.projectDbId).toBe(9);
    expect(FP024C8_WELD0_CONTROL_REPLICATION.protocol.designDbId).toBe(11);
    expect(FP024C8_WELD0_CONTROL_REPLICATION.protocol.settings.weldingWasteMm).toBe(0);
    expect(FP024C8_WELD0_CONTROL_REPLICATION.weld0Measurement.kasa.REQUIRED_PARTS).toBe(1200);
    expect(FP024C8_WELD0_CONTROL_REPLICATION.weld0Measurement.orta.REQUIRED_PARTS).toBe(1116);
    expect(FP024C8_WELD0_CONTROL_REPLICATION.findings.c5Weld0ReportToRequiredPartsDelta45).toBe(0);
    expect(FP024C8_WELD0_CONTROL_REPLICATION.findings.c5Weld0ReportToRequiredPartsDelta90).toBe(0);
    expect(
      FP024C8_WELD0_CONTROL_REPLICATION.findings.weld3To0EffectOn45ReportToRequiredParts
    ).toBe('PROVEN_FOR_C5_FIXTURE');
    expect(
      FP024C8_WELD0_CONTROL_REPLICATION.findings.weldCausalityReplicatedAcrossTwoFixtures
    ).toBe('PROVEN_FOR_MEASURED_KASA_CONDITIONS');
    expect(FP024C8_WELD0_CONTROL_REPLICATION.findings.ninetyReplication).toBe(
      'REPLICATED_NO_OBSERVED_EFFECT'
    );
    expect(FP024C8_WELD0_CONTROL_REPLICATION.findings.generalizedCompensationFormula).toBe(
      'UNPROVEN'
    );
    expect(FP024C8_WELD0_CONTROL_REPLICATION.discardedTodayWork1940.classification).toBe(
      'INVALID_FOR_CAUSAL_AUTHORITY'
    );
    const replicated = evaluateTwoFixtureWeldCausality({
      asddWeld3KasaReportToRequiredPartsDeltaMm: 3,
      asddWeld0KasaReportToRequiredPartsDeltaMm: 0,
      c5Weld3KasaReportToRequiredPartsDeltaMm: 3,
      c5Weld0KasaReportToRequiredPartsDeltaMm: 0,
      asddOrtaReportToRequiredPartsDeltaAtWeld3Mm: 0,
      asddOrtaReportToRequiredPartsDeltaAtWeld0Mm: 0,
      c5OrtaReportToRequiredPartsDeltaAtWeld3Mm: 0,
      c5OrtaReportToRequiredPartsDeltaAtWeld0Mm: 0,
    });
    expect(replicated.weldCausalityReplicatedAcrossTwoFixtures).toBe(
      'PROVEN_FOR_MEASURED_KASA_CONDITIONS'
    );
    expect(replicated.ninetyReplication).toBe('REPLICATED_NO_OBSERVED_EFFECT');
    expect(replicated.authorizesFormulaChange).toBe(false);
    expect(
      evaluateTwoFixtureWeldCausality({
        asddWeld3KasaReportToRequiredPartsDeltaMm: 3,
        asddWeld0KasaReportToRequiredPartsDeltaMm: 0,
        c5Weld3KasaReportToRequiredPartsDeltaMm: 3,
        c5Weld0KasaReportToRequiredPartsDeltaMm: 3,
        asddOrtaReportToRequiredPartsDeltaAtWeld3Mm: 0,
        asddOrtaReportToRequiredPartsDeltaAtWeld0Mm: 0,
        c5OrtaReportToRequiredPartsDeltaAtWeld3Mm: 0,
        c5OrtaReportToRequiredPartsDeltaAtWeld0Mm: 0,
      }).weldCausalityReplicatedAcrossTwoFixtures
    ).toBe('CROSS_FIXTURE_WELD_CAUSALITY_CONTRADICTION');
    expect(FP027_90_CONTROL_CONSERVATION_OBSERVATION.fp027RootCause).toBe('UNPROVEN');
  });

  it('reconciles CITA Design Report from the existing C.6 PDF without a formula', () => {
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.status).toBe('ACCEPTED');
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.independentReviewOfFp024c8).toBe(
      'ACCEPTED'
    );
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.doWinOpened).toBe(false);
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.newSolveCreated).toBe(false);
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.newExportCreated).toBe(false);
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.formulasModified).toBe(false);
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.authorizesFormulaChange).toBe(false);
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.licensedPdfCommitted).toBe(false);
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.designPreviewPdf.sha256).toBe(
      '2c2e558cba2016b2924266ba63768cd3ffe9e8bc2bba8d9b2880770d32c9e0f7'
    );
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.citaDesignPreviewRows).toEqual([
      {
        profile: 'Deceuninck-CITA-20',
        pieceName: "Deceuninck-Standart Cam Çitası",
        roleIfShown: null,
        quantity: 4,
        leftAngleDeg: 45,
        rightAngleDeg: 45,
        designReportLengthMm: 537,
      },
      {
        profile: 'Deceuninck-CITA-20',
        pieceName: "Deceuninck-Standart Cam Çitası",
        roleIfShown: null,
        quantity: 4,
        leftAngleDeg: 45,
        rightAngleDeg: 45,
        designReportLengthMm: 1116,
      },
    ]);
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.cita.designReport).toEqual({
      horizontal: 537,
      vertical: 1116,
    });
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.cita.weld3RequiredParts).toEqual({
      horizontal: 540,
      vertical: 1119,
    });
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.cita.weld0RequiredParts).toEqual({
      horizontal: 537,
      vertical: 1116,
    });
    expect(
      FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.findings.weld3To0EffectOnCitaReportToRequiredParts
    ).toBe('PROVEN_FOR_C5_FIXTURE');
    expect(
      FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.findings.weldCausalityProfileCoverage
    ).toBe('REPLICATED_ON_KASA_AND_CITA_45_DEGREE_PROFILES');
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.findings.kanatWeldCausality).toBe(
      'PROVEN_FOR_ASDD_FIXTURE'
    );
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.kanat.newEvidenceManufactured).toBe(
      false
    );
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.findings.universalFortyFiveRule).toBe(
      'UNPROVEN'
    );
    expect(
      FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.findings.generalizedCompensationFormula
    ).toBe('UNPROVEN');
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.discardedTodayWork1940.classification).toBe(
      'INVALID_FOR_CAUSAL_AUTHORITY'
    );
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.fp027.rootCause).toBe('UNPROVEN');
    expect(FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE.physicalLengthScore).toBe('6.0/10');
    const proven = evaluateCitaWeldCausalityFromExistingArtifacts({
      citaIdentifiedUnambiguously: true,
      designReportHorizontalMm: 537,
      designReportVerticalMm: 1116,
      weld3RequiredPartsHorizontalMm: 540,
      weld3RequiredPartsVerticalMm: 1119,
      weld0RequiredPartsHorizontalMm: 537,
      weld0RequiredPartsVerticalMm: 1116,
    });
    expect(proven.citaDesignReportLayer).toBe('PROVEN');
    expect(proven.weld3To0EffectOnCitaReportToRequiredParts).toBe('PROVEN_FOR_C5_FIXTURE');
    expect(proven.weldCausalityProfileCoverage).toBe(
      'REPLICATED_ON_KASA_AND_CITA_45_DEGREE_PROFILES'
    );
    expect(proven.authorizesFormulaChange).toBe(false);
    expect(
      evaluateCitaWeldCausalityFromExistingArtifacts({
        citaIdentifiedUnambiguously: false,
        designReportHorizontalMm: 537,
        designReportVerticalMm: 1116,
        weld3RequiredPartsHorizontalMm: 540,
        weld3RequiredPartsVerticalMm: 1119,
        weld0RequiredPartsHorizontalMm: 537,
        weld0RequiredPartsVerticalMm: 1116,
      }).citaDesignReportLayer
    ).toBe('UNPROVEN');
  });

  it('measures Weld=2 Required Parts on both fixtures without encoding a formula', () => {
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.status).toBe('ACCEPTED');
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.independentReviewOfFp024c9).toBe(
      'ACCEPTED'
    );
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.newSolveCreated).toBe(false);
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.stockUnchanged).toBe(true);
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.authorizesFormulaChange).toBe(false);
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.weldingWasteRestoredToZero).toBe(true);
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.precheck.weldingWasteMm).toBe(0);
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.weld2Persistence.weldingWasteMm).toBe(2);
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.asdd.kasa.requiredParts.short).toBe(1002);
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.asdd.kanat.requiredParts.short).toBe(453);
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.asdd.orta.requiredParts).toBe(1416);
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.c5.kasa.requiredParts).toBe(1202);
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.c5.cita.requiredParts.short).toBe(539);
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.c5.orta.requiredParts).toBe(1116);
    expect(FP024C10_THREE_POINT_TABLE).toHaveLength(9);
    expect(
      FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.findings.intermediateValueResponse
    ).toBe('LINEAR_AT_MEASURED_0_2_3_POINTS');
    expect(
      FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.findings.directWeldTermLinearity
    ).toBe('PROVEN_FOR_MEASURED_0_2_3_DECEUNINCK70_45_CONDITIONS');
    expect(
      FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.findings.generalizedCompensationFormula
    ).toBe('UNPROVEN');
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.discardedTodayWork1940.classification).toBe(
      'INVALID_FOR_CAUSAL_AUTHORITY'
    );
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.fp027.rootCause).toBe('UNPROVEN');
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.lastOptimizationRunIdUnchanged).toBe(13);
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.physicalLengthScore).toBe('6.0/10');
    expect(classifyWeldThreePointDeltas({ weld0DeltaMm: 0, weld2DeltaMm: 2, weld3DeltaMm: 3 })).toBe(
      'LINEAR_AT_MEASURED_0_2_3_POINTS'
    );
    expect(classifyWeldThreePointDeltas({ weld0DeltaMm: 0, weld2DeltaMm: 3, weld3DeltaMm: 3 })).toBe(
      'NONLINEAR_OR_THRESHOLD_RESPONSE_OBSERVED'
    );
    expect(classifyWeldThreePointDeltas({ weld0DeltaMm: 0, weld2DeltaMm: 0, weld3DeltaMm: 3 })).toBe(
      'NONLINEAR_OR_THRESHOLD_RESPONSE_OBSERVED'
    );
    const linear = evaluateWeldLinearityAcrossRows(FP024C10_THREE_POINT_TABLE);
    expect(linear.intermediateValueResponse).toBe('LINEAR_AT_MEASURED_0_2_3_POINTS');
    expect(linear.twoFixtureReplication).toBe('REPLICATED_ACROSS_TWO_FIXTURES');
    expect(linear.ninetyStatus).toBe(
      'WELD2_90_NO_OBSERVED_EFFECT_REPLICATED_ACROSS_TWO_FIXTURES'
    );
    expect(linear.authorizesFormulaChange).toBe(false);
  });

  it('authorizes only a fail-closed parity-adapter weld-rule review, without implementing it', () => {
    expect(FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.status).toBe('ACCEPTED');
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.independentReviewOfFp024c10).toBe('ACCEPTED');
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.repositoryAuditOnly).toBe(true);
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.formulasModified).toBe(false);
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.authorizesFormulaChange).toBe(false);
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.authorizesProductionEngineChange).toBe(false);
    expect(
      FP024C11_FORMULA_SCOPE_AUTHORIZATION.authorizesParityAdapterImplementationThisCheckpoint
    ).toBe(false);
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.implementationClassification).toBe(
      'PARITY_ADAPTER_ONLY_SAFE'
    );
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.boundedDeceuninck70FortyFiveWeldRule).toBe(
      'ELIGIBLE_FOR_IMPLEMENTATION_REVIEW'
    );
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.generalizedManufacturingFormula).toBe('UNPROVEN');
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.mixedAngleStatus).toBe('UNPROVEN');
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.operationalWeldingWasteMm).toBe(0);
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.fp027.rootCause).toBe('UNPROVEN');
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.fp027.combinedWithC11).toBe(false);
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.discardedTodayWork1940.classification).toBe(
      'INVALID_FOR_CAUSAL_AUTHORITY'
    );
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.physicalLengthScore).toBe('6.0/10');
    expect(FP024C11_FORMULA_SCOPE_AUTHORIZATION.boundedImplementationContract.implementedThisCheckpoint).toBe(
      false
    );
    const authorized = evaluateFormulaScopeAuthorization();
    expect(authorized.classification).toBe('PARITY_ADAPTER_ONLY_SAFE');
    expect(authorized.authorizesFormulaChange).toBe(false);
    expect(authorized.authorizesProductionEngineChange).toBe(false);
    expect(authorized.mixedAngleStatus).toBe('UNPROVEN');
    expect(
      evaluateFormulaScopeAuthorization({ c6ThroughC10Accepted: false }).classification
    ).toBe('UNPROVEN');
    expect(
      evaluateFormulaScopeAuthorization({
        productionHasDualEndAnglePair: true,
        productionHasDesignReportToRequiredPartsBoundary: true,
        productionHasCanonicalDeceuninck70Identity: true,
        unsupportedProfilesCannotInheritSilentlyInProduction: true,
      }).classification
    ).toBe('BOUNDED_IMPLEMENTATION_SAFE');
    expect(
      evaluateFormulaScopeAuthorization({
        parityAdapterHasWeldingWasteConsumer: false,
        parityAdapterHasDualEndAngles: false,
        parityAdapterHasDeceuninckProfileCodes: false,
        parityAdapterCanFailClosedOnMixedAngles: false,
      }).classification
    ).toBe('PRODUCTION_IMPLEMENTATION_UNSAFE');
  });

  it('refuses a repeatability claim from Run A or Run A + Run B', () => {
    const runs = controlledTriplicate();
    expect(classifyControlledRepeatability({ runs: runs.slice(0, 1) }).verdict).toBe(
      'CONTROLLED_REPEATABILITY_IN_PROGRESS'
    );
    const two = classifyControlledRepeatability({ runs: runs.slice(0, 2) });
    expect(two.verdict).toBe('CONTROLLED_REPEATABILITY_IN_PROGRESS');
    expect(two.note).toContain('No repeatability claim from A or A+B');
  });

  it('separates measured-input repeatability from full determinism while offcuts stay UNPROVEN', () => {
    const result = classifyControlledRepeatability({ runs: controlledTriplicate() });
    expect(result.verdict).toBe('MEASURED_INPUT_REPEATABILITY_PROVEN');
    expect(result.measuredInputEquivalence).toBe('IDENTICAL');
    expect(result.completeInputEquivalence).toBe('UNPROVEN');
    expect(result.fullDeterminismClaimAllowed).toBe(false);
    expect(result.uniqueTopologyCount).toBe(1);
    expect(result.note).toContain('NOT full determinism proven');
    expect(result.matrix.map((entry) => entry.pair)).toEqual([
      'FP024C3_RUN_A ↔ FP024C3_RUN_B',
      'FP024C3_RUN_A ↔ FP024C3_RUN_C',
      'FP024C3_RUN_B ↔ FP024C3_RUN_C',
    ]);
    expect(result.matrix.every((entry) => entry.axes.offcutRemnant === 'UNPROVEN')).toBe(true);
    expect(FP024C3_MEASURED_EQUIVALENCE_AXES).not.toContain('offcutRemnant');
    expect(FP024C3_EQUIVALENCE_AXES).toContain('offcutRemnant');
  });

  it('does not overclaim nondeterminism when offcut evidence is missing', () => {
    const runs = controlledTriplicate([{}, {}, { bars: DOWIN_ASDD_TRIM_CUT_10_BARS }]);
    const result = classifyControlledRepeatability({ runs });
    expect(result.uniqueTopologyCount).toBe(2);
    expect(result.verdict).toBe('NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS');
    expect(result.fullDeterminismClaimAllowed).toBe(false);

    const proven = classifyControlledRepeatability({
      runs: runs.map((run) => ({ ...run, offcutRemnantEvidence: 'MEASURED' as const })),
    });
    expect(proven.completeInputEquivalence).toBe('IDENTICAL');
    expect(proven.verdict).toBe('OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING');
  });

  it('stops the experiment when stock moves or a warehouse write is invoked', () => {
    const mutated = controlledTriplicate([
      {},
      {
        observedWarehouseStock: FP024C3_FROZEN_WAREHOUSE_BASELINE.map((card) =>
          card.profileCode === 'Deceuninck-CITA-20' ? { ...card, quantity: 44 } : { ...card }
        ),
      },
      {},
    ]);
    expect(classifyControlledRepeatability({ runs: mutated }).verdict).toBe('STOCK_STATE_MUTATED');

    const written = controlledTriplicate([{ warehouseWriteActionInvoked: true }, {}, {}]);
    const verdict = classifyControlledRepeatability({ runs: written });
    expect(verdict.verdict).toBe('STOCK_STATE_MUTATED');
    expect(verdict.note).toContain('Update Stock');
  });

  it('treats an uncaptured stock check, reused screenshot, or reused result as not proven', () => {
    expect(
      classifyControlledRepeatability({
        runs: controlledTriplicate([{}, {}, { observedWarehouseStock: null }]),
      }).verdict
    ).toBe('AMBIGUOUS');

    const sharedHash = controlledTriplicate([
      { settingsScreenshotSha256: 'same-hash' },
      { settingsScreenshotSha256: 'same-hash' },
      {},
    ]);
    const shared = classifyControlledRepeatability({ runs: sharedHash });
    expect(shared.matrix[0].axes.settings).toBe('UNPROVEN');
    expect(shared.measuredInputEquivalence).toBe('UNPROVEN');
    expect(shared.verdict).toBe('AMBIGUOUS');

    expect(
      classifyControlledRepeatability({
        runs: controlledTriplicate([
          {},
          {},
          { provenance: equivalent({ solveKind: 'REOPENED_REUSED', solveDisposition: 'REUSED' }) },
        ]),
      }).verdict
    ).toBe('AMBIGUOUS');
  });

  it('reports a concrete optimizer-stock difference as HIDDEN_INPUT_DIFFERENCE', () => {
    const runs = controlledTriplicate([
      {},
      {},
      {
        provenance: equivalent({
          stockSnapshot: [
            { profileCode: 'Deceuninck-KASA-70', stockLengthMm: 6000, ordinal: 0, quantity: 13 },
          ],
        }),
      },
    ]);
    const result = classifyControlledRepeatability({ runs });
    expect(result.verdict).toBe('HIDDEN_INPUT_DIFFERENCE');
    expect(
      buildControlledEquivalenceMatrix(runs).some((entry) => entry.axes.optimizerStock === 'DIFFERENT')
    ).toBe(true);
  });

  it('stops a run whose generated fixture does not match the required signature', () => {
    const match = evaluateControlledFixtureSignature(CONTROLLED_PIECES);
    expect(match.verdict).toBe('MATCH');
    expect(
      CONTROLLED_PIECES.filter(
        (piece) => piece.category !== 'glass' && piece.category !== 'angle_compensation'
      )
    ).toHaveLength(FP024C3_EXPECTED_PIECE_COUNT);

    expect(evaluateControlledFixtureSignature([]).verdict).toBe('UNPROVEN');
    expect(evaluateControlledFixtureSignature(null).verdict).toBe('UNPROVEN');

    const forced = CONTROLLED_PIECES.map((piece) =>
      piece.category === 'mullion' ? { ...piece, expectedPackedSegmentMm: 1420 } : piece
    );
    const drift = evaluateControlledFixtureSignature(forced);
    expect(drift.verdict).toBe('GEOMETRY_OR_SYSTEM_INPUT_DIFFERENCE');
    expect(drift.reasons.join(' ')).toContain('expected packed 1416 mm, captured 1420 mm');
  });

  it('keeps the ORTA quantity-0 availability discrepancy as a V1 historical observation only', () => {
    // The anomaly is only visible while ORTA sits at 0, i.e. under baseline V1.
    const historical = observeWarehouseQtyVsOptimizerAvailability({
      warehouseStock: FP024C3_FROZEN_WAREHOUSE_BASELINE_V1,
      usedBars: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.bars,
    });
    expect(historical.observation).toBe('WAREHOUSE_QTY_VS_OPTIMIZER_AVAILABILITY_DISCREPANCY');
    expect(historical.profileCodes).toContain('Deceuninck-ORTA-KAYIT-70');

    // The manual edit removed it from the active baseline. Not retestable.
    expect(ORTA_ZERO_QTY_CONTROL_OBSERVABILITY).toBe('LOST_BY_MANUAL_STOCK_EDIT');
    const active = observeWarehouseQtyVsOptimizerAvailability({
      warehouseStock: FP024C3_FROZEN_WAREHOUSE_BASELINE_V2,
      usedBars: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.bars,
    });
    expect(active.observation).toBe('NOT_OBSERVED');
    expect(active.profileCodes).toEqual([]);

    expect(
      observeWarehouseQtyVsOptimizerAvailability({ warehouseStock: null, usedBars: null }).observation
    ).toBe('UNPROVEN');
    expect(
      observeWarehouseQtyVsOptimizerAvailability({
        warehouseStock: FP024C3_FROZEN_WAREHOUSE_BASELINE_V1.map((card) =>
          card.profileCode === 'Deceuninck-ORTA-KAYIT-70' ? { ...card, quantity: 5 } : card
        ),
        usedBars: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.bars,
      }).observation
    ).toBe('NOT_OBSERVED');
  });

  it('gates controlled-run intake on run identity, stock isolation, and fresh evidence', () => {
    const hashes = {
      generalSettingsScreenshot: 'settings-FP024C3_RUN_A',
      designPreview: 'design-a',
      assemblyLabels: 'labels-a',
      optimization: 'report-a',
      machineExport: 'dw-a',
    };
    const intakeArgs = {
      observedSettings: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.observedSettings,
      widthMm: 1000,
      heightMm: 1500,
      profileSystem: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.profileSystem,
      sourceHashes: hashes,
      mdbGenerated: true,
    };
    const runA = controlledRun('FP024C3_RUN_A');
    expect(evaluateControlledRunIntake({ run: runA, ...intakeArgs }).ok).toBe(true);

    expect(
      evaluateControlledRunIntake({ run: controlledRun('FRESH_D'), ...intakeArgs }).reasons.join(' ')
    ).toContain('runId must be one of');

    const reusedResult = evaluateControlledRunIntake({
      run: controlledRun('FP024C3_RUN_B', {
        provenance: equivalent({ optimizationResultId: 'result-FP024C3_RUN_A' }),
      }),
      priorRuns: [runA],
      ...intakeArgs,
    });
    expect(reusedResult.ok).toBe(false);
    expect(reusedResult.reasons.join(' ')).toContain('optimization result was reused');

    const reusedScreenshot = evaluateControlledRunIntake({
      run: controlledRun('FP024C3_RUN_B', {
        settingsScreenshotSha256: 'settings-FP024C3_RUN_A',
      }),
      priorRuns: [runA],
      ...intakeArgs,
    });
    expect(reusedScreenshot.ok).toBe(false);
    expect(reusedScreenshot.reasons.join(' ')).toContain('reused hash is not evidence');

    const stockMoved = evaluateControlledRunIntake({
      run: controlledRun('FP024C3_RUN_C', {
        observedWarehouseStock: FP024C3_FROZEN_WAREHOUSE_BASELINE.map((card) =>
          card.profileCode === 'Deceuninck-KANAT-70' ? { ...card, quantity: 94 } : { ...card }
        ),
      }),
      ...intakeArgs,
    });
    expect(stockMoved.ok).toBe(false);
    expect(stockMoved.reasons.join(' ')).toContain('STOCK_STATE_MUTATED');
  });

  it('does not let FP-024C.3 evidence touch manufacturing settings', () => {
    const before = resolveManufacturingSettings();
    classifyControlledRepeatability({ runs: controlledTriplicate() });
    evaluateControlledStockPostcheck([...FP024C3_FROZEN_WAREHOUSE_BASELINE]);
    evaluateControlledFixtureSignature(CONTROLLED_PIECES);
    expect(resolveManufacturingSettings()).toEqual(before);
    const source = sourceOf('src/lib/fabricator/dowinParity/optimizerStateProvenance.ts');
    expect(source).not.toContain('ManufacturingSettings');
    expect(source).not.toMatch(/packedLengthMm\s*=\s*nominalLengthMm\s*\+/);
  });
});

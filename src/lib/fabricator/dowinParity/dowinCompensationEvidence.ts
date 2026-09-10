/**
 * FP-024B/C — External compensation reconciliation (test/reference only).
 *
 * Sequence: 1A BASELINE_SETTINGS_SNAPSHOT → 1B BASELINE_REPRODUCTION_RUN
 * (same asdd 1000×1500, settings unchanged) → Tests 2–4 SINGLE_SETTING_ISOLATION
 * → BASELINE_RESET_VALIDATION (Weld=3 / Saw=4 / Trim=0 must recover 1B)
 * → FP-024C.1 OPTIMIZATION_STATE_PROVENANCE_AUDIT (one question: why
 *   identical visible geometry/settings can produce different remainder
 *   topology; compare bar-assignment signatures, not utilization)
 * → Test 5 CONTROL_FIXTURE. Isolation is not authorized until 1B reproduces.
 * CONTROL_FIXTURE is not authorized until reset recovers. Do not encode
 * packed = nominal + 3, do not absorb a hidden +7 mm, and do not feed these
 * values into runtime manufacturing.
 *
 * @see docs/audits/FP-024C-PHYSICAL-FORMULA-PARITY_2026-09-09.md
 */

import { kerfLossOnBarMm } from '@/lib/fabricator/barPackAccounting';
import {
  DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
  type ExternalBarPattern,
} from '@/lib/fabricator/barPackExternalReconciliation';
import {
  DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION,
  DOWIN_ASDD_JOB,
  DOWIN_ASDD_SOURCE_HASHES,
  DOWIN_PARITY_TOLERANCE_MM,
  type DowinJobObservedSettings,
  type DowinPhysicalLengthGoldenRow,
} from '@/lib/fabricator/golden/dowinPhysicalLengthFixture';
import {
  FP024C1_AUDIT_QUESTION,
  FP024C1_DECISIVE_EXPERIMENT,
  FP024C1_PROVENANCE_AUDIT_CHECKLIST,
  asddEquivalentInputProvenance,
  assignmentSignaturesEqual,
  attachOptimizerInputFingerprints,
  classifyOptimizationStateProvenance,
  compareOptimizerInputFingerprints,
  freshOptimizerProvenance,
  identifyAssignmentTopology,
  isOptimizerProvenanceComplete,
  missingOptimizerProvenanceFields,
  overallUtilizationPercent,
  solveDispositionOf,
  topologyFingerprint,
  topologySignatureFromBars,
  type AsddAssignmentTopology,
  type BarAssignmentSignature,
  type OptimizationStateProvenanceVerdict,
  type OptimizerInputEquivalence,
  type OptimizerRunProvenance,
  type OptimizerSolveKind,
  type ProvenanceAuditVerdict,
} from '@/lib/fabricator/dowinParity/optimizerStateProvenance';

export {
  FP024C1_AUDIT_QUESTION,
  FP024C1_DECISIVE_EXPERIMENT,
  FP024C1_PROVENANCE_AUDIT_CHECKLIST,
  asddEquivalentInputProvenance,
  assignmentSignaturesEqual,
  attachOptimizerInputFingerprints,
  classifyOptimizationStateProvenance,
  compareOptimizerInputFingerprints,
  freshOptimizerProvenance,
  isOptimizerProvenanceComplete,
  missingOptimizerProvenanceFields,
  overallUtilizationPercent,
  solveDispositionOf,
  topologyFingerprint,
  topologySignatureFromBars,
  type AsddAssignmentTopology,
  type BarAssignmentSignature,
  type OptimizationStateProvenanceVerdict,
  type OptimizerInputEquivalence,
  type OptimizerRunProvenance,
  type OptimizerSolveKind,
  type ProvenanceAuditVerdict,
};

export type CalibrationVariable =
  | 'baseline'
  | 'baselineReproduction'
  | 'baselineReset'
  | 'weldingWaste'
  | 'sawThickness'
  | 'trimCut'
  | 'optimizationStateProvenance'
  | 'ninetyDegreeControl';

/** How the run is allowed to differ from the asdd parent. */
export type CalibrationRunKind =
  | 'BASELINE_SETTINGS_SNAPSHOT'
  | 'BASELINE_REPRODUCTION_RUN'
  | 'BASELINE_RESET_VALIDATION'
  | 'SINGLE_SETTING_ISOLATION'
  | 'OPTIMIZATION_STATE_PROVENANCE_AUDIT'
  | 'CONTROL_FIXTURE';

export type ReproductionVerdict = 'NOT MEASURED' | 'REPRODUCED' | 'REPRODUCTION_FAILED';

export const REQUIRED_ISOLATION_MACHINE_ID = 'DC-600';

export const SINGLE_SETTING_ISOLATION_VARIABLES = [
  'weldingWaste',
  'sawThickness',
  'trimCut',
] as const satisfies readonly CalibrationVariable[];

export function calibrationRunKind(variable: CalibrationVariable): CalibrationRunKind {
  if (variable === 'baseline') return 'BASELINE_SETTINGS_SNAPSHOT';
  if (variable === 'baselineReproduction') return 'BASELINE_REPRODUCTION_RUN';
  if (variable === 'baselineReset') return 'BASELINE_RESET_VALIDATION';
  if (variable === 'optimizationStateProvenance') return 'OPTIMIZATION_STATE_PROVENANCE_AUDIT';
  if (variable === 'ninetyDegreeControl') return 'CONTROL_FIXTURE';
  return 'SINGLE_SETTING_ISOLATION';
}

/**
 * What each evidence type is allowed to prove. Existing PDFs/MDB are
 * observed outputs only — never causal formulas.
 */
export const EVIDENCE_HIERARCHY = [
  {
    kind: 'BASELINE_SETTINGS_SNAPSHOT' as const,
    canProve: 'Current live General Settings. Not proof they were active at the original 18:14 export.',
  },
  {
    kind: 'BASELINE_REPRODUCTION_RUN' as const,
    canProve:
      'Whether the same asdd design with the currently captured settings reproduces the original length layers and bar accounting',
  },
  {
    kind: 'BASELINE_RESET_VALIDATION' as const,
    canProve:
      'Whether Weld=3 / Saw=4 / Trim=0 still recovers the 1B remainder and machine-length signature after isolation Tests 2–4',
  },
  {
    kind: 'OPTIMIZATION_STATE_PROVENANCE_AUDIT' as const,
    canProve:
      'Why identical visible geometry/settings can produce different optimization remainder topology. Captures optimizer input and selected-result provenance. Not a manufacturing-setting isolation.',
  },
  {
    kind: 'SINGLE_SETTING_ISOLATION' as const,
    canProve:
      'Whether one setting causes a measurable delta in nominal / packed / machine / remainder layers',
  },
  {
    kind: 'CONTROL_FIXTURE' as const,
    canProve: 'Whether angle/geometry conditions behave differently under unchanged settings',
  },
  {
    kind: 'EXISTING_PDF_MDB' as const,
    canProve: 'Observed outputs only; not causal formulas',
  },
] as const;

/** Already-known asdd export identifiers. Live settings SHA-256 is transcribed; 1B still pending. */
export const DOWIN_ASDD_KNOWN_EXPORT_IDENTIFIERS = {
  fixtureId: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.id,
  orderNo: DOWIN_ASDD_JOB.orderNo,
  designName: DOWIN_ASDD_JOB.designName,
  profileSystem: DOWIN_ASDD_JOB.profileSystem,
  widthMm: DOWIN_ASDD_JOB.overallWidthMm,
  heightMm: DOWIN_ASDD_JOB.overallHeightMm,
  machineId: REQUIRED_ISOLATION_MACHINE_ID,
  files: DOWIN_ASDD_SOURCE_HASHES,
  generalSettingsScreenshotSha256:
    DOWIN_ASDD_SOURCE_HASHES['dowin-general-settings.png'],
} as const;

export const BASELINE_SNAPSHOT_REQUIRED_FIELDS = [
  'weldingWasteMm',
  'sawThicknessMm',
  'trimCutMm',
  'machineId',
] as const satisfies readonly (keyof DowinJobObservedSettings)[];

export function isBaselineSettingsSnapshotClassified(
  settings: DowinJobObservedSettings
): boolean {
  return (
    settings.weldingWasteMm != null &&
    settings.sawThicknessMm != null &&
    settings.trimCutMm != null &&
    settings.machineId === REQUIRED_ISOLATION_MACHINE_ID
  );
}

export function classifyBaselineSettingsSnapshot(settings: DowinJobObservedSettings): {
  interpretation: CompensationInterpretation;
  missingFields: (keyof DowinJobObservedSettings)[];
  note: string;
} {
  const missingFields = BASELINE_SNAPSHOT_REQUIRED_FIELDS.filter((key) =>
    key === 'machineId' ? settings.machineId !== REQUIRED_ISOLATION_MACHINE_ID : settings[key] == null
  );
  if (missingFields.length > 0) {
    return {
      interpretation: 'NOT MEASURED',
      missingFields,
      note: 'asdd lengths and PDFs/MDB are observed only. General Settings screenshot is not transcribed. BASELINE_REPRODUCTION_RUN and Tests 2–4 stay closed.',
    };
  }
  return {
    interpretation: 'AMBIGUOUS',
    missingFields: [],
    note: 'Current live General Settings transcribed. Not historical proof for the original 18:14 export. Contemporaneous reproduction is a separate BASELINE_REPRODUCTION_RUN.',
  };
}

export interface LengthLayerSignature {
  category: string;
  nominalMm: number | null;
  packedMm: number | null;
  machineMm: number | null;
}

/** Required contemporaneous reproduction of the original asdd 18:14 length pairs. */
export const ASDD_REQUIRED_REPRODUCTION_PAIRS = [
  { category: 'sash_horizontal', nominalMm: 451, packedMm: 454, machineMm: 454 },
  { category: 'sash_vertical', nominalMm: 1430, packedMm: 1433, machineMm: 1433 },
  { category: 'frame_horizontal', nominalMm: 1000, packedMm: 1003, machineMm: 1003 },
  { category: 'frame_vertical', nominalMm: 1500, packedMm: 1503, machineMm: 1503 },
] as const;

export function uniqueLayerSignatures(
  pieces: readonly DowinPhysicalLengthGoldenRow[]
): LengthLayerSignature[] {
  const keys = new Set<string>();
  const rows: LengthLayerSignature[] = [];
  for (const piece of pieces) {
    if (piece.category === 'glass' || piece.category === 'angle_compensation') continue;
    const sig: LengthLayerSignature = {
      category: piece.category,
      nominalMm: piece.expectedNominalLengthMm,
      packedMm: piece.expectedPackedSegmentMm,
      machineMm: piece.expectedMachineLengthMm,
    };
    const key = `${sig.category}:${sig.nominalMm}:${sig.packedMm}:${sig.machineMm}`;
    if (!keys.has(key)) {
      keys.add(key);
      rows.push(sig);
    }
  }
  return rows.sort((a, b) => a.category.localeCompare(b.category) || (a.nominalMm ?? 0) - (b.nominalMm ?? 0));
}

export function signatureKey(sig: LengthLayerSignature): string {
  return `${sig.category}:${sig.nominalMm}:${sig.packedMm}:${sig.machineMm}`;
}

function withinParityToleranceMm(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return a === b;
  return Math.abs(a - b) <= DOWIN_PARITY_TOLERANCE_MM;
}

function requiredPairReproduced(
  pair: Pick<LengthLayerSignature, 'category' | 'nominalMm' | 'packedMm' | 'machineMm'>,
  signatures: readonly LengthLayerSignature[]
): boolean {
  return signatures.some(
    (sig) =>
      sig.category === pair.category &&
      withinParityToleranceMm(sig.nominalMm, pair.nominalMm) &&
      withinParityToleranceMm(sig.packedMm, pair.packedMm) &&
      withinParityToleranceMm(sig.machineMm, pair.machineMm)
  );
}

export function evaluateBaselineReproduction(
  original: { pieces: readonly DowinPhysicalLengthGoldenRow[]; bars: readonly ExternalBarPattern[] },
  candidate: { pieces: readonly DowinPhysicalLengthGoldenRow[]; bars: readonly ExternalBarPattern[] }
): {
  verdict: ReproductionVerdict;
  missingPairs: string[];
  remainderMismatches: string[];
} {
  const signatures = uniqueLayerSignatures(candidate.pieces);
  const missingPairs = ASDD_REQUIRED_REPRODUCTION_PAIRS.filter(
    (pair) => !requiredPairReproduced(pair, signatures)
  ).map(signatureKey);

  const remainderMismatches: string[] = [];
  const unused = [...candidate.bars];
  for (const bar of original.bars) {
    let idx = unused.findIndex((b) => b.id === bar.id);
    if (idx < 0) {
      idx = unused.findIndex(
        (b) =>
          b.profileCode === bar.profileCode &&
          b.stockLengthMm === bar.stockLengthMm &&
          withinParityToleranceMm(b.remainingMm, bar.remainingMm)
      );
    }
    if (idx < 0) {
      remainderMismatches.push(`${bar.profileCode} ${bar.stockLengthMm} remaining ${bar.remainingMm} missing`);
      continue;
    }
    const match = unused.splice(idx, 1)[0];
    if (!withinParityToleranceMm(match.remainingMm, bar.remainingMm)) {
      remainderMismatches.push(
        `${bar.profileCode} remaining ${match.remainingMm} ≠ ${bar.remainingMm}`
      );
    }
  }

  return {
    verdict:
      missingPairs.length === 0 && remainderMismatches.length === 0
        ? 'REPRODUCED'
        : 'REPRODUCTION_FAILED',
    missingPairs,
    remainderMismatches,
  };
}

export type CalibrationRunStatus = 'MEASURED' | 'PENDING_OPERATOR_RUN';

export type CompensationInterpretation =
  | 'PROVEN EFFECT'
  | 'PROVEN CONSISTENT EFFECT'
  | 'NO OBSERVED EFFECT'
  | 'CONDITIONAL'
  | 'AMBIGUOUS'
  | 'DOWNSTREAM OPTIMIZER RESPONSE'
  | 'UNPROVEN'
  | 'UNPROVEN GENERALIZATION'
  | 'NOT MEASURED';

export type CompensationTermAuthority = 'PROVEN' | 'SUPPORTED' | 'UNPROVEN';

export const WELDABLE_45_CATEGORIES = [
  'sash_horizontal',
  'sash_vertical',
  'frame_horizontal',
  'frame_vertical',
] as const;

export interface IsolationFinding {
  id: string;
  finding: string;
  classification: CompensationInterpretation;
  note: string;
}

export const KASA_KANAT_PROFILE_CODES = ['Deceuninck-KASA-70', 'Deceuninck-KANAT-70'] as const;
export const KASA_PROFILE_CODE = 'Deceuninck-KASA-70';
export const KANAT_PROFILE_CODE = 'Deceuninck-KANAT-70';
export const ORTA_PROFILE_CODE = 'Deceuninck-ORTA-KAYIT-70';
export const CITA_PROFILE_CODE = 'Deceuninck-CITA-20';

export type ResidualCandidateStatus = 'OBSERVED' | 'HYPOTHESIS' | 'UNKNOWN_THIS_RUN';

const MM = 10;

function round1(n: number): number {
  return Math.round(n * MM) / MM;
}

function subtractMm(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return round1(a - b);
}

export function emptyObservedSettings(
  machineId: string | null = null
): DowinJobObservedSettings {
  return {
    sawThicknessMm: null,
    weldingWasteMm: null,
    sashOffsetMm: null,
    trimCutMm: null,
    remnantThresholdMm: null,
    glazingClearanceMm: null,
    robotSafetyLengthMm: null,
    profileWasteMarginPercent: null,
    compLessThan90LeftMm: null,
    compLessThan90RightMm: null,
    compGreaterThan90LeftMm: null,
    compGreaterThan90RightMm: null,
    machineId,
  };
}

export interface ChangedSettingRecord {
  field: keyof DowinJobObservedSettings;
  oldValue: string | number | null;
  newValue: string | number | null;
}

export interface IntendedIsolation {
  field: keyof DowinJobObservedSettings | null;
  /** Operator instruction only. Not a measured this-run value. */
  instructedToMm: number | null;
  note: string;
}

export interface PieceLayerDeltas {
  pieceId: string;
  category: DowinPhysicalLengthGoldenRow['category'];
  leftAngleDeg: number | null;
  rightAngleDeg: number | null;
  nominalMm: number | null;
  packedMm: number | null;
  machineMm: number | null;
  packedMinusNominalMm: number | null;
  machineMinusNominalMm: number | null;
  machineMinusPackedMm: number | null;
}

export function computePieceLayerDeltas(
  row: Pick<
    DowinPhysicalLengthGoldenRow,
    | 'pieceId'
    | 'category'
    | 'leftAngleDeg'
    | 'rightAngleDeg'
    | 'expectedNominalLengthMm'
    | 'expectedPackedSegmentMm'
    | 'expectedMachineLengthMm'
  >
): PieceLayerDeltas {
  return {
    pieceId: row.pieceId,
    category: row.category,
    leftAngleDeg: row.leftAngleDeg,
    rightAngleDeg: row.rightAngleDeg,
    nominalMm: row.expectedNominalLengthMm,
    packedMm: row.expectedPackedSegmentMm,
    machineMm: row.expectedMachineLengthMm,
    packedMinusNominalMm: subtractMm(row.expectedPackedSegmentMm, row.expectedNominalLengthMm),
    machineMinusNominalMm: subtractMm(row.expectedMachineLengthMm, row.expectedNominalLengthMm),
    machineMinusPackedMm: subtractMm(row.expectedMachineLengthMm, row.expectedPackedSegmentMm),
  };
}

export interface ResidualCandidate {
  termId:
    | 'sumNominalMm'
    | 'sumPackedMm'
    | 'sumMachineMm'
    | 'stockMinusRemainingMm'
    | 'extraAfterPackedLabelsMm'
    | 'canonicalKerfIfSawThicknessKnown'
    | 'canonicalKerfIfNamedParity4Mm'
    | 'trimIfThisRunKnown'
    | 'weldingAllowance'
    | 'angleCompensation'
    | 'unexplainedAfterPackedAndNamedParityKerf';
  mm: number | null;
  status: ResidualCandidateStatus;
  note: string;
}

export interface BarResidualAttribution {
  patternId: string;
  profileCode: string;
  stockLengthMm: number;
  reportedRemainingMm: number;
  pieceCount: number;
  candidates: ResidualCandidate[];
  externalBarParity: 'RECONCILED' | 'CONDITIONAL' | 'NOT MEASURED';
}

function sumOrNull(values: Array<number | null | undefined>): number | null {
  if (values.some((v) => v == null)) return null;
  return round1(values.reduce((s, n) => s + (n as number), 0));
}

export function attributeBarResidual(
  pattern: ExternalBarPattern,
  options: {
    nominalMm: Array<number | null>;
    machineMm: Array<number | null>;
    thisRunSawThicknessMm: number | null;
    thisRunTrimCutMm: number | null;
  }
): BarResidualAttribution {
  const sumPackedMm = round1(pattern.packedSegmentMm.reduce((s, n) => s + n, 0));
  const sumNominalMm = sumOrNull(options.nominalMm);
  const sumMachineMm = sumOrNull(options.machineMm);
  const stockMinusRemainingMm = round1(pattern.stockLengthMm - pattern.remainingMm);
  const extraAfterPackedLabelsMm = round1(
    pattern.stockLengthMm - pattern.remainingMm - sumPackedMm
  );
  const pieceCount = pattern.packedSegmentMm.length;
  const namedParityKerfMm = kerfLossOnBarMm(pieceCount, 4);
  const knownKerfMm =
    options.thisRunSawThicknessMm == null
      ? null
      : kerfLossOnBarMm(pieceCount, options.thisRunSawThicknessMm);
  const unexplainedAfterHypothesis = round1(extraAfterPackedLabelsMm - namedParityKerfMm);

  const candidates: ResidualCandidate[] = [
    {
      termId: 'sumNominalMm',
      mm: sumNominalMm,
      status: sumNominalMm == null ? 'UNKNOWN_THIS_RUN' : 'OBSERVED',
      note: 'Σ Design Preview / assembly millimetres for this pattern, when mapped.',
    },
    {
      termId: 'sumPackedMm',
      mm: sumPackedMm,
      status: 'OBSERVED',
      note: 'Σ optimization bar-graphic labels.',
    },
    {
      termId: 'sumMachineMm',
      mm: sumMachineMm,
      status: sumMachineMm == null ? 'UNKNOWN_THIS_RUN' : 'OBSERVED',
      note: 'Σ MDB LENGTH when every packed segment has a machine value.',
    },
    {
      termId: 'stockMinusRemainingMm',
      mm: stockMinusRemainingMm,
      status: 'OBSERVED',
      note: 'stock − DoWin reported remaining.',
    },
    {
      termId: 'extraAfterPackedLabelsMm',
      mm: extraAfterPackedLabelsMm,
      status: 'OBSERVED',
      note: 'stock − remaining − Σ packed. Not absorbed into a hidden constant.',
    },
    {
      termId: 'canonicalKerfIfSawThicknessKnown',
      mm: knownKerfMm,
      status: knownKerfMm == null ? 'UNKNOWN_THIS_RUN' : 'OBSERVED',
      note: 'N × this-run Saw Thickness. Null until that setting is transcribed.',
    },
    {
      termId: 'canonicalKerfIfNamedParity4Mm',
      mm: namedParityKerfMm,
      status: 'HYPOTHESIS',
      note: 'N × 4 mm from the named yilmazcad-parity profile — not this-run Settings.',
    },
    {
      termId: 'trimIfThisRunKnown',
      mm: options.thisRunTrimCutMm,
      status: options.thisRunTrimCutMm == null ? 'UNKNOWN_THIS_RUN' : 'OBSERVED',
      note: 'This-run Trim Cut. Candidate for leftover after packed labels; not encoded as +7.',
    },
    {
      termId: 'weldingAllowance',
      mm: null,
      status: 'UNKNOWN_THIS_RUN',
      note: 'Not subtracted. Packed labels may already include weld; isolating Welding Waste is Test 2.',
    },
    {
      termId: 'angleCompensation',
      mm: null,
      status: 'UNKNOWN_THIS_RUN',
      note: 'This job only exercises 45°/90°. Non-square compensation is not measured.',
    },
    {
      termId: 'unexplainedAfterPackedAndNamedParityKerf',
      mm: unexplainedAfterHypothesis,
      status: 'HYPOTHESIS',
      note: 'extraAfterPackedLabels − (N×4). Surfaces residual; never a production constant.',
    },
  ];

  return {
    patternId: pattern.id,
    profileCode: pattern.profileCode,
    stockLengthMm: pattern.stockLengthMm,
    reportedRemainingMm: pattern.remainingMm,
    pieceCount,
    candidates,
    externalBarParity: unexplainedAfterHypothesis === 0 ? 'RECONCILED' : 'CONDITIONAL',
  };
}

export interface DowinMdbTable1EvidenceRow {
  STOCK_CODE: string;
  LENGTH: number;
  LEFT_ANGLE: number;
  RIGHT_ANGLE: number;
  FRAME_X: number;
  FRAME_Y: number;
  EXPLANATION2: string;
}

export interface DowinMdbTable1Evidence {
  tableName: 'Table1';
  sourceFile: string;
  sha256: string;
  rawFieldNames: readonly (keyof DowinMdbTable1EvidenceRow)[];
  note: string;
  rows: DowinMdbTable1EvidenceRow[];
}

export const DOWIN_ASDD_MDB_TABLE1_EVIDENCE: DowinMdbTable1Evidence = {
  tableName: 'Table1',
  sourceFile: 'asdasd_2026.09.09_18.15.mdb',
  sha256: '6d5932947327db0272e5de92de4d47e4320ecb1aeadbc6a268f2bbd383a3f82d',
  rawFieldNames: [
    'STOCK_CODE',
    'LENGTH',
    'LEFT_ANGLE',
    'RIGHT_ANGLE',
    'FRAME_X',
    'FRAME_Y',
    'EXPLANATION2',
  ],
  note: 'Ordinary readable Table1 columns transcribed from the licensed DC-600 export. Binary MDB is not in the repo. Beads/glass are absent.',
  rows: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows
    .filter((r) => r.expectedMachineLengthMm != null)
    .map((r) => ({
      STOCK_CODE: r.profileCode,
      LENGTH: r.expectedMachineLengthMm as number,
      LEFT_ANGLE: r.leftAngleDeg ?? 0,
      RIGHT_ANGLE: r.rightAngleDeg ?? 0,
      FRAME_X: 1000,
      FRAME_Y: 1500,
      EXPLANATION2: r.externalAssemblyLabel,
    })),
};

export interface CompensationMatrixRow {
  fixtureId: string;
  runKind: CalibrationRunKind;
  variableChanged: CalibrationVariable;
  status: CalibrationRunStatus;
  nominalDeltaMm: number | null;
  packedDeltaMm: number | null;
  packedMinusNominalValuesMm: number[];
  machineDeltaMm: number | null;
  remainderDeltaMm: number | null;
  interpretation: CompensationInterpretation;
  note: string;
}

export interface DowinCalibrationRun {
  fixtureId: string;
  parentFixtureId: string | null;
  runKind: CalibrationRunKind;
  isolationVariable: CalibrationVariable;
  status: CalibrationRunStatus;
  designName: string;
  profileSystem: string;
  widthMm: number;
  heightMm: number;
  machineId: string | null;
  observedSettings: DowinJobObservedSettings;
  intendedIsolation: IntendedIsolation | null;
  changedSetting: ChangedSettingRecord | null;
  pieces: DowinPhysicalLengthGoldenRow[];
  bars: readonly ExternalBarPattern[];
  provenance: string;
  reproductionVerdict: ReproductionVerdict | null;
  lengthLayerVerdict?: ReproductionVerdict | null;
  topologyVerdict?: ReproductionVerdict | null;
  optimizerProvenance?: OptimizerRunProvenance | null;
}

function pendingTemplate(
  fixtureId: string,
  isolationVariable: Exclude<CalibrationVariable, 'baseline'>,
  intendedIsolation: IntendedIsolation,
  provenance: string
): DowinCalibrationRun {
  const runKind = calibrationRunKind(isolationVariable);
  return {
    fixtureId,
    parentFixtureId:
      runKind === 'BASELINE_RESET_VALIDATION' || runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT'
        ? 'BASELINE_REPRODUCTION_RUN'
        : DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.id,
    runKind,
    isolationVariable,
    status: 'PENDING_OPERATOR_RUN',
    designName:
      runKind === 'CONTROL_FIXTURE'
        ? 'pending-90-control'
        : runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT'
          ? 'pending-fresh-state-clone'
          : 'asdd',
    profileSystem: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.profileSystem,
    widthMm: runKind === 'CONTROL_FIXTURE' ? 0 : 1000,
    heightMm: runKind === 'CONTROL_FIXTURE' ? 0 : 1500,
    machineId: REQUIRED_ISOLATION_MACHINE_ID,
    observedSettings: emptyObservedSettings(null),
    intendedIsolation,
    changedSetting: null,
    pieces: [],
    bars: [],
    provenance,
    reproductionVerdict:
      runKind === 'BASELINE_REPRODUCTION_RUN' ||
      runKind === 'BASELINE_RESET_VALIDATION' ||
      runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT'
        ? 'NOT MEASURED'
        : null,
    optimizerProvenance: runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT' ? null : undefined,
  };
}

export const DOWIN_ASDD_BASELINE_RUN: DowinCalibrationRun = {
  fixtureId: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.id,
  parentFixtureId: null,
  runKind: 'BASELINE_SETTINGS_SNAPSHOT',
  isolationVariable: 'baseline',
  status: 'MEASURED',
  designName: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.designName,
  profileSystem: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.profileSystem,
  widthMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallWidthMm,
  heightMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallHeightMm,
  machineId: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.jobSettings.machineId,
  observedSettings: { ...DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.jobSettings },
  intendedIsolation: null,
  changedSetting: null,
  pieces: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows,
  bars: DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
  provenance:
    'Licensed asdd PDFs + DC-600 Table1 millimetres. General Settings transcribed from live Management Panel screenshot SHA-256 95652321b98d682eb07cc46d1e13e464fee21ee31e323e83089231688a72c18a (PNG not committed). Project list showed asdasd / 100001; DC-550 SKH also enabled globally. Angle compensation and robot safety length still null. Not proof these settings were active at 18:14.',
  reproductionVerdict: null,
};

export const DOWIN_ASDD_BASELINE_REPRODUCTION_RUN: DowinCalibrationRun = {
  fixtureId: 'BASELINE_REPRODUCTION_RUN',
  parentFixtureId: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.id,
  runKind: 'BASELINE_REPRODUCTION_RUN',
  isolationVariable: 'baselineReproduction',
  status: 'MEASURED',
  designName: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.designName,
  profileSystem: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.profileSystem,
  widthMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallWidthMm,
  heightMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallHeightMm,
  machineId: REQUIRED_ISOLATION_MACHINE_ID,
  observedSettings: { ...DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.jobSettings },
  intendedIsolation: {
    field: null,
    instructedToMm: null,
    note: 'Same asdd 1000×1500 Deceuninck 70, Weld=3 / Saw=4 / Trim=0, DC-600. Settings unchanged from the 1A snapshot.',
  },
  changedSetting: null,
  pieces: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows,
  bars: DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
  provenance:
    'BASELINE_REPRODUCTION_RUN 2026-09-10 21:25. Design Preview text identical to 18:14. Labels/Optimization text identical except report timestamps. DC-600 Table1 LENGTH sash H 454 / sash V 1433 / frame H 1003 / frame V 1503 / mullion 1416; FRAME_X/Y 1000×1500. Optimization List remainders 206 / 6160 / 2203 / 965 / 5080. Licensed files not committed. SHA-256 in DOWIN_ASDD_SOURCE_HASHES.',
  reproductionVerdict: 'REPRODUCED',
};

function weldingWaste0Pieces(): DowinPhysicalLengthGoldenRow[] {
  return DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows.map((row) => {
    if (row.category === 'glass' || row.category === 'angle_compensation' || row.category === 'mullion') {
      return row;
    }
    if (row.category === 'glazing_bead_horizontal' || row.category === 'glazing_bead_vertical') {
      return { ...row, expectedPackedSegmentMm: row.expectedNominalLengthMm };
    }
    return {
      ...row,
      expectedPackedSegmentMm: row.expectedNominalLengthMm,
      expectedMachineLengthMm: row.expectedNominalLengthMm,
    };
  });
}

export const DOWIN_ASDD_WELDING_WASTE_0_BARS: readonly ExternalBarPattern[] = [
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[0],
    packedSegmentMm: [1500, 1500, 1000, 1000],
    remainingMm: 977,
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[1],
    packedSegmentMm: [1430, 1430, 451, 451],
    remainingMm: 2215,
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[2],
    packedSegmentMm: [1416],
    remainingMm: 5080,
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[3],
    packedSegmentMm: [1310, 1310, 331, 331],
    remainingMm: 3195,
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[4],
    packedSegmentMm: [1310, 1310, 331, 331],
    remainingMm: 3195,
  },
];

export const DOWIN_ASDD_WELDING_WASTE_0_RUN: DowinCalibrationRun = {
  fixtureId: 'WELDING_WASTE_0',
  parentFixtureId: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.fixtureId,
  runKind: 'SINGLE_SETTING_ISOLATION',
  isolationVariable: 'weldingWaste',
  status: 'MEASURED',
  designName: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.designName,
  profileSystem: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.profileSystem,
  widthMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallWidthMm,
  heightMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallHeightMm,
  machineId: REQUIRED_ISOLATION_MACHINE_ID,
  observedSettings: {
    ...DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.jobSettings,
    weldingWasteMm: 0,
  },
  intendedIsolation: {
    field: 'weldingWasteMm',
    instructedToMm: 0,
    note: 'SINGLE_SETTING_ISOLATION vs 1B: only Welding Waste 3 → 0. Same asdd 1000×1500, Deceuninck 70, stock, quantity, Saw=4, Trim=0, DC-600.',
  },
  changedSetting: { field: 'weldingWasteMm', oldValue: 3, newValue: 0 },
  pieces: weldingWaste0Pieces(),
  bars: DOWIN_ASDD_WELDING_WASTE_0_BARS,
  provenance:
    'SINGLE_SETTING_ISOLATION 2026-09-10 21:54. Welding Waste 3→0 only. Settings saved (screenshot SHA-256 ba20b105029affbf9152130c171f0cf6446175cba7fb20e34ec056eec6653638). Design Preview/Labels nominals unchanged (451 / 1430 / 1000 / 1500 / 1416 / 331 / 1310). Packed and DC-600 Table1 LENGTH sash H 451 / sash V 1430 / frame H 1000 / frame V 1500 / mullion 1416; FRAME_X/Y 1000×1500. Optimization List remainders CITA 3195×2 / KANAT 2215 / KASA 977 / ORTA 5080. Licensed files not committed.',
  reproductionVerdict: null,
};

export const DOWIN_ASDD_SAW_THICKNESS_5_BARS: readonly ExternalBarPattern[] = [
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[0],
    packedSegmentMm: [1503, 1503, 1003, 1003],
    remainingMm: 960,
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[1],
    id: 'asdd-sash-kanat-6000-verticals',
    applicationCount: 1,
    packedSegmentMm: [1433, 1433, 1433, 1433],
    remainingMm: 240,
    pieceExternalIds: [
      'asdd.Left.Sash.Left',
      'asdd.Left.Sash.Right',
      'asdd.Right.Sash.Left',
      'asdd.Right.Sash.Right',
    ],
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[1],
    id: 'asdd-sash-kanat-6000-horizontals',
    applicationCount: 1,
    packedSegmentMm: [454, 454, 454, 454],
    remainingMm: 4156,
    pieceExternalIds: [
      'asdd.Left.Sash.Top',
      'asdd.Left.Sash.Bottom',
      'asdd.Right.Sash.Top',
      'asdd.Right.Sash.Bottom',
    ],
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[2],
    remainingMm: 5079,
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[3],
    packedSegmentMm: [1313, 1313, 334, 334],
    remainingMm: 3178,
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[4],
    packedSegmentMm: [1313, 1313, 334, 334],
    remainingMm: 3178,
  },
];

export const DOWIN_ASDD_SAW_THICKNESS_5_RUN: DowinCalibrationRun = {
  fixtureId: 'SAW_THICKNESS_5',
  parentFixtureId: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.fixtureId,
  runKind: 'SINGLE_SETTING_ISOLATION',
  isolationVariable: 'sawThickness',
  status: 'MEASURED',
  designName: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.designName,
  profileSystem: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.profileSystem,
  widthMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallWidthMm,
  heightMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallHeightMm,
  machineId: REQUIRED_ISOLATION_MACHINE_ID,
  observedSettings: {
    ...DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.jobSettings,
    sawThicknessMm: 5,
  },
  intendedIsolation: {
    field: 'sawThicknessMm',
    instructedToMm: 5,
    note: 'SINGLE_SETTING_ISOLATION vs 1B: Welding Waste restored to 3. Only Saw Thickness 4 → 5. Same asdd 1000×1500, Deceuninck 70, stock, quantity, Trim=0, DC-600.',
  },
  changedSetting: { field: 'sawThicknessMm', oldValue: 4, newValue: 5 },
  pieces: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows,
  bars: DOWIN_ASDD_SAW_THICKNESS_5_BARS,
  provenance:
    'SINGLE_SETTING_ISOLATION 2026-09-10 22:21. Saw Thickness 4→5 only (Weld restored to 3, Trim=0). Settings saved (screenshot SHA-256 f1d48844a192d0367f134eae706f622b89adefa09c1eabfbcab2af2c04643bad). Design Preview/Labels nominals unchanged (451 / 1430 / 1000 / 1500 / 1416 / 331 / 1310). Packed required-parts and DC-600 Table1 LENGTH unchanged vs 1B (sash H 454 / sash V 1433 / frame H 1003 / frame V 1503 / mullion 1416; FRAME_X/Y 1000×1500). Optimization List remainders CITA 3178×2 / KANAT 240+4156 / KASA 960 / ORTA 5079. Licensed files not committed.',
  reproductionVerdict: null,
};

export const DOWIN_ASDD_TRIM_CUT_10_BARS: readonly ExternalBarPattern[] = [
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[0],
    packedSegmentMm: [1503, 1503, 1003, 1003],
    remainingMm: 960,
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[1],
    packedSegmentMm: [1433, 1433, 454, 454],
    remainingMm: 2198,
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[2],
    remainingMm: 5079,
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[3],
    packedSegmentMm: [1313, 1313, 334, 334],
    remainingMm: 3178,
  },
  {
    ...DOWIN_ASDD_EXTERNAL_BAR_PATTERNS[4],
    packedSegmentMm: [1313, 1313, 334, 334],
    remainingMm: 3178,
  },
];

export const DOWIN_ASDD_TRIM_CUT_10_RUN: DowinCalibrationRun = {
  fixtureId: 'TRIM_CUT_10',
  parentFixtureId: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.fixtureId,
  runKind: 'SINGLE_SETTING_ISOLATION',
  isolationVariable: 'trimCut',
  status: 'MEASURED',
  designName: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.designName,
  profileSystem: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.profileSystem,
  widthMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallWidthMm,
  heightMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallHeightMm,
  machineId: REQUIRED_ISOLATION_MACHINE_ID,
  observedSettings: {
    ...DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.jobSettings,
    trimCutMm: 10,
  },
  intendedIsolation: {
    field: 'trimCutMm',
    instructedToMm: 10,
    note: 'SINGLE_SETTING_ISOLATION vs 1B: Saw restored to 4, Weld=3. Only Trim Cut 0 → 10. Same asdd 1000×1500, Deceuninck 70, stock, quantity, DC-600.',
  },
  changedSetting: { field: 'trimCutMm', oldValue: 0, newValue: 10 },
  pieces: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows,
  bars: DOWIN_ASDD_TRIM_CUT_10_BARS,
  provenance:
    'SINGLE_SETTING_ISOLATION 2026-09-10 22:52. Trim Cut 0→10 only (Saw restored to 4, Weld=3). Settings screenshot SHA-256 b17121a62c89d83cb734f094d8c36cbe5bc6d6af164462eef47af7943ed3535a. Design Preview/Labels nominals unchanged (451 / 1430 / 1000 / 1500 / 1416 / 331 / 1310). Packed required-parts and DC-600 Table1 LENGTH unchanged vs 1B (sash H 454 / sash V 1433 / frame H 1003 / frame V 1503 / mullion 1416). Optimization List remainders CITA 3178×2 / KANAT 2198×2 / KASA 960 / ORTA 5079. Licensed files not committed.',
  reproductionVerdict: null,
};

export const DOWIN_ASDD_BASELINE_RESET_RUN: DowinCalibrationRun = {
  fixtureId: 'BASELINE_RESET_VALIDATION',
  parentFixtureId: DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.fixtureId,
  runKind: 'BASELINE_RESET_VALIDATION',
  isolationVariable: 'baselineReset',
  status: 'MEASURED',
  designName: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.designName,
  profileSystem: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.profileSystem,
  widthMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallWidthMm,
  heightMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallHeightMm,
  machineId: REQUIRED_ISOLATION_MACHINE_ID,
  observedSettings: { ...DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.jobSettings },
  intendedIsolation: {
    field: null,
    instructedToMm: null,
    note: 'BASELINE_RESET_VALIDATION: Weld=3 / Saw=4 / Trim=0 restored. Clear Screen, re-Send unchanged asdd, Run. Must recover 1B remainders before the 90° control.',
  },
  changedSetting: null,
  pieces: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows,
  bars: DOWIN_ASDD_TRIM_CUT_10_BARS,
  provenance:
    'BASELINE_RESET_VALIDATION 2026-09-10 23:16. Settings screenshot SHA-256 1d4326c1c8d3343fd1362a058a0bd659e6b4a40b5d4ba5a8348216bb14c505a4 shows Weld=3 / Saw=4 / Trim=0 / DC-600. Clear Screen then re-Send asdd + Run. Machine lengths recovered (454 / 1433 / 1003 / 1503 / 1416). Remainders did not: CITA 3178×2 / KANAT 2198 / KASA 960 / ORTA 5079 — the Test 3/4 signature, not 1B 965 / 2203 / 5080 / 206 / 6160. DC-600 .dw SHA matches Test 4 (machine-output identity, not optimizer-remainder identity). REPRODUCTION_FAILED. STOP — FP-024C.1 provenance audit next. Licensed files not committed.',
  reproductionVerdict: 'REPRODUCTION_FAILED',
  lengthLayerVerdict: 'REPRODUCED',
  topologyVerdict: 'REPRODUCTION_FAILED',
};

export const DOWIN_CALIBRATION_TEMPLATES: readonly DowinCalibrationRun[] = [
  pendingTemplate(
    'FP024C1_PROVENANCE_AUDIT',
    'optimizationStateProvenance',
    {
      field: null,
      instructedToMm: null,
      note: 'FP-024C.1 answers one question: why identical visible geometry/settings can produce different optimization remainder topology. Decisive experiment: same geometry + Weld 3 / Saw 4 / Trim 0 + same stock quantities + fresh project/design + fresh production plan + fresh optimization result. Compare bar-assignment signatures, not utilization. Not a manufacturing-setting isolation. Do not encode formulas.',
    },
    'Operator template. Capture optimizer input and selected-result provenance on every run. Test 3 remainder is not attributed to Saw. 90° stays gated until FP-024C.1 explains the discrepancy.'
  ),
  pendingTemplate(
    'dowin-asdd-90-control-pending',
    'ninetyDegreeControl',
    {
      field: null,
      instructedToMm: null,
      note: 'CONTROL_FIXTURE: separate 90°/90° design. Keep General Settings, system, and DC-600 unchanged. Geometry and cut-angle may differ. Not a single-setting isolation.',
    },
    'Operator CONTROL_FIXTURE template. The asdd mullion is a same-job 90° observation, not this control fixture.'
  ),
];

export const DOWIN_CALIBRATION_RUNS: readonly DowinCalibrationRun[] = [
  DOWIN_ASDD_BASELINE_RUN,
  DOWIN_ASDD_BASELINE_REPRODUCTION_RUN,
  DOWIN_ASDD_WELDING_WASTE_0_RUN,
  DOWIN_ASDD_SAW_THICKNESS_5_RUN,
  DOWIN_ASDD_TRIM_CUT_10_RUN,
  DOWIN_ASDD_BASELINE_RESET_RUN,
  ...DOWIN_CALIBRATION_TEMPLATES,
];

export function findBaselineReproduction(
  runs: readonly DowinCalibrationRun[] = DOWIN_CALIBRATION_RUNS
): DowinCalibrationRun | undefined {
  return runs.find((r) => r.runKind === 'BASELINE_REPRODUCTION_RUN');
}

export function isCausalIsolationAuthorized(
  runs: readonly DowinCalibrationRun[] = DOWIN_CALIBRATION_RUNS
): boolean {
  const snapshot = runs.find((r) => r.runKind === 'BASELINE_SETTINGS_SNAPSHOT');
  const reproduction = findBaselineReproduction(runs);
  return (
    snapshot != null &&
    isBaselineSettingsSnapshotClassified(snapshot.observedSettings) &&
    reproduction?.status === 'MEASURED' &&
    reproduction.reproductionVerdict === 'REPRODUCED'
  );
}

export function findBaselineReset(
  runs: readonly DowinCalibrationRun[] = DOWIN_CALIBRATION_RUNS
): DowinCalibrationRun | undefined {
  return runs.find((r) => r.runKind === 'BASELINE_RESET_VALIDATION');
}

/** 90° CONTROL_FIXTURE is gated until reset recovers the 1B remainder/machine signature. */
export function isControlFixtureAuthorized(
  runs: readonly DowinCalibrationRun[] = DOWIN_CALIBRATION_RUNS
): boolean {
  const reset = findBaselineReset(runs);
  return reset?.status === 'MEASURED' && reset.reproductionVerdict === 'REPRODUCED';
}

const ASDD_RESET_MULLION_PAIR = {
  category: 'mullion',
  nominalMm: 1416,
  packedMm: 1416,
  machineMm: 1416,
} as const;

/** Reset must recover 1B length pairs, mullion 1416, and 1B remainders. */
export function evaluateBaselineReset(
  original: { pieces: readonly DowinPhysicalLengthGoldenRow[]; bars: readonly ExternalBarPattern[] },
  candidate: { pieces: readonly DowinPhysicalLengthGoldenRow[]; bars: readonly ExternalBarPattern[] }
): ReturnType<typeof evaluateBaselineReproduction> {
  const reproduction = evaluateBaselineReproduction(original, candidate);
  const signatures = uniqueLayerSignatures(candidate.pieces);
  const mullionMissing = requiredPairReproduced(ASDD_RESET_MULLION_PAIR, signatures)
    ? []
    : [signatureKey(ASDD_RESET_MULLION_PAIR)];
  const missingPairs = [...reproduction.missingPairs, ...mullionMissing];
  return {
    missingPairs,
    remainderMismatches: reproduction.remainderMismatches,
    verdict:
      missingPairs.length === 0 && reproduction.remainderMismatches.length === 0
        ? 'REPRODUCED'
        : 'REPRODUCTION_FAILED',
  };
}

/** Length-layer only: required pairs + mullion 1416. Remainders are not this verdict. */
export function evaluateLengthLayerReset(
  _original: { pieces: readonly DowinPhysicalLengthGoldenRow[] },
  candidate: { pieces: readonly DowinPhysicalLengthGoldenRow[] }
): { verdict: ReproductionVerdict; missingPairs: string[] } {
  const signatures = uniqueLayerSignatures(candidate.pieces);
  const missingPairs = [
    ...ASDD_REQUIRED_REPRODUCTION_PAIRS.filter((pair) => !requiredPairReproduced(pair, signatures)).map(
      signatureKey
    ),
    ...(requiredPairReproduced(ASDD_RESET_MULLION_PAIR, signatures)
      ? []
      : [signatureKey(ASDD_RESET_MULLION_PAIR)]),
  ];
  return {
    missingPairs,
    verdict: missingPairs.length === 0 ? 'REPRODUCED' : 'REPRODUCTION_FAILED',
  };
}

/** Optimizer remainder topology only. Machine-output identity is a separate verdict. */
export function evaluateOptimizerTopologyReproduction(
  originalBars: readonly ExternalBarPattern[],
  candidateBars: readonly ExternalBarPattern[]
): ReproductionVerdict {
  return assignmentSignaturesEqual(originalBars, candidateBars) ? 'REPRODUCED' : 'REPRODUCTION_FAILED';
}

export function identifyAsddAssignmentTopology(
  bars: readonly ExternalBarPattern[]
): AsddAssignmentTopology {
  return identifyAssignmentTopology(bars, DOWIN_ASDD_EXTERNAL_BAR_PATTERNS, DOWIN_ASDD_TRIM_CUT_10_BARS);
}

export function classifyProvenanceFreshStateExperiment(
  runs: readonly DowinCalibrationRun[]
): ReturnType<typeof classifyOptimizationStateProvenance> {
  const provenanceMeasured = runs.filter(
    (run) => run.runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT' && run.status === 'MEASURED'
  );
  const freshRuns = provenanceMeasured.filter(
    (run) => solveDispositionOf(run.optimizerProvenance) === 'NEWLY_SOLVED'
  );
  const reusedStateRuns = [
    ...runs.filter((run) => run.runKind === 'BASELINE_RESET_VALIDATION' && run.status === 'MEASURED'),
    ...provenanceMeasured.filter((run) => {
      const d = solveDispositionOf(run.optimizerProvenance);
      return d === 'REOPENED' || d === 'REUSED';
    }),
  ];
  return classifyOptimizationStateProvenance({
    freshRuns,
    reusedStateRuns,
    originalBars: DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
    laterBars: DOWIN_ASDD_TRIM_CUT_10_BARS,
  });
}

export function pieceDeltasForRun(run: DowinCalibrationRun): PieceLayerDeltas[] {
  return run.pieces
    .filter((p) => p.category !== 'glass' && p.category !== 'angle_compensation')
    .map(computePieceLayerDeltas);
}

export function uniquePackedMinusNominalMm(run: DowinCalibrationRun): number[] {
  const values = new Set<number>();
  for (const delta of pieceDeltasForRun(run)) {
    if (delta.packedMinusNominalMm != null) values.add(delta.packedMinusNominalMm);
  }
  return [...values].sort((a, b) => a - b);
}

export function buildCompensationMatrix(
  runs: readonly DowinCalibrationRun[] = DOWIN_CALIBRATION_RUNS
): CompensationMatrixRow[] {
  return runs.map((run) => {
    if (run.status === 'PENDING_OPERATOR_RUN') {
      return {
        fixtureId: run.fixtureId,
        runKind: run.runKind,
        variableChanged: run.isolationVariable,
        status: run.status,
        nominalDeltaMm: null,
        packedDeltaMm: null,
        packedMinusNominalValuesMm: [],
        machineDeltaMm: null,
        remainderDeltaMm: null,
        interpretation: 'NOT MEASURED',
        note: run.intendedIsolation?.note ?? run.provenance,
      };
    }

    const deltas = pieceDeltasForRun(run);
    const packedMinusNominal = uniquePackedMinusNominalMm(run);
    const machineMinusPacked = [
      ...new Set(
        deltas
          .map((d) => d.machineMinusPackedMm)
          .filter((n): n is number => n != null)
      ),
    ];

    return {
      fixtureId: run.fixtureId,
      runKind: run.runKind,
      variableChanged: run.isolationVariable,
      status: run.status,
      nominalDeltaMm: 0,
      packedDeltaMm: packedMinusNominal.length === 1 ? packedMinusNominal[0] : null,
      packedMinusNominalValuesMm: packedMinusNominal,
      machineDeltaMm: machineMinusPacked.length === 1 ? machineMinusPacked[0] : null,
      remainderDeltaMm: null,
      interpretation: 'AMBIGUOUS',
      note: 'Single-run observation. Packed−nominal is not a proven Welding Waste effect; settings snapshot is incomplete. Remainder residual is listed separately and not collapsed.',
    };
  });
}

export interface CompensationTermRecord {
  term: string;
  authority: CompensationTermAuthority;
  proposedForFp024c: boolean;
  evidence: string;
}

export const DOWIN_COMPENSATION_TERM_AUTHORITY: readonly CompensationTermRecord[] = [
  {
    term: 'packedMinusNominal on 45° asdd pieces',
    authority: 'SUPPORTED',
    proposedForFp024c: false,
    evidence: 'This job: frame/sash/bead packed − nominal = 3 mm. Test 2 proves Welding Waste moves KASA/KANAT packed by −3 mm on this fixture. Still not a generalized production +3.',
  },
  {
    term: 'packedMinusNominal on 90° mullion',
    authority: 'SUPPORTED',
    proposedForFp024c: false,
    evidence: 'This job: mullion 1416 on all three layers. Not an isolated 90° control design.',
  },
  {
    term: 'machineEqualsPacked on DC-600 Table1 LENGTH',
    authority: 'SUPPORTED',
    proposedForFp024c: false,
    evidence: '13 profile rows: LENGTH equals packed graphic. Beads have no MDB row. Not a general machine rule.',
  },
  {
    term: 'Welding Waste on asdd 45° KASA/KANAT packed length',
    authority: 'PROVEN',
    proposedForFp024c: false,
    evidence:
      'Test 2 vs 1B: unique packed delta −3 mm on 45° KASA/KANAT. One fixture. Not a production formula.',
  },
  {
    term: 'Welding Waste on asdd 45° KASA/KANAT DC-600 machine length',
    authority: 'PROVEN',
    proposedForFp024c: false,
    evidence:
      'Test 2 vs 1B: unique Table1 LENGTH delta −3 mm on 45° KASA/KANAT. Machine still equals packed. Not encoded.',
  },
  {
    term: 'Welding Waste',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence:
      'Test 2 package is CONDITIONAL. KASA/KANAT packed/machine −3 mm is proven on this fixture. Generalized “all 45° profiles add WeldingWaste” and proprietary DoWin formula stay unproven. Do not encode.',
  },
  {
    term: 'Saw Thickness on asdd packed/machine piece length',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence:
      'Test 3 vs 1B: unique packed and Table1 LENGTH deltas are 0 mm on KASA/KANAT/ORTA. Saw is not a piece-length compensation on this fixture. Do not encode.',
  },
  {
    term: 'Saw Thickness on asdd KASA remainder',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence:
      'Test 3 observed KASA 965→960 vs 1B, but BASELINE_RESET_VALIDATION with Saw restored to 4 did not recover 1B remainders. Remainder delta is not attributable to Saw Thickness. Do not encode.',
  },
  {
    term: 'Saw Thickness on asdd ORTA remainder',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence:
      'Test 3 observed ORTA 5080→5079 vs 1B, but reset at Saw=4 kept 5079. Remainder delta is not attributable to Saw Thickness. Do not encode.',
  },
  {
    term: 'Saw Thickness',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence:
      'Test 3 package is AMBIGUOUS. Packed/machine piece lengths did not move. Remainder moved vs 1B but did not revert when Saw returned to 4. Exact proprietary kerf formula stays unproven. Do not encode.',
  },
  {
    term: 'Trim Cut on asdd packed/machine piece length',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence:
      'Test 4 vs 1B: unique packed and Table1 LENGTH deltas are 0 mm. Trim Cut 10 is not a piece-level or machine-level compensation on this fixture. Do not encode.',
  },
  {
    term: 'Trim Cut remainder = configured trim delta',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence:
      'Test 4 remainder is not Trim evidence. KASA 960 / ORTA 5079 / CITA 3178×2 matched Test 3 and survived reset at Saw=4. Treat as optimizer-state confound. FP-024C.1 provenance audit is next.',
  },
  {
    term: 'Trim Cut',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence:
    'Test 4 package is AMBIGUOUS. Packed/machine piece lengths did not move. Remainder signature matched Test 3 (KASA 960 / ORTA 5079 / CITA 3178×2) and is not Trim evidence. Possible optimizer-state confound. Do not encode.',
  },
  {
    term: 'KASA/KANAT leftover after packed + named-parity N×4 kerf',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence: 'Hypothesis leftover 7 mm if saw were 4 and trim 0. External bar parity CONDITIONAL.',
  },
];

export const OPERATOR_EVIDENCE_PACKAGE_CHECKLIST = [
  'Exact General Settings screenshot',
  'Design dimensions / system / profile',
  'Machine = DC-600',
  'Design Preview PDF',
  'Labels / Assembly PDF',
  'Optimization PDF',
  'MDB if generated',
  'Timestamp / run ID',
  'The one changed setting and old/new value (SINGLE_SETTING_ISOLATION only)',
  'SHA-256 of each external file',
  'Transcribed nominal / packed / machine / remainder values',
] as const;

export interface OperatorEvidencePackage {
  runId: string;
  timestampIso: string | null;
  generalSettingsScreenshotNote: string | null;
  changedSettingNote: string | null;
  controlFixtureNote: string | null;
  changedSetting: ChangedSettingRecord | null;
  sourceHashesSha256: {
    generalSettingsScreenshot?: string | null;
    designPreview?: string | null;
    assemblyLabels?: string | null;
    optimization?: string | null;
    mdb?: string | null;
  };
  mdbGenerated: boolean;
  isolationVariable: CalibrationVariable;
  observedSettings: DowinJobObservedSettings;
  widthMm: number;
  heightMm: number;
  profileSystem: string;
  pieces: DowinPhysicalLengthGoldenRow[];
  bars: ExternalBarPattern[];
  optimizerProvenance?: OptimizerRunProvenance | null;
}

export type OperatorIngestResult =
  | { ok: true; run: DowinCalibrationRun }
  | { ok: false; reasons: string[] };

const SETTING_KEYS: (keyof DowinJobObservedSettings)[] = [
  'sawThicknessMm',
  'weldingWasteMm',
  'sashOffsetMm',
  'trimCutMm',
  'remnantThresholdMm',
  'glazingClearanceMm',
  'robotSafetyLengthMm',
  'profileWasteMarginPercent',
  'compLessThan90LeftMm',
  'compLessThan90RightMm',
  'compGreaterThan90LeftMm',
  'compGreaterThan90RightMm',
  'machineId',
];

export function changedObservedSettingKeys(
  parent: DowinJobObservedSettings,
  child: DowinJobObservedSettings
): (keyof DowinJobObservedSettings)[] {
  return SETTING_KEYS.filter((key) => parent[key] !== child[key]);
}

function isolationFieldForVariable(
  variable: CalibrationVariable
): keyof DowinJobObservedSettings | null {
  if (variable === 'weldingWaste') return 'weldingWasteMm';
  if (variable === 'sawThickness') return 'sawThicknessMm';
  if (variable === 'trimCut') return 'trimCutMm';
  return null;
}

function stockQuantityByIdentity(
  bars: readonly ExternalBarPattern[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const bar of bars) {
    const key = `${bar.profileCode}|${bar.stockLengthMm}`;
    totals.set(key, (totals.get(key) ?? 0) + bar.applicationCount);
  }
  return totals;
}

function barsIdenticalForIsolation(
  parent: readonly ExternalBarPattern[],
  child: readonly ExternalBarPattern[]
): boolean {
  const parentQty = stockQuantityByIdentity(parent);
  const childQty = stockQuantityByIdentity(child);
  if (parentQty.size !== childQty.size) return false;
  for (const [key, qty] of parentQty) {
    if (childQty.get(key) !== qty) return false;
  }
  return true;
}

function remainderDeltaMm(
  parent: DowinCalibrationRun,
  child: DowinCalibrationRun
): number | null {
  if (parent.bars.length === 0 || child.bars.length !== parent.bars.length) return null;
  const diffs: number[] = [];
  for (let i = 0; i < parent.bars.length; i += 1) {
    diffs.push(round1(child.bars[i].remainingMm - parent.bars[i].remainingMm));
  }
  const unique = [...new Set(diffs)];
  return unique.length === 1 ? unique[0] : null;
}

function classifyMeasuredIsolation(
  runKind: CalibrationRunKind,
  nominalDeltaMm: number | null,
  packedDeltaMm: number | null,
  machineDeltaMm: number | null,
  remainderDeltaMmValue: number | null
): CompensationInterpretation {
  if (
    runKind === 'CONTROL_FIXTURE' ||
    runKind === 'BASELINE_SETTINGS_SNAPSHOT' ||
    runKind === 'BASELINE_REPRODUCTION_RUN' ||
    runKind === 'BASELINE_RESET_VALIDATION' ||
    runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT'
  ) {
    return 'AMBIGUOUS';
  }
  const layers = [nominalDeltaMm, packedDeltaMm, machineDeltaMm, remainderDeltaMmValue];
  if (layers.every((n) => n == null)) return 'AMBIGUOUS';
  if (layers.some((n) => n == null) && layers.every((n) => n == null || n === 0)) {
    return 'AMBIGUOUS';
  }
  if (layers.every((n) => n === 0)) return 'NO OBSERVED EFFECT';
  const nonZero = layers.filter((n): n is number => n != null && n !== 0);
  const uniqueNonZero = [...new Set(nonZero)];
  if (uniqueNonZero.length === 1 && nonZero.length >= 1) return 'PROVEN EFFECT';
  return 'AMBIGUOUS';
}

export function ingestOperatorCalibrationRun(
  parent: DowinCalibrationRun,
  pkg: OperatorEvidencePackage,
  context: { runs?: readonly DowinCalibrationRun[] } = {}
): OperatorIngestResult {
  const reasons: string[] = [];
  const runKind = calibrationRunKind(pkg.isolationVariable);
  const runs = context.runs ?? DOWIN_CALIBRATION_RUNS;

  if (!pkg.generalSettingsScreenshotNote) {
    reasons.push('General Settings screenshot/transcription is missing.');
  }
  if (!pkg.timestampIso) {
    reasons.push('Timestamp / run ID timestamp is missing.');
  }
  if (!pkg.sourceHashesSha256.generalSettingsScreenshot) {
    reasons.push('General Settings screenshot SHA-256 is missing.');
  }
  if (!pkg.sourceHashesSha256.designPreview) reasons.push('Design Preview PDF hash is missing.');
  if (!pkg.sourceHashesSha256.assemblyLabels) reasons.push('Assembly/Labels PDF hash is missing.');
  if (!pkg.sourceHashesSha256.optimization) reasons.push('Optimization PDF hash is missing.');
  if (pkg.mdbGenerated && !pkg.sourceHashesSha256.mdb) {
    reasons.push('MDB was generated but SHA-256 is missing.');
  }
  if (pkg.observedSettings.machineId !== REQUIRED_ISOLATION_MACHINE_ID) {
    reasons.push(`Machine must be ${REQUIRED_ISOLATION_MACHINE_ID}.`);
  }
  if (pkg.pieces.length === 0) {
    reasons.push('Transcribed nominal / packed / machine piece values are missing.');
  }
  if (pkg.bars.length === 0) {
    reasons.push('Transcribed remainder / bar values are missing.');
  }

  const changed = changedObservedSettingKeys(parent.observedSettings, pkg.observedSettings);

  if (runKind === 'CONTROL_FIXTURE') {
    if (!isControlFixtureAuthorized(runs)) {
      reasons.push(
        'BASELINE_RESET_VALIDATION must recover 1B remainders (KASA 965 / KANAT 2203 / ORTA 5080 / CITA 206/6160) and machine lengths 454 / 1433 / 1003 / 1503 / 1416 before the 90° CONTROL_FIXTURE.'
      );
    }
    if (!pkg.controlFixtureNote) {
      reasons.push('CONTROL_FIXTURE note is missing (geometry/cut-angle change; settings unchanged).');
    }
    if (changed.length > 0) {
      reasons.push('CONTROL_FIXTURE must keep General Settings identical to the parent.');
    }
  } else if (runKind === 'BASELINE_SETTINGS_SNAPSHOT') {
    if (!isBaselineSettingsSnapshotClassified(pkg.observedSettings)) {
      reasons.push(
        'Baseline snapshot must transcribe Welding Waste, Saw Thickness, Trim Cut, and DC-600 from the asdd General Settings screenshot.'
      );
    }
  } else if (runKind === 'BASELINE_REPRODUCTION_RUN') {
    if (!isBaselineSettingsSnapshotClassified(parent.observedSettings)) {
      reasons.push('Classify the asdd BASELINE_SETTINGS_SNAPSHOT first.');
    }
    if (changed.length > 0) {
      reasons.push(
        'BASELINE_REPRODUCTION_RUN must keep General Settings identical to the captured snapshot (Weld=3 / Saw=4 / Trim=0).'
      );
    }
    if (pkg.widthMm !== parent.widthMm || pkg.heightMm !== parent.heightMm) {
      reasons.push('BASELINE_REPRODUCTION_RUN must keep the same asdd 1000×1500 geometry.');
    }
    if (pkg.profileSystem !== parent.profileSystem) {
      reasons.push('Do not change profile system on BASELINE_REPRODUCTION_RUN.');
    }
  } else if (runKind === 'BASELINE_RESET_VALIDATION') {
    const oneB = findBaselineReproduction(runs);
    if (oneB?.status !== 'MEASURED' || oneB.reproductionVerdict !== 'REPRODUCED') {
      reasons.push('BASELINE_RESET_VALIDATION requires a REPRODUCED BASELINE_REPRODUCTION_RUN.');
    }
    if (changed.length > 0) {
      reasons.push(
        'BASELINE_RESET_VALIDATION must restore Weld=3 / Saw=4 / Trim=0. Settings must match 1B.'
      );
    }
    if (pkg.widthMm !== parent.widthMm || pkg.heightMm !== parent.heightMm) {
      reasons.push('BASELINE_RESET_VALIDATION must keep the same asdd 1000×1500 geometry.');
    }
    if (pkg.profileSystem !== parent.profileSystem) {
      reasons.push('Do not change profile system on BASELINE_RESET_VALIDATION.');
    }
  } else if (runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT') {
    const oneB = findBaselineReproduction(runs);
    if (oneB?.status !== 'MEASURED' || oneB.reproductionVerdict !== 'REPRODUCED') {
      reasons.push('OPTIMIZATION_STATE_PROVENANCE_AUDIT requires a REPRODUCED BASELINE_REPRODUCTION_RUN.');
    }
    if (changed.length > 0) {
      reasons.push(
        'FP-024C.1 must keep Weld=3 / Saw=4 / Trim=0. Settings must match 1B. This is not a manufacturing-setting isolation.'
      );
    }
    if (pkg.widthMm !== 1000 || pkg.heightMm !== 1500) {
      reasons.push('FP-024C.1 discriminator must keep the same 1000×1500 geometry.');
    }
    if (pkg.profileSystem !== parent.profileSystem) {
      reasons.push('Do not change profile system on OPTIMIZATION_STATE_PROVENANCE_AUDIT.');
    }
    const oneBForStock = findBaselineReproduction(runs);
    if (oneBForStock && !barsIdenticalForIsolation(oneBForStock.bars, pkg.bars)) {
      reasons.push(
        'FP-024C.1 decisive experiment requires the same stock quantities as 1B. Inputs cannot be proven identical.'
      );
    }
    const missingProvenance = missingOptimizerProvenanceFields(pkg.optimizerProvenance);
    if (missingProvenance.length > 0) {
      reasons.push(
        `FP-024C.1 provenance is incomplete (${missingProvenance.join(', ')}). Inputs cannot be proven identical.`
      );
    } else if (solveDispositionOf(pkg.optimizerProvenance) !== 'NEWLY_SOLVED') {
      reasons.push(
        'FP-024C.1 decisive experiment requires a newly solved optimization result, not a reopened/reused one.'
      );
    }
    if (pkg.runId === parent.designName || pkg.runId === 'asdd') {
      reasons.push(
        'FP-024C.1 decisive experiment requires a fresh project/design, not Clear Screen on the same asdd design.'
      );
    }
  } else {
    if (!isCausalIsolationAuthorized(runs)) {
      reasons.push(
        'BASELINE_REPRODUCTION_RUN must reproduce original asdd lengths (451→454, 1430→1433, 1000→1003, 1500→1503) and bar remainders before Tests 2–4.'
      );
    }
    if (!pkg.changedSettingNote) {
      reasons.push('Note identifying the single changed setting is missing.');
    }
    if (!pkg.changedSetting) {
      reasons.push('Old/new value for the one changed setting is missing.');
    }
    if (changed.length !== 1) {
      reasons.push(
        `SINGLE_SETTING_ISOLATION must change exactly one setting; changed: ${changed.join(', ') || 'none'}.`
      );
    }
    if (pkg.widthMm !== parent.widthMm || pkg.heightMm !== parent.heightMm) {
      reasons.push('Do not change geometry on SINGLE_SETTING_ISOLATION runs.');
    }
    if (pkg.profileSystem !== parent.profileSystem) {
      reasons.push('Do not change profile system on SINGLE_SETTING_ISOLATION runs.');
    }
    if (!barsIdenticalForIsolation(parent.bars, pkg.bars)) {
      reasons.push('Keep stock, quantity, and bar identity identical on SINGLE_SETTING_ISOLATION runs.');
    }
  }

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  const isolationField = isolationFieldForVariable(pkg.isolationVariable);
  const oneB = findBaselineReproduction(runs);
  const reproduction =
    runKind === 'BASELINE_REPRODUCTION_RUN'
      ? evaluateBaselineReproduction(parent, { pieces: pkg.pieces, bars: pkg.bars })
      : runKind === 'BASELINE_RESET_VALIDATION' || runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT'
        ? evaluateBaselineReset(oneB ?? parent, { pieces: pkg.pieces, bars: pkg.bars })
        : null;
  const lengthLayer =
    runKind === 'BASELINE_RESET_VALIDATION' || runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT'
      ? evaluateLengthLayerReset(oneB ?? parent, { pieces: pkg.pieces })
      : runKind === 'BASELINE_REPRODUCTION_RUN'
        ? evaluateBaselineReproduction(parent, { pieces: pkg.pieces, bars: pkg.bars })
        : null;
  const topology =
    runKind === 'BASELINE_RESET_VALIDATION' ||
    runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT' ||
    runKind === 'BASELINE_REPRODUCTION_RUN'
      ? evaluateOptimizerTopologyReproduction((oneB ?? parent).bars, pkg.bars)
      : null;

  return {
    ok: true,
    run: {
      fixtureId: pkg.runId,
      parentFixtureId: parent.fixtureId,
      runKind,
      isolationVariable: pkg.isolationVariable,
      status: 'MEASURED',
      designName:
        runKind === 'CONTROL_FIXTURE' || runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT'
          ? pkg.runId
          : parent.designName,
      profileSystem: pkg.profileSystem,
      widthMm: pkg.widthMm,
      heightMm: pkg.heightMm,
      machineId: REQUIRED_ISOLATION_MACHINE_ID,
      observedSettings: { ...pkg.observedSettings },
      intendedIsolation: {
        field: runKind === 'SINGLE_SETTING_ISOLATION' ? isolationField : null,
        instructedToMm:
          runKind === 'SINGLE_SETTING_ISOLATION' && isolationField
            ? ((pkg.observedSettings[isolationField] as number | null) ?? null)
            : null,
        note:
          runKind === 'CONTROL_FIXTURE'
            ? (pkg.controlFixtureNote as string)
            : runKind === 'BASELINE_REPRODUCTION_RUN' ||
                runKind === 'BASELINE_RESET_VALIDATION' ||
                runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT'
              ? (pkg.generalSettingsScreenshotNote as string)
              : (pkg.changedSettingNote as string),
      },
      changedSetting: pkg.changedSetting,
      pieces: pkg.pieces,
      bars: pkg.bars,
      provenance: `Operator package ${pkg.runId} at ${pkg.timestampIso}. ${pkg.generalSettingsScreenshotNote}`,
      reproductionVerdict: reproduction?.verdict ?? null,
      lengthLayerVerdict: lengthLayer
        ? lengthLayer.verdict
        : null,
      topologyVerdict: topology,
      optimizerProvenance: pkg.optimizerProvenance ?? null,
    },
  };
}

export interface IsolationDeltaRow {
  runKind: CalibrationRunKind;
  variableChanged: CalibrationVariable;
  status: CalibrationRunStatus;
  nominalDeltaMm: number | null;
  packedDeltaMm: number | null;
  machineDeltaMm: number | null;
  remainderDeltaMm: number | null;
  interpretation: CompensationInterpretation;
  findings: IsolationFinding[];
  note: string;
}

export function uniquePieceLayerDeltaVsParent(
  parent: DowinCalibrationRun,
  child: DowinCalibrationRun,
  layer: 'nominalMm' | 'packedMm' | 'machineMm',
  categories?: readonly string[]
): number | null {
  const parentById = new Map(pieceDeltasForRun(parent).map((d) => [d.pieceId, d]));
  const diffs: number[] = [];
  for (const childDelta of pieceDeltasForRun(child)) {
    if (categories && !categories.includes(childDelta.category)) continue;
    const parentDelta = parentById.get(childDelta.pieceId);
    if (!parentDelta) continue;
    const delta = subtractMm(childDelta[layer], parentDelta[layer]);
    if (delta != null) diffs.push(delta);
  }
  if (diffs.length === 0) return null;
  const unique = [...new Set(diffs)];
  return unique.length === 1 ? unique[0] : null;
}

export function uniqueBarRemainderDeltaVsParent(
  parent: DowinCalibrationRun,
  child: DowinCalibrationRun,
  profileCodes?: readonly string[]
): number | null {
  const parentBars = parent.bars.filter((b) =>
    profileCodes ? profileCodes.includes(b.profileCode) : true
  );
  const childBars = child.bars.filter((b) =>
    profileCodes ? profileCodes.includes(b.profileCode) : true
  );
  if (parentBars.length === 0 || childBars.length !== parentBars.length) return null;
  const diffs: number[] = [];
  for (let i = 0; i < parentBars.length; i += 1) {
    diffs.push(round1(childBars[i].remainingMm - parentBars[i].remainingMm));
  }
  const unique = [...new Set(diffs)];
  return unique.length === 1 ? unique[0] : null;
}

function packingTopologyChanged(
  parent: DowinCalibrationRun,
  child: DowinCalibrationRun,
  profileCode: string
): boolean {
  const parentBars = parent.bars.filter((b) => b.profileCode === profileCode);
  const childBars = child.bars.filter((b) => b.profileCode === profileCode);
  if (parentBars.length !== childBars.length) return true;
  return parentBars.some((p, i) => {
    const c = childBars[i];
    if (c == null || p.applicationCount !== c.applicationCount) return true;
    if (p.packedSegmentMm.length !== c.packedSegmentMm.length) return true;
    return p.packedSegmentMm.some((v, j) => v !== c.packedSegmentMm[j]);
  });
}

function citaPackingTopologyChanged(
  parent: DowinCalibrationRun,
  child: DowinCalibrationRun
): boolean {
  return packingTopologyChanged(parent, child, CITA_PROFILE_CODE);
}

/**
 * Test 2 authority split. CITA optimizer topology is downstream of lengths
 * and does not veto a unique −3 mm packed/machine effect on 45° KASA/KANAT.
 * Does not authorize a production formula.
 */
export function buildWeldingWasteIsolationFindings(
  parent: DowinCalibrationRun,
  child: DowinCalibrationRun
): IsolationFinding[] {
  const packedWeldable = uniquePieceLayerDeltaVsParent(
    parent,
    child,
    'packedMm',
    WELDABLE_45_CATEGORIES
  );
  const machineWeldable = uniquePieceLayerDeltaVsParent(
    parent,
    child,
    'machineMm',
    WELDABLE_45_CATEGORIES
  );
  const nominalAll = uniquePieceLayerDeltaVsParent(parent, child, 'nominalMm');
  const mullionPacked = uniquePieceLayerDeltaVsParent(parent, child, 'packedMm', ['mullion']);
  const mullionMachine = uniquePieceLayerDeltaVsParent(parent, child, 'machineMm', ['mullion']);
  const kasaKanatRemainder = uniqueBarRemainderDeltaVsParent(
    parent,
    child,
    KASA_KANAT_PROFILE_CODES
  );
  const citaChanged = citaPackingTopologyChanged(parent, child);

  return [
    {
      id: 'kasa-kanat-packed',
      finding: 'Welding Waste 3→0 changes KASA/KANAT packed length by −3 mm',
      classification: packedWeldable === -3 ? 'PROVEN EFFECT' : packedWeldable === 0 ? 'NO OBSERVED EFFECT' : 'AMBIGUOUS',
      note: `Unique packed delta on 45° KASA/KANAT vs parent: ${packedWeldable ?? 'mixed/null'} mm.`,
    },
    {
      id: 'kasa-kanat-machine',
      finding: 'Welding Waste 3→0 changes KASA/KANAT DC-600 machine length by −3 mm',
      classification: machineWeldable === -3 ? 'PROVEN EFFECT' : machineWeldable === 0 ? 'NO OBSERVED EFFECT' : 'AMBIGUOUS',
      note: `Unique Table1 LENGTH delta on 45° KASA/KANAT vs parent: ${machineWeldable ?? 'mixed/null'} mm.`,
    },
    {
      id: 'nominal-report',
      finding: 'Nominal report lengths',
      classification: nominalAll === 0 ? 'NO OBSERVED EFFECT' : nominalAll == null ? 'AMBIGUOUS' : 'AMBIGUOUS',
      note: `Unique nominal delta vs parent: ${nominalAll ?? 'mixed/null'} mm.`,
    },
    {
      id: 'mullion-90',
      finding: '90° mullion',
      classification:
        mullionPacked === 0 && mullionMachine === 0
          ? 'NO OBSERVED EFFECT'
          : 'AMBIGUOUS',
      note: `Mullion packed ${mullionPacked ?? 'null'} / machine ${mullionMachine ?? 'null'} vs parent.`,
    },
    {
      id: 'kasa-kanat-remainder',
      finding: 'KASA/KANAT remainder +12 mm',
      classification: kasaKanatRemainder === 12 ? 'PROVEN CONSISTENT EFFECT' : 'AMBIGUOUS',
      note: `Unique KASA/KANAT remainder delta vs parent: ${kasaKanatRemainder ?? 'mixed/null'} mm (4 pieces × 3 mm).`,
    },
    {
      id: 'cita-topology',
      finding: 'CITA packing topology',
      classification: citaChanged ? 'DOWNSTREAM OPTIMIZER RESPONSE' : 'NO OBSERVED EFFECT',
      note: citaChanged
        ? 'CITA remainder/pattern changed. Downstream of piece lengths; does not veto the KASA/KANAT −3 mm packed/machine result.'
        : 'CITA remainder and packed-segment topology unchanged.',
    },
    {
      id: 'generalized-45-welding-waste',
      finding: 'All 45° profiles always add WeldingWaste',
      classification: 'UNPROVEN GENERALIZATION',
      note: 'One asdd / Deceuninck 70 / DC-600 fixture. Beads are 45° but have no Table1 row. Do not encode a production rule.',
    },
    {
      id: 'proprietary-dowin-formula',
      finding: 'Exact proprietary DoWin formula',
      classification: 'UNPROVEN',
      note: 'Isolation identifies which layers moved. It does not recover DoWin source math.',
    },
  ];
}

/**
 * Test 3 authority split. Packed/machine piece lengths did not move.
 * Remainder is not Saw evidence: reset at Saw=4 did not recover 1B remainders.
 */
export function buildSawThicknessIsolationFindings(
  parent: DowinCalibrationRun,
  child: DowinCalibrationRun
): IsolationFinding[] {
  const packedAll = uniquePieceLayerDeltaVsParent(parent, child, 'packedMm');
  const machineWeldable = uniquePieceLayerDeltaVsParent(
    parent,
    child,
    'machineMm',
    WELDABLE_45_CATEGORIES
  );
  const machineMullion = uniquePieceLayerDeltaVsParent(parent, child, 'machineMm', ['mullion']);
  const nominalAll = uniquePieceLayerDeltaVsParent(parent, child, 'nominalMm');
  const kanatChanged = packingTopologyChanged(parent, child, KANAT_PROFILE_CODE);
  const citaChanged = packingTopologyChanged(parent, child, CITA_PROFILE_CODE);

  return [
    {
      id: 'nominal-report',
      finding: 'Nominal report lengths',
      classification: nominalAll === 0 ? 'NO OBSERVED EFFECT' : 'AMBIGUOUS',
      note: `Unique nominal delta vs parent: ${nominalAll ?? 'mixed/null'} mm.`,
    },
    {
      id: 'packed-piece-length',
      finding: 'Saw Thickness 4→5 changes packed/machine piece length',
      classification:
        packedAll === 0 && machineWeldable === 0 && machineMullion === 0
          ? 'NO OBSERVED EFFECT'
          : 'AMBIGUOUS',
      note: `Unique packed ${packedAll ?? 'mixed/null'} / KASA-KANAT machine ${machineWeldable ?? 'mixed/null'} / mullion machine ${machineMullion ?? 'mixed/null'} mm vs parent.`,
    },
    {
      id: 'bar-remainder-saw-effect',
      finding: 'Saw has a proven bar-remainder effect',
      classification: 'UNPROVEN',
      note: 'KASA 965→960 and ORTA 5080→5079 were observed vs 1B, but BASELINE_RESET_VALIDATION with Saw restored to 4 did not recover 1B remainders. Those remainder deltas cannot be attributed to Saw Thickness.',
    },
    {
      id: 'remainder-signature-confound',
      finding: 'Test-3 remainder signature',
      classification: 'AMBIGUOUS',
      note: 'KASA 960 / ORTA 5079 / CITA 3178×2 persisted through Test 4 and reset at Weld=3 / Saw=4 / Trim=0. Possible persisted optimizer/stock/history state. FP-024C.1 provenance audit is next.',
    },
    {
      id: 'kanat-topology',
      finding: 'KANAT packing topology',
      classification: kanatChanged ? 'DOWNSTREAM OPTIMIZER RESPONSE' : 'NO OBSERVED EFFECT',
      note: kanatChanged
        ? 'KANAT split from 2×[1433,1433,454,454] rem 2203 into [1433×4] rem 240 + [454×4] rem 4156. Not attributed to Saw after reset failure.'
        : 'KANAT remainder and packed-segment topology unchanged.',
    },
    {
      id: 'cita-topology',
      finding: 'CITA packing topology',
      classification: citaChanged ? 'DOWNSTREAM OPTIMIZER RESPONSE' : 'NO OBSERVED EFFECT',
      note: citaChanged
        ? 'CITA remainder/pattern 206/6160 → 3178×2. Downstream optimizer response; not attributed to Saw after reset failure.'
        : 'CITA remainder and packed-segment topology unchanged.',
    },
    {
      id: 'exact-kerf-formula',
      finding: 'Exact remainder delta = N × Δsaw',
      classification: 'UNPROVEN',
      note: 'Not a recovered N×Δsaw identity. Remainder no longer attributed to Saw. Do not encode kerf into production.',
    },
    {
      id: 'proprietary-dowin-formula',
      finding: 'Exact proprietary DoWin formula',
      classification: 'UNPROVEN',
      note: 'Isolation does not recover DoWin source math. Remainder confound is a provenance question, not a formula.',
    },
  ];
}

/**
 * Test 4 authority split. Piece/machine lengths did not move.
 * Remainder is not Trim evidence: the stable-bar signature matched Test 3.
 */
export function buildTrimCutIsolationFindings(
  parent: DowinCalibrationRun,
  child: DowinCalibrationRun
): IsolationFinding[] {
  const packedAll = uniquePieceLayerDeltaVsParent(parent, child, 'packedMm');
  const machineWeldable = uniquePieceLayerDeltaVsParent(
    parent,
    child,
    'machineMm',
    WELDABLE_45_CATEGORIES
  );
  const machineMullion = uniquePieceLayerDeltaVsParent(parent, child, 'machineMm', ['mullion']);
  const nominalAll = uniquePieceLayerDeltaVsParent(parent, child, 'nominalMm');

  return [
    {
      id: 'nominal-report',
      finding: 'Trim 0→10 changes nominal lengths',
      classification: nominalAll === 0 ? 'NO OBSERVED EFFECT' : 'AMBIGUOUS',
      note: `Unique nominal delta vs parent: ${nominalAll ?? 'mixed/null'} mm.`,
    },
    {
      id: 'packed-piece-length',
      finding: 'Trim 0→10 changes packed lengths',
      classification: packedAll === 0 ? 'NO OBSERVED EFFECT' : 'AMBIGUOUS',
      note: `Unique packed delta vs parent: ${packedAll ?? 'mixed/null'} mm.`,
    },
    {
      id: 'machine-length',
      finding: 'Trim 0→10 changes DC-600 LENGTH',
      classification:
        machineWeldable === 0 && machineMullion === 0 ? 'NO OBSERVED EFFECT' : 'AMBIGUOUS',
      note: `Unique KASA/KANAT machine ${machineWeldable ?? 'mixed/null'} / mullion machine ${machineMullion ?? 'mixed/null'} mm vs parent.`,
    },
    {
      id: 'bar-remainder-trim-effect',
      finding: 'Trim has a proven bar-remainder effect',
      classification: 'UNPROVEN',
      note: 'Remainder moved vs 1B, but KASA 960 / ORTA 5079 / CITA 3178×2 are the Test 3 saw signature. Do not attribute that movement to Trim Cut.',
    },
    {
      id: 'remainder-signature-confound',
      finding: 'Test-4 remainder signature',
      classification: 'AMBIGUOUS',
      note: 'Identical to Test 3 on KASA/ORTA/CITA. Possible stale optimization state, a setting that needs a fresh cycle, other persisted state, or an internal relationship. None assumed. BASELINE_RESET_VALIDATION is required before the 90° control.',
    },
    {
      id: 'proprietary-dowin-formula',
      finding: 'Exact proprietary DoWin formula',
      classification: 'UNPROVEN',
      note: 'Isolation identifies which layers did not move. It does not recover DoWin source math.',
    },
  ];
}

export function classifyIsolationPackage(
  findings: readonly IsolationFinding[]
): CompensationInterpretation {
  if (findings.length === 0) return 'AMBIGUOUS';
  const hasProven = findings.some(
    (f) => f.classification === 'PROVEN EFFECT' || f.classification === 'PROVEN CONSISTENT EFFECT'
  );
  const hasOpenQuestion = findings.some(
    (f) =>
      f.classification === 'AMBIGUOUS' ||
      f.classification === 'DOWNSTREAM OPTIMIZER RESPONSE' ||
      f.classification === 'UNPROVEN' ||
      f.classification === 'UNPROVEN GENERALIZATION'
  );
  if (hasProven && hasOpenQuestion) return 'CONDITIONAL';
  if (hasProven) return 'PROVEN EFFECT';
  if (findings.every((f) => f.classification === 'NO OBSERVED EFFECT')) return 'NO OBSERVED EFFECT';
  return 'AMBIGUOUS';
}

/**
 * Operator ingest output: delta table + classification only.
 * Does not patch formulas, K-factor, +3, or +7.
 */
export function buildIsolationDeltaTable(
  runs: readonly DowinCalibrationRun[] = DOWIN_CALIBRATION_RUNS
): IsolationDeltaRow[] {
  const baseline = runs.find((r) => r.runKind === 'BASELINE_SETTINGS_SNAPSHOT');
  return runs.map((run) => {
    if (run.status !== 'MEASURED' || !baseline) {
      return {
        runKind: run.runKind,
        variableChanged: run.isolationVariable,
        status: run.status,
        nominalDeltaMm: null,
        packedDeltaMm: null,
        machineDeltaMm: null,
        remainderDeltaMm: null,
        interpretation: 'NOT MEASURED',
        findings: [],
        note: run.intendedIsolation?.note ?? run.provenance,
      };
    }
    if (run.runKind === 'BASELINE_SETTINGS_SNAPSHOT') {
      const classified = classifyBaselineSettingsSnapshot(run.observedSettings);
      return {
        runKind: run.runKind,
        variableChanged: 'baseline',
        status: 'MEASURED',
        nominalDeltaMm: 0,
        packedDeltaMm: null,
        machineDeltaMm: null,
        remainderDeltaMm: null,
        interpretation: classified.interpretation,
        findings: [],
        note: classified.note,
      };
    }
    if (run.runKind === 'BASELINE_REPRODUCTION_RUN') {
      const reproduction = evaluateBaselineReproduction(baseline, run);
      return {
        runKind: run.runKind,
        variableChanged: 'baselineReproduction',
        status: 'MEASURED',
        nominalDeltaMm: 0,
        packedDeltaMm: null,
        machineDeltaMm: null,
        remainderDeltaMm: null,
        interpretation: 'AMBIGUOUS',
        findings: [],
        note:
          reproduction.verdict === 'REPRODUCED'
            ? 'Contemporaneous baseline: Weld=3 / Saw=4 / Trim=0 reproduces original asdd 451→454, 1430→1433, 1000→1003, 1500→1503 and bar remainders. Tests 2–4 may proceed.'
            : `REPRODUCTION_FAILED. Missing length pairs: ${reproduction.missingPairs.join('; ') || 'none'}. Remainder mismatches: ${reproduction.remainderMismatches.join('; ') || 'none'}. STOP — Tests 2–4 are not clean.`,
      };
    }
    if (run.runKind === 'BASELINE_RESET_VALIDATION') {
      const oneB = findBaselineReproduction(runs) ?? baseline;
      const reset = evaluateBaselineReset(oneB, run);
      return {
        runKind: run.runKind,
        variableChanged: 'baselineReset',
        status: 'MEASURED',
        nominalDeltaMm: 0,
        packedDeltaMm: null,
        machineDeltaMm: null,
        remainderDeltaMm: null,
        interpretation: 'AMBIGUOUS',
        findings: [],
        note:
          reset.verdict === 'REPRODUCED'
            ? 'BASELINE_RESET_VALIDATION recovered 1B: KASA 965 / KANAT 2203 / ORTA 5080 / CITA 206/6160 and machine 454 / 1433 / 1003 / 1503 / 1416. 90° CONTROL_FIXTURE may proceed.'
            : `REPRODUCTION_FAILED. Persistent optimizer/application state. Missing length pairs: ${reset.missingPairs.join('; ') || 'none'}. Remainder mismatches: ${reset.remainderMismatches.join('; ') || 'none'}. STOP — FP-024C.1 provenance audit next. Do not run the 90° CONTROL_FIXTURE.`,
      };
    }
    if (run.runKind === 'OPTIMIZATION_STATE_PROVENANCE_AUDIT') {
      const audit = classifyProvenanceFreshStateExperiment(runs);
      return {
        runKind: run.runKind,
        variableChanged: 'optimizationStateProvenance',
        status: 'MEASURED',
        nominalDeltaMm: 0,
        packedDeltaMm: null,
        machineDeltaMm: null,
        remainderDeltaMm: null,
        interpretation: 'AMBIGUOUS',
        findings: [],
        note: `${audit.verdict}. ${audit.note} Topology: ${audit.topologies.join(', ') || 'none'}. Compare bar-assignment signatures (profile, stock-bar identity/ordinal, piece sequence, packed lengths, remainder), not total utilization.`,
      };
    }
    if (run.runKind === 'CONTROL_FIXTURE') {
      return {
        runKind: run.runKind,
        variableChanged: run.isolationVariable,
        status: 'MEASURED',
        nominalDeltaMm: null,
        packedDeltaMm: null,
        machineDeltaMm: null,
        remainderDeltaMm: null,
        interpretation: 'AMBIGUOUS',
        findings: [],
        note: 'CONTROL_FIXTURE is not a single-setting delta vs asdd. Report within-fixture layers only; do not encode a production formula.',
      };
    }
    const comparisonParent =
      (run.parentFixtureId
        ? runs.find((r) => r.fixtureId === run.parentFixtureId)
        : undefined) ?? baseline;
    const findings =
      run.isolationVariable === 'weldingWaste'
        ? buildWeldingWasteIsolationFindings(comparisonParent, run)
        : run.isolationVariable === 'sawThickness'
          ? buildSawThicknessIsolationFindings(comparisonParent, run)
          : run.isolationVariable === 'trimCut'
            ? buildTrimCutIsolationFindings(comparisonParent, run)
            : [];
    const nominalDeltaMm = uniquePieceLayerDeltaVsParent(comparisonParent, run, 'nominalMm');
    const packedWeldable = uniquePieceLayerDeltaVsParent(
      comparisonParent,
      run,
      'packedMm',
      WELDABLE_45_CATEGORIES
    );
    const machineWeldable = uniquePieceLayerDeltaVsParent(
      comparisonParent,
      run,
      'machineMm',
      WELDABLE_45_CATEGORIES
    );
    const remainder = remainderDeltaMm(comparisonParent, run);
    return {
      runKind: run.runKind,
      variableChanged: run.isolationVariable,
      status: 'MEASURED',
      nominalDeltaMm,
      packedDeltaMm: packedWeldable,
      machineDeltaMm: machineWeldable,
      remainderDeltaMm: remainder,
      interpretation:
        findings.length > 0
          ? classifyIsolationPackage(findings)
          : classifyMeasuredIsolation(
              run.runKind,
              nominalDeltaMm,
              packedWeldable,
              machineWeldable,
              remainder
            ),
      findings,
      note:
        run.fixtureId === 'WELDING_WASTE_0'
          ? 'Test 2 vs 1B: 45° KASA/KANAT packed/machine −3 mm is PROVEN EFFECT. Nominal and 90° mullion NO OBSERVED EFFECT. KASA/KANAT remainder +12 mm is PROVEN CONSISTENT EFFECT. CITA topology is a downstream optimizer response. Package CONDITIONAL. Not encoded as a production formula.'
          : run.fixtureId === 'SAW_THICKNESS_5'
            ? 'Test 3 vs 1B: packed/machine piece lengths NO OBSERVED EFFECT. Remainder 965→960 / 5080→5079 is AMBIGUOUS — reset at Saw=4 did not recover 1B. Saw bar-remainder effect UNPROVEN. Package AMBIGUOUS. Not encoded as a production formula.'
            : run.fixtureId === 'TRIM_CUT_10'
              ? 'Test 4 vs 1B: packed/machine piece lengths NO OBSERVED EFFECT. Remainder signature matched Test 3 (KASA 960 / ORTA 5079 / CITA 3178×2) and is AMBIGUOUS / possible optimizer-state confound. Trim bar-remainder effect UNPROVEN. Not encoded as a production formula.'
          : 'SINGLE_SETTING_ISOLATION delta vs parent. Not encoded as a production formula.',
    };
  });
}

export function buildOperatorIsolationReport(
  runs: readonly DowinCalibrationRun[] = DOWIN_CALIBRATION_RUNS
): {
  evidenceHierarchy: typeof EVIDENCE_HIERARCHY;
  knownExportIdentifiers: typeof DOWIN_ASDD_KNOWN_EXPORT_IDENTIFIERS;
  baselineClassification: ReturnType<typeof classifyBaselineSettingsSnapshot>;
  reproductionVerdict: ReproductionVerdict;
  causalIsolationAuthorized: boolean;
  controlFixtureAuthorized: boolean;
  resetVerdict: ReproductionVerdict;
  provenanceAuditQuestion: typeof FP024C1_AUDIT_QUESTION;
  provenanceAuditVerdict: OptimizationStateProvenanceVerdict;
  deltaTable: IsolationDeltaRow[];
  termAuthority: readonly CompensationTermRecord[];
} {
  const baseline = runs.find((r) => r.runKind === 'BASELINE_SETTINGS_SNAPSHOT');
  const reproduction = findBaselineReproduction(runs);
  const reset = findBaselineReset(runs);
  const provenanceAudit = classifyProvenanceFreshStateExperiment(runs);
  return {
    evidenceHierarchy: EVIDENCE_HIERARCHY,
    knownExportIdentifiers: DOWIN_ASDD_KNOWN_EXPORT_IDENTIFIERS,
    baselineClassification: classifyBaselineSettingsSnapshot(
      baseline?.observedSettings ?? emptyObservedSettings(null)
    ),
    reproductionVerdict: reproduction?.reproductionVerdict ?? 'NOT MEASURED',
    causalIsolationAuthorized: isCausalIsolationAuthorized(runs),
    controlFixtureAuthorized: isControlFixtureAuthorized(runs),
    resetVerdict: reset?.reproductionVerdict ?? 'NOT MEASURED',
    provenanceAuditQuestion: FP024C1_AUDIT_QUESTION,
    provenanceAuditVerdict: provenanceAudit.verdict,
    deltaTable: buildIsolationDeltaTable(runs),
    termAuthority: DOWIN_COMPENSATION_TERM_AUTHORITY,
  };
}

export function asddFrameBarResidual(): BarResidualAttribution {
  const pattern = DOWIN_ASDD_EXTERNAL_BAR_PATTERNS.find((p) => p.id === 'asdd-frame-kasa-6000');
  if (!pattern) throw new Error('missing asdd frame bar pattern');
  return attributeBarResidual(pattern, {
    nominalMm: [1500, 1500, 1000, 1000],
    machineMm: [1503, 1503, 1003, 1003],
    thisRunSawThicknessMm: DOWIN_ASDD_BASELINE_RUN.observedSettings.sawThicknessMm,
    thisRunTrimCutMm: DOWIN_ASDD_BASELINE_RUN.observedSettings.trimCutMm,
  });
}

export function asddSashBarResidual(): BarResidualAttribution {
  const pattern = DOWIN_ASDD_EXTERNAL_BAR_PATTERNS.find((p) => p.id === 'asdd-sash-kanat-6000');
  if (!pattern) throw new Error('missing asdd sash bar pattern');
  return attributeBarResidual(pattern, {
    nominalMm: [1430, 1430, 451, 451],
    machineMm: [1433, 1433, 454, 454],
    thisRunSawThicknessMm: DOWIN_ASDD_BASELINE_RUN.observedSettings.sawThicknessMm,
    thisRunTrimCutMm: DOWIN_ASDD_BASELINE_RUN.observedSettings.trimCutMm,
  });
}

export function asddMullionBarResidual(): BarResidualAttribution {
  const pattern = DOWIN_ASDD_EXTERNAL_BAR_PATTERNS.find((p) => p.id === 'asdd-mullion-orta-6500');
  if (!pattern) throw new Error('missing asdd mullion bar pattern');
  return attributeBarResidual(pattern, {
    nominalMm: [1416],
    machineMm: [1416],
    thisRunSawThicknessMm: DOWIN_ASDD_BASELINE_RUN.observedSettings.sawThicknessMm,
    thisRunTrimCutMm: DOWIN_ASDD_BASELINE_RUN.observedSettings.trimCutMm,
  });
}

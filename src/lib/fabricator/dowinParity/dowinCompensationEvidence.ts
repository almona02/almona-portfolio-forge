/**
 * FP-024B/C — External compensation reconciliation (test/reference only).
 *
 * Sequence: 1A BASELINE_SETTINGS_SNAPSHOT → 1B BASELINE_REPRODUCTION_RUN
 * (same asdd 1000×1500, settings unchanged) → Tests 2–4 SINGLE_SETTING_ISOLATION
 * → Test 5 CONTROL_FIXTURE. Isolation is not authorized until 1B reproduces.
 * Do not encode packed = nominal + 3, do not absorb a hidden +7 mm, and do
 * not feed these values into runtime manufacturing.
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

export type CalibrationVariable =
  | 'baseline'
  | 'baselineReproduction'
  | 'weldingWaste'
  | 'sawThickness'
  | 'trimCut'
  | 'ninetyDegreeControl';

/** How the run is allowed to differ from the asdd parent. */
export type CalibrationRunKind =
  | 'BASELINE_SETTINGS_SNAPSHOT'
  | 'BASELINE_REPRODUCTION_RUN'
  | 'SINGLE_SETTING_ISOLATION'
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
  pair: (typeof ASDD_REQUIRED_REPRODUCTION_PAIRS)[number],
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
  | 'NO OBSERVED EFFECT'
  | 'AMBIGUOUS'
  | 'NOT MEASURED';

export type CompensationTermAuthority = 'PROVEN' | 'SUPPORTED' | 'UNPROVEN';

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
    parentFixtureId: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.id,
    runKind,
    isolationVariable,
    status: 'PENDING_OPERATOR_RUN',
    designName: runKind === 'CONTROL_FIXTURE' ? 'pending-90-control' : 'asdd',
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
    reproductionVerdict: runKind === 'BASELINE_REPRODUCTION_RUN' ? 'NOT MEASURED' : null,
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

export const DOWIN_CALIBRATION_TEMPLATES: readonly DowinCalibrationRun[] = [
  pendingTemplate(
    'dowin-asdd-weld-0-pending',
    'weldingWaste',
    {
      field: 'weldingWasteMm',
      instructedToMm: 0,
      note: 'SINGLE_SETTING_ISOLATION: duplicate asdd. Keep geometry, stock, quantity, system, and DC-600 identical. Change ONLY Welding Waste to 0. Export Design Preview, Labels, Optimization, MDB. 1B is REPRODUCED — this is now a valid causal experiment.',
    },
    'Operator template. Not an executed DoWin run.'
  ),
  pendingTemplate(
    'dowin-asdd-saw-plus-1-pending',
    'sawThickness',
    {
      field: 'sawThicknessMm',
      instructedToMm: 5,
      note: 'SINGLE_SETTING_ISOLATION: return weld to baseline. Keep geometry, stock, quantity, system, and DC-600 identical. Change ONLY Saw Thickness 4 → 5. 1B is REPRODUCED — this is now a valid causal experiment.',
    },
    'Operator template. Instructed Saw Thickness target is 5 mm after a 4 mm contemporaneous baseline.'
  ),
  pendingTemplate(
    'dowin-asdd-trim-plus-delta-pending',
    'trimCut',
    {
      field: 'trimCutMm',
      instructedToMm: null,
      note: 'SINGLE_SETTING_ISOLATION: return saw to baseline. Keep geometry, stock, quantity, system, and DC-600 identical. Change ONLY Trim Cut from 0 to a known value. Compare remainder and packed/machine. 1B is REPRODUCED — this is now a valid causal experiment.',
    },
    'Operator template. Trim Cut baseline is 0. Instructed target stays null until the operator picks a known non-zero value.'
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
    evidence: 'This job: frame/sash/bead packed − nominal = 3 mm. Not isolated to Welding Waste. Do not encode +3.',
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
    term: 'Welding Waste',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence: 'Live General Settings: Welding Waste = 3 mm. Test 2 not executed. Do not encode packed = nominal + 3.',
  },
  {
    term: 'Saw Thickness',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence: 'Live General Settings: Saw Thickness = 4 mm. Test 3 not executed. Do not encode remainder with a hidden constant.',
  },
  {
    term: 'Trim Cut',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence: 'Live General Settings: Trim Cut = 0 mm. Test 4 not executed. Leftover 7 mm after packed + N×4 remains unexplained.',
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

function barsIdenticalForIsolation(
  parent: readonly ExternalBarPattern[],
  child: readonly ExternalBarPattern[]
): boolean {
  if (parent.length !== child.length) return false;
  return parent.every((p, i) => {
    const c = child[i];
    return (
      c != null &&
      p.profileCode === c.profileCode &&
      p.stockLengthMm === c.stockLengthMm &&
      p.applicationCount === c.applicationCount &&
      p.packedSegmentMm.length === c.packedSegmentMm.length
    );
  });
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
  if (runKind === 'CONTROL_FIXTURE' || runKind === 'BASELINE_SETTINGS_SNAPSHOT' || runKind === 'BASELINE_REPRODUCTION_RUN') {
    return 'AMBIGUOUS';
  }
  const layers = [nominalDeltaMm, packedDeltaMm, machineDeltaMm, remainderDeltaMmValue];
  if (layers.every((n) => n == null)) return 'AMBIGUOUS';
  if (layers.every((n) => n == null || n === 0)) return 'NO OBSERVED EFFECT';
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
  const reproduction =
    runKind === 'BASELINE_REPRODUCTION_RUN'
      ? evaluateBaselineReproduction(parent, { pieces: pkg.pieces, bars: pkg.bars })
      : null;

  return {
    ok: true,
    run: {
      fixtureId: pkg.runId,
      parentFixtureId: parent.fixtureId,
      runKind,
      isolationVariable: pkg.isolationVariable,
      status: 'MEASURED',
      designName: runKind === 'CONTROL_FIXTURE' ? pkg.runId : parent.designName,
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
            : runKind === 'BASELINE_REPRODUCTION_RUN'
              ? (pkg.generalSettingsScreenshotNote as string)
              : (pkg.changedSettingNote as string),
      },
      changedSetting: pkg.changedSetting,
      pieces: pkg.pieces,
      bars: pkg.bars,
      provenance: `Operator package ${pkg.runId} at ${pkg.timestampIso}. ${pkg.generalSettingsScreenshotNote}`,
      reproductionVerdict: reproduction?.verdict ?? null,
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
  note: string;
}

function meanDeltaByPieceId(
  parent: DowinCalibrationRun,
  child: DowinCalibrationRun,
  layer: 'nominalMm' | 'packedMm' | 'machineMm'
): number | null {
  const parentById = new Map(pieceDeltasForRun(parent).map((d) => [d.pieceId, d]));
  const diffs: number[] = [];
  for (const childDelta of pieceDeltasForRun(child)) {
    const parentDelta = parentById.get(childDelta.pieceId);
    if (!parentDelta) continue;
    const delta = subtractMm(childDelta[layer], parentDelta[layer]);
    if (delta != null) diffs.push(delta);
  }
  if (diffs.length === 0) return null;
  const unique = [...new Set(diffs)];
  return unique.length === 1 ? unique[0] : null;
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
        note:
          reproduction.verdict === 'REPRODUCED'
            ? 'Contemporaneous baseline: Weld=3 / Saw=4 / Trim=0 reproduces original asdd 451→454, 1430→1433, 1000→1003, 1500→1503 and bar remainders. Tests 2–4 may proceed.'
            : `REPRODUCTION_FAILED. Missing length pairs: ${reproduction.missingPairs.join('; ') || 'none'}. Remainder mismatches: ${reproduction.remainderMismatches.join('; ') || 'none'}. STOP — Tests 2–4 are not clean.`,
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
        note: 'CONTROL_FIXTURE is not a single-setting delta vs asdd. Report within-fixture layers only; do not encode a production formula.',
      };
    }
    const nominalDeltaMm = meanDeltaByPieceId(baseline, run, 'nominalMm');
    const packedDeltaMm = meanDeltaByPieceId(baseline, run, 'packedMm');
    const machineDeltaMm = meanDeltaByPieceId(baseline, run, 'machineMm');
    const remainder = remainderDeltaMm(baseline, run);
    return {
      runKind: run.runKind,
      variableChanged: run.isolationVariable,
      status: 'MEASURED',
      nominalDeltaMm,
      packedDeltaMm,
      machineDeltaMm,
      remainderDeltaMm: remainder,
      interpretation: classifyMeasuredIsolation(
        run.runKind,
        nominalDeltaMm,
        packedDeltaMm,
        machineDeltaMm,
        remainder
      ),
      note: 'SINGLE_SETTING_ISOLATION delta vs asdd. Not encoded as a production formula.',
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
  deltaTable: IsolationDeltaRow[];
  termAuthority: readonly CompensationTermRecord[];
} {
  const baseline = runs.find((r) => r.runKind === 'BASELINE_SETTINGS_SNAPSHOT');
  const reproduction = findBaselineReproduction(runs);
  return {
    evidenceHierarchy: EVIDENCE_HIERARCHY,
    knownExportIdentifiers: DOWIN_ASDD_KNOWN_EXPORT_IDENTIFIERS,
    baselineClassification: classifyBaselineSettingsSnapshot(
      baseline?.observedSettings ?? emptyObservedSettings(null)
    ),
    reproductionVerdict: reproduction?.reproductionVerdict ?? 'NOT MEASURED',
    causalIsolationAuthorized: isCausalIsolationAuthorized(runs),
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

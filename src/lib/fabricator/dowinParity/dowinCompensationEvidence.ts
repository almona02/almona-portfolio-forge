/**
 * FP-024B — External compensation reconciliation (test/reference only).
 *
 * Controlled DoWin runs isolate one General Settings field at a time.
 * Do not encode packed = nominal + 3, do not absorb a hidden +7 mm,
 * and do not feed these values into runtime manufacturing.
 *
 * @see docs/audits/FP-024B-DOWIN-COMPENSATION-RECONCILIATION_2026-09-09.md
 */

import { kerfLossOnBarMm } from '@/lib/fabricator/barPackAccounting';
import {
  DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
  type ExternalBarPattern,
} from '@/lib/fabricator/barPackExternalReconciliation';
import {
  DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION,
  type DowinJobObservedSettings,
  type DowinPhysicalLengthGoldenRow,
} from '@/lib/fabricator/golden/dowinPhysicalLengthFixture';

export type CalibrationVariable =
  | 'baseline'
  | 'weldingWaste'
  | 'sawThickness'
  | 'trimCut'
  | 'ninetyDegreeControl';

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

export interface IntendedIsolation {
  field: keyof DowinJobObservedSettings;
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
  isolationVariable: CalibrationVariable;
  status: CalibrationRunStatus;
  designName: string;
  profileSystem: string;
  widthMm: number;
  heightMm: number;
  machineId: string | null;
  observedSettings: DowinJobObservedSettings;
  intendedIsolation: IntendedIsolation | null;
  pieces: DowinPhysicalLengthGoldenRow[];
  bars: readonly ExternalBarPattern[];
  provenance: string;
}

function pendingTemplate(
  fixtureId: string,
  isolationVariable: Exclude<CalibrationVariable, 'baseline'>,
  intendedIsolation: IntendedIsolation,
  provenance: string
): DowinCalibrationRun {
  return {
    fixtureId,
    parentFixtureId: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.id,
    isolationVariable,
    status: 'PENDING_OPERATOR_RUN',
    designName: 'asdd',
    profileSystem: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.profileSystem,
    widthMm: 1000,
    heightMm: 1500,
    machineId: null,
    observedSettings: emptyObservedSettings(null),
    intendedIsolation,
    pieces: [],
    bars: [],
    provenance,
  };
}

export const DOWIN_ASDD_BASELINE_RUN: DowinCalibrationRun = {
  fixtureId: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.id,
  parentFixtureId: null,
  isolationVariable: 'baseline',
  status: 'MEASURED',
  designName: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.designName,
  profileSystem: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.profileSystem,
  widthMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallWidthMm,
  heightMm: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallHeightMm,
  machineId: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.jobSettings.machineId,
  observedSettings: { ...DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.jobSettings },
  intendedIsolation: null,
  pieces: DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows,
  bars: DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
  provenance:
    'Licensed asdd PDFs + DC-600 Table1 millimetres. General Settings for this run were not transcribed.',
};

export const DOWIN_CALIBRATION_TEMPLATES: readonly DowinCalibrationRun[] = [
  pendingTemplate(
    'dowin-asdd-weld-0-pending',
    'weldingWaste',
    {
      field: 'weldingWasteMm',
      instructedToMm: 0,
      note: 'Duplicate asdd. Change ONLY Welding Waste to 0. Export Design Preview, Labels, Optimization, MDB.',
    },
    'Operator template. Not an executed DoWin run.'
  ),
  pendingTemplate(
    'dowin-asdd-saw-plus-1-pending',
    'sawThickness',
    {
      field: 'sawThicknessMm',
      instructedToMm: null,
      note: 'Return weld to baseline. Change ONLY Saw Thickness by a known +1 mm from the transcribed baseline. Baseline saw is still null.',
    },
    'Operator template. Saw Thickness baseline is unknown, so the instructed target stays null until Test 1 is filled.'
  ),
  pendingTemplate(
    'dowin-asdd-trim-plus-delta-pending',
    'trimCut',
    {
      field: 'trimCutMm',
      instructedToMm: null,
      note: 'Return saw to baseline. Change ONLY Trim Cut by a known delta. Compare remainder and packed/machine.',
    },
    'Operator template. Trim Cut baseline is unknown.'
  ),
  pendingTemplate(
    'dowin-asdd-90-control-pending',
    'ninetyDegreeControl',
    {
      field: 'machineId',
      instructedToMm: null,
      note: 'Simple 90°/90° physical cut. Compare nominal vs packed vs machine. Do not change General Settings.',
    },
    'Operator template. Mullion on asdd is a same-job 90° observation, not an isolated control design.'
  ),
];

export const DOWIN_CALIBRATION_RUNS: readonly DowinCalibrationRun[] = [
  DOWIN_ASDD_BASELINE_RUN,
  ...DOWIN_CALIBRATION_TEMPLATES,
];

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
    evidence: 'Test 2 not executed. This-run Welding Waste is null.',
  },
  {
    term: 'Saw Thickness',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence: 'Test 3 not executed. This-run Saw Thickness is null.',
  },
  {
    term: 'Trim Cut',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence: 'Test 4 not executed. Candidate for leftover after packed labels; not encoded as +7.',
  },
  {
    term: 'KASA/KANAT leftover after packed + named-parity N×4 kerf',
    authority: 'UNPROVEN',
    proposedForFp024c: false,
    evidence: 'Hypothesis leftover 7 mm if saw were 4 and trim 0. External bar parity CONDITIONAL.',
  },
];

export const OPERATOR_EVIDENCE_PACKAGE_CHECKLIST = [
  'Screenshot of General Settings before the run',
  'Exact design dimensions / system / machine',
  'Design Preview PDF',
  'Assembly/Labels PDF',
  'Optimization PDF',
  'MDB machine export where applicable',
  'Timestamp / run ID',
  'Note showing exactly one changed setting',
] as const;

export interface OperatorEvidencePackage {
  runId: string;
  timestampIso: string | null;
  generalSettingsScreenshotNote: string | null;
  changedSettingNote: string | null;
  sourceHashesSha256: {
    designPreview?: string | null;
    assemblyLabels?: string | null;
    optimization?: string | null;
    mdb?: string | null;
  };
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

export function ingestOperatorCalibrationRun(
  parent: DowinCalibrationRun,
  pkg: OperatorEvidencePackage
): OperatorIngestResult {
  const reasons: string[] = [];
  if (!pkg.generalSettingsScreenshotNote) {
    reasons.push('General Settings screenshot/transcription is missing.');
  }
  if (!pkg.changedSettingNote) {
    reasons.push('Note identifying the single changed setting is missing.');
  }
  if (!pkg.timestampIso) {
    reasons.push('Timestamp / run ID timestamp is missing.');
  }
  if (!pkg.sourceHashesSha256.designPreview) reasons.push('Design Preview PDF hash is missing.');
  if (!pkg.sourceHashesSha256.assemblyLabels) reasons.push('Assembly/Labels PDF hash is missing.');
  if (!pkg.sourceHashesSha256.optimization) reasons.push('Optimization PDF hash is missing.');

  const changed = changedObservedSettingKeys(parent.observedSettings, pkg.observedSettings);
  if (pkg.isolationVariable === 'ninetyDegreeControl') {
    if (changed.length > 0) {
      reasons.push('90° control must keep General Settings identical to the parent.');
    }
  } else if (pkg.isolationVariable === 'baseline') {
    if (changed.length === 0 && pkg.observedSettings.weldingWasteMm == null) {
      reasons.push('Baseline settings snapshot still has unknown Welding Waste.');
    }
  } else {
    if (changed.length !== 1) {
      reasons.push(
        `Isolation run must change exactly one setting; changed: ${changed.join(', ') || 'none'}.`
      );
    }
    if (pkg.widthMm !== parent.widthMm || pkg.heightMm !== parent.heightMm) {
      reasons.push('Do not change geometry between the first three isolation runs.');
    }
    if (pkg.profileSystem !== parent.profileSystem) {
      reasons.push('Do not change profile system between isolation runs.');
    }
  }

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  return {
    ok: true,
    run: {
      fixtureId: pkg.runId,
      parentFixtureId: parent.fixtureId,
      isolationVariable: pkg.isolationVariable,
      status: 'MEASURED',
      designName: parent.designName,
      profileSystem: pkg.profileSystem,
      widthMm: pkg.widthMm,
      heightMm: pkg.heightMm,
      machineId: pkg.observedSettings.machineId,
      observedSettings: { ...pkg.observedSettings },
      intendedIsolation: {
        field:
          pkg.isolationVariable === 'ninetyDegreeControl'
            ? 'machineId'
            : ((changed[0] ?? 'weldingWasteMm') as keyof DowinJobObservedSettings),
        instructedToMm:
          pkg.isolationVariable === 'ninetyDegreeControl' || !changed[0] || changed[0] === 'machineId'
            ? null
            : ((pkg.observedSettings[changed[0]] as number | null) ?? null),
        note: pkg.changedSettingNote as string,
      },
      pieces: pkg.pieces,
      bars: pkg.bars,
      provenance: `Operator package ${pkg.runId} at ${pkg.timestampIso}. ${pkg.generalSettingsScreenshotNote}`,
    },
  };
}

export interface IsolationDeltaRow {
  variableChanged: CalibrationVariable;
  status: CalibrationRunStatus;
  nominalDeltaMm: number | null;
  packedDeltaMm: number | null;
  machineDeltaMm: number | null;
  remainderDeltaMm: number | null;
  interpretation: CompensationInterpretation | 'SUPPORTED';
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

export function buildIsolationDeltaTable(
  runs: readonly DowinCalibrationRun[] = DOWIN_CALIBRATION_RUNS
): IsolationDeltaRow[] {
  const baseline = runs.find((r) => r.isolationVariable === 'baseline');
  return runs.map((run) => {
    if (run.status !== 'MEASURED' || !baseline) {
      return {
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
    if (run.isolationVariable === 'baseline') {
      return {
        variableChanged: 'baseline',
        status: 'MEASURED',
        nominalDeltaMm: 0,
        packedDeltaMm: null,
        machineDeltaMm: null,
        remainderDeltaMm: null,
        interpretation: 'AMBIGUOUS',
        note: 'Baseline lengths measured; General Settings screenshot still required before attributing +3 mm.',
      };
    }
    return {
      variableChanged: run.isolationVariable,
      status: 'MEASURED',
      nominalDeltaMm: meanDeltaByPieceId(baseline, run, 'nominalMm'),
      packedDeltaMm: meanDeltaByPieceId(baseline, run, 'packedMm'),
      machineDeltaMm: meanDeltaByPieceId(baseline, run, 'machineMm'),
      remainderDeltaMm: null,
      interpretation: 'SUPPORTED',
      note: 'Ingested operator isolation run. Not encoded as a production formula.',
    };
  });
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

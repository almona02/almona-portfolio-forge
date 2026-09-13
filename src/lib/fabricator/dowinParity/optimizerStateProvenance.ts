/**
 * FP-024C.1 — Optimizer input/result provenance and topology identity.
 *
 * Diagnostic / operator-evidence only. Does not change production packing,
 * K-factor, kerf identity, or Cut lengths.
 *
 * Answers one question: why identical visible geometry/settings can produce
 * different optimization remainder topology.
 */

import type { ExternalBarPattern } from '@/lib/fabricator/barPackExternalReconciliation';
import {
  fingerprintSha256,
  optimizerInputFingerprintSha256,
} from '@/lib/fabricator/dowinParity/canonicalFingerprint';
import {
  evaluateFp024c13GoldenReplay,
  FP024C13_FAIL_CLOSED_CASES,
  FP024C13_GOLDEN_CASES,
  FP024C13_SOURCE_LAYER,
  FP024C13_TARGET_LAYER,
} from '@/lib/fabricator/dowinParity/fp024c13GoldenReplay';
import type {
  DowinJobObservedSettings,
  DowinLengthCategory,
  DowinPhysicalLengthGoldenRow,
} from '@/lib/fabricator/golden/dowinPhysicalLengthFixture';

export const FP024C1_AUDIT_QUESTION =
  'Why can identical visible geometry/settings produce different optimization remainder topology?';

export const FP024C1_DECISIVE_EXPERIMENT =
  'same geometry + Weld 3 / Saw 4 / Trim 0 + same stock quantities + fresh project/design + fresh production plan + fresh optimization result';

export const FP024C1_MIN_FRESH_RUNS_FOR_CONSISTENCY = 3;

/** Fresh A + B + C before claiming repeatability or nondeterminism. */
export const FP024C1_MIN_FRESH_RUNS_FOR_NONDETERMINISM = 3;

export const FP024C1_FRESH_SLOTS = ['A', 'B', 'C'] as const;
export type Fp024c1FreshSlot = (typeof FP024C1_FRESH_SLOTS)[number];

export const FP024C1_FRESH_RUN_IDS = [
  'FP024C1_FRESH_A',
  'FP024C1_FRESH_B',
  'FP024C1_FRESH_C',
] as const;

export const FP024C1_REQUIRED_LIVE_SETTINGS = {
  weldingWasteMm: 3,
  sawThicknessMm: 4,
  trimCutMm: 0,
  machineId: 'DC-600',
} as const;

export type OptimizerSolveKind = 'NEWLY_SOLVED' | 'REOPENED_REUSED';

export type OptimizerSolveDisposition = 'NEWLY_SOLVED' | 'REOPENED' | 'REUSED' | 'UNKNOWN';

export type AsddAssignmentTopology = 'ORIGINAL_1B' | 'LATER_TEST3_4' | 'OTHER';

export type OptimizerInputEquivalence = 'IDENTICAL' | 'DIFFERENT' | 'UNPROVEN';

export type OptimizationStateProvenanceVerdict =
  | 'PENDING_OPERATOR_RUN'
  | 'PERSISTED_STATE_EFFECT_PROVEN'
  | 'ALTERNATIVE_OPTIMIZER_SOLUTION'
  | 'OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING'
  | 'HIDDEN_INPUT_DIFFERENCE'
  | 'AMBIGUOUS';

/** @deprecated Use OptimizationStateProvenanceVerdict. */
export type ProvenanceAuditVerdict = OptimizationStateProvenanceVerdict;

export interface OptimizationSettingsSnapshot {
  weldingWasteMm: number | null;
  sawThicknessMm: number | null;
  trimCutMm: number | null;
  sashOffsetMm: number | null;
  remnantThresholdMm: number | null;
  glazingClearanceMm: number | null;
  machineId: string | null;
}

export interface GeometrySnapshot {
  widthMm: number;
  heightMm: number;
  profileSystem: string;
}

export interface RequiredPartSnapshot {
  physicalCutId: string | null;
  sourceCutId: string | null;
  externalPieceId: string;
  role: string | null;
  packedLengthMm: number | null;
  leftAngleDeg: number | null;
  rightAngleDeg: number | null;
  quantity: number;
}

export interface StockBarSnapshot {
  profileCode: string;
  stockLengthMm: number;
  ordinal: number;
  quantity: number;
}

export interface OffcutRemnantSnapshot {
  profileCode: string;
  lengthMm: number;
  quantity: number;
}

export interface OptimizerRunProvenance {
  runId?: string | null;
  timestampIso: string | null;
  projectId: string | null;
  designId: string | null;
  productionPlanId: string | null;
  optimizationResultId: string | null;
  optimizationHistoryId?: string | null;
  solveKind: OptimizerSolveKind | null;
  solveDisposition?: OptimizerSolveDisposition | null;
  optimizerId?: string | null;
  optimizerVersion?: string | null;
  algorithm?: string | null;
  seed?: string | number | null;
  requiredPartsSnapshotId: string | null;
  stockSnapshotId: string | null;
  offcutRemnantSnapshotId: string | null;
  machineId: string | null;
  settingsSnapshotSha256: string | null;
  settingsSnapshot?: OptimizationSettingsSnapshot | null;
  geometrySnapshot?: GeometrySnapshot | null;
  requiredPartsSnapshot?: readonly RequiredPartSnapshot[] | null;
  stockSnapshot?: readonly StockBarSnapshot[] | null;
  offcutRemnantSnapshot?: readonly OffcutRemnantSnapshot[] | null;
  geometryFingerprint?: string | null;
  requiredPartsFingerprint?: string | null;
  stockFingerprint?: string | null;
  offcutRemnantFingerprint?: string | null;
  settingsFingerprint?: string | null;
  sourceHashesSha256?: {
    generalSettingsScreenshot?: string | null;
    designPreview?: string | null;
    assemblyLabels?: string | null;
    optimization?: string | null;
    machineExport?: string | null;
  };
}

export interface TopologyPieceSignature {
  physicalCutId: string | null;
  sourceCutId: string | null;
  externalPieceId: string | null;
  role: string | null;
  packedLengthMm: number;
  leftAngleDeg: number | null;
  rightAngleDeg: number | null;
}

export interface BarAssignmentSignature {
  profileCode: string;
  stockBarId: string | null;
  stockBarOrdinal: number;
  stockLengthMm: number;
  applicationCount: number;
  pieces: TopologyPieceSignature[];
  remainingMm: number;
}

export const FP024C1_PROVENANCE_AUDIT_CHECKLIST = [
  'project/design ID',
  'production-plan ID',
  'optimization-result/history ID',
  'required-parts snapshot',
  'stock snapshot',
  'offcut/remnant snapshot',
  'machine',
  'settings snapshot',
  'timestamp',
  'whether the result was newly solved or reopened/reused',
] as const;

function nonempty(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function solveDispositionOf(
  provenance: OptimizerRunProvenance | null | undefined
): OptimizerSolveDisposition {
  if (!provenance) return 'UNKNOWN';
  if (provenance.solveDisposition) return provenance.solveDisposition;
  if (provenance.solveKind === 'NEWLY_SOLVED') return 'NEWLY_SOLVED';
  if (provenance.solveKind === 'REOPENED_REUSED') return 'REUSED';
  return 'UNKNOWN';
}

export function missingOptimizerProvenanceFields(
  provenance: OptimizerRunProvenance | null | undefined
): string[] {
  if (!provenance) return [...FP024C1_PROVENANCE_AUDIT_CHECKLIST];
  const missing: string[] = [];
  if (!nonempty(provenance.projectId) || !nonempty(provenance.designId)) {
    missing.push('project/design ID');
  }
  if (!nonempty(provenance.productionPlanId)) missing.push('production-plan ID');
  if (!nonempty(provenance.optimizationResultId) && !nonempty(provenance.optimizationHistoryId)) {
    missing.push('optimization-result/history ID');
  }
  if (!nonempty(provenance.requiredPartsSnapshotId) && provenance.requiredPartsSnapshot == null) {
    missing.push('required-parts snapshot');
  }
  if (!nonempty(provenance.stockSnapshotId) && provenance.stockSnapshot == null) {
    missing.push('stock snapshot');
  }
  if (!nonempty(provenance.offcutRemnantSnapshotId) && provenance.offcutRemnantSnapshot == null) {
    missing.push('offcut/remnant snapshot');
  }
  if (!nonempty(provenance.machineId)) missing.push('machine');
  if (!nonempty(provenance.settingsSnapshotSha256) && provenance.settingsSnapshot == null) {
    missing.push('settings snapshot');
  }
  if (!nonempty(provenance.timestampIso)) missing.push('timestamp');
  if (solveDispositionOf(provenance) === 'UNKNOWN') {
    missing.push('whether the result was newly solved or reopened/reused');
  }
  return missing;
}

export function isOptimizerProvenanceComplete(
  provenance: OptimizerRunProvenance | null | undefined
): boolean {
  return missingOptimizerProvenanceFields(provenance).length === 0;
}

export function settingsSnapshotFromObserved(
  settings: DowinJobObservedSettings
): OptimizationSettingsSnapshot {
  return {
    weldingWasteMm: settings.weldingWasteMm,
    sawThicknessMm: settings.sawThicknessMm,
    trimCutMm: settings.trimCutMm,
    sashOffsetMm: settings.sashOffsetMm,
    remnantThresholdMm: settings.remnantThresholdMm,
    glazingClearanceMm: settings.glazingClearanceMm,
    machineId: settings.machineId,
  };
}

export function requiredPartsSnapshotFromPieces(
  pieces: readonly DowinPhysicalLengthGoldenRow[]
): RequiredPartSnapshot[] {
  return pieces
    .filter((piece) => piece.category !== 'glass' && piece.category !== 'angle_compensation')
    .map((piece) => ({
      physicalCutId: piece.pieceId,
      sourceCutId: piece.pieceId,
      externalPieceId: piece.pieceId,
      role: piece.category,
      packedLengthMm: piece.expectedPackedSegmentMm,
      leftAngleDeg: piece.leftAngleDeg,
      rightAngleDeg: piece.rightAngleDeg,
      quantity: 1,
    }))
    .sort((a, b) => a.externalPieceId.localeCompare(b.externalPieceId));
}

export function stockSnapshotFromBars(bars: readonly ExternalBarPattern[]): StockBarSnapshot[] {
  const grouped = new Map<string, StockBarSnapshot>();
  for (const bar of bars) {
    const key = `${bar.profileCode}|${bar.stockLengthMm}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += bar.applicationCount;
    } else {
      grouped.set(key, {
        profileCode: bar.profileCode,
        stockLengthMm: bar.stockLengthMm,
        ordinal: grouped.size,
        quantity: bar.applicationCount,
      });
    }
  }
  return [...grouped.values()].sort(
    (a, b) => a.profileCode.localeCompare(b.profileCode) || a.stockLengthMm - b.stockLengthMm
  );
}

export function attachOptimizerInputFingerprints(
  provenance: OptimizerRunProvenance
): OptimizerRunProvenance {
  const geometry = provenance.geometrySnapshot ?? null;
  const parts = provenance.requiredPartsSnapshot ?? null;
  const stock = provenance.stockSnapshot ?? null;
  const offcut = provenance.offcutRemnantSnapshot ?? null;
  const settings = provenance.settingsSnapshot ?? null;
  return {
    ...provenance,
    geometryFingerprint: geometry
      ? optimizerInputFingerprintSha256({ unit: 'mm', geometry })
      : null,
    requiredPartsFingerprint: parts
      ? optimizerInputFingerprintSha256({ unit: 'mm', parts })
      : null,
    stockFingerprint: stock ? optimizerInputFingerprintSha256({ unit: 'mm', stock }) : null,
    offcutRemnantFingerprint: offcut
      ? optimizerInputFingerprintSha256({ unit: 'mm', offcut })
      : null,
    settingsFingerprint: settings
      ? optimizerInputFingerprintSha256({ unit: 'mm', settings })
      : null,
  };
}

export function freshOptimizerProvenance(
  overrides: Partial<OptimizerRunProvenance> = {}
): OptimizerRunProvenance {
  const solveKind = overrides.solveKind ?? 'NEWLY_SOLVED';
  const solveDisposition =
    overrides.solveDisposition ??
    (solveKind === 'NEWLY_SOLVED'
      ? 'NEWLY_SOLVED'
      : solveKind === 'REOPENED_REUSED'
        ? 'REUSED'
        : 'UNKNOWN');
  const { solveKind: _sk, solveDisposition: _sd, ...rest } = overrides;
  const base: OptimizerRunProvenance = {
    runId: 'fresh-fp024c1',
    timestampIso: '2026-09-10T21:00:00.000Z',
    projectId: 'fresh-project-fp024c1',
    designId: 'fresh-design-fp024c1',
    productionPlanId: 'fresh-plan-fp024c1',
    optimizationResultId: 'fresh-result-fp024c1',
    optimizationHistoryId: 'fresh-history-fp024c1',
    optimizerId: null,
    optimizerVersion: null,
    algorithm: null,
    seed: null,
    requiredPartsSnapshotId: 'fresh-parts-fp024c1',
    stockSnapshotId: 'stock-same-as-1b',
    offcutRemnantSnapshotId: 'offcut-fresh-fp024c1',
    machineId: 'DC-600',
    settingsSnapshotSha256: 'settings-weld3-saw4-trim0',
    settingsSnapshot: null,
    geometrySnapshot: null,
    requiredPartsSnapshot: null,
    stockSnapshot: null,
    offcutRemnantSnapshot: null,
    ...rest,
    solveKind,
    solveDisposition,
  };
  return attachOptimizerInputFingerprints(base);
}

/** Proven-equivalent asdd inputs for the decisive experiment (Weld 3 / Saw 4 / Trim 0). */
export function asddEquivalentInputProvenance(
  pieces: readonly DowinPhysicalLengthGoldenRow[],
  bars: readonly ExternalBarPattern[],
  settings: DowinJobObservedSettings,
  overrides: Partial<OptimizerRunProvenance> = {}
): OptimizerRunProvenance {
  return attachOptimizerInputFingerprints(
    freshOptimizerProvenance({
      geometrySnapshot: {
        widthMm: 1000,
        heightMm: 1500,
        profileSystem: "Deceuninck 70'lik PVC Sistemi",
      },
      requiredPartsSnapshot: requiredPartsSnapshotFromPieces(pieces),
      stockSnapshot: stockSnapshotFromBars(bars),
      offcutRemnantSnapshot: [],
      settingsSnapshot: settingsSnapshotFromObserved(settings),
      machineId: settings.machineId,
      ...overrides,
    })
  );
}

export function compareOptimizerInputFingerprints(
  a: OptimizerRunProvenance | null | undefined,
  b: OptimizerRunProvenance | null | undefined
): OptimizerInputEquivalence {
  if (!a || !b) return 'UNPROVEN';
  const keys = [
    'geometryFingerprint',
    'requiredPartsFingerprint',
    'stockFingerprint',
    'offcutRemnantFingerprint',
    'settingsFingerprint',
  ] as const;
  const missing = keys.some((key) => !nonempty(a[key] ?? null) || !nonempty(b[key] ?? null));
  if (missing) return 'UNPROVEN';
  if (keys.some((key) => a[key] !== b[key])) return 'DIFFERENT';
  return 'IDENTICAL';
}

export function hasCompleteInputFingerprints(
  provenance: OptimizerRunProvenance | null | undefined
): boolean {
  if (!provenance) return false;
  return (
    nonempty(provenance.geometryFingerprint ?? null) &&
    nonempty(provenance.requiredPartsFingerprint ?? null) &&
    nonempty(provenance.stockFingerprint ?? null) &&
    nonempty(provenance.offcutRemnantFingerprint ?? null) &&
    nonempty(provenance.settingsFingerprint ?? null)
  );
}

export function isClearScreenNotFreshness(args: {
  runId: string;
  projectId: string | null;
  designId: string | null;
  clearScreenClaimedFresh?: boolean;
}): boolean {
  if (args.clearScreenClaimedFresh === true) return true;
  const reusedNames = new Set(['asdd', 'asdasd', '100001']);
  return (
    reusedNames.has(args.runId) ||
    reusedNames.has(args.projectId ?? '') ||
    reusedNames.has(args.designId ?? '')
  );
}

export type AlmonaReproducibilityRisk =
  | 'INPUT_IDENTITY_ONLY'
  | 'TOPOLOGY_AFFECTING'
  | 'RESULT_METADATA_ONLY'
  | 'PERSISTENCE_ONLY'
  | 'ADVISORY_ONLY'
  | 'UNKNOWN';

export interface AlmonaReproducibilitySurface {
  surface: string;
  fileLine: string;
  classification: AlmonaReproducibilityRisk;
  defect?: 'ALMONA_REPRODUCIBILITY_DEFECT';
  note: string;
}

/**
 * ALMONA-only forensic classification. Does not explain DoWin.
 * Production optimizer behavior is not patched here.
 */
export const ALMONA_REPRODUCIBILITY_SURFACES: readonly AlmonaReproducibilitySurface[] = [
  {
    surface: 'AdaptiveSolver constructed per OptimizationPage run',
    fileLine: 'src/pages/fabricator/workflow/OptimizationPage.tsx:78-107',
    classification: 'INPUT_IDENTITY_ONLY',
    note: 'New solver instance each click. Does not by itself reuse a prior cutting plan.',
  },
  {
    surface: 'AlgorithmSelector / AdaptiveSolver algorithm choice',
    fileLine: 'src/lib/fabricator/AlgorithmSelector.ts:73; src/algorithms/adaptiveSolver.ts:45-98',
    classification: 'TOPOLOGY_AFFECTING',
    note: 'Greedy vs linear can change packing. Selection is rule-based, not random.',
  },
  {
    surface: 'First-Fit Decreasing sort',
    fileLine: 'src/lib/fabricator/OptimizationEngine.ts:116-117; src/algorithms/greedyHeuristic.ts:100-129',
    classification: 'TOPOLOGY_AFFECTING',
    defect: 'ALMONA_REPRODUCIBILITY_DEFECT',
    note: 'Equal-length ties depend on engine sort stability and original array order. Not patched in FP-024C.1.',
  },
  {
    surface: 'Stock bar IDs Date.now + Math.random',
    fileLine: 'src/lib/fabricator/OptimizationEngine.ts:203',
    classification: 'RESULT_METADATA_ONLY',
    defect: 'ALMONA_REPRODUCIBILITY_DEFECT',
    note: 'IDs are metadata. Topology fingerprints exclude them. Do not use these IDs as optimizer-input identity.',
  },
  {
    surface: 'workflowStore persist optimizationResult',
    fileLine: 'src/store/workflowStore.ts:106-219',
    classification: 'PERSISTENCE_ONLY',
    defect: 'ALMONA_REPRODUCIBILITY_DEFECT',
    note: 'localStorage key fabricator-workflow-storage rehydrates the last result. A later UI open can display a reused solve. clearWorkflow is required; Clear Screen is not modeled here.',
  },
  {
    surface: 'AlmonaCuttingEngine remnantCache',
    fileLine: 'src/lib/fabricator/AlmonaCuttingEngine.ts:193-239',
    classification: 'TOPOLOGY_AFFECTING',
    note: 'Instance remnant cache can change the next pack if setRemnants is used. IDs REM-n are deterministic.',
  },
  {
    surface: 'Genetic / Math.random GA',
    fileLine: 'src/algorithms/geneticOptimization.ts; src/algorithms/RemnantFirstGeneticOptimizer.ts:700-706',
    classification: 'ADVISORY_ONLY',
    note: 'Excluded from Tier-3 manufacturing authority (FP-016 Option B).',
  },
  {
    surface: 'Project IDs Date.now + Math.random on measurement create',
    fileLine: 'src/store/workflowStore.ts:127',
    classification: 'INPUT_IDENTITY_ONLY',
    note: 'Project/order IDs are container identity, not geometry. Fresh A/B/C must capture them without putting them in input fingerprints.',
  },
];

export function evaluateFreshRunIntake(args: {
  runId: string;
  timestampIso: string | null;
  observedSettings: DowinJobObservedSettings;
  widthMm: number;
  heightMm: number;
  profileSystem: string;
  provenance: OptimizerRunProvenance | null | undefined;
  sourceHashes: {
    generalSettingsScreenshot?: string | null;
    designPreview?: string | null;
    assemblyLabels?: string | null;
    optimization?: string | null;
    machineExport?: string | null;
    mdb?: string | null;
  };
  clearScreenClaimedFresh?: boolean;
  mdbGenerated?: boolean;
  freshSlot?: Fp024c1FreshSlot | null;
  operatorClaimsEquivalence?: boolean;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const p = args.provenance ?? null;
  if (!nonempty(args.runId) || !nonempty(args.timestampIso)) {
    reasons.push('runId and timestamp are required.');
  }
  if (args.freshSlot) {
    const expected = `FP024C1_FRESH_${args.freshSlot}`;
    if (args.runId !== expected) {
      reasons.push(`freshSlot ${args.freshSlot} requires runId ${expected}.`);
    }
  }
  reasons.push(...missingOptimizerProvenanceFields(p).map((f) => `missing ${f}`));
  if (solveDispositionOf(p) !== 'NEWLY_SOLVED') {
    reasons.push('solveDisposition must be NEWLY_SOLVED. REOPENED/REUSED is not fresh.');
  }
  if (
    isClearScreenNotFreshness({
      runId: args.runId,
      projectId: p?.projectId ?? null,
      designId: p?.designId ?? null,
      clearScreenClaimedFresh: args.clearScreenClaimedFresh,
    })
  ) {
    reasons.push('Clear Screen / reused asdd project/design is not fresh-state proof.');
  }
  if (args.observedSettings.weldingWasteMm !== FP024C1_REQUIRED_LIVE_SETTINGS.weldingWasteMm) {
    reasons.push('Welding Waste must be 3 mm.');
  }
  if (args.observedSettings.sawThicknessMm !== FP024C1_REQUIRED_LIVE_SETTINGS.sawThicknessMm) {
    reasons.push('Saw Thickness must be 4 mm.');
  }
  if (args.observedSettings.trimCutMm !== FP024C1_REQUIRED_LIVE_SETTINGS.trimCutMm) {
    reasons.push('Trim Cut must be 0 mm.');
  }
  if (args.observedSettings.machineId !== FP024C1_REQUIRED_LIVE_SETTINGS.machineId) {
    reasons.push('Machine must be DC-600.');
  }
  if (args.widthMm !== 1000 || args.heightMm !== 1500) {
    reasons.push('Geometry must remain 1000×1500.');
  }
  if (!p?.geometrySnapshot || !p.requiredPartsSnapshot || !p.stockSnapshot || p.offcutRemnantSnapshot == null) {
    reasons.push('geometry, required-parts, stock, and offcut/remnant snapshots are required (empty offcut list is allowed).');
  }
  if (!hasCompleteInputFingerprints(p)) {
    reasons.push('Input fingerprints are incomplete. Equivalence is UNPROVEN, never IDENTICAL.');
  }
  if (args.operatorClaimsEquivalence === true && !hasCompleteInputFingerprints(p)) {
    reasons.push(
      'Operator claims equivalence without complete fingerprints. Equivalence stays UNPROVEN, never IDENTICAL.'
    );
  }
  const hashes = args.sourceHashes;
  if (
    !nonempty(hashes.generalSettingsScreenshot ?? null) ||
    !nonempty(hashes.designPreview ?? null) ||
    !nonempty(hashes.assemblyLabels ?? null) ||
    !nonempty(hashes.optimization ?? null)
  ) {
    reasons.push('SHA-256 of General Settings, Design Preview, Labels/Assembly, and Optimization report are required.');
  }
  if (
    args.mdbGenerated === true &&
    !nonempty(hashes.mdb ?? null) &&
    !nonempty(hashes.machineExport ?? null)
  ) {
    reasons.push('Machine export SHA-256 is required when an export was generated. Otherwise leave it null / NOT_MEASURED.');
  }
  return { ok: reasons.length === 0, reasons };
}

export function topologySignatureFromBars(
  bars: readonly ExternalBarPattern[],
  pieces: readonly DowinPhysicalLengthGoldenRow[] = []
): BarAssignmentSignature[] {
  const byPieceId = new Map(pieces.map((piece) => [piece.pieceId, piece]));
  const grouped = new Map<string, ExternalBarPattern[]>();
  for (const bar of bars) {
    const key = `${bar.profileCode}|${bar.stockLengthMm}`;
    const list = grouped.get(key) ?? [];
    list.push(bar);
    grouped.set(key, list);
  }
  const signatures: BarAssignmentSignature[] = [];
  for (const key of [...grouped.keys()].sort()) {
    const group = grouped.get(key) ?? [];
    group.forEach((bar, ordinal) => {
      signatures.push({
        profileCode: bar.profileCode,
        stockBarId: bar.id,
        stockBarOrdinal: ordinal,
        stockLengthMm: bar.stockLengthMm,
        applicationCount: bar.applicationCount,
        pieces: bar.packedSegmentMm.map((packedLengthMm, index) => {
          const externalId = bar.pieceExternalIds[index] ?? null;
          const piece = externalId ? byPieceId.get(externalId) : undefined;
          return {
            physicalCutId: piece?.pieceId ?? externalId,
            sourceCutId: piece?.pieceId ?? externalId,
            externalPieceId: externalId,
            role: piece?.category ?? null,
            packedLengthMm: packedLengthMm,
            leftAngleDeg: piece?.leftAngleDeg ?? null,
            rightAngleDeg: piece?.rightAngleDeg ?? null,
          };
        }),
        remainingMm: bar.remainingMm,
      });
    });
  }
  return signatures;
}

/** Topology identity: assignment geometry only. No result UUID, timestamp, or utilization. */
export function topologyFingerprint(
  bars: readonly ExternalBarPattern[],
  pieces: readonly DowinPhysicalLengthGoldenRow[] = []
): string {
  const payload = topologySignatureFromBars(bars, pieces).map((bar) => ({
    profileCode: bar.profileCode,
    stockBarOrdinal: bar.stockBarOrdinal,
    stockLengthMm: bar.stockLengthMm,
    applicationCount: bar.applicationCount,
    pieces: bar.pieces.map((piece) => ({
      physicalCutId: piece.physicalCutId,
      sourceCutId: piece.sourceCutId,
      externalPieceId: piece.externalPieceId,
      role: piece.role,
      packedLengthMm: piece.packedLengthMm,
      leftAngleDeg: piece.leftAngleDeg,
      rightAngleDeg: piece.rightAngleDeg,
    })),
    remainingMm: bar.remainingMm,
  }));
  return fingerprintSha256({ unit: 'mm', bars: payload });
}

/**
 * Geometry-only, order-sensitive bar identity for comparing two different runs.
 *
 * `topologyFingerprint` deliberately includes per-piece provenance, and those
 * ids are scoped to the design name (`RUN_A.Frame Leftt` vs `RUN_C.Frame
 * Leftt`), so it can never match across runs and must not be used to compare
 * them. This fingerprint keeps the packing geometry — profile, stock length,
 * application count, segment sequence and remainder — and drops the labels.
 */
export function barSequenceFingerprint(bars: readonly ExternalBarPattern[]): string {
  const payload = bars
    .map((bar) => ({
      profileCode: bar.profileCode,
      stockLengthMm: bar.stockLengthMm,
      applicationCount: bar.applicationCount,
      packedSegmentMm: [...bar.packedSegmentMm],
      remainingMm: bar.remainingMm,
    }))
    .map((entry) => ({
      entry,
      key: [
        entry.profileCode,
        entry.stockLengthMm,
        entry.applicationCount,
        entry.packedSegmentMm.join(','),
        entry.remainingMm,
      ].join('|'),
    }))
    .sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0))
    .map((wrapped) => wrapped.entry);
  return fingerprintSha256({ unit: 'mm', barSequence: payload });
}

/**
 * Order-insensitive view of a bar pack: segments sorted within each bar and
 * bars sorted canonically. Two plans with the same contents but a different
 * cut sequence share this fingerprint while differing under
 * `barSequenceFingerprint`.
 */
export function barContentFingerprint(bars: readonly ExternalBarPattern[]): string {
  const payload = bars
    .map((bar) => ({
      profileCode: bar.profileCode,
      stockLengthMm: bar.stockLengthMm,
      applicationCount: bar.applicationCount,
      segmentsSortedMm: [...bar.packedSegmentMm].sort((x, y) => x - y),
      remainingMm: bar.remainingMm,
    }))
    .map((entry) => ({
      entry,
      key: [
        entry.profileCode,
        entry.stockLengthMm,
        entry.applicationCount,
        entry.segmentsSortedMm.join(','),
        entry.remainingMm,
      ].join('|'),
    }))
    .sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0))
    .map((wrapped) => wrapped.entry);
  return fingerprintSha256({ unit: 'mm', barContents: payload });
}

/**
 * Proven by RUN_C: the on-screen bar layout strip is a presentation order, not
 * the machine cut sequence. RUN_C rendered its KANAT bar 1433,1433,454,454
 * while the same run's DC-600 `Table1` carries PICE_NO order 454,454,1433,1433
 * — the same machine order as RUN_A and RUN_B.
 *
 * Consequence for FP-024C.3: a difference in strip order is NOT evidence of a
 * topology divergence, and an uncaptured strip order is not a gap that can
 * affect a verdict. Compare bar contents, remainders and grouping, and take the
 * authoritative sequence from the machine file.
 */
export const DOWIN_BAR_STRIP_ORDER_IS_NOT_MACHINE_ORDER = {
  id: 'BAR_LAYOUT_STRIP_ORDER_IS_PRESENTATION_ONLY',
  classification: 'PROVEN_BY_DIRECT_COMPARISON',
  evidence: [
    'RUN_C KANAT layout strip renders 1433,1433,454,454 (screenshot e6eae6b0…).',
    'RUN_C DC-600 Table1 KANAT bars carry PICE_NO order 454,454,1433,1433.',
    'RUN_A, RUN_B and RUN_C machine PICE_NO orders are identical field-for-field.',
    'RUN_B KANAT strip rendered 454,454,1433,1433, so the strip order is not even stable between runs with identical machine output.',
  ],
  consequence:
    'Strip-order differences are presentation-only. Topology comparison must use contents, remainders and grouping; the machine file supplies the authoritative sequence.',
} as const;

export type TopologyComparison =
  | 'IDENTICAL'
  | 'ORDER_ONLY_DIFFERENCE'
  | 'CONTENT_DIVERGENT'
  | 'UNPROVEN';

/**
 * Separates a genuine bar-assignment divergence from a mere difference in the
 * within-bar cut sequence. This matters because DoWin does not render one
 * uniform sequence convention, and a sequence that was never captured must not
 * be allowed to manufacture a divergence.
 */
export function compareBarTopology(
  a: readonly ExternalBarPattern[] | null | undefined,
  b: readonly ExternalBarPattern[] | null | undefined
): { comparison: TopologyComparison; reasons: string[] } {
  if (a == null || b == null || a.length === 0 || b.length === 0) {
    return {
      comparison: 'UNPROVEN',
      reasons: ['Bar-by-bar topology is missing for at least one run.'],
    };
  }
  if (barSequenceFingerprint(a) === barSequenceFingerprint(b)) {
    return { comparison: 'IDENTICAL', reasons: [] };
  }
  if (barContentFingerprint(a) === barContentFingerprint(b)) {
    return {
      comparison: 'ORDER_ONLY_DIFFERENCE',
      reasons: [
        'Bar contents, application counts and remainders match; only the within-bar cut sequence differs.',
      ],
    };
  }
  const describe = (bars: readonly ExternalBarPattern[]) => {
    const byProfile = new Map<string, string[]>();
    for (const bar of bars) {
      const key = `${bar.profileCode}|${bar.stockLengthMm}`;
      const list = byProfile.get(key) ?? [];
      list.push(
        `x${bar.applicationCount} [${[...bar.packedSegmentMm].sort((x, y) => x - y).join(',')}] rem ${bar.remainingMm}`
      );
      byProfile.set(key, list);
    }
    return byProfile;
  };
  const left = describe(a);
  const right = describe(b);
  const reasons: string[] = [];
  for (const key of [...new Set([...left.keys(), ...right.keys()])].sort()) {
    const l = (left.get(key) ?? []).sort().join(' + ');
    const r = (right.get(key) ?? []).sort().join(' + ');
    if (l !== r) reasons.push(`${key}: A = ${l || 'none'} ; B = ${r || 'none'}`);
  }
  return { comparison: 'CONTENT_DIVERGENT', reasons };
}

export function assignmentSignaturesEqual(
  a: readonly ExternalBarPattern[],
  b: readonly ExternalBarPattern[],
  piecesA: readonly DowinPhysicalLengthGoldenRow[] = [],
  piecesB: readonly DowinPhysicalLengthGoldenRow[] = []
): boolean {
  return topologyFingerprint(a, piecesA) === topologyFingerprint(b, piecesB);
}

export function totalRemainingMm(bars: readonly ExternalBarPattern[]): number {
  return bars.reduce((sum, bar) => sum + bar.remainingMm * bar.applicationCount, 0);
}

export function totalStockMm(bars: readonly ExternalBarPattern[]): number {
  return bars.reduce((sum, bar) => sum + bar.stockLengthMm * bar.applicationCount, 0);
}

export function overallUtilizationPercent(bars: readonly ExternalBarPattern[]): number {
  const stock = totalStockMm(bars);
  if (stock === 0) return 0;
  return Math.round(((stock - totalRemainingMm(bars)) / stock) * 1000) / 10;
}

export interface ProvenanceClassifiableRun {
  runKind: string;
  status: string;
  bars: readonly ExternalBarPattern[];
  pieces: readonly DowinPhysicalLengthGoldenRow[];
  optimizerProvenance?: OptimizerRunProvenance | null;
  observedSettings: DowinJobObservedSettings;
  widthMm: number;
  heightMm: number;
  profileSystem: string;
}

export function identifyAssignmentTopology(
  bars: readonly ExternalBarPattern[],
  originalBars: readonly ExternalBarPattern[],
  laterBars: readonly ExternalBarPattern[]
): AsddAssignmentTopology {
  if (assignmentSignaturesEqual(bars, originalBars)) return 'ORIGINAL_1B';
  if (assignmentSignaturesEqual(bars, laterBars)) return 'LATER_TEST3_4';
  return 'OTHER';
}

function inputEquivalenceAcross(
  runs: readonly ProvenanceClassifiableRun[]
): OptimizerInputEquivalence {
  const provenances = runs.map((run) => run.optimizerProvenance ?? null);
  if (provenances.some((p) => p == null)) return 'UNPROVEN';
  let acc: OptimizerInputEquivalence = 'IDENTICAL';
  for (let i = 1; i < provenances.length; i += 1) {
    const cmp = compareOptimizerInputFingerprints(provenances[0], provenances[i]);
    if (cmp === 'UNPROVEN') return 'UNPROVEN';
    if (cmp === 'DIFFERENT') acc = 'DIFFERENT';
  }
  return acc;
}

export function classifyOptimizationStateProvenance(args: {
  freshRuns: readonly ProvenanceClassifiableRun[];
  reusedStateRuns?: readonly ProvenanceClassifiableRun[];
  originalBars: readonly ExternalBarPattern[];
  laterBars: readonly ExternalBarPattern[];
}): {
  verdict: OptimizationStateProvenanceVerdict;
  topologies: AsddAssignmentTopology[];
  inputEquivalence: OptimizerInputEquivalence;
  note: string;
} {
  const { freshRuns, reusedStateRuns = [], originalBars, laterBars } = args;
  const identify = (bars: readonly ExternalBarPattern[]) =>
    identifyAssignmentTopology(bars, originalBars, laterBars);

  if (freshRuns.length === 0) {
    const reusedOnly = reusedStateRuns.filter((run) => {
      const disposition = solveDispositionOf(run.optimizerProvenance);
      return disposition === 'REOPENED' || disposition === 'REUSED';
    });
    if (reusedOnly.length > 0) {
      return {
        verdict: 'AMBIGUOUS',
        topologies: reusedOnly.map((run) => identify(run.bars)),
        inputEquivalence: 'UNPROVEN',
        note: 'Result was reopened/reused and no clean fresh counterpart exists. Clear Screen is not freshness. AMBIGUOUS.',
      };
    }
    return {
      verdict: 'PENDING_OPERATOR_RUN',
      topologies: [],
      inputEquivalence: 'UNPROVEN',
      note: `FP-024C.1 unanswered: ${FP024C1_AUDIT_QUESTION} Decisive experiment: ${FP024C1_DECISIVE_EXPERIMENT}. Compare bar-assignment signatures, not utilization. Fresh A/B/C required; Clear Screen is not freshness.`,
    };
  }

  const incomplete = freshRuns.filter(
    (run) => !isOptimizerProvenanceComplete(run.optimizerProvenance)
  );
  if (incomplete.length > 0) {
    return {
      verdict: 'AMBIGUOUS',
      topologies: freshRuns.map((run) => identify(run.bars)),
      inputEquivalence: 'UNPROVEN',
      note: 'Provenance is incomplete. Missing fingerprints or IDs cannot become IDENTICAL. AMBIGUOUS.',
    };
  }

  const newlySolved = freshRuns.filter((run) => solveDispositionOf(run.optimizerProvenance) === 'NEWLY_SOLVED');

  if (newlySolved.length === 0) {
    return {
      verdict: 'AMBIGUOUS',
      topologies: freshRuns.map((run) => identify(run.bars)),
      inputEquivalence: 'UNPROVEN',
      note: 'Result was reopened/reused and no clean fresh counterpart exists. Clear Screen is not freshness. AMBIGUOUS.',
    };
  }

  const inputEquivalence = inputEquivalenceAcross(
    [...newlySolved, ...reusedStateRuns.filter((run) => isOptimizerProvenanceComplete(run.optimizerProvenance))]
  );
  const topologies = newlySolved.map((run) => identify(run.bars));
  const uniqueFingerprints = [
    ...new Set(newlySolved.map((run) => topologyFingerprint(run.bars, run.pieces))),
  ];

  if (inputEquivalence === 'UNPROVEN') {
    return {
      verdict: 'AMBIGUOUS',
      topologies,
      inputEquivalence,
      note: 'Optimizer input fingerprints are missing. Missing provenance never becomes IDENTICAL. AMBIGUOUS.',
    };
  }

  if (inputEquivalence === 'DIFFERENT') {
    return {
      verdict: 'HIDDEN_INPUT_DIFFERENCE',
      topologies,
      inputEquivalence,
      note: 'A concrete optimizer-input fingerprint difference was found that visible General Settings do not represent. HIDDEN_INPUT_DIFFERENCE.',
    };
  }

  const reusedWithIdenticalInput = reusedStateRuns.filter(
    (run) =>
      isOptimizerProvenanceComplete(run.optimizerProvenance) &&
      newlySolved.some(
        (fresh) =>
          compareOptimizerInputFingerprints(run.optimizerProvenance, fresh.optimizerProvenance) ===
          'IDENTICAL'
      )
  );
  const reusedIsLater = reusedWithIdenticalInput.some((run) => identify(run.bars) === 'LATER_TEST3_4');
  const freshHasOriginal = topologies.some((t) => t === 'ORIGINAL_1B');

  if (inputEquivalence === 'IDENTICAL' && reusedIsLater && freshHasOriginal) {
    return {
      verdict: 'PERSISTED_STATE_EFFECT_PROVEN',
      topologies,
      inputEquivalence,
      note: 'Proven-identical inputs: reused/reopened state produced later topology B; a genuinely fresh project/design/plan/result produced original topology A. PERSISTED STATE EFFECT PROVEN. Do not encode. 90° stays gated until an explicit continuation verdict.',
    };
  }

  if (uniqueFingerprints.length > 1) {
    if (newlySolved.length < FP024C1_MIN_FRESH_RUNS_FOR_NONDETERMINISM) {
      return {
        verdict: 'AMBIGUOUS',
        topologies,
        inputEquivalence,
        note: `Differing assignment topologies were observed, but Fresh A/B/C (${FP024C1_MIN_FRESH_RUNS_FOR_NONDETERMINISM} independent newly solved runs) are required before classifying OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING. Captured ${newlySolved.length}. AMBIGUOUS. 90° stays gated.`,
      };
    }
    return {
      verdict: 'OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING',
      topologies,
      inputEquivalence,
      note: 'Proven-identical inputs with genuinely fresh Fresh A/B/C runs produced more than one assignment topology. Optimizer nondeterminism or tie-breaking variability. Do not encode. 90° stays gated.',
    };
  }

  if (newlySolved.length < FP024C1_MIN_FRESH_RUNS_FOR_CONSISTENCY) {
    return {
      verdict: 'AMBIGUOUS',
      topologies,
      inputEquivalence,
      note: `A single fresh run cannot claim repeatability/consistency. Captured ${newlySolved.length} newly solved run(s); ${FP024C1_MIN_FRESH_RUNS_FOR_CONSISTENCY} independent fresh solves are required before calling a topology consistent. Repeatability unresolved. Do not encode. 90° stays gated.`,
    };
  }

  if (topologies.every((t) => t === 'LATER_TEST3_4')) {
    return {
      verdict: 'ALTERNATIVE_OPTIMIZER_SOLUTION',
      topologies,
      inputEquivalence,
      note: 'Proven-identical inputs. Three or more genuinely fresh runs consistently resolved to the later topology. Original 1B topology remains a previously observed solution. Do not call this a unique deterministic baseline. Do not encode. 90° stays gated.',
    };
  }

  if (topologies.every((t) => t === 'ORIGINAL_1B')) {
    return {
      verdict: 'AMBIGUOUS',
      topologies,
      inputEquivalence,
      note: 'Fresh runs recovered original topology, but persisted-state proof also requires a captured reused-state counterpart with topology B under proven-identical inputs. Repeatability of A is observed; persisted-state cause is not isolated. AMBIGUOUS.',
    };
  }

  return {
    verdict: 'AMBIGUOUS',
    topologies,
    inputEquivalence,
    note: 'Assignment signature matched neither a complete persisted-state pair nor a consistent later/original set. AMBIGUOUS. Do not encode. 90° stays gated.',
  };
}

/* ------------------------------------------------------------------ *
 * FP-024C.3 — controlled fresh-solve repeatability.
 *
 * The original Fresh A cannot participate in a repeatability triplicate
 * because a proven warehouse write (FP-024C.2, 22:17:20) changed stock
 * afterwards. FP-024C.3 freezes the current post-Fresh-A warehouse state
 * as a new baseline and requires three new controlled runs against it.
 *
 * Evidence gate only. No production formula, K-factor, or Cut length here.
 * ------------------------------------------------------------------ */

export const FP024C3_RUN_IDS = ['FP024C3_RUN_A', 'FP024C3_RUN_B', 'FP024C3_RUN_C'] as const;
export type Fp024c3RunId = (typeof FP024C3_RUN_IDS)[number];

/** No repeatability claim from A alone or A+B. */
export const FP024C3_REQUIRED_RUN_COUNT = 3;

export interface WarehouseStockCard {
  profileCode: string;
  stockLengthMm: number;
  quantity: number;
}

export type ControlledBaselineVersion = 1 | 2;

/**
 * Baseline V1 = warehouse state after the Fresh A stock write (FP-024C.2,
 * 22:17:20). Superseded before any controlled run was created, because a
 * manual Stock Management card edit raised ORTA from 0 to 100.
 *
 * HISTORICAL_ONLY. Never a comparison target for a controlled run, and never
 * a restoration target. Historical 48/98/14 is likewise evidence, not a goal.
 */
export const FP024C3_FROZEN_WAREHOUSE_BASELINE_V1: readonly WarehouseStockCard[] = [
  { profileCode: 'Deceuninck-CITA-20', stockLengthMm: 6500, quantity: 46 },
  { profileCode: 'Deceuninck-DESTEK-SACI-2.0MM', stockLengthMm: 6500, quantity: 15 },
  { profileCode: 'Deceuninck-KANAT-70', stockLengthMm: 6000, quantity: 96 },
  { profileCode: 'Deceuninck-KASA-70', stockLengthMm: 6000, quantity: 13 },
  { profileCode: 'Deceuninck-KOSE-METAL-05', stockLengthMm: 6500, quantity: 100 },
  { profileCode: 'Deceuninck-KOSE-PLASTIK-01', stockLengthMm: 6500, quantity: 50 },
  { profileCode: 'Deceuninck-ORTA-KAYIT-70', stockLengthMm: 6500, quantity: 0 },
];

/**
 * Baseline V2 = warehouse state observed at 2026-09-12 23:58:45 +03, after the
 * manual ORTA edit. Only ORTA differs from V1 (0 → 100). This is the active
 * control baseline for FP024C3_RUN_A/B/C.
 */
export const FP024C3_FROZEN_WAREHOUSE_BASELINE_V2: readonly WarehouseStockCard[] = [
  { profileCode: 'Deceuninck-CITA-20', stockLengthMm: 6500, quantity: 46 },
  { profileCode: 'Deceuninck-DESTEK-SACI-2.0MM', stockLengthMm: 6500, quantity: 15 },
  { profileCode: 'Deceuninck-KANAT-70', stockLengthMm: 6000, quantity: 96 },
  { profileCode: 'Deceuninck-KASA-70', stockLengthMm: 6000, quantity: 13 },
  { profileCode: 'Deceuninck-KOSE-METAL-05', stockLengthMm: 6500, quantity: 100 },
  { profileCode: 'Deceuninck-KOSE-PLASTIK-01', stockLengthMm: 6500, quantity: 50 },
  { profileCode: 'Deceuninck-ORTA-KAYIT-70', stockLengthMm: 6500, quantity: 100 },
];

export type ControlledBaselineStatus = 'ACTIVE' | 'HISTORICAL_ONLY';

export interface ControlledStockBaseline {
  baselineVersion: ControlledBaselineVersion;
  baselineStockSnapshot: readonly WarehouseStockCard[];
  baselineReason: string;
  /** SHA-256 of the independent Stock Management capture that froze it. */
  baselineSourceHash: string | null;
  status: ControlledBaselineStatus;
  frozenAtIso: string;
}

export const FP024C3_BASELINE_V1: ControlledStockBaseline = {
  baselineVersion: 1,
  baselineStockSnapshot: FP024C3_FROZEN_WAREHOUSE_BASELINE_V1,
  baselineReason: 'POST_FRESH_A_OPTIMIZATION_STOCK_WRITE',
  baselineSourceHash: 'a1881bba3df98e15eb73adf3958a0fcc6d312cbbb1b025e5999f25db0ba8ae31',
  status: 'HISTORICAL_ONLY',
  frozenAtIso: '2026-09-12T23:24:05+03:00',
};

export const FP024C3_BASELINE_V2: ControlledStockBaseline = {
  baselineVersion: 2,
  baselineStockSnapshot: FP024C3_FROZEN_WAREHOUSE_BASELINE_V2,
  baselineReason: 'MANUAL_STOCK_CARD_EDIT_CONTAMINATED_V1',
  baselineSourceHash: 'c8626da5166731e393a74ae731b663410ef77f2bde2b05bcfa572531e6c32012',
  status: 'ACTIVE',
  frozenAtIso: '2026-09-12T23:58:45+03:00',
};

export const FP024C3_CONTROLLED_BASELINES: readonly ControlledStockBaseline[] = [
  FP024C3_BASELINE_V1,
  FP024C3_BASELINE_V2,
];

export const FP024C3_ACTIVE_BASELINE_VERSION: ControlledBaselineVersion = 2;

export const FP024C3_ACTIVE_BASELINE: ControlledStockBaseline = FP024C3_BASELINE_V2;

/** Always the ACTIVE snapshot. Read V1 explicitly when you mean history. */
export const FP024C3_FROZEN_WAREHOUSE_BASELINE: readonly WarehouseStockCard[] =
  FP024C3_ACTIVE_BASELINE.baselineStockSnapshot;

export function controlledBaselineOf(
  version: ControlledBaselineVersion
): ControlledStockBaseline | null {
  return FP024C3_CONTROLLED_BASELINES.find((b) => b.baselineVersion === version) ?? null;
}

export type BaselineEquivalenceClaim =
  | 'ALLOWED'
  | 'REJECTED_BASELINE_SUPERSEDED'
  | 'REJECTED_UNKNOWN_BASELINE';

/**
 * A controlled run may only claim input equivalence against the ACTIVE
 * baseline. Once V2 is active, a V1 comparison is a category error: the two
 * snapshots describe different warehouse states.
 */
export function evaluateBaselineEquivalenceClaim(
  claimedVersion: number,
  activeVersion: ControlledBaselineVersion = FP024C3_ACTIVE_BASELINE_VERSION
): { claim: BaselineEquivalenceClaim; reason: string } {
  const known = FP024C3_CONTROLLED_BASELINES.find((b) => b.baselineVersion === claimedVersion);
  if (!known) {
    return {
      claim: 'REJECTED_UNKNOWN_BASELINE',
      reason: `Baseline version ${claimedVersion} is not a frozen FP-024C.3 baseline.`,
    };
  }
  if (known.baselineVersion !== activeVersion) {
    const active = FP024C3_CONTROLLED_BASELINES.find((b) => b.baselineVersion === activeVersion);
    return {
      claim: 'REJECTED_BASELINE_SUPERSEDED',
      reason: `Baseline V${known.baselineVersion} is ${known.status}; it was frozen for ${known.baselineReason} and superseded by V${activeVersion} for ${active?.baselineReason ?? 'an unrecorded reason'}. Controlled runs compare against V${activeVersion} only. V${known.baselineVersion} remains historical evidence.`,
    };
  }
  return { claim: 'ALLOWED', reason: `Baseline V${activeVersion} is ACTIVE.` };
}

/**
 * The ORTA anomaly (warehouse quantity 0, yet the optimizer packed one 6500
 * ORTA bar) is only observable while ORTA sits at 0. The manual edit removed
 * that. It must not be recreated by hand or by artificial decrement.
 */
export const ORTA_ZERO_QTY_CONTROL_OBSERVABILITY = 'LOST_BY_MANUAL_STOCK_EDIT' as const;

/**
 * Proven for the observed path only: a Management Panel stock-card edit can
 * mutate warehouse quantity without emitting the optimization stock-update log
 * event that FP-024C.2 relied on. Log silence is therefore not proof of
 * warehouse immutability.
 */
export const MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED = {
  id: 'MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED',
  classification: 'PROVEN_FOR_OBSERVED_PATH',
  statement:
    'Observed Stock Management card edit path can mutate quantity without the optimization stock-update log event.',
  evidence: [
    'Management Panel opened at 23:57:36 (SERVICE_INIT entries only).',
    'A manual Deceuninck-ORTA-KAYIT-70 quantity edit occurred afterward.',
    'Independent capture at 23:58:45 showed ORTA 6500 ×100 against a frozen baseline of 0.',
    'No stock-write log line appeared; ExecuteStockUpdateCoreAsync entries stayed at 6.',
  ],
  doesNotGeneralize:
    'Not generalized to every manual edit path in DoWin. Only the observed Stock Management card edit is proven.',
} as const;

/** Warehouse-write actions that invalidate FP-024C.3 if invoked. */
export const FP024C3_FORBIDDEN_WAREHOUSE_ACTIONS = [
  'Update Stock',
  'Add Offcuts',
  'Production Approval',
  'Confirm Stock',
  'Import Remnants',
] as const;

export type ControlledStockPostcheck = 'PASS' | 'STOCK_STATE_MUTATED' | 'UNPROVEN';

export interface ControlledStockDelta {
  profileCode: string;
  stockLengthMm: number;
  baselineQuantity: number | null;
  observedQuantity: number | null;
  deltaQuantity: number | null;
}

export interface ControlledStockPostcheckResult {
  verdict: ControlledStockPostcheck;
  deltas: ControlledStockDelta[];
  missingCards: string[];
  unexpectedCards: string[];
}

function stockCardKey(card: { profileCode: string; stockLengthMm: number }): string {
  return `${card.profileCode}|${card.stockLengthMm}`;
}

/**
 * Post-run warehouse verification. Fail-closed: an uncaptured or incomplete
 * stock screen is UNPROVEN, never PASS. A new card (for example an imported
 * remnant row) counts as a mutation.
 */
export function evaluateControlledStockPostcheck(
  observed: readonly WarehouseStockCard[] | null | undefined,
  baseline: readonly WarehouseStockCard[] = FP024C3_FROZEN_WAREHOUSE_BASELINE
): ControlledStockPostcheckResult {
  if (observed == null) {
    return {
      verdict: 'UNPROVEN',
      deltas: [],
      missingCards: baseline.map(stockCardKey),
      unexpectedCards: [],
    };
  }
  const observedByKey = new Map(observed.map((card) => [stockCardKey(card), card]));
  const baselineKeys = new Set(baseline.map(stockCardKey));
  const deltas: ControlledStockDelta[] = [];
  const missingCards: string[] = [];
  for (const card of baseline) {
    const match = observedByKey.get(stockCardKey(card));
    if (!match) {
      missingCards.push(stockCardKey(card));
      deltas.push({
        profileCode: card.profileCode,
        stockLengthMm: card.stockLengthMm,
        baselineQuantity: card.quantity,
        observedQuantity: null,
        deltaQuantity: null,
      });
      continue;
    }
    deltas.push({
      profileCode: card.profileCode,
      stockLengthMm: card.stockLengthMm,
      baselineQuantity: card.quantity,
      observedQuantity: match.quantity,
      deltaQuantity: match.quantity - card.quantity,
    });
  }
  const unexpectedCards = observed
    .map(stockCardKey)
    .filter((key) => !baselineKeys.has(key));
  if (deltas.some((delta) => delta.deltaQuantity != null && delta.deltaQuantity !== 0)) {
    return { verdict: 'STOCK_STATE_MUTATED', deltas, missingCards, unexpectedCards };
  }
  if (unexpectedCards.length > 0) {
    return { verdict: 'STOCK_STATE_MUTATED', deltas, missingCards, unexpectedCards };
  }
  if (missingCards.length > 0) {
    return { verdict: 'UNPROVEN', deltas, missingCards, unexpectedCards };
  }
  return { verdict: 'PASS', deltas, missingCards, unexpectedCards };
}

/**
 * Diagnostic-log review outcome for the stock-write window of a run. Kept as a
 * separate axis from the UI comparison so neither can silently stand in for
 * the other.
 */
export type StockWriteLogReview =
  | 'NO_STOCK_WRITE_LOGGED'
  | 'STOCK_WRITE_LOGGED'
  | 'NOT_REVIEWED';

export type WarehouseImmutabilityVerdict =
  | 'IMMUTABLE_VERIFIED'
  | 'STOCK_STATE_MUTATED'
  | 'UNPROVEN';

export interface WarehouseImmutabilityResult {
  verdict: WarehouseImmutabilityVerdict;
  /** The authoritative source. */
  uiVerdict: ControlledStockPostcheck;
  logReview: StockWriteLogReview;
  deltas: ControlledStockDelta[];
  reasons: string[];
}

/**
 * FP-024C.3 requires BOTH a direct Stock Management quantity comparison and a
 * diagnostic-log review. The UI comparison is authoritative for detecting
 * drift; the log is supplementary.
 *
 * MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED is why: log silence can never override or
 * substitute for a UI mismatch, and an unreviewed log leaves the run UNPROVEN
 * rather than verified.
 */
export function verifyWarehouseImmutability(args: {
  observedStock: readonly WarehouseStockCard[] | null | undefined;
  baseline?: readonly WarehouseStockCard[];
  logReview: StockWriteLogReview;
  manualStockCardEditObserved?: boolean;
}): WarehouseImmutabilityResult {
  const { observedStock, baseline = FP024C3_FROZEN_WAREHOUSE_BASELINE, logReview } = args;
  const ui = evaluateControlledStockPostcheck(observedStock, baseline);
  const reasons: string[] = [];
  const shell = { uiVerdict: ui.verdict, logReview, deltas: ui.deltas };

  if (args.manualStockCardEditObserved === true) {
    reasons.push(
      'A manual Stock Management card edit was observed. That path mutates the warehouse without a stock-update log entry.'
    );
    return { ...shell, verdict: 'STOCK_STATE_MUTATED', reasons };
  }
  if (ui.verdict === 'STOCK_STATE_MUTATED') {
    reasons.push(
      'Stock Management quantities differ from the active frozen baseline. The UI comparison is authoritative; log silence cannot override it.'
    );
    return { ...shell, verdict: 'STOCK_STATE_MUTATED', reasons };
  }
  if (logReview === 'STOCK_WRITE_LOGGED') {
    reasons.push(
      'A stock-write log event was recorded for this window. A write occurred even though quantities currently match the baseline.'
    );
    return { ...shell, verdict: 'STOCK_STATE_MUTATED', reasons };
  }
  if (ui.verdict === 'UNPROVEN') {
    reasons.push('The Stock Management capture is missing or incomplete.');
    return { ...shell, verdict: 'UNPROVEN', reasons };
  }
  if (logReview === 'NOT_REVIEWED') {
    reasons.push(
      'The diagnostic log was not reviewed. Both sources are required; a UI match alone is not verification.'
    );
    return { ...shell, verdict: 'UNPROVEN', reasons };
  }
  return { ...shell, verdict: 'IMMUTABLE_VERIFIED', reasons };
}

/**
 * Offcut/remnant evidence. There is no PROVEN_NONE state: an absent UI
 * surface stays UNPROVEN and must not be read as "no remnants".
 */
export type OffcutRemnantEvidenceState = 'MEASURED' | 'UNPROVEN';

export const FP024C3_EQUIVALENCE_AXES = [
  'geometry',
  'requiredParts',
  'settings',
  'machine',
  'optimizerStock',
  'warehouseStock',
  'offcutRemnant',
  'freshness',
] as const;
export type Fp024c3EquivalenceAxis = (typeof FP024C3_EQUIVALENCE_AXES)[number];

/**
 * MEASURED_INPUT_EQUIVALENCE covers only axes the licensed UI exposes.
 * offcutRemnant is deliberately excluded, which is why measured equivalence
 * must never be reported as COMPLETE_INPUT_EQUIVALENCE.
 */
export const FP024C3_MEASURED_EQUIVALENCE_AXES = FP024C3_EQUIVALENCE_AXES.filter(
  (axis) => axis !== 'offcutRemnant'
) as readonly Fp024c3EquivalenceAxis[];

export interface ControlledRunEvidence {
  runId: string;
  provenance: OptimizerRunProvenance | null;
  /** Stock Management reopened immediately after solve/export. */
  observedWarehouseStock: readonly WarehouseStockCard[] | null;
  offcutRemnantEvidence: OffcutRemnantEvidenceState;
  /** New screenshot per run. A reused hash is not evidence of current state. */
  settingsScreenshotSha256: string | null;
  /**
   * Identity of the capture itself (file name / timestamp), distinct from its
   * content hash. Two independent captures of an unchanged settings page render
   * byte-identically, so only the capture identity separates that from an
   * operator reusing a single screenshot. Absent means fail closed.
   */
  settingsCaptureId?: string | null;
  bars: readonly ExternalBarPattern[] | null;
  pieces: readonly DowinPhysicalLengthGoldenRow[];
  warehouseWriteActionInvoked?: boolean;
  /** Frozen baseline this run was solved against. Defaults to the active one. */
  baselineVersion?: ControlledBaselineVersion;
  /** Supplementary log review for the run's stock window. */
  stockWriteLogReview?: StockWriteLogReview;
  /** Set when a Management Panel stock-card edit was seen (unlogged path). */
  manualStockCardEditObserved?: boolean;
}

/** DIFFERENT (a concrete finding) outranks UNPROVEN, which outranks IDENTICAL. */
function reduceEquivalence(
  values: readonly OptimizerInputEquivalence[]
): OptimizerInputEquivalence {
  if (values.some((value) => value === 'DIFFERENT')) return 'DIFFERENT';
  if (values.some((value) => value === 'UNPROVEN')) return 'UNPROVEN';
  return values.length > 0 ? 'IDENTICAL' : 'UNPROVEN';
}

function compareFingerprintAxis(
  a: string | null | undefined,
  b: string | null | undefined
): OptimizerInputEquivalence {
  if (!nonempty(a ?? null) || !nonempty(b ?? null)) return 'UNPROVEN';
  return a === b ? 'IDENTICAL' : 'DIFFERENT';
}

function compareFreshnessAxis(
  a: ControlledRunEvidence,
  b: ControlledRunEvidence
): OptimizerInputEquivalence {
  const da = solveDispositionOf(a.provenance);
  const db = solveDispositionOf(b.provenance);
  if (da === 'UNKNOWN' || db === 'UNKNOWN') return 'UNPROVEN';
  if (da === 'NEWLY_SOLVED' && db === 'NEWLY_SOLVED') return 'IDENTICAL';
  return 'DIFFERENT';
}

function compareSettingsAxis(
  a: ControlledRunEvidence,
  b: ControlledRunEvidence
): OptimizerInputEquivalence {
  const fingerprints = compareFingerprintAxis(
    a.provenance?.settingsFingerprint,
    b.provenance?.settingsFingerprint
  );
  if (fingerprints !== 'IDENTICAL') return fingerprints;
  if (!nonempty(a.settingsScreenshotSha256) || !nonempty(b.settingsScreenshotSha256)) {
    return 'UNPROVEN';
  }
  if (a.settingsScreenshotSha256 === b.settingsScreenshotSha256) {
    // A shared content hash has two very different causes, and the hash alone
    // cannot tell them apart: either one screenshot was cited twice (the second
    // run then has no contemporaneous evidence), or two independent captures of
    // an unchanged page rendered byte-identically (which is pixel-level proof of
    // equality). Distinguish them by capture identity, and fail closed when it
    // is absent.
    if (
      nonempty(a.settingsCaptureId) &&
      nonempty(b.settingsCaptureId) &&
      a.settingsCaptureId !== b.settingsCaptureId
    ) {
      return 'IDENTICAL';
    }
    return 'UNPROVEN';
  }
  return 'IDENTICAL';
}

function warehouseStockFingerprint(
  stock: readonly WarehouseStockCard[] | null | undefined
): string | null {
  if (stock == null) return null;
  const sorted = [...stock].sort(
    (x, y) => x.profileCode.localeCompare(y.profileCode) || x.stockLengthMm - y.stockLengthMm
  );
  return optimizerInputFingerprintSha256({ unit: 'mm', warehouse: sorted });
}

export function compareControlledRunAxes(
  a: ControlledRunEvidence,
  b: ControlledRunEvidence
): Record<Fp024c3EquivalenceAxis, OptimizerInputEquivalence> {
  const offcut =
    a.offcutRemnantEvidence === 'UNPROVEN' || b.offcutRemnantEvidence === 'UNPROVEN'
      ? 'UNPROVEN'
      : compareFingerprintAxis(
          a.provenance?.offcutRemnantFingerprint,
          b.provenance?.offcutRemnantFingerprint
        );
  return {
    geometry: compareFingerprintAxis(
      a.provenance?.geometryFingerprint,
      b.provenance?.geometryFingerprint
    ),
    requiredParts: compareFingerprintAxis(
      a.provenance?.requiredPartsFingerprint,
      b.provenance?.requiredPartsFingerprint
    ),
    settings: compareSettingsAxis(a, b),
    machine: compareFingerprintAxis(a.provenance?.machineId, b.provenance?.machineId),
    optimizerStock: compareFingerprintAxis(
      a.provenance?.stockFingerprint,
      b.provenance?.stockFingerprint
    ),
    warehouseStock: compareFingerprintAxis(
      warehouseStockFingerprint(a.observedWarehouseStock),
      warehouseStockFingerprint(b.observedWarehouseStock)
    ),
    offcutRemnant: offcut,
    freshness: compareFreshnessAxis(a, b),
  };
}

export interface ControlledEquivalencePair {
  pair: string;
  axes: Record<Fp024c3EquivalenceAxis, OptimizerInputEquivalence>;
  /** Excludes offcut/remnant. Never rename this to complete equivalence. */
  measuredInputEquivalence: OptimizerInputEquivalence;
  /** Includes offcut/remnant. Stays UNPROVEN while no remnant surface exists. */
  completeInputEquivalence: OptimizerInputEquivalence;
}

export function buildControlledEquivalenceMatrix(
  runs: readonly ControlledRunEvidence[]
): ControlledEquivalencePair[] {
  const pairs: ControlledEquivalencePair[] = [];
  for (let i = 0; i < runs.length; i += 1) {
    for (let j = i + 1; j < runs.length; j += 1) {
      const axes = compareControlledRunAxes(runs[i], runs[j]);
      pairs.push({
        pair: `${runs[i].runId} ↔ ${runs[j].runId}`,
        axes,
        measuredInputEquivalence: reduceEquivalence(
          FP024C3_MEASURED_EQUIVALENCE_AXES.map((axis) => axes[axis])
        ),
        completeInputEquivalence: reduceEquivalence(
          FP024C3_EQUIVALENCE_AXES.map((axis) => axes[axis])
        ),
      });
    }
  }
  return pairs;
}

export type ControlledRepeatabilityVerdict =
  | 'CONTROLLED_REPEATABILITY_IN_PROGRESS'
  | 'MEASURED_INPUT_REPEATABILITY_PROVEN'
  | 'NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS'
  | 'OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING'
  | 'HIDDEN_INPUT_DIFFERENCE'
  | 'STOCK_STATE_MUTATED'
  | 'BASELINE_SUPERSEDED'
  | 'AMBIGUOUS';

export interface ControlledRepeatabilityResult {
  verdict: ControlledRepeatabilityVerdict;
  runCount: number;
  baselineVersion: ControlledBaselineVersion;
  stockPostchecks: { runId: string; verdict: ControlledStockPostcheck }[];
  /** UI comparison plus log review. Both are required per run. */
  immutability: ({ runId: string } & WarehouseImmutabilityResult)[];
  topologyFingerprints: (string | null)[];
  uniqueTopologyCount: number;
  measuredInputEquivalence: OptimizerInputEquivalence;
  completeInputEquivalence: OptimizerInputEquivalence;
  /** True only when every axis including offcut/remnant is IDENTICAL. */
  fullDeterminismClaimAllowed: boolean;
  matrix: ControlledEquivalencePair[];
  note: string;
}

export function classifyControlledRepeatability(args: {
  runs: readonly ControlledRunEvidence[];
  baseline?: readonly WarehouseStockCard[];
  baselineVersion?: ControlledBaselineVersion;
}): ControlledRepeatabilityResult {
  const { runs, baselineVersion = FP024C3_ACTIVE_BASELINE_VERSION } = args;
  const baseline =
    args.baseline ??
    controlledBaselineOf(baselineVersion)?.baselineStockSnapshot ??
    FP024C3_FROZEN_WAREHOUSE_BASELINE;
  const stockPostchecks = runs.map((run) => ({
    runId: run.runId,
    verdict: evaluateControlledStockPostcheck(run.observedWarehouseStock, baseline).verdict,
  }));
  const immutability = runs.map((run) => ({
    runId: run.runId,
    ...verifyWarehouseImmutability({
      observedStock: run.observedWarehouseStock,
      baseline,
      logReview: run.stockWriteLogReview ?? 'NOT_REVIEWED',
      manualStockCardEditObserved: run.manualStockCardEditObserved,
    }),
  }));
  const matrix = buildControlledEquivalenceMatrix(runs);
  const measuredInputEquivalence = reduceEquivalence(
    matrix.map((entry) => entry.measuredInputEquivalence)
  );
  const completeInputEquivalence = reduceEquivalence(
    matrix.map((entry) => entry.completeInputEquivalence)
  );
  const topologyFingerprints = runs.map((run) =>
    run.bars == null ? null : barSequenceFingerprint(run.bars)
  );
  const uniqueTopologyCount = new Set(
    topologyFingerprints.filter((value): value is string => value != null)
  ).size;
  const base = {
    runCount: runs.length,
    baselineVersion,
    stockPostchecks,
    immutability,
    topologyFingerprints,
    uniqueTopologyCount,
    measuredInputEquivalence,
    completeInputEquivalence,
    fullDeterminismClaimAllowed: false,
    matrix,
  };

  const baselineClaim = evaluateBaselineEquivalenceClaim(baselineVersion);
  if (baselineClaim.claim !== 'ALLOWED') {
    return { ...base, verdict: 'BASELINE_SUPERSEDED', note: baselineClaim.reason };
  }
  const wrongBaselineRuns = runs.filter(
    (run) => (run.baselineVersion ?? FP024C3_ACTIVE_BASELINE_VERSION) !== baselineVersion
  );
  if (wrongBaselineRuns.length > 0) {
    return {
      ...base,
      verdict: 'BASELINE_SUPERSEDED',
      note: `${wrongBaselineRuns
        .map((run) => run.runId)
        .join(', ')} declared a different frozen baseline than V${baselineVersion}. Runs frozen against different warehouse states cannot be compared for input equivalence.`,
    };
  }
  if (runs.some((run) => run.manualStockCardEditObserved === true)) {
    return {
      ...base,
      verdict: 'STOCK_STATE_MUTATED',
      note: 'A manual Stock Management card edit was observed during FP-024C.3. That path mutates the warehouse without a stock-update log entry. STOP. Do not repair stock.',
    };
  }
  if (runs.some((run) => run.warehouseWriteActionInvoked === true)) {
    return {
      ...base,
      verdict: 'STOCK_STATE_MUTATED',
      note: `A forbidden warehouse-write action (${FP024C3_FORBIDDEN_WAREHOUSE_ACTIONS.join(' / ')}) was invoked during FP-024C.3. STOP. Do not repair experiment state.`,
    };
  }
  if (immutability.some((check) => check.verdict === 'STOCK_STATE_MUTATED')) {
    return {
      ...base,
      verdict: 'STOCK_STATE_MUTATED',
      note: `Warehouse immutability failed for ${immutability
        .filter((check) => check.verdict === 'STOCK_STATE_MUTATED')
        .map((check) => check.runId)
        .join(', ')}: ${immutability
        .filter((check) => check.verdict === 'STOCK_STATE_MUTATED')
        .flatMap((check) => check.reasons)
        .join(' ')} STOP all runs. Do not repair stock. Classify the failure.`,
    };
  }
  if (runs.length < FP024C3_REQUIRED_RUN_COUNT) {
    return {
      ...base,
      verdict: 'CONTROLLED_REPEATABILITY_IN_PROGRESS',
      note: `FP-024C.3 requires ${FP024C3_REQUIRED_RUN_COUNT} controlled runs (${FP024C3_RUN_IDS.join(' / ')}) against the frozen baseline. Captured ${runs.length}. No repeatability claim from A or A+B.`,
    };
  }
  const incomplete = runs.filter((run) => !isOptimizerProvenanceComplete(run.provenance));
  if (incomplete.length > 0) {
    return {
      ...base,
      verdict: 'AMBIGUOUS',
      note: `Provenance is incomplete for ${incomplete.map((run) => run.runId).join(', ')}. Missing provenance never becomes IDENTICAL.`,
    };
  }
  if (runs.some((run) => solveDispositionOf(run.provenance) !== 'NEWLY_SOLVED')) {
    return {
      ...base,
      verdict: 'AMBIGUOUS',
      note: 'Every controlled run must be NEWLY_SOLVED. A reopened or reused result means freshness is not proven.',
    };
  }
  if (immutability.some((check) => check.verdict === 'UNPROVEN')) {
    return {
      ...base,
      verdict: 'AMBIGUOUS',
      note: `Warehouse immutability is UNPROVEN for ${immutability
        .filter((check) => check.verdict === 'UNPROVEN')
        .map((check) => check.runId)
        .join(', ')}: ${immutability
        .filter((check) => check.verdict === 'UNPROVEN')
        .flatMap((check) => check.reasons)
        .join(' ')} Absence of a stock capture is not a PASS, and log silence alone is not verification.`,
    };
  }
  if (topologyFingerprints.some((value) => value == null)) {
    return {
      ...base,
      verdict: 'AMBIGUOUS',
      note: 'Bar-by-bar topology is missing for at least one run. Utilization is not topology.',
    };
  }
  if (measuredInputEquivalence === 'DIFFERENT') {
    return {
      ...base,
      verdict: 'HIDDEN_INPUT_DIFFERENCE',
      note: 'A concrete measured-input fingerprint difference was found across the controlled triplicate. Repeatability cannot be assessed under differing inputs.',
    };
  }
  if (measuredInputEquivalence === 'UNPROVEN') {
    return {
      ...base,
      verdict: 'AMBIGUOUS',
      note: 'Measured input equivalence is UNPROVEN (missing fingerprints, reused settings screenshot hash, or uncaptured axis). Fail-closed.',
    };
  }
  if (uniqueTopologyCount === 1) {
    return {
      ...base,
      verdict: 'MEASURED_INPUT_REPEATABILITY_PROVEN',
      fullDeterminismClaimAllowed: completeInputEquivalence === 'IDENTICAL',
      note:
        completeInputEquivalence === 'IDENTICAL'
          ? 'Three controlled fresh solves under identical measured inputs produced one topology, and every axis including offcut/remnant is proven identical.'
          : 'Three controlled fresh solves under identical measured inputs produced one topology. Offcut/remnant evidence remains UNPROVEN, so this is NOT full determinism proven.',
    };
  }
  if (completeInputEquivalence === 'IDENTICAL') {
    return {
      ...base,
      verdict: 'OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING',
      note: 'All input axes including offcut/remnant are proven identical and the controlled triplicate still produced more than one topology.',
    };
  }
  return {
    ...base,
    verdict: 'NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS',
    note: 'More than one topology under identical measured inputs, but offcut/remnant evidence is UNPROVEN. Do not overclaim pure nondeterminism or hidden state.',
  };
}

export type WarehouseAvailabilityObservation =
  | 'WAREHOUSE_QTY_VS_OPTIMIZER_AVAILABILITY_DISCREPANCY'
  | 'NOT_OBSERVED'
  | 'UNPROVEN';

/**
 * ORTA-class observation: a profile carried at warehouse quantity 0 that the
 * optimizer still packs. Recorded as an observation, not a product defect.
 */
export function observeWarehouseQtyVsOptimizerAvailability(args: {
  warehouseStock: readonly WarehouseStockCard[] | null | undefined;
  usedBars: readonly ExternalBarPattern[] | null | undefined;
}): { observation: WarehouseAvailabilityObservation; profileCodes: string[] } {
  if (args.warehouseStock == null || args.usedBars == null) {
    return { observation: 'UNPROVEN', profileCodes: [] };
  }
  const zeroQty = new Set(
    args.warehouseStock.filter((card) => card.quantity === 0).map((card) => card.profileCode)
  );
  const profileCodes = [
    ...new Set(args.usedBars.map((bar) => bar.profileCode).filter((code) => zeroQty.has(code))),
  ].sort();
  return {
    observation:
      profileCodes.length > 0
        ? 'WAREHOUSE_QTY_VS_OPTIMIZER_AVAILABILITY_DISCREPANCY'
        : 'NOT_OBSERVED',
    profileCodes,
  };
}

/**
 * Resolves the FP-024C.2 `AMBIGUOUS` trigger. Send to Machine raises a modal
 * "Stock Update" dialog offering to deduct used stock. The write is logged by
 * `ExecuteStockUpdateCoreAsync` but carries no `[USER_ACTION]` tag, because a
 * dialog confirmation is not a ribbon command — which is why the 22:17:20
 * write looked untriggered.
 *
 * Observed as a two-armed comparison on the same trigger:
 *   Fresh A  export 22:02:57 → Yes at 22:17:20 → stock write PROVEN
 *   RUN_A    export 01:05:22 → No  at ~01:06   → no stock write
 */
export const STOCK_COMMIT_DIALOG_TRIGGER = {
  id: 'POST_EXPORT_STOCK_UPDATE_DIALOG_IS_THE_WRITE_TRIGGER',
  classification: 'SUPPORTED_BY_CONTROLLED_COMPARISON',
  dialogTitle: 'Stock Update',
  dialogText:
    'Export to machine completed successfully. Would you like to deduct the used stock quantities from your inventory?',
  raisedBy: 'Send to Machine (MDB/DC-600 export)',
  logsUserActionTag: false,
  statement:
    'The post-export Stock Update dialog is the confirmation that commits the warehouse write. Answering Yes writes stock; answering No does not.',
  evidence: [
    'Fresh A: MDB Export logged 22:02:57, then ExecuteStockUpdateCoreAsync at 22:17:20 with no [USER_ACTION] tag. The 14 min 23 s gap is the dialog awaiting an answer.',
    'RUN_A: MDB Export logged 01:05:22, operator answered No, and app-20260913.log contains zero ExecuteStockUpdateCoreAsync lines across the whole session.',
  ],
  limitation:
    'The Fresh A answer was not directly observed; it is inferred from the proven write plus the now-observed dialog. The RUN_A No arm is directly observed.',
} as const;

/**
 * Solver stages DoWin logs per solve. Recorded because simulated annealing is
 * a stochastic metaheuristic and is therefore the candidate mechanism for any
 * topology non-repeatability FP-024C.3 might find. Observation only: no seed,
 * RNG, or determinism guarantee is exposed, so this proves nothing on its own.
 */
export const DOWIN_OBSERVED_SOLVER_STAGES = {
  stages: [
    'HİBRİT Column Generation Loop (High-Performance Modu)',
    'Tamsayılı Çözücü (MIP Solver) — Maliyet ve Stok Limiti Odaklı',
    'TAVLAMA BENZETİMİ (simulated annealing)',
  ],
  annealingParameters: { maxIterObserved: [210, 220], temperatureObserved: 100 },
  seedExposed: false,
  determinismDocumented: false,
  note: 'Simulated annealing is stochastic by construction. Whether DoWin seeds it deterministically is UNPROVEN and is exactly what the controlled triplicate tests.',
} as const;

export type OverproductionObservation =
  | 'OVERPRODUCTION_BEYOND_REQUIRED_QUANTITY'
  | 'NOT_OBSERVED'
  | 'UNPROVEN';

export interface OverproductionSurplusRow {
  packedLengthMm: number;
  requiredQuantity: number;
  producedQuantity: number;
  surplusQuantity: number;
  surplusLengthMm: number;
}

/**
 * Compares pieces the cutting plan actually cuts against pieces the design
 * requires, matched on packed length. A plan that cuts more than required
 * inflates yield and understates the reusable remainder, so it must never be
 * read as a packing improvement.
 */
export function observeOverproductionBeyondRequired(args: {
  bars: readonly ExternalBarPattern[] | null | undefined;
  pieces: readonly DowinPhysicalLengthGoldenRow[] | null | undefined;
}): {
  observation: OverproductionObservation;
  surplus: OverproductionSurplusRow[];
  producedPieceCount: number;
  requiredPieceCount: number;
} {
  const empty = { surplus: [], producedPieceCount: 0, requiredPieceCount: 0 };
  if (args.bars == null || args.pieces == null || args.bars.length === 0) {
    return { observation: 'UNPROVEN', ...empty };
  }
  const required = new Map<number, number>();
  let requiredPieceCount = 0;
  for (const piece of args.pieces) {
    if (piece.category === 'glass' || piece.category === 'angle_compensation') continue;
    if (piece.expectedPackedSegmentMm == null) {
      return { observation: 'UNPROVEN', ...empty };
    }
    const key = piece.expectedPackedSegmentMm;
    required.set(key, (required.get(key) ?? 0) + 1);
    requiredPieceCount += 1;
  }
  const produced = new Map<number, number>();
  let producedPieceCount = 0;
  for (const bar of args.bars) {
    const applications = bar.applicationCount > 0 ? bar.applicationCount : 1;
    for (const segment of bar.packedSegmentMm) {
      produced.set(segment, (produced.get(segment) ?? 0) + applications);
      producedPieceCount += applications;
    }
  }
  const surplus: OverproductionSurplusRow[] = [];
  for (const [packedLengthMm, producedQuantity] of [...produced.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    const requiredQuantity = required.get(packedLengthMm) ?? 0;
    if (producedQuantity > requiredQuantity) {
      const surplusQuantity = producedQuantity - requiredQuantity;
      surplus.push({
        packedLengthMm,
        requiredQuantity,
        producedQuantity,
        surplusQuantity,
        surplusLengthMm: surplusQuantity * packedLengthMm,
      });
    }
  }
  return {
    observation:
      surplus.length > 0 ? 'OVERPRODUCTION_BEYOND_REQUIRED_QUANTITY' : 'NOT_OBSERVED',
    surplus,
    producedPieceCount,
    requiredPieceCount,
  };
}

/**
 * Pipeline layers the FP-027 forensic trace must localise the count change in.
 * `observedCount` is the ORTA-KAYIT-70 1416 mm count measured at that layer in
 * all three FP-024C.3 runs; `null` means the layer exposes no piece
 * multiplicity at all and therefore cannot be assigned a count without
 * decompilation, which is forbidden.
 */
export const FP027_CONSERVATION_TRACE_LAYERS = [
  { layer: 'DESIGN_REQUIRED_PARTS', observable: true, observedCount: 1 },
  { layer: 'PRODUCTION_PLAN', observable: true, observedCount: 1 },
  { layer: 'OPTIMIZATION_INPUT', observable: true, observedCount: 1 },
  { layer: 'COLUMN_GENERATION_PATTERNS', observable: false, observedCount: null },
  { layer: 'MIP_DEMAND_CONSTRAINTS', observable: false, observedCount: null },
  { layer: 'POST_MIP_ANNEALING', observable: false, observedCount: null },
  { layer: 'CUTTING_PLAN_REPORT', observable: true, observedCount: 4 },
  { layer: 'DC600_EXPORT', observable: true, observedCount: 1 },
] as const;

export type Fp027TraceLayer = (typeof FP027_CONSERVATION_TRACE_LAYERS)[number]['layer'];

/**
 * FP-027 gate state. Declarative only: this records what the FP-024C.3
 * triplicate established about the required-parts conservation failure and
 * what remains unproven. It implements no invariant and no fix — the gate is
 * open for localisation, and naming a layer before the evidence supports it is
 * exactly the overclaim this record exists to prevent.
 */
export const FP027_REQUIRED_PARTS_CONSERVATION_GATE = {
  id: 'FP027_OPTIMIZATION_REQUIRED_PARTS_CONSERVATION_FORENSICS',
  status: 'OPEN_FORENSICS_ONLY',
  fixImplemented: false,
  invariantImplemented: false,
  conservationViolation: 'REPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS',
  rootCause: 'UNPROVEN',
  firstDivergenceLayer: null,
  divergenceBoundedAfter: 'OPTIMIZATION_INPUT',
  divergenceBoundedAtOrBefore: 'CUTTING_PLAN_REPORT',
  remainderRecomputedAfterExportMatchFilter: 'SUPPORTED_NOT_RECOMPUTED',
  leadingHypothesis: 'INEQUALITY_DEMAND_CONSTRAINT_PLUS_OBJECTIVE_INDIFFERENCE',
  leadingHypothesisAuthority: 'CONSISTENT_WITH_ALL_OBSERVED_DATA',
  fillTheBarHypothesis: 'WEAKENED',
  simpleSpareCapacityGeneralization: 'NOT_SUPPORTED_BY_E3',
  fixtureDiscriminatingPower: 'INSUFFICIENT',
  nextSpecifiedExperiment: 'INDEPENDENT_REVIEW_ONLY',
  statement:
    'The +3 ORTA surplus is repeatable across all three measured-identical runs and is not correlated with the observed stochastic CITA topology variation. Evidence therefore supports a deterministic or upstream conservation defect, but root cause remains UNPROVEN.',
  notProven: [
    'Three identical surplus outcomes make a stochastic explanation unsupported and increasingly unlikely; they do not mathematically exclude it.',
    'A blanket bar-filling mechanism is weakened: KANAT and CITA in A/B/C, and both KASA and CITA in E3, left room for further pieces and produced exactly the demanded quantity. That does not mathematically exclude bar-fill on every profile.',
    'ORTA remains the only overproducing profile in the measured set. Demand=1, 90/90, mullion role, and zero-price / 6.50 cost treatment are still live and still confounded. E2 could not unconfound 90/90 from ORTA: the only naturally generated 90/90 linear piece on the two-panel template is the ORTA mullion.',
  ],
  /** E3 conserved; E1 and E2 are negative fixtures, not failed experiments. */
  discriminatingExperiments: [
    {
      id: 'E3',
      fixture: 'small frame, single-bar KASA with spare capacity, all 45 degrees, non-zero price',
      separates: 'structural single-bar fill vs ORTA-specific',
      authorized: true,
      executed: true,
      classification: 'EXACT_CONSERVATION',
    },
    {
      id: 'E1',
      fixture:
        'demand exactly 1 on a non-ORTA profile: one physical piece, spare room for duplicates on the same bar, 45 degrees if a valid design emits it, non-zero cost. Natural design only — do not inject cut rows. If no valid design emits demand=1, STOP with UNPROVEN fixture.',
      separates: 'demand=1 mechanism vs ORTA / 90-degree / profile-specific handling',
      authorized: true,
      executed: true,
      classification: 'E1_FIXTURE_NOT_OBTAINABLE_NATURALLY',
      isFailedExperiment: false,
    },
    {
      id: 'E2',
      fixture:
        'naturally generated non-ORTA 90/90 linear piece; demand is whatever the design system produces. Do not inject rows. If no valid non-ORTA 90 fixture exists, STOP with E2_FIXTURE_NOT_OBTAINABLE_NATURALLY. Does not test demand=1. Separates 90-degree semantics from ORTA/profile-specific handling.',
      separates: '90-degree semantics vs ORTA / profile-specific handling',
      authorized: true,
      executed: true,
      classification: 'E2_FIXTURE_NOT_OBTAINABLE_NATURALLY',
      isFailedExperiment: false,
    },
  ],
  demand1Hypothesis: 'UNRESOLVED',
  ortaSpecificHypothesis: 'STILL_LIVE',
  ninetyDegreeHypothesis: 'STILL_LIVE',
  e1IsFailedExperiment: false,
  e2IsFailedExperiment: false,
  e3Generalization: 'GENERALIZATION_NOT_SUPPORTED_BY_E3',
  e3ClosesGate: false,
  e3AuthorizesFormulaChange: false,
  e3ProvesDemandInequality: false,
  e1ClosesGate: false,
  e1AuthorizesFormulaChange: false,
  e1ProvesDemandInequality: false,
  e2ClosesGate: false,
  e2AuthorizesFormulaChange: false,
  e2ProvesDemandInequality: false,
  e2AuthorizesNinetyControl: false,
  ninetyControlDualUseClassification: 'DUAL_USE_CONDITIONAL',
  ninetyControlDualUseAuthorizesControl: false,
  injectedSyntheticRowIsValidEvidence: false,
  almonaExposure: 'NOT_EXPOSED_BY_CONSTRUCTION',
  almonaInvariantAsserted: false,
  almonaNote:
    'SimplifiedOptimizationEngine and AlmonaCuttingEngine both emit exactly one piece per demanded unit, so overproduction is structurally impossible today. The invariant is nowhere asserted, so a future pattern-based or column-generation optimizer built for DoWin parity could introduce this defect class silently.',
  auditPath:
    'docs/audits/FP-027-OPTIMIZATION-REQUIRED-PARTS-CONSERVATION_2026-09-13.md',
} as const;

export type Fp027ConservationClassification =
  | 'EXACT_CONSERVATION'
  | 'OVERPRODUCTION'
  | 'UNDERPRODUCTION'
  | 'UNPROVEN';

/**
 * Piece-count conservation only. Utilization, remainder and bar count are
 * not inputs — using them here would reintroduce the exact category error
 * the protocol forbids.
 */
export function classifyRequiredVsPlanConservation(args: {
  requiredCount: number | null | undefined;
  planCount: number | null | undefined;
}): Fp027ConservationClassification {
  if (
    args.requiredCount == null ||
    args.planCount == null ||
    !Number.isFinite(args.requiredCount) ||
    !Number.isFinite(args.planCount)
  ) {
    return 'UNPROVEN';
  }
  if (args.planCount > args.requiredCount) return 'OVERPRODUCTION';
  if (args.planCount < args.requiredCount) return 'UNDERPRODUCTION';
  return 'EXACT_CONSERVATION';
}

/**
 * E3 required parts, generated from a valid 500×500 Deceuninck 70 fixed
 * frame (no sash, no mullion). Dimensions were not tuned after the solve.
 * Glazing beads were generated automatically and could not be avoided
 * without abandoning a valid design; they are recorded rather than hidden.
 */
export const FP027_E3_REQUIRED_PIECES: readonly DowinPhysicalLengthGoldenRow[] = [
  { pieceId: 'e3-kasa-top', externalAssemblyLabel: 'E3_KASA_SPARE.Frame Top', profileCode: 'Deceuninck-KASA-70', category: 'frame_horizontal', leftAngleDeg: 45, rightAngleDeg: 45, expectedNominalLengthMm: 500, expectedPackedSegmentMm: 503, expectedMachineLengthMm: 503, sourceDocument: 'assembly_report', sourcePage: null },
  { pieceId: 'e3-kasa-bottom', externalAssemblyLabel: 'E3_KASA_SPARE.Frame Bottom', profileCode: 'Deceuninck-KASA-70', category: 'frame_horizontal', leftAngleDeg: 45, rightAngleDeg: 45, expectedNominalLengthMm: 500, expectedPackedSegmentMm: 503, expectedMachineLengthMm: 503, sourceDocument: 'assembly_report', sourcePage: null },
  { pieceId: 'e3-kasa-left', externalAssemblyLabel: 'E3_KASA_SPARE.Frame Leftt', profileCode: 'Deceuninck-KASA-70', category: 'frame_vertical', leftAngleDeg: 45, rightAngleDeg: 45, expectedNominalLengthMm: 500, expectedPackedSegmentMm: 503, expectedMachineLengthMm: 503, sourceDocument: 'assembly_report', sourcePage: null },
  { pieceId: 'e3-kasa-right', externalAssemblyLabel: 'E3_KASA_SPARE.Frame Right', profileCode: 'Deceuninck-KASA-70', category: 'frame_vertical', leftAngleDeg: 45, rightAngleDeg: 45, expectedNominalLengthMm: 500, expectedPackedSegmentMm: 503, expectedMachineLengthMm: 503, sourceDocument: 'assembly_report', sourcePage: null },
  { pieceId: 'e3-cita-top', externalAssemblyLabel: 'E3_KASA_SPARE.GlazingBead Top', profileCode: 'Deceuninck-CITA-20', category: 'glazing_bead_horizontal', leftAngleDeg: 45, rightAngleDeg: 45, expectedNominalLengthMm: null, expectedPackedSegmentMm: 419, expectedMachineLengthMm: null, sourceDocument: 'assembly_report', sourcePage: null },
  { pieceId: 'e3-cita-bottom', externalAssemblyLabel: 'E3_KASA_SPARE.GlazingBead Bottom', profileCode: 'Deceuninck-CITA-20', category: 'glazing_bead_horizontal', leftAngleDeg: 45, rightAngleDeg: 45, expectedNominalLengthMm: null, expectedPackedSegmentMm: 419, expectedMachineLengthMm: null, sourceDocument: 'assembly_report', sourcePage: null },
  { pieceId: 'e3-cita-left', externalAssemblyLabel: 'E3_KASA_SPARE.GlazingBead Left', profileCode: 'Deceuninck-CITA-20', category: 'glazing_bead_vertical', leftAngleDeg: 45, rightAngleDeg: 45, expectedNominalLengthMm: null, expectedPackedSegmentMm: 419, expectedMachineLengthMm: null, sourceDocument: 'assembly_report', sourcePage: null },
  { pieceId: 'e3-cita-right', externalAssemblyLabel: 'E3_KASA_SPARE.GlazingBead Right', profileCode: 'Deceuninck-CITA-20', category: 'glazing_bead_vertical', leftAngleDeg: 45, rightAngleDeg: 45, expectedNominalLengthMm: null, expectedPackedSegmentMm: 419, expectedMachineLengthMm: null, sourceDocument: 'assembly_report', sourcePage: null },
];

/** Cutting-plan bars measured after the single authorized E3 solve. */
export const FP027_E3_BARS: readonly ExternalBarPattern[] = [
  {
    id: 'e3-cita-6500',
    profileCode: 'Deceuninck-CITA-20',
    stockLengthMm: 6500,
    applicationCount: 1,
    pieceExternalIds: [
      'E3_KASA_SPARE.GlazingBead Top',
      'E3_KASA_SPARE.GlazingBead Bottom',
      'E3_KASA_SPARE.GlazingBead Left',
      'E3_KASA_SPARE.GlazingBead Right',
    ],
    packedSegmentMm: [419, 419, 419, 419],
    remainingMm: 4801.37,
    reportedYieldPercent: 26.7,
  },
  {
    id: 'e3-kasa-6000',
    profileCode: 'Deceuninck-KASA-70',
    stockLengthMm: 6000,
    applicationCount: 1,
    pieceExternalIds: [
      'E3_KASA_SPARE.Frame Top',
      'E3_KASA_SPARE.Frame Bottom',
      'E3_KASA_SPARE.Frame Leftt',
      'E3_KASA_SPARE.Frame Right',
    ],
    packedSegmentMm: [503, 503, 503, 503],
    remainingMm: 3965.37,
    reportedYieldPercent: 33.9,
  },
];

export const FP027_E3_KASA_SPARE = {
  id: 'FP027_E3_KASA_SPARE',
  status: 'MEASURED',
  solveDisposition: 'NEWLY_SOLVED',
  projectId: '100006',
  projectDbId: 6,
  designId: 'E3_KASA_SPARE',
  designDbId: 8,
  productionPlanId: 'E3_KASA_SPARE_PLAN',
  productionPlanDbId: 6,
  optimizationRunId: 12,
  solverId: 'b5445400',
  timestampIso: '2026-09-13T13:26:34.000Z',
  widthMm: 500,
  heightMm: 500,
  profileSystem: "Deceuninck 70'lik PVC Sistemi",
  settingsFullWindowSha256:
    'ff5fcf4384a15790b5f28a202e2b1df4c716d43e834e7f0a217c91336fbb0623',
  settingsContentSha256:
    'e000c1ce6cebfe080dd76b8125119d3676a28667befb20133b58a0fa125f0760',
  settingsCaptureId: 'e3-settings-20260913-160944',
  warehouseSha256:
    'c8626da5166731e393a74ae731b663410ef77f2bde2b05bcfa572531e6c32012',
  machineExportSha256:
    'e06a1e6d406c2fd04906f99e020510f6bec0fb411f71e4f367f7a7e0355f5953',
  requiredKasaCount: 4,
  planKasaCount: 4,
  requiredCitaCount: 4,
  planCitaCount: 4,
  classification: 'EXACT_CONSERVATION' as Fp027ConservationClassification,
  citaClassification: 'EXACT_CONSERVATION' as Fp027ConservationClassification,
  generalization: 'GENERALIZATION_NOT_SUPPORTED_BY_E3',
  crossProfileConservationViolation: 'NOT_OBSERVED',
  unmatchedExportWarning: false,
  machineKasaCount: 4,
  machineCitaCount: 0,
  machineKasaRemainingLengthMm: 3965.4,
  planKasaRemainingMm: 3965.37,
  stockUpdateResponse: 'NO',
  warehouseImmutability: 'IMMUTABLE_VERIFIED',
  seedExposed: false,
  closesFp027: false,
  authorizesFormulaChange: false,
  provesDemandInequality: false,
  hypotheses: {
    H1_demandInequality: 'WEAKENED_SIMPLE_INTERPRETATION',
    H2_barFill: 'FURTHER_WEAKENED',
    H3_ortaSpecific: 'STRENGTHENED_AS_REMAINING_LIVE_SET',
  },
} as const;

const ORTA_PROFILE_CODE = 'Deceuninck-ORTA-KAYIT-70';

/**
 * Counts required linear-cut pieces by profile. Accessories and
 * non-cut metadata must not be passed in. A valid E1 target is a
 * non-ORTA profile whose count is exactly 1. Injecting a synthetic
 * row to manufacture that count is invalid evidence.
 */
export function evaluateDemandOneNonOrtaFixture(
  pieces: readonly { profileCode: string; quantity?: number }[] | null | undefined
): {
  fixtureValid: boolean;
  classification: 'E1_FIXTURE_VALID' | 'E1_FIXTURE_NOT_OBTAINABLE_NATURALLY' | 'UNPROVEN';
  profileCounts: Readonly<Record<string, number>>;
  candidateProfile: string | null;
} {
  if (pieces == null) {
    return {
      fixtureValid: false,
      classification: 'UNPROVEN',
      profileCounts: {},
      candidateProfile: null,
    };
  }
  const profileCounts: Record<string, number> = {};
  for (const piece of pieces) {
    const qty = piece.quantity ?? 1;
    profileCounts[piece.profileCode] = (profileCounts[piece.profileCode] ?? 0) + qty;
  }
  const candidates = Object.entries(profileCounts).filter(
    ([code, count]) => code !== ORTA_PROFILE_CODE && count === 1
  );
  if (candidates.length === 0) {
    return {
      fixtureValid: false,
      classification: 'E1_FIXTURE_NOT_OBTAINABLE_NATURALLY',
      profileCounts,
      candidateProfile: null,
    };
  }
  return {
    fixtureValid: true,
    classification: 'E1_FIXTURE_VALID',
    profileCounts,
    candidateProfile: candidates[0][0],
  };
}

/** E1 required rows as generated. Quantity is 1 per assembly row; profile totals are 4/4/4. */
export const FP027_E1_GENERATED_ROWS: readonly {
  assembly: string;
  profileCode: string;
  packedLengthMm: number;
  leftAngleDeg: number;
  rightAngleDeg: number;
  quantity: number;
}[] = [
  { assembly: 'Frame Top', profileCode: 'Deceuninck-KASA-70', packedLengthMm: 1003, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Frame Bottom', profileCode: 'Deceuninck-KASA-70', packedLengthMm: 1003, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Frame Leftt', profileCode: 'Deceuninck-KASA-70', packedLengthMm: 1503, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Frame Right', profileCode: 'Deceuninck-KASA-70', packedLengthMm: 1503, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: '(sash) Top', profileCode: 'Deceuninck-KANAT-70', packedLengthMm: 933, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: '(sash) Bottom', profileCode: 'Deceuninck-KANAT-70', packedLengthMm: 933, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: '(sash) Leftt', profileCode: 'Deceuninck-KANAT-70', packedLengthMm: 1433, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: '(sash) Right', profileCode: 'Deceuninck-KANAT-70', packedLengthMm: 1433, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: '(sash) GlazingBead Top', profileCode: 'Deceuninck-CITA-20', packedLengthMm: 813, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: '(sash) GlazingBead Bottom', profileCode: 'Deceuninck-CITA-20', packedLengthMm: 813, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: '(sash) GlazingBead Leftt', profileCode: 'Deceuninck-CITA-20', packedLengthMm: 1313, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: '(sash) GlazingBead Right', profileCode: 'Deceuninck-CITA-20', packedLengthMm: 1313, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
];

export const FP027_E1_DEMAND1_NONORTA = {
  id: 'FP027_E1_DEMAND1_NONORTA',
  fixtureValid: false,
  solved: false,
  classification: 'E1_FIXTURE_NOT_OBTAINABLE_NATURALLY',
  projectId: '100007',
  projectDbId: 7,
  designId: 'E1_DEMAND1_NONORTA',
  designDbId: 9,
  widthMm: 1000,
  heightMm: 1500,
  profileSystem: "Deceuninck 70'lik PVC Sistemi",
  generatedRowCount: 12,
  profileTotals: {
    'Deceuninck-KASA-70': 4,
    'Deceuninck-KANAT-70': 4,
    'Deceuninck-CITA-20': 4,
  },
  ortaPresent: false,
  injectedRow: false,
  warehouseSha256:
    'c8626da5166731e393a74ae731b663410ef77f2bde2b05bcfa572531e6c32012',
  settingsCaptureId: 'e1-settings-20260913-164948',
  settingsFullWindowSha256:
    '3393d0a6e3205334e36326fa1f4954ff2aa9a8096f2c4817848bc94befefff22',
  closesFp027: false,
  authorizesFormulaChange: false,
  provesDemandInequality: false,
  demand1Hypothesis: 'UNRESOLVED',
  isFailedExperiment: false,
  ortaSpecificHypothesis: 'STILL_LIVE',
  ninetyDegreeHypothesis: 'UNRESOLVED',
  physicalLengthScore: '6.0/10',
} as const;

/**
 * A valid E2 target is a naturally generated linear-cut piece whose
 * both ends are 90° and whose profile is not ORTA. Injecting a
 * synthetic 90/90 row, or editing a generated angle, is invalid
 * evidence. Demand count is not a validity condition.
 */
export function evaluateNonOrtaNinetyDegreeFixture(
  pieces:
    | readonly {
        profileCode: string;
        leftAngleDeg?: number;
        rightAngleDeg?: number;
        quantity?: number;
      }[]
    | null
    | undefined
): {
  fixtureValid: boolean;
  classification: 'E2_FIXTURE_VALID' | 'E2_FIXTURE_NOT_OBTAINABLE_NATURALLY' | 'UNPROVEN';
  ninetyDegreeRows: readonly { profileCode: string; quantity: number }[];
  candidateProfile: string | null;
} {
  if (pieces == null) {
    return {
      fixtureValid: false,
      classification: 'UNPROVEN',
      ninetyDegreeRows: [],
      candidateProfile: null,
    };
  }
  const ninetyDegreeRows = pieces
    .filter((piece) => piece.leftAngleDeg === 90 && piece.rightAngleDeg === 90)
    .map((piece) => ({
      profileCode: piece.profileCode,
      quantity: piece.quantity ?? 1,
    }));
  const candidates = ninetyDegreeRows.filter((row) => row.profileCode !== ORTA_PROFILE_CODE);
  if (candidates.length === 0) {
    return {
      fixtureValid: false,
      classification: 'E2_FIXTURE_NOT_OBTAINABLE_NATURALLY',
      ninetyDegreeRows,
      candidateProfile: null,
    };
  }
  return {
    fixtureValid: true,
    classification: 'E2_FIXTURE_VALID',
    ninetyDegreeRows,
    candidateProfile: candidates[0].profileCode,
  };
}

/** E2 required rows as generated. The only 90/90 piece is the ORTA mullion. */
export const FP027_E2_GENERATED_ROWS: readonly {
  assembly: string;
  profileCode: string;
  packedLengthMm: number;
  leftAngleDeg: number;
  rightAngleDeg: number;
  quantity: number;
}[] = [
  { assembly: 'Frame Top', profileCode: 'Deceuninck-KASA-70', packedLengthMm: 1003, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Frame Bottom', profileCode: 'Deceuninck-KASA-70', packedLengthMm: 1003, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Frame Leftt', profileCode: 'Deceuninck-KASA-70', packedLengthMm: 1503, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Frame Right', profileCode: 'Deceuninck-KASA-70', packedLengthMm: 1503, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Mullion Vertical', profileCode: 'Deceuninck-ORTA-KAYIT-70', packedLengthMm: 1416, leftAngleDeg: 90, rightAngleDeg: 90, quantity: 1 },
  { assembly: 'Left Area.GlazingBead Top', profileCode: 'Deceuninck-CITA-20', packedLengthMm: 440, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Left Area.GlazingBead Bottom', profileCode: 'Deceuninck-CITA-20', packedLengthMm: 440, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Left Area.GlazingBead Left', profileCode: 'Deceuninck-CITA-20', packedLengthMm: 1419, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Left Area.GlazingBead Right', profileCode: 'Deceuninck-CITA-20', packedLengthMm: 1419, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Right Area (Sash).Top', profileCode: 'Deceuninck-KANAT-70', packedLengthMm: 454, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Right Area (Sash).Bottom', profileCode: 'Deceuninck-KANAT-70', packedLengthMm: 454, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Right Area (Sash).Left', profileCode: 'Deceuninck-KANAT-70', packedLengthMm: 1433, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Right Area (Sash).Right', profileCode: 'Deceuninck-KANAT-70', packedLengthMm: 1433, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Right Area (Sash).GlazingBead Top', profileCode: 'Deceuninck-CITA-20', packedLengthMm: 334, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Right Area (Sash).GlazingBead Bottom', profileCode: 'Deceuninck-CITA-20', packedLengthMm: 334, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Right Area (Sash).GlazingBead Left', profileCode: 'Deceuninck-CITA-20', packedLengthMm: 1313, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
  { assembly: 'Right Area (Sash).GlazingBead Right', profileCode: 'Deceuninck-CITA-20', packedLengthMm: 1313, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 1 },
];

export const FP027_E2_NONORTA_90 = {
  id: 'FP027_E2_NONORTA_90',
  fixtureValid: false,
  solved: false,
  classification: 'E2_FIXTURE_NOT_OBTAINABLE_NATURALLY',
  projectId: '100008',
  projectDbId: 8,
  designId: 'E2_NONORTA_90',
  designDbId: 10,
  widthMm: 1000,
  heightMm: 1500,
  profileSystem: "Deceuninck 70'lik PVC Sistemi",
  template: 'two_panel_fixed_plus_sash',
  generatedRowCount: 17,
  cutListLogLine: 'E2_NONORTA_90 için 17 satır cut list üretildi.',
  profileTotals: {
    'Deceuninck-KASA-70': 4,
    'Deceuninck-KANAT-70': 4,
    'Deceuninck-CITA-20': 8,
    'Deceuninck-ORTA-KAYIT-70': 1,
  },
  ortaPresent: true,
  onlyNinetyDegreeProfile: 'Deceuninck-ORTA-KAYIT-70',
  injectedRow: false,
  anglesEdited: false,
  warehouseSha256:
    'ba488c66e73be4b605a54a7e13e8024c7d7ab9691fc269db7aaf756fddfa6445',
  warehouseQuantitiesIdenticalToV2: true,
  warehouseSelectionTintNote:
    'CITA card highlight changed pixels vs V2 hash c8626da5…; quantities remain CITA 46 / KANAT 96 / KASA 13 / ORTA 100.',
  settingsCaptureId: 'e2-settings-20260913-171102',
  settingsFullWindowSha256:
    '8597b36c1dba0e0d21113597bdeaba6e0a09d5d8eb0c83dcd3b09b8c3c92a3ae',
  settingsContentSha256:
    'e000c1ce6cebfe080dd76b8125119d3676a28667befb20133b58a0fa125f0760',
  closesFp027: false,
  authorizesFormulaChange: false,
  provesDemandInequality: false,
  authorizesNinetyControl: false,
  demand1Hypothesis: 'UNRESOLVED',
  isFailedExperiment: false,
  ortaSpecificHypothesis: 'STILL_LIVE',
  ninetyDegreeHypothesis: 'UNRESOLVED',
  physicalLengthScore: '6.0/10',
} as const;

export type Fp024cNinetyControlDualUseClassification =
  | 'DUAL_USE_SAFE'
  | 'DUAL_USE_UNSAFE'
  | 'DUAL_USE_CONDITIONAL'
  | 'UNPROVEN';

/**
 * FP-024C.5 independent 90° compensation fixture.
 * Chosen for a clear 90/90 mullion plus 45/45 frame references — not to
 * trigger ORTA surplus, demand=1, or the asdd 1→4 observation. Mullion
 * packed/nominal lengths are not pre-encoded; DoWin must generate them.
 */
export const FP024C_NINETY_CONTROL_SPEC = {
  fixtureId: 'FP024C_90_CONTROL',
  projectTemplate: 'FP024C_90_CONTROL',
  designId: 'FP024C_90_CONTROL_DESIGN',
  purpose: 'ANGLE_GEOMETRY_COMPENSATION',
  scientificQuestion:
    'Does a naturally generated 90° piece receive the same, different, or no packed/machine compensation relative to its nominal layer?',
  profileSystem: "Deceuninck 70'lik PVC Sistemi",
  widthMm: 1200,
  heightMm: 1200,
  geometryDescription:
    'single centered vertical mullion / two-panel symmetric frame',
  centeredVerticalMullion: true,
  sashRequired: false,
  selectedForCompensationOnly: true,
  geometryIndependentlySpecified: true,
  asddMullionIsThisControl: false,
  requiredOrtaCount: null,
  requiredOrtaSurplus: false,
  ortaDemandNaturallyEquals1: 'NOT_AN_ACCEPTANCE_FIELD',
  expectedMullionNominalLengthMm: null,
  expectedCompensationDeltaMm: null,
  ninetyDegreeAcceptance: { leftAngleDeg: 90, rightAngleDeg: 90, minCount: 1 },
  fortyFiveReferenceAcceptance: { leftAngleDeg: 45, rightAngleDeg: 45, minCount: 1 },
  settings: {
    weldingWasteMm: 3,
    sawThicknessMm: 4,
    trimCutMm: 0,
    sashOffsetMm: 7,
    glazingClearanceMm: 2.5,
    remnantThresholdMm: 500,
    machineId: 'DC-600',
  },
  dc550SkhGloballyEnabled: true,
  settingsUnchangedFromParent: true,
  stockSpecified: false,
  topologyRequiredForCompensationClassification: false,
  topologyRequiredForPackageIngest: true,
  machineExportRequiredForCompensation: 'MACHINE_LENGTH_LAYER',
  quantityConservationInOriginalAcceptanceGate: false,
} as const;

export type Fp024cNinetyControlCompensationClassification =
  | 'NO_OBSERVED_COMPENSATION_ON_90_CONTROL'
  | 'PACKED_COMPENSATION_OBSERVED_MACHINE_FOLLOWS_PACKED'
  | 'MACHINE_LAYER_DIFFERENCE_OBSERVED'
  | 'NOMINAL_PACKED_ONLY_MACHINE_NOT_MEASURED';

export type Fp024cNinetyControlLayerObservation =
  | 'NO_OBSERVED_EFFECT'
  | 'OBSERVED_DELTA'
  | 'MACHINE_NOT_MEASURED'
  | 'UNPROVEN';

/**
 * Layer classification only. Does not encode a production formula and
 * must not be cited as FP-027 root cause.
 */
export function classifyNinetyControlCompensationLayers(args: {
  nominalMm: number;
  packedMm: number;
  machineMm: number | null;
}): {
  packedMinusNominalMm: number;
  machineMinusPackedMm: number | null;
  machineMinusNominalMm: number | null;
  observation: Fp024cNinetyControlLayerObservation;
  classification: Fp024cNinetyControlCompensationClassification;
} {
  const packedMinusNominalMm = args.packedMm - args.nominalMm;
  if (args.machineMm == null) {
    return {
      packedMinusNominalMm,
      machineMinusPackedMm: null,
      machineMinusNominalMm: null,
      observation: packedMinusNominalMm === 0 ? 'MACHINE_NOT_MEASURED' : 'OBSERVED_DELTA',
      classification: 'NOMINAL_PACKED_ONLY_MACHINE_NOT_MEASURED',
    };
  }
  const machineMinusPackedMm = args.machineMm - args.packedMm;
  const machineMinusNominalMm = args.machineMm - args.nominalMm;
  if (machineMinusPackedMm !== 0) {
    return {
      packedMinusNominalMm,
      machineMinusPackedMm,
      machineMinusNominalMm,
      observation: 'OBSERVED_DELTA',
      classification: 'MACHINE_LAYER_DIFFERENCE_OBSERVED',
    };
  }
  if (packedMinusNominalMm !== 0) {
    return {
      packedMinusNominalMm,
      machineMinusPackedMm,
      machineMinusNominalMm,
      observation: 'OBSERVED_DELTA',
      classification: 'PACKED_COMPENSATION_OBSERVED_MACHINE_FOLLOWS_PACKED',
    };
  }
  return {
    packedMinusNominalMm: 0,
    machineMinusPackedMm: 0,
    machineMinusNominalMm: 0,
    observation: 'NO_OBSERVED_EFFECT',
    classification: 'NO_OBSERVED_COMPENSATION_ON_90_CONTROL',
  };
}

const FP024C_90_CONTROL_ORTA_LAYERS = classifyNinetyControlCompensationLayers({
  nominalMm: 1116,
  packedMm: 1116,
  machineMm: 1116,
});
const FP024C_90_CONTROL_KASA_LAYERS = classifyNinetyControlCompensationLayers({
  nominalMm: 1203,
  packedMm: 1203,
  machineMm: 1203,
});
const FP024C_90_CONTROL_CITA_H_LAYERS = classifyNinetyControlCompensationLayers({
  nominalMm: 540,
  packedMm: 540,
  machineMm: null,
});
const FP024C_90_CONTROL_CITA_V_LAYERS = classifyNinetyControlCompensationLayers({
  nominalMm: 1119,
  packedMm: 1119,
  machineMm: null,
});

/** Record A — compensation only. Independent 90° control, MEASURED. */
export const FP024C_90_CONTROL_COMPENSATION = {
  id: 'FP024C_90_CONTROL_COMPENSATION',
  status: 'MEASURED',
  purpose: 'COMPENSATION_PRIMARY',
  fixtureIdentity: 'FP024C_90_CONTROL',
  fixtureValid: true,
  projectId: 'FP024C_90_CONTROL',
  projectNo: '100009',
  projectDbId: 9,
  designId: 'FP024C_90_CONTROL_DESIGN',
  designDbId: 11,
  productionPlanId: 'FP024C_90_CONTROL_PLAN',
  productionPlanDbId: 7,
  runId: 'OptimizationRun_13_ae9c45f0',
  optimizationRunId: 13,
  solverId: 'ae9c45f0',
  solveDisposition: 'NEWLY_SOLVED',
  timestampIso: '2026-09-13T15:08:11.000Z',
  widthMm: 1200,
  heightMm: 1200,
  profileSystem: "Deceuninck 70'lik PVC Sistemi",
  geometryDescription:
    'single centered vertical mullion / two-panel symmetric frame',
  sashPresent: false,
  settingsSnapshot: FP024C_NINETY_CONTROL_SPEC.settings,
  dc550SkhGloballyEnabled: true,
  machine: 'DC-600',
  settingsFullWindowSha256:
    '8597b36c1dba0e0d21113597bdeaba6e0a09d5d8eb0c83dcd3b09b8c3c92a3ae',
  stockPreSha256:
    '82a46e09854d46f18b923f6592e137212fb8a5b2e54bfcfadf4e549ab1644f6d',
  stockPostSha256:
    '0013acd5b38c816ab7c1d93337700dd83ab2709695b079f809d7ce29a50639cc',
  stockQuantitiesMatchV2: true,
  stockUpdateModalShown: true,
  stockUpdateResponse: 'NO',
  warehouseImmutability: 'IMMUTABLE_VERIFIED',
  machineExportSha256:
    '4b386aa792a7f427a5ad30a9562cdf1bc8dbc1507f6ebd065c3a2ea2249047a9',
  pieces: [
    {
      profile: 'Deceuninck-ORTA-KAYIT-70',
      role: 'mullion',
      requiredCount: 1,
      nominalLengthMm: 1116,
      packedLengthMm: 1116,
      machineLengthMm: 1116,
      leftAngleDeg: 90,
      rightAngleDeg: 90,
      ...FP024C_90_CONTROL_ORTA_LAYERS,
    },
    {
      profile: 'Deceuninck-KASA-70',
      role: 'frame',
      requiredCount: 4,
      designOuterMm: 1200,
      nominalLengthMm: 1203,
      packedLengthMm: 1203,
      machineLengthMm: 1203,
      leftAngleDeg: 45,
      rightAngleDeg: 45,
      ...FP024C_90_CONTROL_KASA_LAYERS,
    },
    {
      profile: 'Deceuninck-CITA-20',
      role: 'glazing_bead_horizontal',
      requiredCount: 4,
      nominalLengthMm: 540,
      packedLengthMm: 540,
      machineLengthMm: null,
      leftAngleDeg: 45,
      rightAngleDeg: 45,
      ...FP024C_90_CONTROL_CITA_H_LAYERS,
    },
    {
      profile: 'Deceuninck-CITA-20',
      role: 'glazing_bead_vertical',
      requiredCount: 4,
      nominalLengthMm: 1119,
      packedLengthMm: 1119,
      machineLengthMm: null,
      leftAngleDeg: 45,
      rightAngleDeg: 45,
      ...FP024C_90_CONTROL_CITA_V_LAYERS,
    },
  ],
  classification: FP024C_90_CONTROL_ORTA_LAYERS.classification,
  ninetyRequiredPartsToPacked: 'PROVEN',
  ninetyPackedToMachine: 'PROVEN',
  fortyFiveRequiredPartsToPacked: 'OBSERVED',
  fortyFivePackedToMachine: 'OBSERVED',
  fortyFiveDesignOrReportNominalToRequiredParts: 'OBSERVED_PLUS_3_FOR_C5_FIXTURE',
  ninetyDesignOrReportToRequiredParts: 'OBSERVED_0_FOR_C5_FIXTURE',
  fortyFiveDesignReportToPackedTwoFixtures: 'OBSERVED_PLUS_3',
  ninetyDesignReportToPackedTwoFixtures: 'OBSERVED_0',
  fortyFiveClassObservedInterLayerDeltaMm: 0,
  ninetyClassObservedInterLayerDeltaMm: 0,
  crossAngleDifference: 'REJECTED_BY_OBSERVATION',
  crossAngleCompensationSame: 'REJECTED_BY_OBSERVATION',
  crossAngleLayerComparison: 'CROSS_ANGLE_LAYER_COMPARISON_SUPPORTED',
  generalizedCompensationFormula: 'UNPROVEN',
  nextGate: 'FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION',
  cannotCiteFp027Conservation: true,
  authorizesFormulaChange: false,
  physicalLengthScore: '6.0/10',
} as const;

/** Record B — conservation only. Passive transcription of the same run. */
export const FP027_90_CONTROL_CONSERVATION_OBSERVATION = {
  id: 'FP027_90_CONTROL_CONSERVATION_OBSERVATION',
  status: 'MEASURED',
  purpose: 'CONSERVATION_SECONDARY',
  fixtureIdentity: 'FP024C_90_CONTROL',
  requiredCount: 13,
  planCount: 17,
  deltaCount: 4,
  requiredLengthMm: 12564,
  planLengthMm: 17028,
  machineExportCount: 5,
  profiles: [
    {
      profile: 'Deceuninck-KASA-70',
      requiredCount: 4,
      planCount: 4,
      deltaCount: 0,
      machineExportCount: 4,
    },
    {
      profile: 'Deceuninck-ORTA-KAYIT-70',
      requiredCount: 1,
      planCount: 5,
      deltaCount: 4,
      machineExportCount: 1,
    },
    {
      profile: 'Deceuninck-CITA-20',
      requiredCount: 8,
      planCount: 8,
      deltaCount: 0,
      machineExportCount: 0,
    },
  ],
  remainderPropagation:
    'ORTA REMAINING_LENGTH 900.0 matches plan remainder after 5×1116; KASA 1165.4. Remainder not recomputed after export match filter.',
  warningText:
    '4 piece(s) in the optimization plan could not be matched to the detailed production list',
  classification: classifyRequiredVsPlanConservation({
    requiredCount: 13,
    planCount: 17,
  }),
  cannotAffectFixtureValidity: true,
  cannotCiteFp024cCompensation: true,
  cannotAuthorizeRerun: true,
  cannotChangeGeometry: true,
  cannotCloseFp027: true,
  cannotProveRootCause: true,
  variableBundle: 'ORTA + demand=1 + 90/90 + single-length + cost/profile',
  repeatability: 'REPEATABLE_ACROSS_INDEPENDENT_GEOMETRY',
  asddAndControlledSurplusDelta: 3,
  thisFixtureSurplusDelta: 4,
  alwaysDuplicateToFour: 'WEAKENED',
  fp027RootCause: 'UNPROVEN',
} as const;

/**
 * Dual-use reassessment. CONDITIONAL: a future independently authorized
 * compensation run may be transcribed into Record B, but FP-027 must not
 * choose the geometry, and this reassessment does not open the gate.
 */
export const FP024C_NINETY_CONTROL_DUAL_USE = {
  classification: 'DUAL_USE_CONDITIONAL' as Fp024cNinetyControlDualUseClassification,
  authorizesControl: false,
  targetingOrtaOneToFourChangesFixtureSelection: true,
  targetingOrtaOneToFourIsUnsafe: true,
  passiveObservationAllowedAfterIndependentAuthorization: true,
  fixtureSelectionBiasIfFp027ChoosesGeometry: true,
  stockStateLimitsConservationAuthority: true,
  lengthLayersIndependentOfTopology: true,
  quantityFeedbackRerunForbidden: true,
  sharedVerdictAuthorityForbidden: true,
  fp027RootCause: 'UNPROVEN',
  physicalLengthScore: '6.0/10',
  formulaFreeze: true,
} as const;

/**
 * FP-024C.6 — length-layer semantics. Artifact-only Design Preview export
 * from the existing C.5 package. Do not solve again. Do not patch formulas.
 */
export const FP024C6_LENGTH_LAYER_SEMANTICS = {
  id: 'FP024C6_LENGTH_LAYER_SEMANTICS',
  status: 'ACCEPTED',
  outcome: 'A',
  classification: 'LAYER_SEMANTICS_RECONCILED',
  scientificQuestion:
    'Where exactly does the 1200 → 1203 frame transformation occur: Design geometry, Design Preview/report, Required Parts, packed plan, or machine export?',
  fixtureIdentity: 'FP024C_90_CONTROL',
  projectDbId: 9,
  designDbId: 11,
  productionPlanDbId: 7,
  optimizationRunDbId: 13,
  artifactOnlyProtocolPreserved: true,
  newSolveCreated: false,
  newPlanCreated: false,
  stockUnchanged: true,
  doNotRerunDowin: true,
  doNotPatchFormulas: true,
  asddDesignPreviewReport: {
    document: 'OptimizationReport_20260909_181432_DesignPreview.pdf',
    kasaLengthMm: 1000,
    ortaLengthMm: 1416,
    packedKasaMm: 1003,
    machineKasaMm: 1003,
    packedOrtaMm: 1416,
    machineOrtaMm: 1416,
    note: 'Historical asdd fixture only. Do not collapse into C.5/C.6.',
  },
  controlLayers: {
    designGeometryOuterMm: { kasa: 1200, orta: null, source: 'design canvas 1200×1200' },
    designPreviewReportMm: {
      kasa: 1200,
      orta: 1116,
      source: 'OptimizationReport_20260913_191321_DesignPreview.pdf Profile Cutting List',
    },
    cutListPreviewMm: { kasa: 1203, orta: 1116, source: "Cut List for FP024C_90_CONTROL_DESIGN (Preview)" },
    requiredPartsMm: { kasa: 1203, orta: 1116, source: 'optimizer Required Parts' },
    packedPlanMm: { kasa: 1203, orta: 1116, source: 'optimization bar strip' },
    machineLengthMm: { kasa: 1203, orta: 1116, source: 'DC-600 Table1.LENGTH/10' },
    machineFrameXYMm: { kasa: 1200, orta: 1200, source: 'DC-600 FRAME_X/Y' },
  },
  kasaFiveLayer: {
    GEOMETRY: 1200,
    DESIGN_REPORT: 1200,
    REQUIRED_PARTS: 1203,
    PACKED: 1203,
    MACHINE: 1203,
  },
  ortaFiveLayer: {
    GEOMETRY: null,
    DESIGN_REPORT: 1116,
    REQUIRED_PARTS: 1116,
    PACKED: 1116,
    MACHINE: 1116,
  },
  geometryLengthMm: { kasa: 1200, orta: null },
  designReportLengthMm: { kasa: 1200, orta: 1116 },
  requiredPartsLengthMm: { kasa: 1203, orta: 1116 },
  packedLengthMm: { kasa: 1203, orta: 1116 },
  machineLengthMm: { kasa: 1203, orta: 1116 },
  geometryToReportDeltaMm: { kasa: 0, orta: null },
  reportToRequiredDeltaMm: { kasa: 3, orta: 0 },
  requiredToPackedDeltaMm: { kasa: 0, orta: 0 },
  packedToMachineDeltaMm: { kasa: 0, orta: 0 },
  designPreviewPdf: {
    status: 'EXPORTED',
    filename: 'OptimizationReport_20260913_191321_DesignPreview.pdf',
    sha256: '2c2e558cba2016b2924266ba63768cd3ffe9e8bc2bba8d9b2880770d32c9e0f7',
    capturedAtIso: '2026-09-13T16:14:00.000Z',
    sourceLayer: 'Optimization Export as PDF / Design preview report',
    kasaLengthMm: 1200,
    ortaLengthMm: 1116,
    licensedFileCommitted: false,
    renderPngSha256: '115698c570479e999b4e334bc3a50847a0a5758ac2c5d284dbf30ef04c610da5',
  },
  firstPass: 'ARTIFACT_ONLY_DESIGN_PREVIEW_EXPORT',
  firstObserved1200To1203Transition: 'DESIGN_REPORT_TO_REQUIRED_PARTS',
  transformation1200To1203FirstObservedAt: 'DESIGN_REPORT_TO_REQUIRED_PARTS',
  reportToRequiredClassification: 'DESIGN_REPORT_TO_REQUIRED_PARTS_DELTA_+3_OBSERVED_FOR_C5_FIXTURE',
  ninetyReportToRequiredClassification: 'DESIGN_REPORT_TO_REQUIRED_PARTS_DELTA_0_OBSERVED_FOR_C5_FIXTURE',
  fortyFiveReportToPackedTwoFixtures: 'OBSERVED_PLUS_3',
  ninetyReportToPackedTwoFixtures: 'OBSERVED_0',
  requiredPartsToPackedDelta: 0,
  packedToMachineDelta: 0,
  citaDesignPreviewMm: { horizontal: 537, vertical: 1116 },
  citaRequiredPartsMm: { horizontal: 540, vertical: 1119 },
  citaNote:
    'CITA also shows Design Preview 537/1116 vs Required Parts 540/1119. Recorded only. No formula inferred.',
  independentReview: 'ACCEPTED',
  authority: {
    ninetyRequiredPartsToPacked: 'PROVEN',
    ninetyPackedToMachine: 'PROVEN',
    fortyFiveRequiredPartsToPacked: 'OBSERVED',
    fortyFivePackedToMachine: 'OBSERVED',
    fortyFiveDesignOrReportNominalToRequiredParts: 'OBSERVED_PLUS_3_FOR_C5_FIXTURE',
    ninetyDesignOrReportToRequiredParts: 'OBSERVED_0_FOR_C5_FIXTURE',
    fortyFiveDesignReportToPackedTwoFixtures: 'OBSERVED_PLUS_3',
    ninetyDesignReportToPackedTwoFixtures: 'OBSERVED_0',
    packedToMachineRepresentedRows: 'OBSERVED_0',
    sameCompensationAcrossAngles: 'REJECTED_BY_OBSERVATION',
    crossAngleLayerComparison: 'CROSS_ANGLE_LAYER_COMPARISON_SUPPORTED',
    generalizedCompensationFormula: 'UNPROVEN',
  },
  nextPossibleEvidenceAction:
    'FP-024C.7 Compensation Causality Reconciliation using existing Weld 3→0 evidence first. Do not implement formulas.',
  designPreviewExportAuthorizedByThisCheckpoint: true,
  authorizesFormulaChange: false,
  physicalLengthScore: '6.0/10',
} as const;

export interface Fp024c7LayerMeasurement {
  designReportMm: number;
  requiredPartsMm: number | null;
  packedMm: number;
  machineMm: number | null;
}

function reportToRequiredPartsDeltaMm(
  layer: Fp024c7LayerMeasurement
): number | null {
  return layer.requiredPartsMm == null
    ? null
    : layer.requiredPartsMm - layer.designReportMm;
}

/**
 * Map a Welding Waste 3→0 pair onto the C.6 five-layer position.
 * Does not infer a missing Required Parts value. Does not encode
 * a production formula. AICS-001: evidence classification only.
 */
export function evaluateWeldingWasteLayerCausality(args: {
  weld3Kasa: Fp024c7LayerMeasurement;
  weld0Kasa: Fp024c7LayerMeasurement;
  weld3Orta: Fp024c7LayerMeasurement;
  weld0Orta: Fp024c7LayerMeasurement;
}): {
  designReportUnchanged: boolean;
  fortyFiveReportToPackedDeltaAtWeld3Mm: number;
  fortyFiveReportToPackedDeltaAtWeld0Mm: number;
  ninetyReportToPackedDeltaAtWeld3Mm: number;
  ninetyReportToPackedDeltaAtWeld0Mm: number;
  fortyFiveReportToRequiredPartsDeltaAtWeld3Mm: number | null;
  fortyFiveReportToRequiredPartsDeltaAtWeld0Mm: number | null;
  ninetyReportToRequiredPartsDeltaAtWeld3Mm: number | null;
  ninetyReportToRequiredPartsDeltaAtWeld0Mm: number | null;
  weldMovesFortyFiveReportToPacked: boolean;
  weldMovesNinetyReportToPacked: boolean;
  requiredPartsMeasuredAtBothWeldSettings: boolean;
  weldMovesReportToRequiredParts:
    | 'UNPROVEN'
    | 'PROVEN_FOR_ASDD_FIXTURE'
    | 'NO_OBSERVED_EFFECT';
  sameCompensationAcrossAngles: 'REJECTED_BY_OBSERVATION';
  authorizesFormulaChange: false;
} {
  const kasaReportUnchanged =
    args.weld3Kasa.designReportMm === args.weld0Kasa.designReportMm;
  const ortaReportUnchanged =
    args.weld3Orta.designReportMm === args.weld0Orta.designReportMm;
  const fortyFiveReportToPackedDeltaAtWeld3Mm =
    args.weld3Kasa.packedMm - args.weld3Kasa.designReportMm;
  const fortyFiveReportToPackedDeltaAtWeld0Mm =
    args.weld0Kasa.packedMm - args.weld0Kasa.designReportMm;
  const ninetyReportToPackedDeltaAtWeld3Mm =
    args.weld3Orta.packedMm - args.weld3Orta.designReportMm;
  const ninetyReportToPackedDeltaAtWeld0Mm =
    args.weld0Orta.packedMm - args.weld0Orta.designReportMm;
  const fortyFiveReportToRequiredPartsDeltaAtWeld3Mm = reportToRequiredPartsDeltaMm(
    args.weld3Kasa
  );
  const fortyFiveReportToRequiredPartsDeltaAtWeld0Mm = reportToRequiredPartsDeltaMm(
    args.weld0Kasa
  );
  const ninetyReportToRequiredPartsDeltaAtWeld3Mm = reportToRequiredPartsDeltaMm(
    args.weld3Orta
  );
  const ninetyReportToRequiredPartsDeltaAtWeld0Mm = reportToRequiredPartsDeltaMm(
    args.weld0Orta
  );
  const requiredPartsMeasuredAtBothWeldSettings =
    fortyFiveReportToRequiredPartsDeltaAtWeld3Mm != null &&
    fortyFiveReportToRequiredPartsDeltaAtWeld0Mm != null &&
    ninetyReportToRequiredPartsDeltaAtWeld3Mm != null &&
    ninetyReportToRequiredPartsDeltaAtWeld0Mm != null;

  let weldMovesReportToRequiredParts:
    | 'UNPROVEN'
    | 'PROVEN_FOR_ASDD_FIXTURE'
    | 'NO_OBSERVED_EFFECT' = 'UNPROVEN';
  if (requiredPartsMeasuredAtBothWeldSettings) {
    if (
      fortyFiveReportToRequiredPartsDeltaAtWeld3Mm === 3 &&
      fortyFiveReportToRequiredPartsDeltaAtWeld0Mm === 0 &&
      ninetyReportToRequiredPartsDeltaAtWeld3Mm === 0 &&
      ninetyReportToRequiredPartsDeltaAtWeld0Mm === 0
    ) {
      weldMovesReportToRequiredParts = 'PROVEN_FOR_ASDD_FIXTURE';
    } else if (
      fortyFiveReportToRequiredPartsDeltaAtWeld3Mm ===
        fortyFiveReportToRequiredPartsDeltaAtWeld0Mm &&
      ninetyReportToRequiredPartsDeltaAtWeld3Mm ===
        ninetyReportToRequiredPartsDeltaAtWeld0Mm
    ) {
      weldMovesReportToRequiredParts = 'NO_OBSERVED_EFFECT';
    }
  }

  return {
    designReportUnchanged: kasaReportUnchanged && ortaReportUnchanged,
    fortyFiveReportToPackedDeltaAtWeld3Mm,
    fortyFiveReportToPackedDeltaAtWeld0Mm,
    ninetyReportToPackedDeltaAtWeld3Mm,
    ninetyReportToPackedDeltaAtWeld0Mm,
    fortyFiveReportToRequiredPartsDeltaAtWeld3Mm,
    fortyFiveReportToRequiredPartsDeltaAtWeld0Mm,
    ninetyReportToRequiredPartsDeltaAtWeld3Mm,
    ninetyReportToRequiredPartsDeltaAtWeld0Mm,
    weldMovesFortyFiveReportToPacked:
      kasaReportUnchanged &&
      fortyFiveReportToPackedDeltaAtWeld3Mm === 3 &&
      fortyFiveReportToPackedDeltaAtWeld0Mm === 0,
    weldMovesNinetyReportToPacked:
      !ortaReportUnchanged ||
      ninetyReportToPackedDeltaAtWeld3Mm !== 0 ||
      ninetyReportToPackedDeltaAtWeld0Mm !== 0,
    requiredPartsMeasuredAtBothWeldSettings,
    weldMovesReportToRequiredParts,
    sameCompensationAcrossAngles: 'REJECTED_BY_OBSERVATION',
    authorizesFormulaChange: false,
  };
}

/**
 * FP-024C.7 — compensation causality. Weld=0 Required Parts boundary
 * measured on the existing asdd fixture. Do not patch formulas.
 */
export const FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION = {
  id: 'FP024C7_COMPENSATION_CAUSALITY_RECONCILIATION',
  status: 'ACCEPTED',
  scientificQuestion:
    'At Welding Waste = 0, does the 45° Design Report → Required Parts delta become 0?',
  firstPass: 'EXISTING_WELD_3_TO_0_ONLY',
  weld0RequiredPartsMeasurement: '2026-09-13T19:54:17',
  doNotRerunDowin: true,
  doNotPatchFormulas: true,
  authorizesWeld0Rerun: false,
  authorizesFormulaChange: false,
  independentReviewOfFp024c6: 'ACCEPTED',
  protocol: {
    fixture: 'asdd / asdasd 100001',
    productionPlan: 'FP024C7_WELD0_RP',
    productionPlanId: 8,
    discardedStaleTodayWorkCutList: true,
    discardedTodayWork1940Classification: 'INVALID_FOR_CAUSAL_AUTHORITY',
    discardedTodayWork1940Reason: 'Weld=0 had not persisted',
    newSolveCreated: false,
    stockUnchanged: true,
    settings: {
      weldingWasteMm: 0,
      sawThicknessMm: 4,
      trimCutMm: 0,
      sashOffsetMm: 7,
      glazingClearanceMm: 2.5,
      minimumOffcutMm: 500,
      machineId: 'DC-600',
    },
    settingsPersistSha256:
      '78f75452ee322f8f89d4e15a7f3162ffc5ecd424b74fbec6b03427b2ae216f7e',
    settingsSavedToastSha256:
      'd6e4fadd4f48e56844296b7c29d08d2c80bfef31a2666e633a100d60b6a22b09',
    settingsPostCutSha256:
      '94ebca8707358f1eeb523aaf9b150596dcb0f52eae8a9a69d233789099aad8bd',
    weld0CutListSha256:
      'e18a96e92dccfc8eabcf35337c72113e106f8cbf1b88ec391ef40b910552dd16',
    weld3AsddCutListArtifactSha256:
      'de94f6253e414a738a71cc137fd68fb93ca69aa33396821177b9b645369981f8',
    weld3AsddSupportingCutListSha256:
      'fe916f3fac8296201ea2e7e8060ac2b4a4831a30caba30e54d7c006711a3e1d7',
  },
  asddWeld3: {
    source:
      'BASELINE_REPRODUCTION_RUN packed/machine + artifact-only asdd Cut List transcription',
    kasa: { GEOMETRY: 1000, DESIGN_REPORT: 1000, REQUIRED_PARTS: 1003, PACKED: 1003, MACHINE: 1003 },
    kasaVertical: { DESIGN_REPORT: 1500, REQUIRED_PARTS: 1503, PACKED: 1503, MACHINE: 1503 },
    kanatHorizontal: { DESIGN_REPORT: 451, REQUIRED_PARTS: 454, PACKED: 454, MACHINE: 454 },
    kanatVertical: { DESIGN_REPORT: 1430, REQUIRED_PARTS: 1433, PACKED: 1433, MACHINE: 1433 },
    orta: { DESIGN_REPORT: 1416, REQUIRED_PARTS: 1416, PACKED: 1416, MACHINE: 1416 },
  },
  asddWeld0: {
    source: 'FP024C7_WELD0_RP live Required Parts 2026-09-13 19:54:17; packed/machine from WELDING_WASTE_0 2026-09-10 21:54',
    kasa: { GEOMETRY: 1000, DESIGN_REPORT: 1000, REQUIRED_PARTS: 1000, PACKED: 1000, MACHINE: 1000 },
    kasaVertical: { DESIGN_REPORT: 1500, REQUIRED_PARTS: 1500, PACKED: 1500, MACHINE: 1500 },
    kanatHorizontal: { DESIGN_REPORT: 451, REQUIRED_PARTS: 451, PACKED: 451, MACHINE: 451 },
    kanatVertical: { DESIGN_REPORT: 1430, REQUIRED_PARTS: 1430, PACKED: 1430, MACHINE: 1430 },
    orta: { DESIGN_REPORT: 1416, REQUIRED_PARTS: 1416, PACKED: 1416, MACHINE: 1416 },
  },
  controlWeld3: {
    source: 'FP024C_90_CONTROL C.5/C.6',
    kasa: { GEOMETRY: 1200, DESIGN_REPORT: 1200, REQUIRED_PARTS: 1203, PACKED: 1203, MACHINE: 1203 },
    orta: { DESIGN_REPORT: 1116, REQUIRED_PARTS: 1116, PACKED: 1116, MACHINE: 1116 },
  },
  findings: {
    designReportUnchangedUnderWeld3To0: 'NO_OBSERVED_EFFECT',
    fortyFiveReportToPackedAtWeld3Mm: 3,
    fortyFiveReportToPackedAtWeld0Mm: 0,
    fortyFivePackedToMachineAtBothWeldSettingsMm: 0,
    ninetyReportToPackedAtBothWeldSettingsMm: 0,
    ninetyPackedToMachineAtBothWeldSettingsMm: 0,
    fortyFiveReportToPackedTwoFixtures: 'OBSERVED_PLUS_3',
    ninetyReportToPackedTwoFixtures: 'OBSERVED_0',
    fortyFiveReportToRequiredPartsAtWeld3: 'OBSERVED_PLUS_3_ASDD_AND_C5',
    fortyFiveReportToRequiredPartsAtWeld0: 'OBSERVED_0_FOR_ASDD_FIXTURE',
    ninetyReportToRequiredPartsAtWeld3: 'OBSERVED_0_ASDD_AND_C5',
    ninetyReportToRequiredPartsAtWeld0: 'OBSERVED_0_FOR_ASDD_FIXTURE',
    weld0ReportToRequiredPartsDelta45: 0,
    weld0ReportToRequiredPartsDelta90: 0,
    weld3To0EffectOn45ReportToPacked: 'PROVEN_FOR_ASDD_FIXTURE',
    weld3To0EffectOn90ReportToPacked: 'NO_OBSERVED_EFFECT_FOR_ASDD_FIXTURE',
    weld3To0EffectOn45ReportToRequiredParts: 'PROVEN_FOR_ASDD_FIXTURE',
    weld3To0EffectOn90ReportToRequiredParts: 'NO_OBSERVED_EFFECT_FOR_ASDD_FIXTURE',
    weld0RequiredPartsLayer: 'MEASURED',
    requiredPartsAtWeld0: 'DELTA_0',
    existingWeld3RequiredPartsArtifactFound: true,
    pairedWeld3To0BoundaryProof: true,
    weldCausesDesignReportToRequiredPartsPlus3: 'PROVEN_FOR_ASDD_FIXTURE',
    weldMovesFortyFiveReportToPacked: 'PROVEN_FOR_ASDD_FIXTURE',
    weldMovesNinety: 'NO_OBSERVED_EFFECT_FOR_ASDD_FIXTURE',
    weldMovesReportToRequiredParts: 'PROVEN_FOR_ASDD_FIXTURE',
    weldCausalityAtRequiredPartsBoundary: 'PROVEN_FOR_ASDD_FIXTURE',
    consistentWithC6LayerPosition: true,
    sameCompensationAcrossAngles: 'REJECTED_BY_OBSERVATION',
    generalizedCompensationFormula: 'UNPROVEN',
  },
  limitation:
    'Paired Design Report → Required Parts proof on asdd is accepted. The 19:40 today work 1003 list remains INVALID_FOR_CAUSAL_AUTHORITY. Do not encode packed = nominal + WeldingWaste.',
  nextPossibleEvidenceAction:
    'FP-024C.8 second-fixture Weld=0 Required Parts replication on C.5. Do not implement a formula.',
  physicalLengthScore: '6.0/10',
} as const;

export function evaluateTwoFixtureWeldCausality(args: {
  asddWeld3KasaReportToRequiredPartsDeltaMm: number;
  asddWeld0KasaReportToRequiredPartsDeltaMm: number;
  c5Weld3KasaReportToRequiredPartsDeltaMm: number;
  c5Weld0KasaReportToRequiredPartsDeltaMm: number;
  asddOrtaReportToRequiredPartsDeltaAtWeld3Mm: number;
  asddOrtaReportToRequiredPartsDeltaAtWeld0Mm: number;
  c5OrtaReportToRequiredPartsDeltaAtWeld3Mm: number;
  c5OrtaReportToRequiredPartsDeltaAtWeld0Mm: number;
}): {
  weldCausalityReplicatedAcrossTwoFixtures:
    | 'PROVEN_FOR_MEASURED_KASA_CONDITIONS'
    | 'CROSS_FIXTURE_WELD_CAUSALITY_CONTRADICTION'
    | 'UNPROVEN';
  ninetyReplication:
    | 'REPLICATED_NO_OBSERVED_EFFECT'
    | 'CONTRADICTION'
    | 'UNPROVEN';
  authorizesFormulaChange: false;
} {
  const fortyFiveReplicated =
    args.asddWeld3KasaReportToRequiredPartsDeltaMm === 3 &&
    args.asddWeld0KasaReportToRequiredPartsDeltaMm === 0 &&
    args.c5Weld3KasaReportToRequiredPartsDeltaMm === 3 &&
    args.c5Weld0KasaReportToRequiredPartsDeltaMm === 0;
  const fortyFiveContradicted =
    args.c5Weld0KasaReportToRequiredPartsDeltaMm === 3 &&
    args.asddWeld0KasaReportToRequiredPartsDeltaMm === 0;
  const ninetyReplicated =
    args.asddOrtaReportToRequiredPartsDeltaAtWeld3Mm === 0 &&
    args.asddOrtaReportToRequiredPartsDeltaAtWeld0Mm === 0 &&
    args.c5OrtaReportToRequiredPartsDeltaAtWeld3Mm === 0 &&
    args.c5OrtaReportToRequiredPartsDeltaAtWeld0Mm === 0;
  const ninetyContradicted =
    args.c5OrtaReportToRequiredPartsDeltaAtWeld0Mm !== 0 ||
    args.asddOrtaReportToRequiredPartsDeltaAtWeld0Mm !== 0;

  return {
    weldCausalityReplicatedAcrossTwoFixtures: fortyFiveReplicated
      ? 'PROVEN_FOR_MEASURED_KASA_CONDITIONS'
      : fortyFiveContradicted
        ? 'CROSS_FIXTURE_WELD_CAUSALITY_CONTRADICTION'
        : 'UNPROVEN',
    ninetyReplication: ninetyReplicated
      ? 'REPLICATED_NO_OBSERVED_EFFECT'
      : ninetyContradicted
        ? 'CONTRADICTION'
        : 'UNPROVEN',
    authorizesFormulaChange: false,
  };
}

/**
 * FP-024C.8 — replicate the Weld=0 Required Parts boundary on C.5.
 * No solve. No Welding Waste change. No formula patch. AICS-001.
 */
export const FP024C8_WELD0_CONTROL_REPLICATION = {
  id: 'FP024C8_WELD0_CONTROL_REPLICATION',
  status: 'ACCEPTED',
  scientificQuestion:
    'At Weld=0 on C.5, does KASA Required Parts become 1200 and ORTA stay 1116?',
  independentReviewOfFp024c7: 'ACCEPTED',
  doNotPatchFormulas: true,
  authorizesFormulaChange: false,
  newSolveCreated: false,
  stockUnchanged: true,
  weldingWasteLeftAtPersistedZero: true,
  existingPlan7AndRun13NotReusedAsFreshEvidence: true,
  protocol: {
    projectName: 'FP024C_90_CONTROL',
    projectDbId: 9,
    projectNo: '100009',
    designName: 'FP024C_90_CONTROL_DESIGN',
    designDbId: 11,
    productionPlan: 'FP024C8_WELD0_RP',
    productionPlanId: 9,
    generatedAt: '2026-09-13T20:06:13',
    cutListRows: 13,
    totalLengthMm: 12528,
    settings: {
      weldingWasteMm: 0,
      sawThicknessMm: 4,
      trimCutMm: 0,
      sashOffsetMm: 7,
      glazingClearanceMm: 2.5,
      minimumOffcutMm: 500,
      machineId: 'DC-600',
    },
    settingsPrecheckSha256:
      'd7914c5dc78406e720561fca2556c7b6a0e81ed5cb65cd486e779430ba453e41',
    settingsPostCutSha256:
      '78f75452ee322f8f89d4e15a7f3162ffc5ecd424b74fbec6b03427b2ae216f7e',
    cutListSha256:
      'c8d8add5045622a767a397d906c3ef60da2c9b0c60c3d98291a921cfc30984d6',
  },
  discardedTodayWork1940: {
    classification: 'INVALID_FOR_CAUSAL_AUTHORITY',
    reason: 'Weld=0 had not persisted',
    kasaValuesMustNotSupportPositiveConclusion: [1003],
    preservedInAuditHistory: true,
  },
  lockedWeld3Reference: {
    kasa: { DESIGN_REPORT: 1200, REQUIRED_PARTS: 1203 },
    orta: { DESIGN_REPORT: 1116, REQUIRED_PARTS: 1116 },
  },
  weld0Measurement: {
    kasa: { DESIGN_REPORT: 1200, REQUIRED_PARTS: 1200, angles: '45/45' },
    orta: { DESIGN_REPORT: 1116, REQUIRED_PARTS: 1116, angles: '90/90' },
    citaHorizontal: { REQUIRED_PARTS: 537, angles: '45/45', reportLayer: 'NOT_USED_AS_PRIMARY' },
    citaVertical: { REQUIRED_PARTS: 1116, angles: '45/45', reportLayer: 'NOT_USED_AS_PRIMARY' },
  },
  findings: {
    c5Weld0ReportToRequiredPartsDelta45: 0,
    c5Weld0ReportToRequiredPartsDelta90: 0,
    weld3To0EffectOn45ReportToRequiredParts: 'PROVEN_FOR_C5_FIXTURE',
    weld3To0EffectOn90ReportToRequiredParts: 'NO_OBSERVED_EFFECT_FOR_C5_FIXTURE',
    weldCausalityReplicatedAcrossTwoFixtures: 'PROVEN_FOR_MEASURED_KASA_CONDITIONS',
    ninetyReplication: 'REPLICATED_NO_OBSERVED_EFFECT',
    universalPlusWeldRuleForAll45Profiles: 'UNPROVEN',
    generalizedCompensationFormula: 'UNPROVEN',
  },
  limitation:
    'Replication is for measured Deceuninck 70 KASA 45° and ORTA 90° on asdd and C.5. Do not implement RequiredParts = Report + WeldingWaste. Do not generalize to unmeasured profiles or angles.',
  physicalLengthScore: '6.0/10',
} as const;

/**
 * FP-024C.9 — pair CITA Design Report from the existing C.6 PDF with
 * already-measured Weld=3 / Weld=0 Required Parts. Artifact-only.
 * AICS-001: evidence classification. Does not encode a production formula.
 */
export function evaluateCitaWeldCausalityFromExistingArtifacts(args: {
  citaIdentifiedUnambiguously: boolean;
  designReportHorizontalMm: number | null;
  designReportVerticalMm: number | null;
  weld3RequiredPartsHorizontalMm: number;
  weld3RequiredPartsVerticalMm: number;
  weld0RequiredPartsHorizontalMm: number;
  weld0RequiredPartsVerticalMm: number;
}): {
  citaDesignReportLayer: 'PROVEN' | 'UNPROVEN';
  weld3To0EffectOnCitaReportToRequiredParts:
    | 'PROVEN_FOR_C5_FIXTURE'
    | 'UNPROVEN';
  weldCausalityProfileCoverage:
    | 'REPLICATED_ON_KASA_AND_CITA_45_DEGREE_PROFILES'
    | 'UNPROVEN';
  authorizesFormulaChange: false;
  universalFortyFiveRule: 'UNPROVEN';
  generalizedCompensationFormula: 'UNPROVEN';
} {
  const reportH = args.designReportHorizontalMm;
  const reportV = args.designReportVerticalMm;
  if (
    !args.citaIdentifiedUnambiguously ||
    reportH == null ||
    reportV == null
  ) {
    return {
      citaDesignReportLayer: 'UNPROVEN',
      weld3To0EffectOnCitaReportToRequiredParts: 'UNPROVEN',
      weldCausalityProfileCoverage: 'UNPROVEN',
      authorizesFormulaChange: false,
      universalFortyFiveRule: 'UNPROVEN',
      generalizedCompensationFormula: 'UNPROVEN',
    };
  }

  const proven =
    args.weld3RequiredPartsHorizontalMm - reportH === 3 &&
    args.weld3RequiredPartsVerticalMm - reportV === 3 &&
    args.weld0RequiredPartsHorizontalMm - reportH === 0 &&
    args.weld0RequiredPartsVerticalMm - reportV === 0;

  return {
    citaDesignReportLayer: 'PROVEN',
    weld3To0EffectOnCitaReportToRequiredParts: proven
      ? 'PROVEN_FOR_C5_FIXTURE'
      : 'UNPROVEN',
    weldCausalityProfileCoverage: proven
      ? 'REPLICATED_ON_KASA_AND_CITA_45_DEGREE_PROFILES'
      : 'UNPROVEN',
    authorizesFormulaChange: false,
    universalFortyFiveRule: 'UNPROVEN',
    generalizedCompensationFormula: 'UNPROVEN',
  };
}

/**
 * FP-024C.9 — existing-artifact profile coverage. CITA Design Report
 * transcribed from the already-exported C.6 Design Preview PDF.
 * Do not open DoWin. Do not change settings. Do not solve. Do not
 * implement RequiredParts = Report + WeldingWaste. AICS-001.
 */
export const FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE = {
  id: 'FP024C9_EXISTING_ARTIFACT_PROFILE_COVERAGE',
  status: 'ACCEPTED',
  scientificQuestion:
    'Does the already-exported C.6 Design Preview PDF establish the CITA Design Report layer strongly enough to pair existing Weld=3 and Weld=0 Required Parts?',
  independentReviewOfFp024c7: 'ACCEPTED',
  independentReviewOfFp024c8: 'ACCEPTED',
  artifactOnlyProtocolPreserved: true,
  doWinOpened: false,
  settingsChanged: false,
  weldingWasteLeftAtPersistedZero: true,
  newSolveCreated: false,
  newPlanCreated: false,
  newExportCreated: false,
  formulasModified: false,
  authorizesFormulaChange: false,
  doNotPatchFormulas: true,
  licensedPdfCommitted: false,
  designPreviewPdf: {
    filename: 'OptimizationReport_20260913_191321_DesignPreview.pdf',
    sha256: '2c2e558cba2016b2924266ba63768cd3ffe9e8bc2bba8d9b2880770d32c9e0f7',
    renderPngSha256: '115698c570479e999b4e334bc3a50847a0a5758ac2c5d284dbf30ef04c610da5',
    sourceLayer: 'Optimization Export as PDF / Design preview report Profile Cutting List',
    capturedAtIso: '2026-09-13T16:14:00.000Z',
  },
  citaDesignPreviewRows: [
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
  ],
  citaIdentifiedUnambiguously: true,
  citaDesignReportLayer: 'PROVEN',
  cita: {
    designReport: { horizontal: 537, vertical: 1116 },
    weld3RequiredParts: { horizontal: 540, vertical: 1119 },
    weld0RequiredParts: { horizontal: 537, vertical: 1116 },
    weld3DeltaMm: { horizontal: 3, vertical: 3 },
    weld0DeltaMm: { horizontal: 0, vertical: 0 },
    weld3Source: 'C.5 Required Parts / C.6 citaRequiredPartsMm',
    weld0Source: 'C.8 weld0Measurement citaHorizontal/citaVertical',
    reportSource: 'C.6 Design Preview PDF Profile Cutting List',
  },
  kanat: {
    fixture: 'asdd',
    designReport: { horizontal: 451, vertical: 1430 },
    weld3RequiredParts: { horizontal: 454, vertical: 1433 },
    weld0RequiredParts: { horizontal: 451, vertical: 1430 },
    source: 'existing accepted asdd C.7 paired layers',
    newEvidenceManufactured: false,
    kanatWeldCausality: 'PROVEN_FOR_ASDD_FIXTURE',
  },
  kasa: {
    asdd: 'PROVEN_FOR_ASDD_FIXTURE',
    c5: 'PROVEN_FOR_C5_FIXTURE',
    twoFixture: 'PROVEN_FOR_MEASURED_KASA_CONDITIONS',
  },
  discardedTodayWork1940: {
    classification: 'INVALID_FOR_CAUSAL_AUTHORITY',
    reason: 'Weld=0 had not persisted',
    usedInPositiveConclusion: false,
    preservedInAuditHistory: true,
  },
  fp027: {
    authorityChanged: false,
    rootCause: 'UNPROVEN',
    conservationWorkTouched: false,
  },
  findings: {
    citaDesignReportLayer: 'PROVEN',
    weld3To0EffectOnCitaReportToRequiredParts: 'PROVEN_FOR_C5_FIXTURE',
    weldCausalityProfileCoverage:
      'REPLICATED_ON_KASA_AND_CITA_45_DEGREE_PROFILES',
    kanatWeldCausality: 'PROVEN_FOR_ASDD_FIXTURE',
    measuredFortyFiveProfileCoverage: {
      kasa: 'PROVEN_ACROSS_TWO_GEOMETRIES',
      kanat: 'PROVEN_FOR_ASDD_FIXTURE',
      cita: 'PROVEN_FOR_C5_FIXTURE',
    },
    ninetyOrtaWeldEffect: 'NO_OBSERVED_EFFECT_REPLICATED_ACROSS_TWO_FIXTURES',
    boundedWeldCausality:
      'For measured Deceuninck 70 45° KASA, KANAT, and CITA conditions, Welding Waste 3→0 controls the observed +3 mm Design Report → Required Parts delta. For measured 90° ORTA conditions, no Weld effect was observed.',
    universalFortyFiveRule: 'UNPROVEN',
    generalizedCompensationFormula: 'UNPROVEN',
    stillUnproven: [
      'other systems',
      'other profile families',
      'mixed angles',
      'non-Deceuninck systems',
      'other Welding Waste values',
      'interaction with other settings',
      'whether +Weld remains linear for values other than 0 and 3',
    ],
  },
  limitation:
    'Even with KASA/KANAT/CITA coverage, do not claim all 45° pieces use Welding Waste. Do not implement RequiredParts = Report + WeldingWaste. Do not introduce an angle conditional.',
  physicalLengthScore: '6.0/10',
} as const;

export type Fp024c10ThreePointRow = {
  fixture: 'asdd' | 'c5';
  profile: 'KASA' | 'KANAT' | 'CITA' | 'ORTA';
  variant: 'short' | 'long' | 'single';
  angles: '45/45' | '90/90';
  reportLengthMm: number;
  weld0RequiredPartsMm: number;
  weld0DeltaMm: number;
  weld2RequiredPartsMm: number;
  weld2DeltaMm: number;
  weld3RequiredPartsMm: number;
  weld3DeltaMm: number;
};

/**
 * FP-024C.10 — classify a 0/2/3 Welding Waste delta series.
 * AICS-001: evidence classification only. Does not encode a formula.
 */
export function classifyWeldThreePointDeltas(args: {
  weld0DeltaMm: number;
  weld2DeltaMm: number;
  weld3DeltaMm: number;
}):
  | 'LINEAR_AT_MEASURED_0_2_3_POINTS'
  | 'NONLINEAR_OR_THRESHOLD_RESPONSE_OBSERVED' {
  if (
    args.weld0DeltaMm === 0 &&
    args.weld2DeltaMm === 2 &&
    args.weld3DeltaMm === 3
  ) {
    return 'LINEAR_AT_MEASURED_0_2_3_POINTS';
  }
  return 'NONLINEAR_OR_THRESHOLD_RESPONSE_OBSERVED';
}

export function evaluateWeldLinearityAcrossRows(rows: readonly Fp024c10ThreePointRow[]): {
  intermediateValueResponse:
    | 'LINEAR_AT_MEASURED_0_2_3_POINTS'
    | 'NONLINEAR_OR_THRESHOLD_RESPONSE_OBSERVED'
    | 'PROFILE_DEPENDENT_RESPONSE_OBSERVED'
    | 'CROSS_FIXTURE_INTERMEDIATE_VALUE_DIVERGENCE';
  weldDeltaEqualsSettingValue:
    | 'STRONGLY_SUPPORTED_FOR_MEASURED_DECEUNINCK70_45_CONDITIONS'
    | 'CONTRADICTED'
    | 'UNPROVEN';
  directWeldTermLinearity:
    | 'PROVEN_FOR_MEASURED_0_2_3_DECEUNINCK70_45_CONDITIONS'
    | 'UNPROVEN';
  twoFixtureReplication:
    | 'REPLICATED_ACROSS_TWO_FIXTURES'
    | 'CROSS_FIXTURE_INTERMEDIATE_VALUE_DIVERGENCE'
    | 'UNPROVEN';
  ninetyStatus:
    | 'WELD2_90_NO_OBSERVED_EFFECT_REPLICATED_ACROSS_TWO_FIXTURES'
    | 'CONTRADICTION'
    | 'UNPROVEN';
  authorizesFormulaChange: false;
  generalizedCompensationFormula: 'UNPROVEN';
} {
  const fortyFive = rows.filter((row) => row.angles === '45/45');
  const ninety = rows.filter((row) => row.angles === '90/90');
  const fortyFiveLinear = fortyFive.every(
    (row) =>
      classifyWeldThreePointDeltas(row) === 'LINEAR_AT_MEASURED_0_2_3_POINTS'
  );
  const uniqueWeld2Deltas = [...new Set(fortyFive.map((row) => row.weld2DeltaMm))];
  const asddKasa = fortyFive.find((row) => row.fixture === 'asdd' && row.profile === 'KASA');
  const c5Kasa = fortyFive.find((row) => row.fixture === 'c5' && row.profile === 'KASA');
  const kasaDiverged =
    asddKasa != null &&
    c5Kasa != null &&
    asddKasa.weld2DeltaMm !== c5Kasa.weld2DeltaMm;
  const ninetyZero = ninety.every(
    (row) =>
      row.weld0DeltaMm === 0 && row.weld2DeltaMm === 0 && row.weld3DeltaMm === 0
  );
  const ninetyBothFixtures =
    ninety.some((row) => row.fixture === 'asdd') &&
    ninety.some((row) => row.fixture === 'c5');

  let intermediateValueResponse:
    | 'LINEAR_AT_MEASURED_0_2_3_POINTS'
    | 'NONLINEAR_OR_THRESHOLD_RESPONSE_OBSERVED'
    | 'PROFILE_DEPENDENT_RESPONSE_OBSERVED'
    | 'CROSS_FIXTURE_INTERMEDIATE_VALUE_DIVERGENCE' =
    'NONLINEAR_OR_THRESHOLD_RESPONSE_OBSERVED';
  if (kasaDiverged) {
    intermediateValueResponse = 'CROSS_FIXTURE_INTERMEDIATE_VALUE_DIVERGENCE';
  } else if (uniqueWeld2Deltas.length > 1) {
    intermediateValueResponse = 'PROFILE_DEPENDENT_RESPONSE_OBSERVED';
  } else if (fortyFiveLinear) {
    intermediateValueResponse = 'LINEAR_AT_MEASURED_0_2_3_POINTS';
  }

  return {
    intermediateValueResponse,
    weldDeltaEqualsSettingValue:
      intermediateValueResponse === 'LINEAR_AT_MEASURED_0_2_3_POINTS'
        ? 'STRONGLY_SUPPORTED_FOR_MEASURED_DECEUNINCK70_45_CONDITIONS'
        : intermediateValueResponse === 'NONLINEAR_OR_THRESHOLD_RESPONSE_OBSERVED'
          ? 'CONTRADICTED'
          : 'UNPROVEN',
    directWeldTermLinearity:
      intermediateValueResponse === 'LINEAR_AT_MEASURED_0_2_3_POINTS'
        ? 'PROVEN_FOR_MEASURED_0_2_3_DECEUNINCK70_45_CONDITIONS'
        : 'UNPROVEN',
    twoFixtureReplication: kasaDiverged
      ? 'CROSS_FIXTURE_INTERMEDIATE_VALUE_DIVERGENCE'
      : fortyFiveLinear
        ? 'REPLICATED_ACROSS_TWO_FIXTURES'
        : 'UNPROVEN',
    ninetyStatus:
      ninetyZero && ninetyBothFixtures
        ? 'WELD2_90_NO_OBSERVED_EFFECT_REPLICATED_ACROSS_TWO_FIXTURES'
        : ninety.some((row) => row.weld2DeltaMm !== 0)
          ? 'CONTRADICTION'
          : 'UNPROVEN',
    authorizesFormulaChange: false,
    generalizedCompensationFormula: 'UNPROVEN',
  };
}

function fp024c10Row(
  fixture: Fp024c10ThreePointRow['fixture'],
  profile: Fp024c10ThreePointRow['profile'],
  variant: Fp024c10ThreePointRow['variant'],
  angles: Fp024c10ThreePointRow['angles'],
  reportLengthMm: number,
  weld0RequiredPartsMm: number,
  weld2RequiredPartsMm: number,
  weld3RequiredPartsMm: number
): Fp024c10ThreePointRow {
  return {
    fixture,
    profile,
    variant,
    angles,
    reportLengthMm,
    weld0RequiredPartsMm,
    weld0DeltaMm: weld0RequiredPartsMm - reportLengthMm,
    weld2RequiredPartsMm,
    weld2DeltaMm: weld2RequiredPartsMm - reportLengthMm,
    weld3RequiredPartsMm,
    weld3DeltaMm: weld3RequiredPartsMm - reportLengthMm,
  };
}

export const FP024C10_THREE_POINT_TABLE = [
  fp024c10Row('asdd', 'KASA', 'short', '45/45', 1000, 1000, 1002, 1003),
  fp024c10Row('asdd', 'KASA', 'long', '45/45', 1500, 1500, 1502, 1503),
  fp024c10Row('asdd', 'KANAT', 'short', '45/45', 451, 451, 453, 454),
  fp024c10Row('asdd', 'KANAT', 'long', '45/45', 1430, 1430, 1432, 1433),
  fp024c10Row('asdd', 'ORTA', 'single', '90/90', 1416, 1416, 1416, 1416),
  fp024c10Row('c5', 'KASA', 'single', '45/45', 1200, 1200, 1202, 1203),
  fp024c10Row('c5', 'CITA', 'short', '45/45', 537, 537, 539, 540),
  fp024c10Row('c5', 'CITA', 'long', '45/45', 1116, 1116, 1118, 1119),
  fp024c10Row('c5', 'ORTA', 'single', '90/90', 1116, 1116, 1116, 1116),
] as const satisfies readonly Fp024c10ThreePointRow[];

/**
 * FP-024C.10 — Welding Waste linearity discriminator at Weld=2.
 * Required Parts only. No solve. Restore Weld to 0. AICS-001.
 * Do not implement RequiredParts = Report + WeldingWaste.
 */
export const FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR = {
  id: 'FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR',
  status: 'ACCEPTED',
  scientificQuestion:
    'At Welding Waste = 2 mm, does Design Report → Required Parts equal +2 on measured Deceuninck 70 45° profiles, with 90° ORTA remaining 0?',
  independentReviewOfFp024c9: 'ACCEPTED',
  protocolPreserved: true,
  newSolveCreated: false,
  stockUnchanged: true,
  formulasModified: false,
  authorizesFormulaChange: false,
  doNotPatchFormulas: true,
  weldingWasteRestoredToZero: true,
  dc550SkhGloballyEnabled: true,
  dc550SkhUnchanged: true,
  precheck: {
    weldingWasteMm: 0,
    sawThicknessMm: 4,
    trimCutMm: 0,
    sashOffsetMm: 7,
    glazingClearanceMm: 2.5,
    minimumOffcutMm: 500,
    machineId: 'DC-600',
    sha256: '85b007e5f690c05e16af280e81ff40af1490c9a722f512f49b96ae3e3b6c9ef3',
  },
  weld2Persistence: {
    weldingWasteMm: 2,
    persisted: true,
    saveToastObserved: true,
    reopenConfirmed: true,
    persistSha256: '457ca5bb26af41266ac2f89e087d056e248377d71cbaf112a4a79326564497c4',
    afterSaveSha256: '6deb1634f002d04a5565877fd26e94f5edf552cf08d752496c46138d0af2a9e0',
  },
  asdd: {
    project: 'asdasd / 100001',
    design: 'asdd',
    designDbId: 1,
    productionPlan: 'FP024C10_WELD2_ASDD',
    productionPlanId: 10,
    generatedAt: '2026-09-13T21:35:58',
    cutListRows: 21,
    totalLengthMm: 20544,
    newSolveCreated: false,
    cutListSha256: '55523d4e82229deb2a45c1409e2cb33bc07070a67db26cf7bbc764009aa68dac',
    kasa: { report: { short: 1000, long: 1500 }, requiredParts: { short: 1002, long: 1502 }, delta: { short: 2, long: 2 } },
    kanat: { report: { short: 451, long: 1430 }, requiredParts: { short: 453, long: 1432 }, delta: { short: 2, long: 2 } },
    orta: { report: 1416, requiredParts: 1416, delta: 0 },
    citaObservedNotPrimary: { requiredParts: { short: 333, long: 1312 }, reportLayer: 'NOT_USED_AS_PRIMARY' },
  },
  midpointCheck: {
    weldingWasteMm: 2,
    confirmed: true,
    sha256: '15cb6154eb167d46d101e3178106cc8754db6028bc43f6612b12f2c3a35d7198',
  },
  c5: {
    project: 'FP024C_90_CONTROL',
    projectDbId: 9,
    projectNo: '100009',
    design: 'FP024C_90_CONTROL_DESIGN',
    designDbId: 11,
    productionPlan: 'FP024C10_WELD2_C5',
    productionPlanId: 11,
    generatedAt: '2026-09-13T21:39:44',
    cutListRows: 13,
    totalLengthMm: 12552,
    newSolveCreated: false,
    existingPlan7AndRun13NotReusedAsFreshEvidence: true,
    cutListSha256: '6b33a987b376f4977ab58003fcc0d3cd09735d4d940eb9794e1f56ab7feeb693',
    kasa: { report: 1200, requiredParts: 1202, delta: 2 },
    cita: { report: { short: 537, long: 1116 }, requiredParts: { short: 539, long: 1118 }, delta: { short: 2, long: 2 } },
    orta: { report: 1116, requiredParts: 1116, delta: 0 },
  },
  postMeasurementCheck: {
    weldingWasteMm: 2,
    confirmed: true,
    sha256: 'b5098578b3cf92b7382afa487714adb8d8d73dbc00a674c21b6012aa7d97352f',
  },
  restore: {
    weldingWasteMm: 0,
    restored: true,
    persistConfirmed: true,
    afterSaveSha256: 'd6e4fadd4f48e56844296b7c29d08d2c80bfef31a2666e633a100d60b6a22b09',
    persistSha256: '27345d9e2f50075a5c7e4fe69c269eba0d7e8e5f9930060ead96296f257aa682',
  },
  threePointTable: FP024C10_THREE_POINT_TABLE,
  discardedTodayWork1940: {
    classification: 'INVALID_FOR_CAUSAL_AUTHORITY',
    reason: 'Weld=0 had not persisted',
    usedInPositiveConclusion: false,
    preservedInAuditHistory: true,
  },
  fp027: {
    authorityChanged: false,
    rootCause: 'UNPROVEN',
    conservationWorkTouched: false,
  },
  findings: {
    intermediateValueResponse: 'LINEAR_AT_MEASURED_0_2_3_POINTS',
    weldDeltaEqualsSettingValue:
      'STRONGLY_SUPPORTED_FOR_MEASURED_DECEUNINCK70_45_CONDITIONS',
    directWeldTermLinearity:
      'PROVEN_FOR_MEASURED_0_2_3_DECEUNINCK70_45_CONDITIONS',
    twoFixtureReplication: 'REPLICATED_ACROSS_TWO_FIXTURES',
    ninetyStatus: 'WELD2_90_NO_OBSERVED_EFFECT_REPLICATED_ACROSS_TWO_FIXTURES',
    universalFortyFiveRule: 'UNPROVEN',
    generalizedCompensationFormula: 'UNPROVEN',
    stillUnproven: [
      'other systems',
      'other profile families',
      'mixed angles',
      'other Weld values',
      'negative/invalid values',
      'interaction with Saw/Trim',
      'non-Deceuninck profiles',
    ],
  },
  limitation:
    'Three measured points 0/2/3 on Deceuninck 70 KASA, KANAT, and CITA 45° do not authorize a production formula. Do not implement RequiredParts = Report + WeldingWaste. Do not introduce an angle conditional.',
  lastOptimizationRunIdUnchanged: 13,
  physicalLengthScore: '6.0/10',
} as const;

/**
 * FP-024C.11 — narrowest formula-scope authorization justified by C.6–C.10.
 * Repository/audit only. No production formula change. AICS-001.
 *
 * C.10 remains accepted evidence. This checkpoint classifies where a bounded
 * weld rule may later be reviewed — not implemented here.
 */
export const FP024C11_CANONICAL_PROFILE_SYSTEM =
  "Deceuninck 70'lik PVC Sistemi" as const;

export const FP024C11_MEASURED_45_PROFILE_CODES = [
  'Deceuninck-KASA-70',
  'Deceuninck-KANAT-70',
  'Deceuninck-CITA-20',
] as const;

export const FP024C11_MEASURED_90_PROFILE_CODES = [
  'Deceuninck-ORTA-KAYIT-70',
] as const;

export const FP024C11_MEASURED_WELDING_WASTE_MM = [0, 2, 3] as const;

export type Fp024c11ImplementationClassification =
  | 'BOUNDED_IMPLEMENTATION_SAFE'
  | 'PARITY_ADAPTER_ONLY_SAFE'
  | 'PRODUCTION_IMPLEMENTATION_UNSAFE'
  | 'UNPROVEN';

export interface Fp024c11ArchitectureFacts {
  c6ThroughC10Accepted: boolean;
  directWeldTermLinearityProvenForMeasuredDeceuninck70_45: boolean;
  mixedAnglesProven: boolean;
  productionHasDualEndAnglePair: boolean;
  productionHasDesignReportToRequiredPartsBoundary: boolean;
  productionHasCanonicalDeceuninck70Identity: boolean;
  weldingWasteAlreadyAppliedInProductionCutLength: boolean;
  unsupportedProfilesCannotInheritSilentlyInProduction: boolean;
  parityAdapterHasWeldingWasteConsumer: boolean;
  parityAdapterHasDualEndAngles: boolean;
  parityAdapterHasDeceuninckProfileCodes: boolean;
  parityAdapterCanFailClosedOnMixedAngles: boolean;
}

export const FP024C11_ALMONA_PIPELINE_FACTS: Fp024c11ArchitectureFacts = {
  c6ThroughC10Accepted: true,
  directWeldTermLinearityProvenForMeasuredDeceuninck70_45: true,
  mixedAnglesProven: false,
  productionHasDualEndAnglePair: false,
  productionHasDesignReportToRequiredPartsBoundary: false,
  productionHasCanonicalDeceuninck70Identity: false,
  weldingWasteAlreadyAppliedInProductionCutLength: false,
  unsupportedProfilesCannotInheritSilentlyInProduction: false,
  parityAdapterHasWeldingWasteConsumer: true,
  parityAdapterHasDualEndAngles: true,
  parityAdapterHasDeceuninckProfileCodes: true,
  parityAdapterCanFailClosedOnMixedAngles: true,
};

export function evaluateFormulaScopeAuthorization(
  args: Partial<Fp024c11ArchitectureFacts> = {}
): {
  classification: Fp024c11ImplementationClassification;
  authorizesFormulaChange: false;
  authorizesProductionEngineChange: false;
  boundedDeceuninck70FortyFiveWeldRule: 'ELIGIBLE_FOR_IMPLEMENTATION_REVIEW' | 'UNPROVEN';
  generalizedManufacturingFormula: 'UNPROVEN';
  mixedAngleStatus: 'UNPROVEN';
  reason: string;
} {
  const facts: Fp024c11ArchitectureFacts = {
    ...FP024C11_ALMONA_PIPELINE_FACTS,
    ...args,
  };

  const evidenceSufficient =
    facts.c6ThroughC10Accepted &&
    facts.directWeldTermLinearityProvenForMeasuredDeceuninck70_45;

  if (!evidenceSufficient) {
    return {
      classification: 'UNPROVEN',
      authorizesFormulaChange: false,
      authorizesProductionEngineChange: false,
      boundedDeceuninck70FortyFiveWeldRule: 'UNPROVEN',
      generalizedManufacturingFormula: 'UNPROVEN',
      mixedAngleStatus: 'UNPROVEN',
      reason: 'C.6–C.10 evidence is insufficient to authorize even a bounded weld rule.',
    };
  }

  const productionCanExpressFailClosed =
    facts.productionHasDualEndAnglePair &&
    facts.productionHasDesignReportToRequiredPartsBoundary &&
    facts.productionHasCanonicalDeceuninck70Identity &&
    !facts.weldingWasteAlreadyAppliedInProductionCutLength &&
    facts.unsupportedProfilesCannotInheritSilentlyInProduction &&
    !facts.mixedAnglesProven;

  const adapterCanExpressFailClosed =
    facts.parityAdapterHasWeldingWasteConsumer &&
    facts.parityAdapterHasDualEndAngles &&
    facts.parityAdapterHasDeceuninckProfileCodes &&
    facts.parityAdapterCanFailClosedOnMixedAngles &&
    !facts.mixedAnglesProven;

  if (productionCanExpressFailClosed) {
    return {
      classification: 'BOUNDED_IMPLEMENTATION_SAFE',
      authorizesFormulaChange: false,
      authorizesProductionEngineChange: false,
      boundedDeceuninck70FortyFiveWeldRule: 'ELIGIBLE_FOR_IMPLEMENTATION_REVIEW',
      generalizedManufacturingFormula: 'UNPROVEN',
      mixedAngleStatus: 'UNPROVEN',
      reason:
        'Production architecture could express an explicit fail-closed scope. C.11 still does not implement it.',
    };
  }

  if (adapterCanExpressFailClosed) {
    return {
      classification: 'PARITY_ADAPTER_ONLY_SAFE',
      authorizesFormulaChange: false,
      authorizesProductionEngineChange: false,
      boundedDeceuninck70FortyFiveWeldRule: 'ELIGIBLE_FOR_IMPLEMENTATION_REVIEW',
      generalizedManufacturingFormula: 'UNPROVEN',
      mixedAngleStatus: 'UNPROVEN',
      reason:
        'Evidence supports a fail-closed DoWin parity-adapter contract only. Canonical production engines lack dual-end angles, a Design Report → Required Parts boundary, and a canonical Deceuninck 70 identity.',
    };
  }

  return {
    classification: 'PRODUCTION_IMPLEMENTATION_UNSAFE',
    authorizesFormulaChange: false,
    authorizesProductionEngineChange: false,
    boundedDeceuninck70FortyFiveWeldRule: 'UNPROVEN',
    generalizedManufacturingFormula: 'UNPROVEN',
    mixedAngleStatus: 'UNPROVEN',
    reason:
      'Evidence is real, but neither production nor the parity adapter can express the proven scope without guessing.',
  };
}

export const FP024C11_FORMULA_SCOPE_AUTHORIZATION = {
  id: 'FP024C11_FORMULA_SCOPE_AUTHORIZATION',
  status: 'AUTHORIZATION_CHECKPOINT',
  independentReviewOfFp024c10: 'ACCEPTED',
  repositoryAuditOnly: true,
  formulasModified: false,
  authorizesFormulaChange: false,
  authorizesProductionEngineChange: false,
  authorizesParityAdapterImplementationThisCheckpoint: false,
  boundedDeceuninck70FortyFiveWeldRule: 'ELIGIBLE_FOR_IMPLEMENTATION_REVIEW',
  generalizedManufacturingFormula: 'UNPROVEN',
  implementationClassification: evaluateFormulaScopeAuthorization().classification,
  mixedAngleStatus: 'UNPROVEN',
  fp027: {
    authorityChanged: false,
    rootCause: 'UNPROVEN',
    conservationWorkTouched: false,
    combinedWithC11: false,
  },
  discardedTodayWork1940: {
    classification: 'INVALID_FOR_CAUSAL_AUTHORITY',
    reason: 'Weld=0 had not persisted',
    usedInPositiveConclusion: false,
    preservedInAuditHistory: true,
  },
  operationalWeldingWasteMm: 0,
  weldingWasteMustNotBeChangedThisCheckpoint: true,
  acceptedC10: {
    status: FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.status,
    directWeldTermLinearity:
      FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.findings.directWeldTermLinearity,
    weld2NinetyNoObservedEffect:
      FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR.findings.ninetyStatus,
    weldCausalityProfileCoverage: 'KASA + KANAT + CITA',
    threePointTable: FP024C10_THREE_POINT_TABLE,
  },
  provenScope: {
    system: FP024C11_CANONICAL_PROFILE_SYSTEM,
    profiles45: FP024C11_MEASURED_45_PROFILE_CODES,
    profiles90: FP024C11_MEASURED_90_PROFILE_CODES,
    weldingWasteMm: FP024C11_MEASURED_WELDING_WASTE_MM,
    fortyFiveReportToRequiredParts: 'tracks Welding Waste at 0→0, 2→+2, 3→+3',
    ninetyOrtaReportToRequiredParts: '0 / 0 / 0 at Welding Waste 0/2/3',
  },
  unprovenScope: [
    'every 45° profile in every system',
    'mixed-angle cuts (45/90, 90/45, other)',
    'other profile systems',
    'non-Deceuninck families',
    'interaction with Saw Thickness',
    'interaction with Trim',
    'arbitrary Welding Waste values outside measured {0, 2, 3}',
    'universal mathematical rule',
    'FP-027 root cause',
  ],
  pipeline: {
    designReportSemantic:
      'src/lib/fabricator/cutLengthSemantics.ts:18-22 nominalLengthMm; src/types/fabricator.ts:708-714 reportedWeldedLengthMm/nominalLengthMm',
    designReportGeneratorEquivalent:
      'src/lib/fabricator/UnitProfileGatherer.ts:489-490 plannedLength = finished dimension; src/lib/fabricator/OptimizationEngine.ts:31 plannedLength',
    cutGeneration:
      'src/lib/fabricator/CuttingListGenerator.ts:36-63,134-148; src/lib/fabricator/UPVCCuttingEngine.ts:243-314 generateOptimizedCutList; src/lib/fabricator/HardenedCuttingListGenerator.ts; src/lib/reports/CuttingListGenerator.ts:24-33 report transform only',
    angleRepresentation:
      'src/types/fabricator.ts:697 Cut.angle (single end); src/lib/fabricator/production/CutSheetGenerator.ts:81 angleDeg: cut.angle ?? 0; src/lib/fabricator/UPVCCuttingEngine.ts:269,281 hardcoded miter 45; src/lib/fabricator/dowinParity/DowinParityLengthEngine.ts:165-166 left/right with ?? 45 default',
    profileSystemIdentity:
      'src/types/fabricator.ts:755 MeasurementData.systemPackId; src/lib/fabricator/golden/dowinPhysicalLengthFixture.ts:272 profileSystem "Deceuninck 70\'lik PVC Sistemi"; SYSTEM_PACKS has no Deceuninck pack',
    weldingWasteSettingAccess:
      'canonical manufacturing-settings module: weldingWasteMm field ~:36, platform/yilmazcad-parity defaults 3 ~:100/:121, resolver ~:187-211. Exact path recorded in docs/audits/FP-024C11-FORMULA-SCOPE-AUTHORIZATION_2026-09-13.md',
    weldingWasteConsumers:
      'src/lib/fabricator/dowinParity/DowinParityLengthEngine.ts:85-99,139-150 sash packed = inner + Basma + Kaynak + weldingWasteMm. Not consumed by UPVCCuttingEngine, AlmonaCuttingEngine, barPackAccounting, or production/*',
    requiredPartsSemantic:
      'src/lib/fabricator/cutLengthSemantics.ts:24-26 packedSegmentMm; src/types/fabricator.ts:715-719 packedSegmentMm (DoWin Required Parts graphic)',
    packedPhysicalLength:
      'src/lib/fabricator/barPackAccounting.ts kerf/trim only; historical Cut.length packing; CutSheetGenerator.ts:71-76 uses cut.length',
    machineCncLength:
      'src/types/fabricator.ts:725-729 machineInstructionLengthMm; src/lib/fabricator/production/machineExportPreflight.ts export gate only (no length formula); DowinParityLengthEngine.ts:261-268 machineInstructionMm null',
  },
  answers: {
    designReportToRequiredPartsBoundary:
      'Closest equivalent is cutLengthSemantics nominalLengthMm (Design Report) → packedSegmentMm (Required Parts). Production generators do not populate that split; they emit fused plannedLength/finalLength/Cut.length.',
    weldingWasteCurrentlyApplied:
      'Stored as a first-class manufacturing setting. Applied only in isolated DowinParityLengthEngine sash packed formula. Not applied in canonical production cut length.',
    doubleCountingRisk:
      'HIGH if stacked on UPVCCuttingEngine K-factor+burnOff, or on parity sashInner+Basma+Kaynak+Weld. Geometric role offsets (L+50 / L-40) and bar kerf are different layers.',
    angleCanonicality:
      'Production Cut.angle is a single number and generators often hardcode 45. Not sufficient to distinguish 45/45 vs 90/90 vs mixed. Evidence/parity leftAngleDeg+rightAngleDeg can distinguish if both ends are required and missing angles are not defaulted to 45.',
    deceuninckIdentity:
      'Deterministic in evidence as profileSystem "Deceuninck 70\'lik PVC Sistemi" plus profileCode allowlist. Not a canonical SYSTEM_PACKS id. A hidden production includes("Deceuninck") branch would be an unsafe Tier-3 special case.',
    deceuninckOnlyHiddenSpecialCase:
      'UNSAFE in production without an explicit fail-closed allowlist. Eligible only as a named parity-adapter contract with FAIL_CLOSED outside measured scope.',
  },
  doubleCounting: {
    productionKFactorBurnOff:
      'src/lib/fabricator/UPVCCuttingEngine.ts:169-208 calculateUPVCCutLength adds burnOffMm + K-factor + cooling. Independent of weldingWasteMm. Adding weld on this path would double-count weld-like allowance.',
    paritySashFormula:
      'DowinParityLengthEngine sash already adds weldingWasteMm with Basma/Kaynak. C.6–C.10 proved DoWin Required Parts − Design Report = Welding Waste alone. Stacking Report+Weld on that packed sash path would double-count weld.',
    roleGeometricOffsets:
      'src/lib/fabricator/roleDetection.ts:121-193 and cuttingFormulaConstants.ts:19-38 (frame +50 / sash −40) are geometric, not Welding Waste.',
    barPackKerf: 'src/lib/fabricator/barPackAccounting.ts saw kerf + trim only. Not weld.',
    naiveSilentRule: 'if (angle == 45) length += weldingWaste is FORBIDDEN.',
  },
  requiredGuardrails: [
    'Fail closed unless profileSystem is exactly Deceuninck 70\'lik PVC Sistemi',
    'Fail closed unless profileCode is in the measured 45° or 90° allowlist',
    'Require both leftAngleDeg and rightAngleDeg; never default missing to 45',
    'Treat 45/90, 90/45, and other mixed angles as UNPROVEN / FAIL_CLOSED',
    'Apply weld only at Design Report → Required Parts; do not stack on K-factor, burnOff, or Basma+Kaynak+Weld',
    'Fail closed for Welding Waste values outside measured {0, 2, 3}',
    'Do not implement in UPVCCuttingEngine, CuttingListGenerator, AlmonaCuttingEngine, or production/*',
    'Do not encode a silent if (angle == 45) production rule',
    'Keep GENERALIZED_MANUFACTURING_FORMULA = UNPROVEN',
    'Keep FP-027 root cause = UNPROVEN; do not combine defects',
  ],
  boundedImplementationContract: {
    appliesTo: 'DoWin compatibility/parity adapter only; not canonical production engines',
    fortyFive:
      'IF system+profile allowlist AND left=45 AND right=45 AND weld∈{0,2,3} THEN requiredPartsMm = designReportPhysicalMm + weldingWasteMm',
    ninetyOrta:
      'IF system+ORTA-KAYIT-70 AND left=90 AND right=90 THEN requiredPartsMm = designReportPhysicalMm (no weld term)',
    otherwise: 'FAIL_CLOSED',
    implementedThisCheckpoint: false,
  },
  remainingRisks: [
    'Parity adapter currently defaults missing angles to 45 (DowinParityLengthEngine.ts:165-166). Future impl must reject missing angles.',
    'Parity adapter does not currently ingest Design Report millimetres (nominalLengthMm is null in almonaParityActualsForAsdd).',
    'Production Cut has no dual-end angle pair; a 45-only check would silently misclassify mixed cuts.',
    'Deceuninck 70 is evidence-canonical, not a SYSTEM_PACKS identity.',
    'Measured weld domain is {0, 2, 3} only.',
  ],
  physicalLengthScore: '6.0/10',
  scoreMayMoveOnlyAfter: ['implementation', 'tests', 'golden replay', 'independent review'],
} as const;

/**
 * FP-024C.12 — bounded parity-adapter implementation of the C.11 weld contract.
 * Not a canonical production formula. AICS-001. Score stays 6.0/10 until
 * golden replay + C.13 closeout + independent review.
 */
export const FP024C12_BOUNDED_PARITY_WELD_RULE = {
  id: 'FP024C12_BOUNDED_PARITY_WELD_RULE',
  status: 'WIRED_PARITY_ADAPTER_ONLY',
  independentReviewOfFp024c11: 'ACCEPTED',
  implementationScope: 'PARITY_ADAPTER_ONLY',
  generalizedManufacturingFormula: 'UNPROVEN',
  authorizesProductionEngineChange: false,
  wiringClassification: 'PARITY_API_NEEDS_EXPLICIT_ENTRY_POINT',
  parityWiring: 'PROVEN',
  wiredIntoComputeDowinParityLengths: false,
  wiredIntoSashBasmaKaynakFormula: false,
  wiredIntoCanonicalCutGeneration: false,
  helper: 'src/lib/fabricator/dowinParity/evaluateDowinRequiredPartsWeldAdjustment.ts',
  helperFunction: 'evaluateDowinRequiredPartsWeldAdjustment',
  parityEntryPoint:
    'src/lib/fabricator/dowinParity/evaluateDowinRequiredPartsWeldAdjustment.ts computeDowinRequiredPartsFromDesignReport',
  reexport: 'src/lib/fabricator/dowinParity/DowinParityLengthEngine.ts',
  supportedSystem: FP024C11_CANONICAL_PROFILE_SYSTEM,
  supported45ProfileCodes: FP024C11_MEASURED_45_PROFILE_CODES,
  supported90ProfileCodes: FP024C11_MEASURED_90_PROFILE_CODES,
  supportedWeldingWasteMm: FP024C11_MEASURED_WELDING_WASTE_MM,
  sourceLayer: 'DESIGN_REPORT',
  targetLayer: 'REQUIRED_PARTS',
  doubleCountPath: 'ISOLATED',
  mixedAngleStatus: 'UNPROVEN',
  fp027: {
    authorityChanged: false,
    rootCause: 'UNPROVEN',
    conservationWorkTouched: false,
  },
  discardedTodayWork1940: {
    classification: 'INVALID_FOR_CAUSAL_AUTHORITY',
    usedInPositiveConclusion: false,
  },
  physicalLengthScore: '6.0/10',
} as const;

const FP024C13_REPLAY = evaluateFp024c13GoldenReplay();

/**
 * FP-024C.13 — bounded parity golden replay and stage closeout.
 * WIRED_PARITY_ADAPTER_ONLY means the parity API is callable, not that
 * canonical live production consumes it. AICS-001. Authoritative score
 * stays 6.0/10 until independent review.
 */
export const FP024C13_GOLDEN_REPLAY_CLOSEOUT = {
  id: 'FP024C13_GOLDEN_REPLAY_CLOSEOUT',
  c12ClosedForAuthorizedScope: true,
  c121Wiring: 'PROVEN',
  wiredParityAdapterOnlyMeans:
    'Parity API is implemented and callable. Canonical Fabricator production does not consume it.',
  goldenReplay: FP024C13_REPLAY.status,
  boundedParityStage: FP024C13_REPLAY.status === 'PASS' ? 'COMPLETE' : 'BLOCKED',
  deceuninck70MeasuredScope:
    FP024C13_REPLAY.status === 'PASS'
      ? 'PROVEN_AND_IMPLEMENTED_IN_PARITY_ADAPTER'
      : 'REPLAY_FAILED',
  implementationScope: 'PARITY_ADAPTER_ONLY',
  generalizedManufacturingFormula: 'UNPROVEN',
  authorizesProductionEngineChange: false,
  authorizesCanonicalFormula: false,
  sourceLayer: FP024C13_SOURCE_LAYER,
  targetLayer: FP024C13_TARGET_LAYER,
  supportedCaseCount: FP024C13_REPLAY.supportedCaseCount,
  passedCount: FP024C13_REPLAY.passedCount,
  mismatchCount: FP024C13_REPLAY.mismatchCount,
  failClosedCaseCount: FP024C13_REPLAY.failClosed.caseCount,
  failClosedPassCount: FP024C13_REPLAY.failClosed.passCount,
  failClosedFailureCount: FP024C13_REPLAY.failClosed.failureCount,
  failClosedStatus: FP024C13_REPLAY.failClosed.status,
  ortaNegativeControl: FP024C13_REPLAY.ortaNegativeControl,
  noFallbackStatus: FP024C13_REPLAY.noFallback.status,
  goldenCaseCount: FP024C13_GOLDEN_CASES.length,
  failClosedCatalogCount: FP024C13_FAIL_CLOSED_CASES.length,
  authorityMatrix: {
    layerSemantics: 'PROVEN_FOR_C5',
    weldCausality: 'PROVEN_FOR_MEASURED_CONDITIONS',
    profileCoverage: 'KASA + KANAT + CITA',
    intermediateValueLinearity: 'PROVEN_FOR_MEASURED_DECEUNINCK70_45_CONDITIONS',
    ninetyOrtaNoEffect: 'REPLICATED_ACROSS_TWO_FIXTURES',
    parityHelper: 'IMPLEMENTED',
    parityApiWiring: 'PROVEN',
    goldenReplay: FP024C13_REPLAY.status,
    failClosedUnsupportedScope: FP024C13_REPLAY.failClosed.status,
    canonicalProductionIntegration: 'NONE',
    generalizedFormula: 'UNPROVEN',
    fp027RootCause: 'UNPROVEN',
  },
  remainingUnprovenScope: [
    'canonical Fabricator production formula',
    'all profile systems',
    'mixed-angle cuts',
    'Welding Waste outside {0, 2, 3}',
    'Saw/Trim piece-length formulas',
    'FP-027 conservation root cause',
    'REQUIRED_PARTS → PACKED as a formula operation',
    'PACKED → MACHINE as a formula operation',
  ],
  authoritativePhysicalLengthScore: '6.0/10',
  recommendedPhysicalLengthScore: '7.5/10',
  scoreRecommendationNote:
    'Material improvement from 6.0 because measured Deceuninck 70 45°/90° weld behavior is implemented, fail-closed, and golden-replayed on the parity adapter. Not 9/10 or 10/10: canonical production does not consume the API, mixed angles and other systems remain unproven, and the generalized formula is UNPROVEN.',
  prRecommendation: 'KEEP_DRAFT_DO_NOT_MERGE',
  prRecommendationReason:
    'FP-027 root cause remains UNPROVEN on this branch; C.13 does not make the full PR merge-ready.',
  fp027: {
    authorityChanged: false,
    rootCause: 'UNPROVEN',
    conservationWorkTouched: false,
    usedInReplay: false,
  },
  discardedTodayWork1940: {
    classification: 'INVALID_FOR_CAUSAL_AUTHORITY',
    usedInPositiveConclusion: false,
  },
} as const;

export function evaluateNinetyControlFixtureSelection(args: {
  selectedToObserveOrtaSurplus: boolean;
}): 'FIXTURE_SELECTION_BIAS' | 'COMPENSATION_PRIMARY' {
  return args.selectedToObserveOrtaSurplus
    ? 'FIXTURE_SELECTION_BIAS'
    : 'COMPENSATION_PRIMARY';
}

export interface IndependentNinetyControlFixtureArgs {
  widthMm?: number;
  heightMm?: number;
  profileSystem?: string;
  centeredVerticalMullion?: boolean;
  selectedForCompensationOnly?: boolean;
  requiredOrtaCount?: number | null;
  requiredOrtaSurplus?: boolean;
  selectedToObserveOrtaSurplus?: boolean;
  settingsFrozen?: boolean;
  machineId?: string;
  stockUpdateNo?: boolean;
  authorityFirewallActive?: boolean;
  formulaFreeze?: boolean;
}

/**
 * Compensation-only independence check. ORTA quantity and surplus are
 * not acceptance fields. A naturally generated ORTA 90/90 piece is
 * allowed; requiring those counts is not.
 */
export function evaluateIndependentNinetyControlFixtureSpec(
  args: IndependentNinetyControlFixtureArgs = {}
): { specifiedIndependently: boolean; failures: string[] } {
  const width = args.widthMm ?? FP024C_NINETY_CONTROL_SPEC.widthMm;
  const height = args.heightMm ?? FP024C_NINETY_CONTROL_SPEC.heightMm;
  const system = args.profileSystem ?? FP024C_NINETY_CONTROL_SPEC.profileSystem;
  const mullion =
    args.centeredVerticalMullion ?? FP024C_NINETY_CONTROL_SPEC.centeredVerticalMullion;
  const compensationOnly =
    args.selectedForCompensationOnly ??
    FP024C_NINETY_CONTROL_SPEC.selectedForCompensationOnly;
  const requiredOrta = args.requiredOrtaCount ?? FP024C_NINETY_CONTROL_SPEC.requiredOrtaCount;
  const requiredSurplus =
    args.requiredOrtaSurplus ?? FP024C_NINETY_CONTROL_SPEC.requiredOrtaSurplus;
  const selectedForOrta = args.selectedToObserveOrtaSurplus ?? false;
  const settingsFrozen = args.settingsFrozen ?? true;
  const machine = args.machineId ?? FP024C_NINETY_CONTROL_SPEC.settings.machineId;
  const stockUpdateNo =
    args.stockUpdateNo ?? FP024C_90_CONTROL_STOCK_PROTOCOL.stockUpdateResponse === 'NO';
  const firewall =
    args.authorityFirewallActive ??
    FP024C_NINETY_CONTROL_DUAL_USE.sharedVerdictAuthorityForbidden;
  const freeze = args.formulaFreeze ?? FP024C_NINETY_CONTROL_DUAL_USE.formulaFreeze;

  const failures: string[] = [];
  if (width !== 1200 || height !== 1200) {
    failures.push('GEOMETRY_MUST_BE_1200x1200');
  }
  if (!system.includes('Deceuninck 70')) failures.push('SYSTEM_MUST_BE_DECEUNINCK_70');
  if (!mullion) failures.push('CENTERED_VERTICAL_MULLION_REQUIRED');
  if (!compensationOnly || selectedForOrta) {
    failures.push('FP027_TARGETING_CANNOT_AUTHORIZE_FP024C_CONTROL');
  }
  if (requiredOrta === 1) failures.push('REQUIRED_ORTA_COUNT_MUST_NOT_BE_ENCODED');
  if (requiredSurplus) failures.push('REQUIRED_ORTA_SURPLUS_MUST_NOT_BE_ENCODED');
  if (!settingsFrozen) failures.push('SETTINGS_MUST_REMAIN_FROZEN');
  if (machine !== 'DC-600') failures.push('MACHINE_MUST_BE_DC-600');
  if (!stockUpdateNo) failures.push('STOCK_UPDATE_MUST_BE_NO');
  if (!firewall) failures.push('AUTHORITY_FIREWALL_REQUIRED');
  if (!freeze) failures.push('PRODUCTION_FORMULAS_FROZEN');

  return {
    specifiedIndependently: failures.length === 0,
    failures,
  };
}

/**
 * Shared artifact hashes do not merge verdict authority. Conservation
 * matching expectation cannot prove compensation, and the reverse is
 * also forbidden. FP-027 root cause stays UNPROVEN.
 */
export function evaluateDualUseVerdictFirewall(args: {
  compensationClassification: string | null | undefined;
  conservationClassification: Fp027ConservationClassification | null | undefined;
  compensationArtifactSha256?: string | null;
  conservationArtifactSha256?: string | null;
}): {
  observedCompensation: string | null;
  observedConservation: Fp027ConservationClassification | null;
  compensationAuthority: 'INDEPENDENT';
  conservationAuthority: 'INDEPENDENT';
  sharedHashImpliesSharedVerdict: false;
  compensationProvenBecauseConservationMatched: false;
  conservationProvenBecauseCompensationMatched: false;
  artifactsShared: boolean;
  fp027RootCause: 'UNPROVEN';
} {
  const artifactsShared =
    !!args.compensationArtifactSha256 &&
    !!args.conservationArtifactSha256 &&
    args.compensationArtifactSha256 === args.conservationArtifactSha256;
  return {
    observedCompensation: args.compensationClassification ?? null,
    observedConservation: args.conservationClassification ?? null,
    compensationAuthority: 'INDEPENDENT',
    conservationAuthority: 'INDEPENDENT',
    sharedHashImpliesSharedVerdict: false,
    compensationProvenBecauseConservationMatched: false,
    conservationProvenBecauseCompensationMatched: false,
    artifactsShared,
    fp027RootCause: 'UNPROVEN',
  };
}

/**
 * FP-024C.1 asked why identical visible inputs produced different remainder
 * topology. That repeatability question was answered by the accepted
 * FP-024C.3 triplicate. Historical C.1 rows stay visible; they must not
 * deadlock the 90° compensation-control gate.
 */
export const FP024C1_CONTROLLED_REPEATABILITY_SUPERSESSION = {
  experiment: 'FP024C1_OPTIMIZATION_STATE_PROVENANCE',
  status: 'SUPERSEDED_BY_FP024C3',
  supersededFor: 'controlled_repeatability_and_control_authorization',
  historicalEvidencePreserved: true,
  freshBFixtureId: 'FP024C1_FRESH_B',
  freshCFixtureId: 'FP024C1_FRESH_C',
  freshBStatus: 'PENDING_OPERATOR_RUN',
  freshCStatus: 'PENDING_OPERATOR_RUN',
  baselineResetVerdict: 'REPRODUCTION_FAILED',
  cannotDeadlockControlAuthorization: true,
} as const;

export const FP024C3_EVIDENCE_CHECKPOINT = {
  accepted: true,
  verdict: 'NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS',
  completeInputEquivalence: 'UNPROVEN',
  offcutRemnant: 'UNPROVEN',
} as const;

export const FP024C_90_CONTROL_STOCK_PROTOCOL = {
  present: true,
  captureStockBeforeRun: true,
  noMutationDuringRun: true,
  stockUpdateResponse: 'NO',
} as const;

export const FP024C_90_CONTROL_AUTHORIZATION_CONTRACT = {
  id: 'FP024C4_CONTROL_AUTHORIZATION',
  required: [
    'FP024C3_EVIDENCE_CHECKPOINT_ACCEPTED',
    'PRODUCTION_FORMULAS_FROZEN',
    'FP024C_90_CONTROL_FIXTURE_SPECIFIED_INDEPENDENTLY',
    'SETTINGS_WELD_3_SAW_4_TRIM_0',
    'MACHINE_PROVENANCE_DEFINED',
    'NO_SYNTHETIC_REQUIRED_PART_MANIPULATION',
    'COMPENSATION_AND_FP027_AUTHORITY_SEPARATED',
    'STOCK_MUTATION_PROTOCOL_PRESENT',
    'FP027_TARGETING_CANNOT_AUTHORIZE_FP024C_CONTROL',
  ],
  supersededAsBlockers: [
    'BASELINE_RESET_RECOVERS_1B_REMAINDERS',
    'FP024C1_FRESH_B_C_MEASURED',
    'FP024C1_VERDICT_NOT_PENDING_OR_AMBIGUOUS',
    'FP027_ROOT_CAUSE_CLOSED',
  ],
  fp027TargetingCannotAuthorize: true,
  dualUseConditionalDoesNotEqualSafe: true,
  fp027ObservationPassiveOnly: true,
  scoreUnchangedByAuthorization: '6.0/10',
} as const;

export type ControlFixtureAuthorizationVerdict =
  | 'AUTHORIZED'
  | 'READY_FOR_OPERATOR_RUN'
  | 'BLOCKED'
  | 'CONDITIONAL'
  | 'UNPROVEN';

export interface ControlFixtureAuthorizationArgs {
  controlledTriplicateComplete?: boolean;
  fixtureIndependentlySpecified?: boolean;
  selectedToObserveOrtaSurplus?: boolean;
  formulaFreeze?: boolean;
  stockMutationProtocolPresent?: boolean;
  settingsWeld3Saw4Trim0?: boolean;
  machineProvenanceDefined?: boolean;
  syntheticRowRejected?: boolean;
  authoritySeparated?: boolean;
  dualUseClassification?: Fp024cNinetyControlDualUseClassification;
  fp027TargetingAuthorize?: boolean;
}

/**
 * Current scientific gate for the original 90° compensation control.
 * Does not ask whether optimizer topology is deterministic, whether the
 * asdd remainder reset recovered, or whether FP-027 root cause is closed.
 */
export function evaluateControlFixtureAuthorization(
  args: ControlFixtureAuthorizationArgs = {}
): {
  authorized: boolean;
  verdict: ControlFixtureAuthorizationVerdict;
  blockers: string[];
  supersededConditions: readonly string[];
  fp027RootCauseBlocksCompensation: false;
  fp027TargetingAuthorizedControl: false;
  dualUseIsSafe: boolean;
  physicalLengthScore: '6.0/10';
  controlRunStatus: 'NOT_RUN' | 'MEASURED';
} {
  const fixtureSpecified =
    args.fixtureIndependentlySpecified ??
    evaluateIndependentNinetyControlFixtureSpec().specifiedIndependently;
  const selectedForOrta = args.selectedToObserveOrtaSurplus ?? false;
  const freeze = args.formulaFreeze ?? FP024C_NINETY_CONTROL_DUAL_USE.formulaFreeze;
  const stockProtocol =
    args.stockMutationProtocolPresent ?? FP024C_90_CONTROL_STOCK_PROTOCOL.present;
  const settings = args.settingsWeld3Saw4Trim0 ?? true;
  const machine = args.machineProvenanceDefined ?? true;
  const noSynthetic =
    args.syntheticRowRejected ??
    !FP027_REQUIRED_PARTS_CONSERVATION_GATE.injectedSyntheticRowIsValidEvidence;
  const separated =
    args.authoritySeparated ??
    FP024C_NINETY_CONTROL_DUAL_USE.sharedVerdictAuthorityForbidden;
  const dualUse =
    args.dualUseClassification ?? FP024C_NINETY_CONTROL_DUAL_USE.classification;
  const c3Accepted =
    args.controlledTriplicateComplete ?? FP024C3_EVIDENCE_CHECKPOINT.accepted;
  const fp027Wants = args.fp027TargetingAuthorize ?? false;

  const blockers: string[] = [];
  if (!c3Accepted) blockers.push('FP024C3_EVIDENCE_CHECKPOINT_ACCEPTED');
  if (!freeze) blockers.push('PRODUCTION_FORMULAS_FROZEN');
  if (!fixtureSpecified) {
    blockers.push('FP024C_90_CONTROL_FIXTURE_SPECIFIED_INDEPENDENTLY');
  }
  if (selectedForOrta || fp027Wants) {
    blockers.push('FP027_TARGETING_CANNOT_AUTHORIZE_FP024C_CONTROL');
  }
  if (!settings) blockers.push('SETTINGS_WELD_3_SAW_4_TRIM_0');
  if (!machine) blockers.push('MACHINE_PROVENANCE_DEFINED');
  if (!noSynthetic) blockers.push('NO_SYNTHETIC_REQUIRED_PART_MANIPULATION');
  if (!separated) blockers.push('COMPENSATION_AND_FP027_AUTHORITY_SEPARATED');
  if (!stockProtocol) blockers.push('STOCK_MUTATION_PROTOCOL_PRESENT');

  return {
    authorized: blockers.length === 0,
    verdict: blockers.length === 0 ? 'READY_FOR_OPERATOR_RUN' : 'BLOCKED',
    blockers,
    supersededConditions: FP024C_90_CONTROL_AUTHORIZATION_CONTRACT.supersededAsBlockers,
    fp027RootCauseBlocksCompensation: false,
    fp027TargetingAuthorizedControl: false,
    dualUseIsSafe: dualUse === 'DUAL_USE_SAFE',
    physicalLengthScore: '6.0/10',
    controlRunStatus:
      FP024C_90_CONTROL_COMPENSATION.status === 'MEASURED' ? 'MEASURED' : 'NOT_RUN',
  };
}

export interface ControlledFixtureRow {
  category: DowinLengthCategory;
  nominalLengthMm: number;
  packedLengthMm: number;
  leftAngleDeg: number;
  rightAngleDeg: number;
  quantity: number;
}

/**
 * The fixture each controlled run must generate on its own: 1000×1500,
 * Deceuninck 70. Cut lengths must arise from design generation. Do not
 * force them by hand; a mismatch stops that run.
 */
export const FP024C3_EXPECTED_FIXTURE_ROWS: readonly ControlledFixtureRow[] = [
  { category: 'frame_horizontal', nominalLengthMm: 1000, packedLengthMm: 1003, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 2 },
  { category: 'frame_vertical', nominalLengthMm: 1500, packedLengthMm: 1503, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 2 },
  { category: 'sash_horizontal', nominalLengthMm: 451, packedLengthMm: 454, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 4 },
  { category: 'sash_vertical', nominalLengthMm: 1430, packedLengthMm: 1433, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 4 },
  { category: 'mullion', nominalLengthMm: 1416, packedLengthMm: 1416, leftAngleDeg: 90, rightAngleDeg: 90, quantity: 1 },
  { category: 'glazing_bead_horizontal', nominalLengthMm: 331, packedLengthMm: 334, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 4 },
  { category: 'glazing_bead_vertical', nominalLengthMm: 1310, packedLengthMm: 1313, leftAngleDeg: 45, rightAngleDeg: 45, quantity: 4 },
];

export const FP024C3_EXPECTED_PIECE_COUNT = 21;

export type ControlledFixtureVerdict =
  | 'MATCH'
  | 'GEOMETRY_OR_SYSTEM_INPUT_DIFFERENCE'
  | 'UNPROVEN';

/**
 * Compares a run's generated pieces against the required fixture signature.
 * A missing layer is UNPROVEN; a present-but-different layer stops the run.
 */
export function evaluateControlledFixtureSignature(
  pieces: readonly DowinPhysicalLengthGoldenRow[] | null | undefined,
  expected: readonly ControlledFixtureRow[] = FP024C3_EXPECTED_FIXTURE_ROWS
): { verdict: ControlledFixtureVerdict; reasons: string[] } {
  if (pieces == null || pieces.length === 0) {
    return { verdict: 'UNPROVEN', reasons: ['no generated pieces were captured'] };
  }
  const cuttable = pieces.filter(
    (piece) => piece.category !== 'glass' && piece.category !== 'angle_compensation'
  );
  const reasons: string[] = [];
  let unproven = false;
  for (const row of expected) {
    const matches = cuttable.filter((piece) => piece.category === row.category);
    if (matches.length === 0) {
      unproven = true;
      reasons.push(`${row.category}: not present in the captured design`);
      continue;
    }
    const sized = matches.filter((piece) => piece.expectedNominalLengthMm === row.nominalLengthMm);
    if (sized.length === 0) {
      reasons.push(
        `${row.category}: expected nominal ${row.nominalLengthMm} mm, captured ${[
          ...new Set(matches.map((piece) => piece.expectedNominalLengthMm)),
        ].join('/')}`
      );
      continue;
    }
    if (sized.length !== row.quantity) {
      reasons.push(
        `${row.category} ${row.nominalLengthMm} mm: expected ×${row.quantity}, captured ×${sized.length}`
      );
    }
    for (const piece of sized) {
      if (piece.expectedPackedSegmentMm == null) {
        unproven = true;
        reasons.push(`${piece.pieceId}: packed length not captured`);
        continue;
      }
      if (piece.expectedPackedSegmentMm !== row.packedLengthMm) {
        reasons.push(
          `${piece.pieceId}: expected packed ${row.packedLengthMm} mm, captured ${piece.expectedPackedSegmentMm} mm`
        );
      }
      if (
        piece.leftAngleDeg !== row.leftAngleDeg ||
        piece.rightAngleDeg !== row.rightAngleDeg
      ) {
        reasons.push(
          `${piece.pieceId}: expected ${row.leftAngleDeg}°/${row.rightAngleDeg}°, captured ${piece.leftAngleDeg}°/${piece.rightAngleDeg}°`
        );
      }
    }
  }
  if (cuttable.length !== FP024C3_EXPECTED_PIECE_COUNT) {
    reasons.push(
      `expected ${FP024C3_EXPECTED_PIECE_COUNT} cuttable pieces, captured ${cuttable.length}`
    );
  }
  if (reasons.length === 0) return { verdict: 'MATCH', reasons };
  return {
    verdict: unproven ? 'UNPROVEN' : 'GEOMETRY_OR_SYSTEM_INPUT_DIFFERENCE',
    reasons,
  };
}

/**
 * Intake gate for a controlled run. Reuses the FP-024C.1 fresh-run rules and
 * adds the FP-024C.3 stock-isolation requirements.
 */
export function evaluateControlledRunIntake(args: {
  run: ControlledRunEvidence;
  observedSettings: DowinJobObservedSettings;
  widthMm: number;
  heightMm: number;
  profileSystem: string;
  sourceHashes: {
    generalSettingsScreenshot?: string | null;
    designPreview?: string | null;
    assemblyLabels?: string | null;
    optimization?: string | null;
    machineExport?: string | null;
    mdb?: string | null;
  };
  priorRuns?: readonly ControlledRunEvidence[];
  baseline?: readonly WarehouseStockCard[];
  baselineVersion?: ControlledBaselineVersion;
  mdbGenerated?: boolean;
  operatorClaimsEquivalence?: boolean;
}): { ok: boolean; reasons: string[] } {
  const { run, priorRuns = [], baselineVersion = FP024C3_ACTIVE_BASELINE_VERSION } = args;
  const baseline =
    args.baseline ??
    controlledBaselineOf(baselineVersion)?.baselineStockSnapshot ??
    FP024C3_FROZEN_WAREHOUSE_BASELINE;
  const reasons: string[] = [];
  if (!(FP024C3_RUN_IDS as readonly string[]).includes(run.runId)) {
    reasons.push(`runId must be one of ${FP024C3_RUN_IDS.join(' / ')}.`);
  }
  const baselineClaim = evaluateBaselineEquivalenceClaim(
    run.baselineVersion ?? baselineVersion,
    baselineVersion
  );
  if (baselineClaim.claim !== 'ALLOWED') {
    reasons.push(baselineClaim.reason);
  }
  const fresh = evaluateFreshRunIntake({
    runId: run.runId,
    timestampIso: run.provenance?.timestampIso ?? null,
    observedSettings: args.observedSettings,
    widthMm: args.widthMm,
    heightMm: args.heightMm,
    profileSystem: args.profileSystem,
    provenance: run.provenance,
    sourceHashes: args.sourceHashes,
    mdbGenerated: args.mdbGenerated,
    operatorClaimsEquivalence: args.operatorClaimsEquivalence,
  });
  reasons.push(...fresh.reasons.filter((reason) => !reason.startsWith('freshSlot')));
  const immutability = verifyWarehouseImmutability({
    observedStock: run.observedWarehouseStock,
    baseline,
    logReview: run.stockWriteLogReview ?? 'NOT_REVIEWED',
    manualStockCardEditObserved: run.manualStockCardEditObserved,
  });
  if (immutability.verdict === 'STOCK_STATE_MUTATED') {
    reasons.push(
      `Post-run warehouse stock left frozen FP-024C.3 baseline V${baselineVersion}. STOCK_STATE_MUTATED. Stop the experiment. ${immutability.reasons.join(' ')}`
    );
  }
  if (immutability.verdict === 'UNPROVEN') {
    reasons.push(`Warehouse immutability UNPROVEN. ${immutability.reasons.join(' ')}`);
  }
  if (run.warehouseWriteActionInvoked === true) {
    reasons.push('A warehouse-write action was invoked. The run is invalid.');
  }
  if (!nonempty(run.settingsScreenshotSha256)) {
    reasons.push('A new General Settings screenshot SHA-256 is required for each run.');
  } else if (
    priorRuns.some((prior) => prior.settingsScreenshotSha256 === run.settingsScreenshotSha256)
  ) {
    reasons.push(
      'The settings screenshot hash matches a prior run. A reused hash is not evidence of current state.'
    );
  }
  const fixture = evaluateControlledFixtureSignature(run.pieces);
  if (fixture.verdict !== 'MATCH') {
    reasons.push(`fixture signature ${fixture.verdict}: ${fixture.reasons.join('; ')}`);
  }
  if (
    priorRuns.some(
      (prior) =>
        prior.provenance?.optimizationResultId != null &&
        prior.provenance.optimizationResultId === run.provenance?.optimizationResultId
    )
  ) {
    reasons.push('An optimization result was reused across controlled runs.');
  }
  return { ok: reasons.length === 0, reasons };
}

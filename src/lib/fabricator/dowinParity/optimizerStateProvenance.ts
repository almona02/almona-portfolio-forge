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
  // A shared hash means one screenshot was reused across runs, so the second
  // run has no contemporaneous settings evidence.
  if (a.settingsScreenshotSha256 === b.settingsScreenshotSha256) return 'UNPROVEN';
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
    run.bars == null ? null : topologyFingerprint(run.bars, run.pieces)
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

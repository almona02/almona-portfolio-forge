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

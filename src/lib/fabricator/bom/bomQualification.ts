import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WorkflowIdentity } from '@/store/workflowStore';
import type { FabricationData, WindowUnit } from '@/types/fabricator';

export interface BOMQualification {
  status: 'estimate' | 'qualified';
  identity: WorkflowIdentity | null;
  catalogueVersion: string | null;
  ruleVersion: string | null;
  requiredPieceCount: number;
  generatedPieceCount: number;
  unplacedPieceCount: number;
  reasons: string[];
}

export interface BOMQualificationContext {
  identity?: WorkflowIdentity | null;
  catalogueVersion?: string | null;
  ruleVersion?: string | null;
}

export function countRequiredProfilePieces(
  project: WindowUnit,
  pattern: EgyptianPattern,
): number {
  const operativeCells = project.grid?.cells.filter(
    cell => cell.type === 'sash' || cell.type === 'sliding',
  ).length ?? 0;
  const internalMembers = (pattern.mullions?.length ?? 0) + (pattern.transoms?.length ?? 0);
  return 4 + (operativeCells * 4) + internalMembers;
}

export function assessBOMQualification(
  project: WindowUnit,
  pattern: EgyptianPattern,
  profiles: FabricationData['profiles'],
  context: BOMQualificationContext = {},
): BOMQualification {
  const requiredPieceCount = countRequiredProfilePieces(project, pattern);
  const generatedPieceCount = profiles.reduce(
    (count, profile) => count + profile.cuttingLengths.length,
    0,
  );
  const reasons: string[] = [];

  if (!context.identity) reasons.push('Authoritative workflow identity is missing');
  if (!context.catalogueVersion) reasons.push('Approved catalogue version is missing');
  if (!context.ruleVersion) reasons.push('Approved manufacturing rule version is missing');
  if (generatedPieceCount !== requiredPieceCount) {
    reasons.push(`Piece ledger mismatch: required ${requiredPieceCount}, generated ${generatedPieceCount}`);
  }

  return {
    status: reasons.length === 0 ? 'qualified' : 'estimate',
    identity: context.identity ?? null,
    catalogueVersion: context.catalogueVersion ?? null,
    ruleVersion: context.ruleVersion ?? null,
    requiredPieceCount,
    generatedPieceCount,
    unplacedPieceCount: Math.max(0, requiredPieceCount - generatedPieceCount),
    reasons,
  };
}

export function isQualifiedBOM(
  bom: { qualification?: BOMQualification } | null,
): boolean {
  return bom?.qualification?.status === 'qualified'
    && Boolean(bom.qualification.identity?.ownerUserId)
    && Boolean(bom.qualification.catalogueVersion)
    && Boolean(bom.qualification.ruleVersion)
    && Number.isInteger(bom.qualification.requiredPieceCount)
    && bom.qualification.requiredPieceCount > 0
    && bom.qualification.requiredPieceCount === bom.qualification.generatedPieceCount
    && bom.qualification.unplacedPieceCount === 0
    && bom.qualification.reasons?.length === 0;
}

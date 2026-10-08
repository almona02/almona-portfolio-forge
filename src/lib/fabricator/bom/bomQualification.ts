import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { normalizeOpeningType } from '@/lib/fabricator/openingType';
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

function operativeSashCells(project: WindowUnit, pattern: EgyptianPattern) {
  const cells = project.grid?.cells?.length
    ? project.grid.cells
    : pattern.gridSpec?.cells ?? [];
  return cells.filter((cell) => {
    const t = String(cell.type ?? '').toLowerCase();
    return t === 'sash' || t.includes('sliding');
  });
}

function isSlidingLedger(project: WindowUnit, pattern: EgyptianPattern): boolean {
  if (normalizeOpeningType(project.type, project.grid) === 'sliding') return true;
  if (pattern.type === 'sliding' || pattern.openingMechanism?.type === 'sliding') return true;
  const cells = [
    ...(project.grid?.cells ?? []),
    ...(pattern.gridSpec?.cells ?? []),
  ];
  return cells.some((cell) => String(cell.type ?? '').toLowerCase().includes('sliding'));
}

/**
 * Required physical cut occurrences for the profile ledger.
 * Must match ProfileBOMCalculator emission rules (frame + sash + sliding
 * subsystem roles). Do not relax comparisons — update this when member rules change.
 */
export function countRequiredProfilePieces(
  project: WindowUnit,
  pattern: EgyptianPattern,
): number {
  const sashCells = operativeSashCells(project, pattern);
  const operativeCells = sashCells.length;
  const internalMembers = (pattern.mullions?.length ?? 0) + (pattern.transoms?.length ?? 0);
  let required = 4 + (operativeCells * 4) + internalMembers;

  if (isSlidingLedger(project, pattern) && operativeCells >= 1) {
    // Matches appendMissingSlidingSubsystemProfiles:
    // interlock (sashCount-1 when ≥2), track ×2, glazing bead ×4 per sash
    if (operativeCells >= 2) {
      required += Math.max(1, operativeCells - 1);
    }
    required += 2; // track pair
    required += operativeCells * 4; // glazing bead perimeter cuts
  }

  return required;
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

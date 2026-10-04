import type {
  ApprovedProfileReference,
  ApprovedRuleReference,
  ApprovedSystemPackReference,
  ManufacturingDesignContract,
} from '@/lib/fabricator/manufacturing/ManufacturingDesignContract';
import { serializeManufacturingDesignContract } from '@/lib/fabricator/manufacturing/ManufacturingDesignContract';
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import type { FenestrationSystem, ProfileSpec } from '@/types/fenestration';
import { optimizeLinearCuts, type OptimizationResult } from '@/lib/algorithms/LinearOptimizer';
import {
  resolveManufacturingSettings,
  systemPackCuttingOverrideFromMicrons,
} from '@/lib/fabricator/ManufacturingSettings';
import { ApexEngineV6, type ApexV6Output } from './ApexEngineV6';

export type ApexManufacturingBoundaryErrorCode =
  | 'INVALID_CONTRACT'
  | 'SYSTEM_AUTHORITY_MISMATCH'
  | 'PROFILE_AUTHORITY_MISMATCH'
  | 'RULE_AUTHORITY_MISMATCH'
  | 'PIECE_RECONCILIATION_FAILED';

export class ApexManufacturingBoundaryError extends Error {
  readonly blocking = true;

  constructor(
    readonly code: ApexManufacturingBoundaryErrorCode,
    readonly field: string,
    message: string
  ) {
    super(message);
    this.name = 'ApexManufacturingBoundaryError';
  }
}

export interface ApprovedApexSystemSnapshot {
  readonly system: FenestrationSystem;
  readonly systemPack: Readonly<ApprovedSystemPackReference>;
  readonly profiles: readonly Readonly<ApprovedProfileReference>[];
  readonly cuttingRules: readonly Readonly<ApprovedRuleReference>[];
  readonly toleranceRule: Readonly<ApprovedRuleReference>;
}

export interface ApexManufacturingResult {
  readonly contractKey: string;
  readonly identity: ManufacturingDesignContract['identity'];
  readonly contract: ManufacturingDesignContract;
  readonly physicalAssembly: ApexPhysicalAssembly;
  readonly linearPieces: readonly ApexLinearPiece[];
  readonly requiredPieceManifest: readonly ApexLinearPiece[];
  readonly bom: { readonly linearPieces: readonly ApexLinearPiece[] };
  readonly optimization: readonly ApexProfileOptimization[];
  readonly blockedComponents: readonly ApexBlockedManufacturingComponent[];
  readonly apex: ApexV6Output;
}

export interface ApexProfileOptimization {
  readonly profileId: string;
  readonly stockLength: { readonly value: number; readonly unit: 'mm' };
  readonly result: OptimizationResult;
}

export interface ApexLinearPiece {
  readonly pieceId: string;
  readonly role: 'frame' | 'sash';
  readonly sourceCellId?: string;
  readonly side: 'top' | 'bottom' | 'left' | 'right';
  readonly cutLength: { readonly value: number; readonly unit: 'mm' };
  readonly totalQuantity: number;
  readonly profile: {
    readonly profileId: string;
    readonly stockLength: { readonly value: number; readonly unit: 'mm' };
    readonly approvalId: string;
  };
}

export interface ApexBlockedManufacturingComponent {
  readonly componentId: string;
  readonly role: 'mullion' | 'transom' | 'glazing';
  readonly reason: 'approved_cut_formula_required';
}

export interface ApexPhysicalCellAssembly {
  readonly sourceCellId: string;
  readonly type: ManufacturingDesignContract['cells'][number]['type'];
  readonly boundsMm: ManufacturingDesignContract['cells'][number]['bounds'];
  readonly glazing: {
    readonly glazingId: string;
    readonly openingBoundsMm: ManufacturingDesignContract['cells'][number]['bounds'];
    readonly cutDimensionsStatus: 'blocked_pending_approved_formula';
  };
}

export interface ApexPhysicalDivider {
  readonly id: string;
  readonly role: 'mullion' | 'transom';
  readonly sourceCellIds: readonly string[];
  readonly axisPositionMm: number;
  readonly spanStartMm: number;
  readonly spanEndMm: number;
}

export interface ApexPhysicalAssembly {
  readonly cells: readonly ApexPhysicalCellAssembly[];
  readonly dividers: readonly ApexPhysicalDivider[];
}

const sameReference = (left: object, right: object): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const profileByRole = (
  system: FenestrationSystem,
  role: string
): ProfileSpec | undefined => {
  const profiles: Readonly<Record<string, ProfileSpec | undefined>> = system.profiles;
  return profiles[role];
};

function assertApprovedSnapshot(
  contract: ManufacturingDesignContract,
  snapshot: ApprovedApexSystemSnapshot
): void {
  if (
    snapshot.system.id !== contract.systemPack.id ||
    !sameReference(snapshot.systemPack, contract.systemPack)
  ) {
    throw new ApexManufacturingBoundaryError(
      'SYSTEM_AUTHORITY_MISMATCH',
      'systemPack',
      'Apex blocked: the resolved system snapshot does not match the approved contract system.'
    );
  }

  if (!sameReference(snapshot.profiles, contract.profiles)) {
    throw new ApexManufacturingBoundaryError(
      'PROFILE_AUTHORITY_MISMATCH',
      'profiles',
      'Apex blocked: resolved profile authority does not match the approved contract.'
    );
  }
  for (const requiredRole of ['frame', 'sash'] as const) {
    if (!contract.profiles.some((profile) => profile.role === requiredRole)) {
      throw new ApexManufacturingBoundaryError(
        'PROFILE_AUTHORITY_MISMATCH',
        `profiles.${requiredRole}`,
        `Apex blocked: an approved ${requiredRole} profile is required.`
      );
    }
  }
  for (const reference of contract.profiles) {
    const profile = profileByRole(snapshot.system, reference.role);
    if (
      !profile ||
      profile.code !== reference.profileId ||
      profile.standardStockLength !== reference.stockLengthMm
    ) {
      throw new ApexManufacturingBoundaryError(
        'PROFILE_AUTHORITY_MISMATCH',
        `profiles.${reference.role}`,
        `Apex blocked: profile ${reference.role} differs from its approved authority reference.`
      );
    }
  }

  if (
    !sameReference(snapshot.cuttingRules, contract.cuttingRules) ||
    !sameReference(snapshot.toleranceRule, contract.toleranceRule)
  ) {
    throw new ApexManufacturingBoundaryError(
      'RULE_AUTHORITY_MISMATCH',
      'cuttingRules',
      'Apex blocked: resolved cutting or tolerance rules do not match the approved contract.'
    );
  }
}

function toLegacyWindowUnit(contract: ManufacturingDesignContract): WindowUnit {
  const rows = Math.max(...contract.cells.map((cell) => cell.row + cell.rowSpan));
  const cols = Math.max(...contract.cells.map((cell) => cell.col + cell.colSpan));
  const grid: WindowGrid = {
    rows,
    cols,
    cells: contract.cells.map((cell) => ({
      id: cell.id,
      row: cell.row,
      col: cell.col,
      rowSpan: cell.rowSpan,
      colSpan: cell.colSpan,
      type: cell.type,
      ...(cell.openingDirection ? { openingDirection: cell.openingDirection } : {}),
    })),
  };

  return {
    id: contract.identity.positionId,
    orderNumber: contract.identity.projectId,
    posNumber: contract.identity.positionId,
    type: 'window',
    components: [],
    overallWidth: contract.overallWidthMm,
    overallHeight: contract.overallHeightMm,
    color: '',
    glazing: {},
    hardware: [],
    status: 'design',
    optimization: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    revision: contract.identity.revision,
    systemPackId: contract.systemPack.id,
    quantity: contract.quantity,
    grid,
  };
}

function buildPhysicalAssembly(contract: ManufacturingDesignContract): ApexPhysicalAssembly {
  const glazingByCell = new Map(
    contract.glazingSelections.map((selection) => [selection.sourceCellId, selection] as const)
  );
  const cells = contract.cells
    .filter((cell) => cell.type !== 'empty')
    .map((cell): ApexPhysicalCellAssembly => ({
      sourceCellId: cell.id,
      type: cell.type,
      boundsMm: cell.bounds,
      glazing: {
        glazingId: glazingByCell.get(cell.id)!.glazingId,
        openingBoundsMm: cell.bounds,
        cutDimensionsStatus: 'blocked_pending_approved_formula',
      },
    }));

  const dividers: ApexPhysicalDivider[] = [];
  for (let leftIndex = 0; leftIndex < contract.cells.length; leftIndex += 1) {
    const left = contract.cells[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < contract.cells.length; rightIndex += 1) {
      const right = contract.cells[rightIndex];
      const sourceCellIds = [left.id, right.id].sort() as [string, string];
      const leftRight = left.bounds.xMm + left.bounds.widthMm;
      const rightRight = right.bounds.xMm + right.bounds.widthMm;
      const verticalAxis = Math.abs(leftRight - right.bounds.xMm) < Number.EPSILON
        ? leftRight
        : Math.abs(rightRight - left.bounds.xMm) < Number.EPSILON
          ? rightRight
          : undefined;
      const verticalStart = Math.max(left.bounds.yMm, right.bounds.yMm);
      const verticalEnd = Math.min(
        left.bounds.yMm + left.bounds.heightMm,
        right.bounds.yMm + right.bounds.heightMm
      );
      if (verticalAxis !== undefined && verticalEnd > verticalStart) {
        dividers.push({
          id: `mullion:${sourceCellIds.join(':')}`,
          role: 'mullion',
          sourceCellIds,
          axisPositionMm: verticalAxis,
          spanStartMm: verticalStart,
          spanEndMm: verticalEnd,
        });
      }

      const leftBottom = left.bounds.yMm + left.bounds.heightMm;
      const rightBottom = right.bounds.yMm + right.bounds.heightMm;
      const horizontalAxis = Math.abs(leftBottom - right.bounds.yMm) < Number.EPSILON
        ? leftBottom
        : Math.abs(rightBottom - left.bounds.yMm) < Number.EPSILON
          ? rightBottom
          : undefined;
      const horizontalStart = Math.max(left.bounds.xMm, right.bounds.xMm);
      const horizontalEnd = Math.min(
        left.bounds.xMm + left.bounds.widthMm,
        right.bounds.xMm + right.bounds.widthMm
      );
      if (horizontalAxis !== undefined && horizontalEnd > horizontalStart) {
        dividers.push({
          id: `transom:${sourceCellIds.join(':')}`,
          role: 'transom',
          sourceCellIds,
          axisPositionMm: horizontalAxis,
          spanStartMm: horizontalStart,
          spanEndMm: horizontalEnd,
        });
      }
    }
  }

  const mergedDividers: ApexPhysicalDivider[] = [];
  for (const divider of dividers.sort((left, right) =>
    left.role.localeCompare(right.role) ||
    left.axisPositionMm - right.axisPositionMm ||
    left.spanStartMm - right.spanStartMm
  )) {
    const previous = mergedDividers[mergedDividers.length - 1];
    if (
      previous &&
      previous.role === divider.role &&
      Math.abs(previous.axisPositionMm - divider.axisPositionMm) <= 0.000001 &&
      divider.spanStartMm <= previous.spanEndMm + 0.000001
    ) {
      const sourceCellIds = [...new Set([...previous.sourceCellIds, ...divider.sourceCellIds])].sort();
      mergedDividers[mergedDividers.length - 1] = {
        ...previous,
        id: `${previous.role}:${sourceCellIds.join(':')}`,
        sourceCellIds,
        spanEndMm: Math.max(previous.spanEndMm, divider.spanEndMm),
      };
    } else {
      mergedDividers.push(divider);
    }
  }

  return Object.freeze({
    cells: Object.freeze(cells),
    dividers: Object.freeze(mergedDividers.sort((left, right) => left.id.localeCompare(right.id))),
  });
}

function buildLinearPieces(
  contract: ManufacturingDesignContract,
  apex: ApexV6Output
): readonly ApexLinearPiece[] {
  const profile = (role: 'frame' | 'sash') => contract.profiles.find((item) => item.role === role)!;
  const sides = ['top', 'bottom', 'left', 'right'] as const;
  const cutLength = (cuts: ApexV6Output['manufacturing']['frame'], side: typeof sides[number]): number => {
    const key = `${side}Length` as const;
    return cuts[key] / 1000;
  };
  const pieces: ApexLinearPiece[] = [];

  for (const side of sides) {
    const authority = profile('frame');
    pieces.push({
      pieceId: `${contract.identity.positionId}:frame:${side}`,
      role: 'frame',
      side,
      cutLength: { value: cutLength(apex.manufacturing.frame, side), unit: 'mm' },
      totalQuantity: contract.quantity,
      profile: {
        profileId: authority.profileId,
        stockLength: { value: authority.stockLengthMm, unit: 'mm' },
        approvalId: authority.approvalId,
      },
    });
  }
  for (const sash of apex.manufacturing.sashes) {
    for (const side of sides) {
      const authority = profile('sash');
      pieces.push({
        pieceId: `${contract.identity.positionId}:sash:${sash.sourceCellId}:${side}`,
        role: 'sash',
        sourceCellId: sash.sourceCellId,
        side,
        cutLength: { value: cutLength(sash, side), unit: 'mm' },
        totalQuantity: contract.quantity,
        profile: {
          profileId: authority.profileId,
          stockLength: { value: authority.stockLengthMm, unit: 'mm' },
          approvalId: authority.approvalId,
        },
      });
    }
  }
  return Object.freeze(pieces.sort((left, right) => left.pieceId.localeCompare(right.pieceId)));
}

function optimizeAndReconcilePieces(
  pieces: readonly ApexLinearPiece[],
  system: FenestrationSystem
): readonly ApexProfileOptimization[] {
  const settings = resolveManufacturingSettings({
    systemPack: systemPackCuttingOverrideFromMicrons(system.fabricationRules.cutting),
  });
  const groups = new Map<string, ApexLinearPiece[]>();
  for (const piece of pieces) {
    if (piece.cutLength.value > piece.profile.stockLength.value) {
      throw new ApexManufacturingBoundaryError(
        'PIECE_RECONCILIATION_FAILED',
        `linearPieces.${piece.pieceId}`,
        `Apex blocked: piece ${piece.pieceId} exceeds its approved stock length.`
      );
    }
    const key = `${piece.profile.profileId}:${piece.profile.stockLength.value}`;
    groups.set(key, [...(groups.get(key) ?? []), piece]);
  }

  return Object.freeze([...groups.values()]
    .map((group): ApexProfileOptimization => {
      const first = group[0];
      const result = optimizeLinearCuts(
        group.map((piece) => ({
          id: piece.pieceId,
          length: piece.cutLength.value,
          label: piece.pieceId,
          quantity: piece.totalQuantity,
        })),
        first.profile.stockLength.value,
        settings.sawKerfMm,
        settings.trimCutMm
      );
      const expectedIds = group
        .flatMap((piece) => Array.from({ length: piece.totalQuantity }, (_, index) => `${piece.pieceId}-${index}`))
        .sort();
      const actualIds = result.stockUsed.flatMap((bar) => bar.cuts.map((cut) => cut.id)).sort();
      if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
        throw new ApexManufacturingBoundaryError(
          'PIECE_RECONCILIATION_FAILED',
          `optimization.${first.profile.profileId}`,
          `Apex blocked: optimization did not conserve every ${first.profile.profileId} piece exactly once.`
        );
      }
      return {
        profileId: first.profile.profileId,
        stockLength: first.profile.stockLength,
        result,
      };
    })
    .sort((left, right) => left.profileId.localeCompare(right.profileId)));
}

/** Canonical FP-028 manufacturing entry point. */
export function generateApexManufacturing(
  contract: ManufacturingDesignContract,
  snapshot: ApprovedApexSystemSnapshot,
  strategyId = 'miter'
): ApexManufacturingResult {
  if (
    contract.schema !== 'almona.manufacturing-design-contract' ||
    contract.schemaVersion !== 1
  ) {
    throw new ApexManufacturingBoundaryError(
      'INVALID_CONTRACT',
      'contract',
      'Apex accepts only a validated manufacturing design contract.'
    );
  }

  assertApprovedSnapshot(contract, snapshot);
  const contractKey = serializeManufacturingDesignContract(contract);
  const physicalAssembly = buildPhysicalAssembly(contract);
  const apex = new ApexEngineV6(
    snapshot.system,
    toLegacyWindowUnit(contract),
    strategyId,
    contract.cells,
    contractKey
  ).generate();
  const linearPieces = buildLinearPieces(contract, apex);
  const optimization = optimizeAndReconcilePieces(linearPieces, snapshot.system);
  const blockedComponents: readonly ApexBlockedManufacturingComponent[] = Object.freeze([
    ...physicalAssembly.dividers.map((divider) => ({
      componentId: divider.id,
      role: divider.role,
      reason: 'approved_cut_formula_required' as const,
    })),
    ...physicalAssembly.cells.map((cell) => ({
      componentId: `glazing:${cell.sourceCellId}`,
      role: 'glazing' as const,
      reason: 'approved_cut_formula_required' as const,
    })),
  ]);

  return Object.freeze({
    contractKey,
    identity: contract.identity,
    contract,
    physicalAssembly,
    linearPieces,
    requiredPieceManifest: linearPieces,
    bom: Object.freeze({ linearPieces }),
    optimization,
    blockedComponents,
    apex,
  });
}

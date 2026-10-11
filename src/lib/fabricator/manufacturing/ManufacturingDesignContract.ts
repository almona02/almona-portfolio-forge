import { ManufacturingContractError } from './ManufacturingContractError';
import { z } from 'zod';

export interface ManufacturingWorkflowIdentity {
  readonly ownerId: string;
  readonly projectId: string;
  readonly positionId: string;
  readonly source: string;
  readonly revision: number;
}

export interface ManufacturingDesignContractInput {
  readonly identity: ManufacturingWorkflowIdentity;
  readonly overallWidthMm: number;
  readonly overallHeightMm: number;
  readonly quantity: number;
  readonly cells: readonly ManufacturingPhysicalCellInput[];
  readonly systemPack: ApprovedSystemPackReference;
  readonly profiles: readonly ApprovedProfileReference[];
  readonly cuttingRules: readonly ApprovedRuleReference[];
  readonly toleranceRule: ApprovedRuleReference;
  readonly glazingSelections: readonly ApprovedGlazingSelection[];
  readonly hardware: ManufacturingHardwareDecision;
}

export interface ApprovedAuthorityReference {
  readonly evidenceStatus: 'approved';
  readonly approvalId: string;
}

export interface ApprovedSystemPackReference extends ApprovedAuthorityReference {
  readonly id: string;
  readonly revision: number;
}

export interface ApprovedProfileReference extends ApprovedAuthorityReference {
  readonly role: string;
  readonly profileId: string;
  readonly stockLengthMm: number;
}

export interface ApprovedRuleReference extends ApprovedAuthorityReference {
  readonly ruleId: string;
  readonly revision: number;
  readonly deductions?: Readonly<Record<string, unknown>>;
  readonly allowances?: Readonly<Record<string, unknown>>;
  readonly applicability?: Readonly<Record<string, unknown>>;
}

export interface ApprovedGlazingSelection extends ApprovedAuthorityReference {
  readonly sourceCellId: string;
  readonly glazingId: string;
  readonly revision: number;
}

export interface ApprovedHardwareSelection extends ApprovedAuthorityReference {
  readonly hardwareId: string;
  readonly quantity: number;
  readonly sourceCellId?: string;
}

export type ManufacturingHardwareDecision =
  | { readonly mode: 'selected'; readonly selections: readonly ApprovedHardwareSelection[] }
  | { readonly mode: 'not_required'; readonly rule: ApprovedRuleReference };

export type ManufacturingCellType = 'fixed' | 'sash' | 'panel' | 'empty' | 'sliding';
export type ManufacturingOpeningDirection = 'left' | 'right' | 'top' | 'bottom';

export interface ManufacturingPhysicalCellInput {
  readonly id: string;
  readonly row: number;
  readonly col: number;
  readonly rowSpan?: number;
  readonly colSpan?: number;
  readonly type: ManufacturingCellType;
  readonly openingDirection?: ManufacturingOpeningDirection;
  readonly bounds: {
    readonly xMm: number;
    readonly yMm: number;
    readonly widthMm: number;
    readonly heightMm: number;
  };
}

export type ManufacturingPhysicalCell = Readonly<
  Omit<ManufacturingPhysicalCellInput, 'bounds' | 'rowSpan' | 'colSpan'> & {
    readonly rowSpan: number;
    readonly colSpan: number;
    readonly bounds: Readonly<ManufacturingPhysicalCellInput['bounds']>;
  }
>;

export interface ManufacturingDesignContract {
  readonly schema: 'almona.manufacturing-design-contract';
  readonly schemaVersion: 1;
  readonly identity: Readonly<ManufacturingWorkflowIdentity>;
  readonly overallWidthMm: number;
  readonly overallHeightMm: number;
  readonly quantity: number;
  readonly cells: readonly ManufacturingPhysicalCell[];
  readonly systemPack: Readonly<ApprovedSystemPackReference>;
  readonly profiles: readonly Readonly<ApprovedProfileReference>[];
  readonly cuttingRules: readonly Readonly<ApprovedRuleReference>[];
  readonly toleranceRule: Readonly<ApprovedRuleReference>;
  readonly glazingSelections: readonly Readonly<ApprovedGlazingSelection>[];
  readonly hardware: Readonly<
    | { readonly mode: 'selected'; readonly selections: readonly Readonly<ApprovedHardwareSelection>[] }
    | { readonly mode: 'not_required'; readonly rule: Readonly<ApprovedRuleReference> }
  >;
}

export interface ManufacturingPreviewContractInput {
  readonly identity: ManufacturingWorkflowIdentity;
  readonly overallWidthMm: number;
  readonly overallHeightMm: number;
  readonly quantity: number;
  readonly cells: readonly ManufacturingPhysicalCellInput[];
}

export interface ManufacturingPreviewContract {
  readonly schema: 'almona.manufacturing-preview-contract';
  readonly schemaVersion: 1;
  readonly outputClassification: 'estimate_only';
  readonly manufacturingEligible: false;
  readonly identity: Readonly<ManufacturingWorkflowIdentity>;
  readonly overallWidthMm: number;
  readonly overallHeightMm: number;
  readonly quantity: number;
  readonly cells: readonly ManufacturingPhysicalCell[];
}

const GEOMETRY_EPSILON_MM = 0.000001;

const requireNonEmptyIdentity = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ManufacturingContractError(
      'INVALID_IDENTITY',
      field,
      `Manufacturing identity ${field} is required.`
    );
  }
  return normalized;
};

const requirePositiveFinite = (value: number, field: string): number => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ManufacturingContractError(
      'INVALID_DIMENSION',
      field,
      `${field} must be a finite value greater than zero.`
    );
  }
  return value;
};

const requireGridIndex = (value: number, field: string, minimum: number): number => {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new ManufacturingContractError(
      'INVALID_CELL',
      field,
      `${field} must be a safe integer greater than or equal to ${minimum}.`
    );
  }
  return value;
};

const normalizeCells = (
  cells: readonly ManufacturingPhysicalCellInput[],
  overallWidthMm: number,
  overallHeightMm: number
): readonly ManufacturingPhysicalCell[] => {
  if (cells.length === 0) {
    throw new ManufacturingContractError('INVALID_CELL', 'cells', 'At least one physical cell is required.');
  }

  const ids = new Set<string>();
  const normalized = cells.map((cell, index): ManufacturingPhysicalCell => {
    const field = `cells[${index}]`;
    const id = requireNonEmptyIdentity(cell.id, `${field}.id`);
    if (ids.has(id)) {
      throw new ManufacturingContractError('INVALID_CELL', `${field}.id`, `Physical cell id ${id} is duplicated.`);
    }
    ids.add(id);

    const { xMm, yMm, widthMm, heightMm } = cell.bounds;
    if (!Number.isFinite(xMm) || xMm < 0 || !Number.isFinite(yMm) || yMm < 0) {
      throw new ManufacturingContractError(
        'INVALID_CELL',
        `${field}.bounds`,
        'Physical cell coordinates must be finite and non-negative.'
      );
    }
    requirePositiveFinite(widthMm, `${field}.bounds.widthMm`);
    requirePositiveFinite(heightMm, `${field}.bounds.heightMm`);
    if (
      xMm + widthMm > overallWidthMm + GEOMETRY_EPSILON_MM ||
      yMm + heightMm > overallHeightMm + GEOMETRY_EPSILON_MM
    ) {
      throw new ManufacturingContractError(
        'INCONSISTENT_GEOMETRY',
        `${field}.bounds`,
        `Physical cell ${id} exceeds the overall opening.`
      );
    }

    return Object.freeze({
      id,
      row: requireGridIndex(cell.row, `${field}.row`, 0),
      col: requireGridIndex(cell.col, `${field}.col`, 0),
      rowSpan: requireGridIndex(cell.rowSpan ?? 1, `${field}.rowSpan`, 1),
      colSpan: requireGridIndex(cell.colSpan ?? 1, `${field}.colSpan`, 1),
      type: cell.type,
      ...(cell.openingDirection ? { openingDirection: cell.openingDirection } : {}),
      bounds: Object.freeze({ xMm, yMm, widthMm, heightMm }),
    });
  });

  for (let leftIndex = 0; leftIndex < normalized.length; leftIndex += 1) {
    const left = normalized[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < normalized.length; rightIndex += 1) {
      const right = normalized[rightIndex];
      const overlapWidth = Math.min(left.bounds.xMm + left.bounds.widthMm, right.bounds.xMm + right.bounds.widthMm)
        - Math.max(left.bounds.xMm, right.bounds.xMm);
      const overlapHeight = Math.min(left.bounds.yMm + left.bounds.heightMm, right.bounds.yMm + right.bounds.heightMm)
        - Math.max(left.bounds.yMm, right.bounds.yMm);
      if (overlapWidth > GEOMETRY_EPSILON_MM && overlapHeight > GEOMETRY_EPSILON_MM) {
        throw new ManufacturingContractError(
          'INCONSISTENT_GEOMETRY',
          'cells',
          `Physical cells ${left.id} and ${right.id} overlap.`
        );
      }
    }
  }

  const cellsAreaMm2 = normalized.reduce(
    (area, cell) => area + cell.bounds.widthMm * cell.bounds.heightMm,
    0
  );
  const openingAreaMm2 = overallWidthMm * overallHeightMm;
  if (Math.abs(cellsAreaMm2 - openingAreaMm2) > GEOMETRY_EPSILON_MM) {
    throw new ManufacturingContractError(
      'INCONSISTENT_GEOMETRY',
      'cells',
      'Physical cells must close the overall opening without gaps.'
    );
  }

  return Object.freeze([...normalized].sort((left, right) =>
    left.bounds.yMm - right.bounds.yMm ||
    left.bounds.xMm - right.bounds.xMm ||
    left.id.localeCompare(right.id)
  ));
};

const requireApproved = (
  reference: ApprovedAuthorityReference,
  field: string,
  code: 'UNAPPROVED_SYSTEM' | 'UNAPPROVED_PROFILE' | 'UNAPPROVED_RULE'
): void => {
  if (reference.evidenceStatus !== 'approved' || reference.approvalId.trim().length === 0) {
    throw new ManufacturingContractError(code, field, `${field} requires approved authority evidence.`);
  }
};

const normalizeRule = (rule: ApprovedRuleReference, field: string): Readonly<ApprovedRuleReference> => {
  requireApproved(rule, field, 'UNAPPROVED_RULE');
  const ruleId = requireNonEmptyIdentity(rule.ruleId, `${field}.ruleId`);
  if (!Number.isSafeInteger(rule.revision) || rule.revision < 1) {
    throw new ManufacturingContractError('UNAPPROVED_RULE', `${field}.revision`, 'Rule revision must be positive.');
  }
  return Object.freeze({
    ruleId,
    revision: rule.revision,
    evidenceStatus: 'approved',
    approvalId: rule.approvalId.trim(),
  });
};

const normalizeAuthority = (input: ManufacturingDesignContractInput) => {
  requireApproved(input.systemPack, 'systemPack', 'UNAPPROVED_SYSTEM');
  if (!Number.isSafeInteger(input.systemPack.revision) || input.systemPack.revision < 1) {
    throw new ManufacturingContractError(
      'UNAPPROVED_SYSTEM',
      'systemPack.revision',
      'System-pack revision must be positive.'
    );
  }
  const systemPack = Object.freeze({
    id: requireNonEmptyIdentity(input.systemPack.id, 'systemPack.id'),
    revision: input.systemPack.revision,
    evidenceStatus: 'approved' as const,
    approvalId: input.systemPack.approvalId.trim(),
  });

  if (input.profiles.length === 0) {
    throw new ManufacturingContractError('UNAPPROVED_PROFILE', 'profiles', 'At least one approved profile is required.');
  }
  const roles = new Set<string>();
  const profiles = Object.freeze(input.profiles.map((profile, index) => {
    const field = `profiles[${index}]`;
    requireApproved(profile, field, 'UNAPPROVED_PROFILE');
    const role = requireNonEmptyIdentity(profile.role, `${field}.role`);
    if (roles.has(role)) {
      throw new ManufacturingContractError('UNAPPROVED_PROFILE', `${field}.role`, `Profile role ${role} is duplicated.`);
    }
    roles.add(role);
    return Object.freeze({
      role,
      profileId: requireNonEmptyIdentity(profile.profileId, `${field}.profileId`),
      stockLengthMm: requirePositiveFinite(profile.stockLengthMm, `${field}.stockLengthMm`),
      evidenceStatus: 'approved' as const,
      approvalId: profile.approvalId.trim(),
    });
  }).sort((left, right) => left.role.localeCompare(right.role) || left.profileId.localeCompare(right.profileId)));

  if (input.cuttingRules.length === 0) {
    throw new ManufacturingContractError('UNAPPROVED_RULE', 'cuttingRules', 'Approved cutting rules are required.');
  }
  const cuttingRules = Object.freeze(input.cuttingRules
    .map((rule, index) => normalizeRule(rule, `cuttingRules[${index}]`))
    .sort((left, right) => left.ruleId.localeCompare(right.ruleId)));
  const cuttingRuleIds = new Set(cuttingRules.map((rule) => rule.ruleId));
  if (cuttingRuleIds.size !== cuttingRules.length) {
    throw new ManufacturingContractError('UNAPPROVED_RULE', 'cuttingRules', 'Cutting rule IDs must be unique.');
  }

  return Object.freeze({
    systemPack,
    profiles,
    cuttingRules,
    toleranceRule: normalizeRule(input.toleranceRule, 'toleranceRule'),
  });
};

const normalizeSelections = (
  input: ManufacturingDesignContractInput,
  cells: readonly ManufacturingPhysicalCell[]
) => {
  const physicalCellIds = new Set(cells.filter((cell) => cell.type !== 'empty').map((cell) => cell.id));
  const glazingCellIds = new Set<string>();
  const glazingSelections = Object.freeze(input.glazingSelections.map((selection, index) => {
    const field = `glazingSelections[${index}]`;
    requireApproved(selection, field, 'UNAPPROVED_RULE');
    const sourceCellId = requireNonEmptyIdentity(selection.sourceCellId, `${field}.sourceCellId`);
    if (!physicalCellIds.has(sourceCellId) || glazingCellIds.has(sourceCellId)) {
      throw new ManufacturingContractError(
        'INVALID_GLAZING',
        `${field}.sourceCellId`,
        `Glazing must reference one unique physical cell; received ${sourceCellId}.`
      );
    }
    if (!Number.isSafeInteger(selection.revision) || selection.revision < 1) {
      throw new ManufacturingContractError('INVALID_GLAZING', `${field}.revision`, 'Glazing revision must be positive.');
    }
    glazingCellIds.add(sourceCellId);
    return Object.freeze({
      sourceCellId,
      glazingId: requireNonEmptyIdentity(selection.glazingId, `${field}.glazingId`),
      revision: selection.revision,
      evidenceStatus: 'approved' as const,
      approvalId: selection.approvalId.trim(),
    });
  }).sort((left, right) => left.sourceCellId.localeCompare(right.sourceCellId)));
  if (glazingCellIds.size !== physicalCellIds.size) {
    throw new ManufacturingContractError(
      'INVALID_GLAZING',
      'glazingSelections',
      'Every non-empty physical cell requires one approved glazing selection.'
    );
  }

  if (input.hardware.mode === 'not_required') {
    return Object.freeze({
      glazingSelections,
      hardware: Object.freeze({
        mode: 'not_required' as const,
        rule: normalizeRule(input.hardware.rule, 'hardware.rule'),
      }),
    });
  }
  if (input.hardware.selections.length === 0) {
    throw new ManufacturingContractError(
      'INVALID_HARDWARE',
      'hardware.selections',
      'Selected hardware requires at least one approved item.'
    );
  }
  const hardwareIds = new Set<string>();
  const selections = Object.freeze(input.hardware.selections.map((selection, index) => {
    const field = `hardware.selections[${index}]`;
    requireApproved(selection, field, 'UNAPPROVED_RULE');
    const hardwareId = requireNonEmptyIdentity(selection.hardwareId, `${field}.hardwareId`);
    const identity = `${selection.sourceCellId ?? 'unit'}:${hardwareId}`;
    if (hardwareIds.has(identity)) {
      throw new ManufacturingContractError('INVALID_HARDWARE', field, `Hardware selection ${identity} is duplicated.`);
    }
    if (!Number.isSafeInteger(selection.quantity) || selection.quantity < 1) {
      throw new ManufacturingContractError('INVALID_HARDWARE', `${field}.quantity`, 'Hardware quantity must be positive.');
    }
    if (selection.sourceCellId && !physicalCellIds.has(selection.sourceCellId)) {
      throw new ManufacturingContractError(
        'INVALID_HARDWARE',
        `${field}.sourceCellId`,
        `Hardware references unknown physical cell ${selection.sourceCellId}.`
      );
    }
    hardwareIds.add(identity);
    return Object.freeze({
      hardwareId,
      quantity: selection.quantity,
      ...(selection.sourceCellId ? { sourceCellId: selection.sourceCellId } : {}),
      evidenceStatus: 'approved' as const,
      approvalId: selection.approvalId.trim(),
    });
  }).sort((left, right) =>
    (left.sourceCellId ?? '').localeCompare(right.sourceCellId ?? '') || left.hardwareId.localeCompare(right.hardwareId)
  ));
  return Object.freeze({
    glazingSelections,
    hardware: Object.freeze({ mode: 'selected' as const, selections }),
  });
};

const normalizeCore = (input: ManufacturingPreviewContractInput) => {
  if (!Number.isSafeInteger(input.identity.revision) || input.identity.revision < 1) {
    throw new ManufacturingContractError('INVALID_REVISION', 'identity.revision', 'Revision must be positive.');
  }
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) {
    throw new ManufacturingContractError('INVALID_QUANTITY', 'quantity', 'Quantity must be positive.');
  }
  const overallWidthMm = requirePositiveFinite(input.overallWidthMm, 'overallWidthMm');
  const overallHeightMm = requirePositiveFinite(input.overallHeightMm, 'overallHeightMm');
  return Object.freeze({
    identity: Object.freeze({
      ownerId: requireNonEmptyIdentity(input.identity.ownerId, 'identity.ownerId'),
      projectId: requireNonEmptyIdentity(input.identity.projectId, 'identity.projectId'),
      positionId: requireNonEmptyIdentity(input.identity.positionId, 'identity.positionId'),
      source: requireNonEmptyIdentity(input.identity.source, 'identity.source'),
      revision: input.identity.revision,
    }),
    overallWidthMm,
    overallHeightMm,
    quantity: input.quantity,
    cells: normalizeCells(input.cells, overallWidthMm, overallHeightMm),
  });
};

export function createManufacturingDesignContract(
  input: ManufacturingDesignContractInput
): ManufacturingDesignContract {
  const revision = input.identity.revision;
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new ManufacturingContractError(
      'INVALID_REVISION',
      'identity.revision',
      'Manufacturing identity revision must be a positive safe integer.'
    );
  }

  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) {
    throw new ManufacturingContractError(
      'INVALID_QUANTITY',
      'quantity',
      'Manufacturing quantity must be a positive safe integer.'
    );
  }

  const core = normalizeCore(input);
  const authority = normalizeAuthority(input);
  const selections = normalizeSelections(input, core.cells);

  return Object.freeze({
    schema: 'almona.manufacturing-design-contract',
    schemaVersion: 1,
    ...core,
    ...authority,
    ...selections,
  });
}

export function createManufacturingPreviewContract(
  input: ManufacturingPreviewContractInput
): ManufacturingPreviewContract {
  return Object.freeze({
    schema: 'almona.manufacturing-preview-contract',
    schemaVersion: 1,
    outputClassification: 'estimate_only',
    manufacturingEligible: false,
    ...normalizeCore(input),
  });
}

const approvedReferenceSchema = z.object({
  evidenceStatus: z.literal('approved'),
  approvalId: z.string(),
});

const ruleSchema = approvedReferenceSchema.extend({
  ruleId: z.string(),
  revision: z.number(),
  deductions: z.record(z.unknown()).optional(),
  allowances: z.record(z.unknown()).optional(),
  applicability: z.record(z.unknown()).optional(),
});

const serializedContractSchema = z.object({
  schema: z.literal('almona.manufacturing-design-contract'),
  schemaVersion: z.literal(1),
  identity: z.object({
    ownerId: z.string(),
    projectId: z.string(),
    positionId: z.string(),
    source: z.string(),
    revision: z.number(),
  }),
  overallWidthMm: z.number(),
  overallHeightMm: z.number(),
  quantity: z.number(),
  cells: z.array(z.object({
    id: z.string(),
    row: z.number(),
    col: z.number(),
    rowSpan: z.number(),
    colSpan: z.number(),
    type: z.enum(['fixed', 'sash', 'panel', 'empty', 'sliding']),
    openingDirection: z.enum(['left', 'right', 'top', 'bottom']).optional(),
    bounds: z.object({ xMm: z.number(), yMm: z.number(), widthMm: z.number(), heightMm: z.number() }),
  })),
  systemPack: approvedReferenceSchema.extend({ id: z.string(), revision: z.number() }),
  profiles: z.array(approvedReferenceSchema.extend({
    role: z.string(),
    profileId: z.string(),
    stockLengthMm: z.number(),
  })),
  cuttingRules: z.array(ruleSchema),
  toleranceRule: ruleSchema,
  glazingSelections: z.array(approvedReferenceSchema.extend({
    sourceCellId: z.string(),
    glazingId: z.string(),
    revision: z.number(),
  })),
  hardware: z.discriminatedUnion('mode', [
    z.object({
      mode: z.literal('selected'),
      selections: z.array(approvedReferenceSchema.extend({
        hardwareId: z.string(),
        quantity: z.number(),
        sourceCellId: z.string().optional(),
      })),
    }),
    z.object({ mode: z.literal('not_required'), rule: ruleSchema }),
  ]),
}).strict();

export function serializeManufacturingDesignContract(contract: ManufacturingDesignContract): string {
  return JSON.stringify(contract);
}

export function replayManufacturingDesignContract(serialized: string): ManufacturingDesignContract {
  try {
    const parsed: unknown = JSON.parse(serialized);
    const contract = serializedContractSchema.parse(parsed);
    return createManufacturingDesignContract(contract);
  } catch (error: unknown) {
    if (error instanceof ManufacturingContractError) throw error;
    throw new ManufacturingContractError(
      'INVALID_SERIALIZED_CONTRACT',
      'serializedContract',
      'Serialized manufacturing contract is invalid.'
    );
  }
}

import { describe, expect, it } from 'vitest';
import {
  createManufacturingDesignContract,
  createManufacturingPreviewContract,
  replayManufacturingDesignContract,
  serializeManufacturingDesignContract,
  type ManufacturingDesignContractInput,
} from '../ManufacturingDesignContract';
import { ManufacturingContractError } from '../ManufacturingContractError';
import { FP028_ACCEPTANCE_FIXTURES } from '../fp028AcceptanceFixtures';

const validInput = (): ManufacturingDesignContractInput => ({
  identity: {
    ownerId: 'owner-fp028',
    projectId: 'project-fp028',
    positionId: 'position-fp028',
    source: 'v2',
    revision: 1,
  },
  overallWidthMm: 1210,
  overallHeightMm: 1550,
  quantity: 1,
  cells: [
    {
      id: 'left',
      row: 0,
      col: 0,
      type: 'sliding',
      openingDirection: 'right',
      bounds: { xMm: 0, yMm: 0, widthMm: 605, heightMm: 1550 },
    },
    {
      id: 'right',
      row: 0,
      col: 1,
      type: 'sliding',
      openingDirection: 'left',
      bounds: { xMm: 605, yMm: 0, widthMm: 605, heightMm: 1550 },
    },
  ],
  systemPack: { id: 'rock60', revision: 4, evidenceStatus: 'approved', approvalId: 'approval-system-4' },
  profiles: [
    {
      role: 'frame',
      profileId: 'RC-6111-8',
      stockLengthMm: 6000,
      evidenceStatus: 'approved',
      approvalId: 'approval-profile-frame',
    },
    {
      role: 'sash',
      profileId: 'RC-6122',
      stockLengthMm: 6000,
      evidenceStatus: 'approved',
      approvalId: 'approval-profile-sash',
    },
  ],
  cuttingRules: [
    { ruleId: 'rock60-frame-v4', revision: 4, evidenceStatus: 'approved', approvalId: 'approval-cut-frame' },
    { ruleId: 'rock60-sash-v4', revision: 4, evidenceStatus: 'approved', approvalId: 'approval-cut-sash' },
  ],
  toleranceRule: {
    ruleId: 'aluminium-qc-v2',
    revision: 2,
    evidenceStatus: 'approved',
    approvalId: 'approval-tolerance-2',
  },
  glazingSelections: [
    { sourceCellId: 'left', glazingId: 'DG-24', revision: 2, evidenceStatus: 'approved', approvalId: 'glass-L' },
    { sourceCellId: 'right', glazingId: 'DG-24', revision: 2, evidenceStatus: 'approved', approvalId: 'glass-R' },
  ],
  hardware: {
    mode: 'selected',
    selections: [
      { hardwareId: 'roller-kit', sourceCellId: 'left', quantity: 2, evidenceStatus: 'approved', approvalId: 'hw-L' },
      { hardwareId: 'roller-kit', sourceCellId: 'right', quantity: 2, evidenceStatus: 'approved', approvalId: 'hw-R' },
    ],
  },
});

const captureContractError = (input: ManufacturingDesignContractInput): ManufacturingContractError => {
  try {
    createManufacturingDesignContract(input);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(ManufacturingContractError);
    return error as ManufacturingContractError;
  }
  throw new Error('Expected contract creation to fail.');
};

describe('FP-028 / Phase 1 manufacturing contract boundary', () => {
  it('creates an immutable, normalized contract', () => {
    const input = validInput();
    input.identity = { ...input.identity, ownerId: ' owner-fp028 ' };

    const contract = createManufacturingDesignContract(input);

    expect(contract).toEqual({
      schema: 'almona.manufacturing-design-contract',
      schemaVersion: 1,
      identity: { ...validInput().identity, ownerId: 'owner-fp028' },
      overallWidthMm: 1210,
      overallHeightMm: 1550,
      quantity: 1,
      cells: validInput().cells.map((cell) => ({
        ...cell,
        rowSpan: 1,
        colSpan: 1,
      })),
      systemPack: validInput().systemPack,
      profiles: validInput().profiles,
      cuttingRules: validInput().cuttingRules,
      toleranceRule: validInput().toleranceRule,
      glazingSelections: validInput().glazingSelections,
      hardware: validInput().hardware,
    });
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.identity)).toBe(true);
    expect(Object.isFrozen(contract.cells)).toBe(true);
    expect(Object.isFrozen(contract.cells[0].bounds)).toBe(true);
    expect(Object.isFrozen(contract.systemPack)).toBe(true);
    expect(Object.isFrozen(contract.profiles)).toBe(true);
    expect(Object.isFrozen(contract.cuttingRules)).toBe(true);
    expect(Object.isFrozen(contract.glazingSelections)).toBe(true);
    expect(Object.isFrozen(contract.hardware)).toBe(true);
  });

  it.each([
    ['ownerId', { ownerId: ' ' }],
    ['projectId', { projectId: '' }],
    ['positionId', { positionId: '\t' }],
    ['source', { source: '' }],
  ] as const)('rejects missing identity field %s', (field, identityPatch) => {
    const input = validInput();
    input.identity = { ...input.identity, ...identityPatch };

    expect(captureContractError(input)).toMatchObject({
      code: 'INVALID_IDENTITY',
      field: `identity.${field}`,
      blocking: true,
    });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid revision %s',
    (revision) => {
      const input = validInput();
      input.identity = { ...input.identity, revision };
      expect(captureContractError(input)).toMatchObject({
        code: 'INVALID_REVISION',
        field: 'identity.revision',
      });
    }
  );

  it('rejects empty and duplicate physical cells', () => {
    expect(captureContractError({ ...validInput(), cells: [] })).toMatchObject({
      code: 'INVALID_CELL',
      field: 'cells',
    });

    const input = validInput();
    expect(
      captureContractError({
        ...input,
        cells: [input.cells[0], { ...input.cells[1], id: input.cells[0].id }],
      })
    ).toMatchObject({ code: 'INVALID_CELL', field: 'cells[1].id' });
  });

  it('rejects non-finite, negative, or out-of-opening bounds', () => {
    const input = validInput();
    expect(
      captureContractError({
        ...input,
        cells: [{ ...input.cells[0], bounds: { ...input.cells[0].bounds, xMm: Number.NaN } }],
      })
    ).toMatchObject({ code: 'INVALID_CELL', field: 'cells[0].bounds' });

    expect(
      captureContractError({
        ...input,
        cells: [{ ...input.cells[0], bounds: { ...input.cells[0].bounds, widthMm: 1211 } }],
      })
    ).toMatchObject({ code: 'INCONSISTENT_GEOMETRY', field: 'cells[0].bounds' });
  });

  it('rejects overlapping cells and geometry gaps', () => {
    const input = validInput();
    expect(
      captureContractError({
        ...input,
        cells: [input.cells[0], { ...input.cells[1], bounds: { ...input.cells[1].bounds, xMm: 600 } }],
      })
    ).toMatchObject({ code: 'INCONSISTENT_GEOMETRY', field: 'cells' });

    expect(
      captureContractError({
        ...input,
        cells: [input.cells[0], { ...input.cells[1], bounds: { ...input.cells[1].bounds, widthMm: 600 } }],
      })
    ).toMatchObject({ code: 'INCONSISTENT_GEOMETRY', field: 'cells' });
  });

  it('rejects invalid grid coordinates and spans', () => {
    const input = validInput();
    expect(
      captureContractError({ ...input, cells: [{ ...input.cells[0], row: -1 }] })
    ).toMatchObject({ code: 'INVALID_CELL', field: 'cells[0].row' });
    expect(
      captureContractError({ ...input, cells: [{ ...input.cells[0], colSpan: 0 }] })
    ).toMatchObject({ code: 'INVALID_CELL', field: 'cells[0].colSpan' });
  });

  it('rejects system packs without approved revision evidence', () => {
    const input = validInput();
    expect(
      captureContractError({
        ...input,
        systemPack: { ...input.systemPack, evidenceStatus: 'approved', approvalId: '' },
      })
    ).toMatchObject({ code: 'UNAPPROVED_SYSTEM', field: 'systemPack' });
    expect(
      captureContractError({ ...input, systemPack: { ...input.systemPack, revision: 0 } })
    ).toMatchObject({ code: 'UNAPPROVED_SYSTEM', field: 'systemPack.revision' });
  });

  it('rejects missing, duplicate, or invalid approved profiles', () => {
    const input = validInput();
    expect(captureContractError({ ...input, profiles: [] })).toMatchObject({
      code: 'UNAPPROVED_PROFILE',
      field: 'profiles',
    });
    expect(
      captureContractError({
        ...input,
        profiles: [input.profiles[0], { ...input.profiles[1], role: input.profiles[0].role }],
      })
    ).toMatchObject({ code: 'UNAPPROVED_PROFILE', field: 'profiles[1].role' });
    expect(
      captureContractError({
        ...input,
        profiles: [{ ...input.profiles[0], stockLengthMm: Number.POSITIVE_INFINITY }],
      })
    ).toMatchObject({ code: 'INVALID_DIMENSION', field: 'profiles[0].stockLengthMm' });
  });

  it('rejects absent, duplicate, stale, or unapproved manufacturing rules', () => {
    const input = validInput();
    expect(captureContractError({ ...input, cuttingRules: [] })).toMatchObject({
      code: 'UNAPPROVED_RULE',
      field: 'cuttingRules',
    });
    expect(
      captureContractError({
        ...input,
        cuttingRules: [input.cuttingRules[0], { ...input.cuttingRules[1], ruleId: input.cuttingRules[0].ruleId }],
      })
    ).toMatchObject({ code: 'UNAPPROVED_RULE', field: 'cuttingRules' });
    expect(
      captureContractError({ ...input, toleranceRule: { ...input.toleranceRule, revision: 0 } })
    ).toMatchObject({ code: 'UNAPPROVED_RULE', field: 'toleranceRule.revision' });
    expect(
      captureContractError({ ...input, toleranceRule: { ...input.toleranceRule, approvalId: '' } })
    ).toMatchObject({ code: 'UNAPPROVED_RULE', field: 'toleranceRule' });
  });

  it('requires one approved glazing selection for every non-empty cell', () => {
    const input = validInput();
    expect(captureContractError({ ...input, glazingSelections: input.glazingSelections.slice(0, 1) })).toMatchObject({
      code: 'INVALID_GLAZING',
      field: 'glazingSelections',
    });
    expect(
      captureContractError({
        ...input,
        glazingSelections: input.glazingSelections.map((selection) => ({ ...selection, sourceCellId: 'unknown' })),
      })
    ).toMatchObject({ code: 'INVALID_GLAZING', field: 'glazingSelections[0].sourceCellId' });
  });

  it('requires selected hardware or an approved not-required rule', () => {
    const input = validInput();
    expect(
      captureContractError({ ...input, hardware: { mode: 'selected', selections: [] } })
    ).toMatchObject({ code: 'INVALID_HARDWARE', field: 'hardware.selections' });

    const contract = createManufacturingDesignContract({
      ...input,
      hardware: {
        mode: 'not_required',
        rule: { ruleId: 'fixed-no-hardware', revision: 1, evidenceStatus: 'approved', approvalId: 'no-hardware-1' },
      },
    });
    expect(contract.hardware.mode).toBe('not_required');
  });

  it('creates a separately labelled preview that is never manufacturing eligible', () => {
    const input = validInput();
    const preview = createManufacturingPreviewContract({
      identity: input.identity,
      overallWidthMm: input.overallWidthMm,
      overallHeightMm: input.overallHeightMm,
      quantity: input.quantity,
      cells: input.cells,
    });
    expect(preview).toMatchObject({
      schema: 'almona.manufacturing-preview-contract',
      outputClassification: 'estimate_only',
      manufacturingEligible: false,
    });
    expect('systemPack' in preview).toBe(false);
  });

  it('serializes equivalent contracts canonically regardless of input array order', () => {
    const input = validInput();
    const canonical = createManufacturingDesignContract(input);
    const reordered = createManufacturingDesignContract({
      ...input,
      cells: [...input.cells].reverse(),
      profiles: [...input.profiles].reverse(),
      cuttingRules: [...input.cuttingRules].reverse(),
      glazingSelections: [...input.glazingSelections].reverse(),
      hardware: input.hardware.mode === 'selected'
        ? { mode: 'selected', selections: [...input.hardware.selections].reverse() }
        : input.hardware,
    });
    expect(serializeManufacturingDesignContract(reordered)).toBe(
      serializeManufacturingDesignContract(canonical)
    );
  });

  it.each(FP028_ACCEPTANCE_FIXTURES)('replays $id deterministically', (fixture) => {
    const colOffsets = fixture.grid.colWidths?.map((_, index, widths) =>
      widths.slice(0, index).reduce((sum, width) => sum + width, 0)
    ) ?? [];
    const rowOffsets = fixture.grid.rowHeights?.map((_, index, heights) =>
      heights.slice(0, index).reduce((sum, height) => sum + height, 0)
    ) ?? [];
    const cells = fixture.grid.cells.map((cell) => ({
      ...cell,
      bounds: {
        xMm: colOffsets[cell.col],
        yMm: rowOffsets[cell.row],
        widthMm: fixture.grid.colWidths?.slice(cell.col, cell.col + (cell.colSpan ?? 1))
          .reduce((sum, width) => sum + width, 0) ?? 0,
        heightMm: fixture.grid.rowHeights?.slice(cell.row, cell.row + (cell.rowSpan ?? 1))
          .reduce((sum, height) => sum + height, 0) ?? 0,
      },
    }));
    const base = validInput();
    const contract = createManufacturingDesignContract({
      ...base,
      identity: fixture.identity,
      overallWidthMm: fixture.overallWidthMm,
      overallHeightMm: fixture.overallHeightMm,
      quantity: fixture.quantity,
      cells,
      systemPack: { ...base.systemPack, id: fixture.systemPackId },
      glazingSelections: cells.filter((cell) => cell.type !== 'empty').map((cell) => ({
        sourceCellId: cell.id,
        glazingId: 'fixture-glazing',
        revision: 1,
        evidenceStatus: 'approved' as const,
        approvalId: `fixture-glazing-${cell.id}`,
      })),
      hardware: {
        mode: 'not_required',
        rule: { ruleId: 'fixture-hardware-rule', revision: 1, evidenceStatus: 'approved', approvalId: 'fixture-only' },
      },
    });
    const serialized = serializeManufacturingDesignContract(contract);
    const replayed = replayManufacturingDesignContract(serialized);
    expect(replayed).toEqual(contract);
    expect(serializeManufacturingDesignContract(replayed)).toBe(serialized);
  });

  it('fails closed when replay input is malformed or has extra fields', () => {
    expect(() => replayManufacturingDesignContract('{"schema":"wrong"}')).toThrowError(
      ManufacturingContractError
    );
    const parsed = JSON.parse(serializeManufacturingDesignContract(createManufacturingDesignContract(validInput()))) as Record<string, unknown>;
    parsed.untrusted = true;
    expect(() => replayManufacturingDesignContract(JSON.stringify(parsed))).toThrowError(
      ManufacturingContractError
    );
  });

  it.each([
    ['overallWidthMm', 0],
    ['overallWidthMm', -1],
    ['overallWidthMm', Number.NaN],
    ['overallWidthMm', Number.POSITIVE_INFINITY],
    ['overallHeightMm', 0],
    ['overallHeightMm', Number.NEGATIVE_INFINITY],
  ] as const)('rejects invalid dimension %s=%s', (field, value) => {
    const input = { ...validInput(), [field]: value };
    expect(captureContractError(input)).toMatchObject({ code: 'INVALID_DIMENSION', field });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid quantity %s',
    (quantity) => {
      expect(captureContractError({ ...validInput(), quantity })).toMatchObject({
        code: 'INVALID_QUANTITY',
        field: 'quantity',
      });
    }
  );
});

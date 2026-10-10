import { describe, expect, it } from 'vitest';
import {
  ManufacturingAuthorityResolutionError,
  parseManufacturingAuthorityRpcRow,
  type ManufacturingAuthorityRpcRow,
} from '../ManufacturingAuthorityResolver';

const approvalId = '41000000-0000-0000-0000-000000000001';
const row = (): ManufacturingAuthorityRpcRow => ({
  project_id: 'project-a',
  position_id: 'position-a',
  position_source: 'v2',
  position_revision: 7,
  authority_approval_id: approvalId,
  system_pack_id: 'rock60',
  system_pack_revision: 1,
  authority_payload: {
    schema: 'almona.manufacturing-authority',
    schemaVersion: 1,
    system: { id: 'rock60', version: '1' },
    systemPack: { id: 'rock60', revision: 1, evidenceStatus: 'approved', approvalId },
    profiles: [
      { role: 'frame', profileId: 'R60-F', stockLengthMm: 6000, evidenceStatus: 'approved', approvalId: '51000000-0000-0000-0000-000000000001' },
      { role: 'sash', profileId: 'R60-S', stockLengthMm: 6000, evidenceStatus: 'approved', approvalId: '51000000-0000-0000-0000-000000000002' },
    ],
    cuttingRules: [
      {
        ruleId: 'cut',
        revision: 1,
        evidenceStatus: 'approved',
        approvalId: '61000000-0000-0000-0000-000000000001',
        deductions: { endDeductionMm: 20 },
        allowances: { weldMm: 3 },
        applicability: { materials: ['aluminum'] },
      },
    ],
    toleranceRule: { ruleId: 'tol', revision: 1, evidenceStatus: 'approved', approvalId: '61000000-0000-0000-0000-000000000002' },
    manufacturingSettings: { sawKerfMm: 4, trimCutMm: 0 },
  },
});

describe('FP-028 / P4.5 manufacturing authority resolver', () => {
  it('accepts one exact position/revision/system/approval response', () => {
    const resolved = parseManufacturingAuthorityRpcRow(row(), { positionId: 'position-a', revision: 7 });
    expect(resolved.authorityApprovalId).toBe(approvalId);
    expect(resolved.systemPack).toMatchObject({ id: 'rock60', revision: 1 });
    expect(resolved.profiles.map((profile) => profile.role)).toEqual(['frame', 'sash']);
    expect(resolved.manufacturingSettings).toEqual({ sawKerfMm: 4, trimCutMm: 0 });
    expect(resolved.cuttingRules[0]?.deductions).toEqual({ endDeductionMm: 20 });
  });

  it('rejects authority missing manufacturingSettings', () => {
    const payload = { ...row().authority_payload };
    delete (payload as { manufacturingSettings?: unknown }).manufacturingSettings;
    expect(() =>
      parseManufacturingAuthorityRpcRow(
        { ...row(), authority_payload: payload },
        { positionId: 'position-a', revision: 7 },
      ),
    ).toThrowError(ManufacturingAuthorityResolutionError);
  });

  it.each([
    { patch: { position_id: 'position-b' }, label: 'position' },
    { patch: { position_revision: 8 }, label: 'revision' },
    { patch: { system_pack_id: 'other' }, label: 'system' },
    { patch: { authority_approval_id: '41000000-0000-0000-0000-000000000002' }, label: 'approval' },
  ])('rejects mismatched $label identity', ({ patch }) => {
    expect(() => parseManufacturingAuthorityRpcRow({ ...row(), ...patch }, {
      positionId: 'position-a', revision: 7,
    })).toThrowError(ManufacturingAuthorityResolutionError);
  });

  it('rejects unapproved or structurally incomplete authority payloads', () => {
    const invalid: ManufacturingAuthorityRpcRow = {
      ...row(),
      authority_payload: { ...row().authority_payload, profiles: [] },
    };
    try {
      parseManufacturingAuthorityRpcRow(invalid, { positionId: 'position-a', revision: 7 });
      throw new Error('Expected invalid authority rejection.');
    } catch (error: unknown) {
      expect(error).toMatchObject({ code: 'INVALID_AUTHORITY', blocking: true });
    }
  });
});

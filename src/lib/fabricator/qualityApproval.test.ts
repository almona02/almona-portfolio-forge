import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: mocks.rpc, from: vi.fn() } }));

import { approveQualityControl, type QualityEvidence } from './qualityApproval';

const evidence: QualityEvidence = {
  checks: { measurements: true, design: true, model: true, optimization: true, materials: true, commands: true, documents: true },
  measurements: { width: { actualMm: 1200 }, height: { actualMm: 1401 } },
  notes: 'Dimensions verified',
};

describe('quality approval persistence boundary', () => {
  beforeEach(() => mocks.rpc.mockReset());

  it('does not acknowledge a persistence failure', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'transaction failed' } });
    await expect(approveQualityControl('position-1', 3, evidence, 'retry-key')).rejects.toThrow('transaction failed');
  });

  it('returns the server-bound inspector and revision acknowledgement', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ approval_id: 'approval-1', project_id: 'project-1', position_id: 'position-1', revision: 3, inspector_id: 'user-1', approved_at: '2026-09-26T00:00:00Z' }], error: null });
    await expect(approveQualityControl('position-1', 3, evidence, 'retry-key')).resolves.toMatchObject({ approvalId: 'approval-1', inspectorId: 'user-1', revision: 3 });
    expect(mocks.rpc).toHaveBeenCalledWith('approve_fabricator_quality_control', expect.objectContaining({ p_expected_revision: 3, p_idempotency_key: 'retry-key' }));
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}))

import {
  getVisitChecklistWorkspace,
  isChecklistStaleRevision,
  recordVisitChecklistAnswer,
} from './serviceVisitChecklistApi'

describe('serviceVisitChecklistApi', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('calls workspace and record RPCs with frozen arg names', async () => {
    rpcMock.mockResolvedValue({ data: { has_active_pin: true, checklist_revision: 0 }, error: null })
    await getVisitChecklistWorkspace('v1')
    expect(rpcMock).toHaveBeenCalledWith('get_visit_checklist_workspace', {
      p_visit_id: 'v1',
      p_actor_id: null,
    })
    await recordVisitChecklistAnswer({
      visitId: 'v1',
      itemKey: 'sg1',
      outcome: 'passed',
      expectedChecklistRevision: 0,
    })
    expect(rpcMock).toHaveBeenCalledWith('record_visit_checklist_answer', {
      p_visit_id: 'v1',
      p_item_key: 'sg1',
      p_outcome: 'passed',
      p_expected_checklist_revision: 0,
      p_value: null,
      p_unit: null,
      p_evidence_paths: null,
      p_note: null,
      p_actor_id: null,
    })
  })

  it('maps PT409 + routine_checklist_stale_revision to 409', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        message: 'Stale checklist revision',
        code: 'PT409',
        details: 'routine_checklist_stale_revision',
      },
    })
    await expect(
      recordVisitChecklistAnswer({
        visitId: 'v',
        itemKey: 'x',
        outcome: 'passed',
        expectedChecklistRevision: 1,
      }),
    ).rejects.toMatchObject({
      status: 409,
      detailCode: 'routine_checklist_stale_revision',
    })
    try {
      await recordVisitChecklistAnswer({
        visitId: 'v',
        itemKey: 'x',
        outcome: 'passed',
        expectedChecklistRevision: 1,
      })
    } catch (e) {
      expect(isChecklistStaleRevision(e)).toBe(true)
    }
  })

  it('maps authz DETAIL to 403', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        message: 'denied',
        code: '42501',
        details: 'routine_checklist_authz_denied',
      },
    })
    await expect(getVisitChecklistWorkspace('v')).rejects.toMatchObject({
      status: 403,
      detailCode: 'routine_checklist_authz_denied',
    })
  })
})

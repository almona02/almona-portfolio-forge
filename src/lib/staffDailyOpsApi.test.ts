const rpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
  },
}))

import {
  STAFF_DAILY_OPS_DETAIL_CODES,
  getStaffDailyOpsWorkspace,
} from './staffDailyOpsApi'

describe('staffDailyOpsApi', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('exposes frozen authz detail code', () => {
    expect(STAFF_DAILY_OPS_DETAIL_CODES).toContain('staff_daily_ops_authz_denied')
  })

  it('getStaffDailyOpsWorkspace maps RPC args and payload', async () => {
    const payload = {
      as_of: '2026-11-19',
      overdue_occurrences: { count: 0, items: [] },
      unassigned_jobs: { count: 0, items: [] },
      jobs_awaiting_review: { count: 0, items: [] },
      awaiting_customer: { count: 0, items: [] },
    }
    rpc.mockResolvedValue({ data: payload, error: null })
    const row = await getStaffDailyOpsWorkspace({ asOf: '2026-11-19' })
    expect(row.as_of).toBe('2026-11-19')
    expect(rpc).toHaveBeenCalledWith('get_staff_daily_ops_workspace', {
      p_as_of: '2026-11-19',
      p_actor_id: null,
    })
  })

  it('maps staff_daily_ops_authz_denied to 403 (never empty success)', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'Not permitted', code: '42501', details: 'staff_daily_ops_authz_denied' },
    })
    await expect(getStaffDailyOpsWorkspace()).rejects.toMatchObject({
      status: 403,
      detailCode: 'staff_daily_ops_authz_denied',
    })
  })
})

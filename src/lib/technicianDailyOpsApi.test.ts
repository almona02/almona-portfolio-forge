import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}))

import {
  getTechnicianDailyOpsWorkspace,
  resolveTechnicianTicketFocus,
} from './technicianDailyOpsApi'

describe('technicianDailyOpsApi', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('calls get_technician_daily_ops_workspace read-only', async () => {
    rpcMock.mockResolvedValue({
      data: {
        as_of: '2026-03-15',
        window_end: '2026-03-22',
        timezone: 'Africa/Cairo',
        assigned_jobs: { count: 0, items: [] },
        upcoming_visits: { count: 0, items: [] },
        needs_attention: { count: 0, items: [] },
      },
      error: null,
    })
    const ws = await getTechnicianDailyOpsWorkspace()
    expect(rpcMock).toHaveBeenCalledWith('get_technician_daily_ops_workspace', {
      p_as_of: null,
      p_actor_id: null,
    })
    expect(ws.assigned_jobs.count).toBe(0)
  })

  it('maps authz denial to 403', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        message: 'Not permitted',
        code: '42501',
        details: 'technician_daily_ops_authz_denied',
      },
    })
    await expect(getTechnicianDailyOpsWorkspace()).rejects.toMatchObject({
      status: 403,
      detailCode: 'technician_daily_ops_authz_denied',
    })
  })

  it('resolveTechnicianTicketFocus returns focused=false on rpc error without leaking', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'boom', code: 'XX000', details: null },
    })
    await expect(
      resolveTechnicianTicketFocus({ ticketId: 't1', jobId: 'j1', visitId: 'v1', panel: 'report' }),
    ).resolves.toEqual({ focused: false })
  })
})

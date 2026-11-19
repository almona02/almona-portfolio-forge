import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpc(...a),
  },
}))

import {
  getCustomerDailyOpsWorkspace,
  resolveCustomerTicketFocus,
} from './customerDailyOpsApi'

describe('customerDailyOpsApi (DO-3)', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('maps authz deny to 403 with detail code', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        message: 'Not permitted',
        code: '42501',
        details: 'customer_daily_ops_authz_denied',
      },
    })
    await expect(getCustomerDailyOpsWorkspace()).rejects.toMatchObject({
      status: 403,
      detailCode: 'customer_daily_ops_authz_denied',
    })
  })

  it('returns workspace payload from rpc', async () => {
    const payload = {
      as_of: '2026-03-15',
      timezone: 'Africa/Cairo',
      active_tickets: { count: 0, items: [] },
      issued_reports: { count: 1, items: [{ revision_id: 'r1' }] },
      awaiting_acknowledgment: { count: 1, items: [{ revision_id: 'r1' }] },
      upcoming_service: { count: 0, items: [] },
    }
    rpc.mockResolvedValue({ data: payload, error: null })
    await expect(getCustomerDailyOpsWorkspace({ asOf: '2026-03-15' })).resolves.toEqual(payload)
    expect(rpc).toHaveBeenCalledWith('get_customer_daily_ops_workspace', {
      p_as_of: '2026-03-15',
      p_actor_id: null,
    })
  })

  it('focus resolver returns focused=false on error (no disclosure)', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } })
    await expect(
      resolveCustomerTicketFocus({ ticketId: 't1', panel: 'issued', revisionId: 'rev' }),
    ).resolves.toEqual({ focused: false })
  })
})

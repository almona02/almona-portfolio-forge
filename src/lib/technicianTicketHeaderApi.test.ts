import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}))

import { getTechnicianTicketHeader } from './technicianTicketHeaderApi'

describe('technicianTicketHeaderApi', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('calls get_technician_ticket_header with ticket id', async () => {
    rpcMock.mockResolvedValue({
      data: {
        id: 't1',
        ticket_number: 'T-1',
        title: 'Title',
        status: 'assigned',
        priority: 'high',
        type: 'maintenance',
        description: 'desc',
        machine_id: null,
        machine_serial_number: null,
        site_location: null,
        created_at: '2026-01-01T00:00:00Z',
        maintenance_type: 'preventive',
      },
      error: null,
    })
    const row = await getTechnicianTicketHeader('t1')
    expect(rpcMock).toHaveBeenCalledWith('get_technician_ticket_header', { p_ticket_id: 't1' })
    expect(row?.id).toBe('t1')
    expect(row).not.toHaveProperty('contact_email')
  })

  it('returns null when RPC yields null (deny/empty)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    await expect(getTechnicianTicketHeader('t-x')).resolves.toBeNull()
  })
})

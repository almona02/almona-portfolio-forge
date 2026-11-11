import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from, rpc, recordServiceEvent } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  recordServiceEvent: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from, rpc, auth: { getUser: vi.fn() } },
}))

vi.mock('@/lib/ticketing/serviceEventLedger', () => ({
  recordServiceEvent,
}))

vi.mock('@/lib/ticketGovernanceApi', () => ({
  governTicketAssign: vi.fn(),
}))

import { governedCreateTicket, retryLinkTicketMachine } from './TicketGovernanceService'
import { governTicketAssign } from '@/lib/ticketGovernanceApi'

function ticketInsertMock(ticketId: string) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: ticketId,
            ticket_number: 'TKT-1',
            status: 'open',
            assigned_to: null,
            type: 'general',
            priority: 'medium',
          },
          error: null,
        }),
      }),
    }),
  }
}

/** profiles select chain that supports both role-by-id and candidates-by-role. */
function profilesMock(opts: { actorRole: string | null; candidateIds?: string[] }) {
  return {
    select: vi.fn().mockImplementation((cols: string) => {
      if (cols === 'role') {
        return {
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: opts.actorRole ? { role: opts.actorRole } : null,
              error: null,
            }),
          }),
        }
      }
      // select('id') for assignee candidates
      return {
        eq: vi.fn().mockResolvedValue({
          data: (opts.candidateIds ?? []).map((id) => ({ id })),
          error: null,
        }),
      }
    }),
  }
}

function activeCountsMock() {
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  recordServiceEvent.mockResolvedValue({ ok: true })
  rpc.mockResolvedValue({ data: null, error: null })
})

describe('governedCreateTicket auto-assignment', () => {
  it('omits client ticket_number so the DB trigger allocates server-side', async () => {
    const insert = ticketInsertMock('cust-ticket')
    from.mockImplementation((table: string) => {
      if (table === 'service_tickets') return insert
      if (table === 'profiles') {
        return profilesMock({ actorRole: 'customer', candidateIds: ['tech-1'] })
      }
      return activeCountsMock()
    })

    await governedCreateTicket(
      { title: 'Issue', description: 'enough text here', type: 'general', priority: 'medium' } as never,
      'cust-1',
      'cust-1',
    )

    expect(insert.insert).toHaveBeenCalledTimes(1)
    const payload = insert.insert.mock.calls[0][0][0] as Record<string, unknown>
    expect(payload).not.toHaveProperty('ticket_number')
    expect(payload.title).toBe('Issue')
  })

  it('returns created ticket unassigned when customer cannot assign (even if staff profiles are visible)', async () => {
    const insert = ticketInsertMock('cust-ticket')
    from.mockImplementation((table: string) => {
      if (table === 'service_tickets') return insert
      if (table === 'profiles') {
        return profilesMock({ actorRole: 'customer', candidateIds: ['tech-1', 'tech-2'] })
      }
      return activeCountsMock()
    })

    const result = await governedCreateTicket(
      { title: 'Issue', description: 'd', type: 'general', priority: 'medium' } as never,
      'cust-1',
      'cust-1',
    )

    expect(result.row.id).toBe('cust-ticket')
    expect(result.assignment).toEqual({ status: 'unassigned', reason: 'not_authorized' })
    expect(governTicketAssign).not.toHaveBeenCalled()
  })

  it('returns created ticket unassigned on assign authorization denial without failing create', async () => {
    const insert = ticketInsertMock('admin-ticket')
    from.mockImplementation((table: string) => {
      if (table === 'service_tickets') {
        // insert path first; later active-count queries also hit service_tickets
        if (insert.insert.mock.calls.length === 0) return insert
        return activeCountsMock()
      }
      if (table === 'profiles') {
        return profilesMock({ actorRole: 'admin', candidateIds: ['tech-1'] })
      }
      return activeCountsMock()
    })
    vi.mocked(governTicketAssign).mockRejectedValue(
      new Error('42501: Only admin/support may assign tickets'),
    )

    const result = await governedCreateTicket(
      { title: 'Issue', description: 'd', type: 'general', priority: 'medium' } as never,
      'admin-1',
      'admin-1',
    )

    expect(result.row.id).toBe('admin-ticket')
    expect(result.assignment.status).toBe('unassigned')
    if (result.assignment.status === 'unassigned') {
      expect(result.assignment.reason).toBe('assign_denied')
    }
  })

  it('rethrows unexpected assignment errors after successful insert', async () => {
    const insert = ticketInsertMock('admin-ticket-2')
    from.mockImplementation((table: string) => {
      if (table === 'service_tickets') {
        if (insert.insert.mock.calls.length === 0) return insert
        return activeCountsMock()
      }
      if (table === 'profiles') {
        return profilesMock({ actorRole: 'admin', candidateIds: ['tech-1'] })
      }
      return activeCountsMock()
    })
    vi.mocked(governTicketAssign).mockRejectedValue(new Error('connection reset'))

    await expect(
      governedCreateTicket(
        { title: 'Issue', description: 'd', type: 'general', priority: 'medium' } as never,
        'admin-1',
        'admin-1',
      ),
    ).rejects.toThrow(/connection reset/)
  })
})

describe('governedCreateTicket machine_id link', () => {
  it('links via link_ticket_machine RPC after create', async () => {
    const insert = ticketInsertMock('link-ticket')
    from.mockImplementation((table: string) => {
      if (table === 'service_tickets') return insert
      if (table === 'profiles') return profilesMock({ actorRole: 'customer' })
      return activeCountsMock()
    })
    rpc.mockResolvedValue({
      data: { id: 'link-ticket', machine_id: 'mach-1', ticket_number: 'TKT-1' },
      error: null,
    })

    const result = await governedCreateTicket(
      {
        title: 'Issue',
        description: 'enough text here',
        type: 'general',
        priority: 'medium',
        machine_id: 'mach-1',
      } as never,
      'cust-1',
      'cust-1',
    )

    expect(rpc).toHaveBeenCalledWith('link_ticket_machine', {
      p_ticket_id: 'link-ticket',
      p_machine_id: 'mach-1',
    })
    expect(result.row.machine_id).toBe('mach-1')
    expect(result.machineLink).toEqual({ status: 'linked', machineId: 'mach-1' })
  })

  it('keeps created ticket identity when machine link is denied (no unauthorized link)', async () => {
    const insert = ticketInsertMock('deny-ticket')
    from.mockImplementation((table: string) => {
      if (table === 'service_tickets') return insert
      if (table === 'profiles') return profilesMock({ actorRole: 'customer' })
      return activeCountsMock()
    })
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'Not authorized for machine' },
    })

    const result = await governedCreateTicket(
      {
        title: 'Issue',
        description: 'enough text here',
        type: 'general',
        priority: 'medium',
        machine_id: 'foreign-mach',
      } as never,
      'cust-1',
      'cust-1',
    )

    expect(result.row.id).toBe('deny-ticket')
    expect(result.row.machine_id).toBeUndefined()
    expect(result.machineLink.status).toBe('unlinked')
    if (result.machineLink.status === 'unlinked' && result.machineLink.reason !== 'not_requested') {
      expect(result.machineLink.reason).toBe('link_denied')
      expect(result.machineLink.retryable).toBe(true)
      expect(result.machineLink.machineId).toBe('foreign-mach')
      expect(result.machineLink.warning).toMatch(/Ticket was created/)
    }
    expect(insert.insert).toHaveBeenCalledTimes(1)
  })

  it('keeps created ticket identity on unexpected link failure', async () => {
    const insert = ticketInsertMock('fail-ticket')
    from.mockImplementation((table: string) => {
      if (table === 'service_tickets') return insert
      if (table === 'profiles') return profilesMock({ actorRole: 'customer' })
      return activeCountsMock()
    })
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'connection reset' },
    })

    const result = await governedCreateTicket(
      {
        title: 'Issue',
        description: 'enough text here',
        type: 'general',
        priority: 'medium',
        machine_id: 'mach-2',
      } as never,
      'cust-1',
      'cust-1',
    )

    expect(result.row.id).toBe('fail-ticket')
    expect(result.machineLink.status).toBe('unlinked')
    if (result.machineLink.status === 'unlinked' && result.machineLink.reason !== 'not_requested') {
      expect(result.machineLink.reason).toBe('link_failed')
      expect(result.machineLink.retryable).toBe(true)
    }
  })

  it('allows legacy free-text tickets without machine_id', async () => {
    const insert = ticketInsertMock('legacy-ticket')
    from.mockImplementation((table: string) => {
      if (table === 'service_tickets') return insert
      if (table === 'profiles') return profilesMock({ actorRole: 'customer' })
      return activeCountsMock()
    })

    const result = await governedCreateTicket(
      {
        title: 'Issue',
        description: 'enough text here',
        type: 'general',
        priority: 'medium',
        machine_serial_number: 'FREE-TEXT-1',
      } as never,
      'cust-1',
      'cust-1',
    )

    expect(rpc).not.toHaveBeenCalled()
    expect(result.row.id).toBe('legacy-ticket')
    expect(result.machineLink).toEqual({ status: 'unlinked', reason: 'not_requested' })
  })
})

describe('retryLinkTicketMachine', () => {
  it('retries link against the original ticket without inserting another ticket', async () => {
    from.mockImplementation(() => {
      throw new Error('retry path must not insert tickets')
    })
    rpc.mockResolvedValue({
      data: { id: 'deny-ticket', machine_id: 'mach-1', ticket_number: 'TKT-1' },
      error: null,
    })

    const result = await retryLinkTicketMachine('deny-ticket', 'mach-1')

    expect(rpc).toHaveBeenCalledWith('link_ticket_machine', {
      p_ticket_id: 'deny-ticket',
      p_machine_id: 'mach-1',
    })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      status: 'linked',
      ticketId: 'deny-ticket',
      machineId: 'mach-1',
      row: { id: 'deny-ticket', machine_id: 'mach-1', ticket_number: 'TKT-1' },
    })
  })
})

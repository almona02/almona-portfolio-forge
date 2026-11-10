import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from, recordServiceEvent } = vi.hoisted(() => ({
  from: vi.fn(),
  recordServiceEvent: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from, auth: { getUser: vi.fn() } },
}))

vi.mock('@/lib/ticketing/serviceEventLedger', () => ({
  recordServiceEvent,
}))

vi.mock('@/lib/ticketGovernanceApi', () => ({
  governTicketAssign: vi.fn(),
}))

import { governedCreateTicket } from './TicketGovernanceService'
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
})

describe('governedCreateTicket auto-assignment', () => {
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

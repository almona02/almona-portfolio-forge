import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  governTicketAssign,
  governTicketBulkAssign,
  governTicketTransition,
} from './ticketGovernanceApi'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }))
vi.mock('@/lib/ticketApi', () => ({
  mapTicket: (row: Record<string, unknown>) => row,
}))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('ticketGovernanceApi', () => {
  it('rejects pending_approval before calling the database', async () => {
    await expect(
      governTicketTransition({ ticketId: 't1', toStatus: 'pending_approval' as never }),
    ).rejects.toThrow(/pending_approval/)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('routes transitions through govern_ticket_transition', async () => {
    rpc.mockResolvedValue({
      data: { id: 't1', status: 'in_progress', ticket_number: 'T-1' },
      error: null,
    })
    await governTicketTransition({ ticketId: 't1', toStatus: 'in_progress', rationale: 'accept' })
    expect(rpc).toHaveBeenCalledWith('govern_ticket_transition', {
      p_ticket_id: 't1',
      p_to_status: 'in_progress',
      p_rationale: 'accept',
      p_resolution_summary: null,
    })
  })

  it('routes assignment through govern_ticket_assign', async () => {
    rpc.mockResolvedValue({
      data: { id: 't1', status: 'assigned', assigned_to: 'tech-1', ticket_number: 'T-1' },
      error: null,
    })
    await governTicketAssign({ ticketId: 't1', assigneeId: 'tech-1' })
    expect(rpc).toHaveBeenCalledWith('govern_ticket_assign', {
      p_ticket_id: 't1',
      p_assignee_id: 'tech-1',
      p_rationale: null,
    })
  })

  it('returns bulk partial-failure payload from govern_ticket_bulk_assign', async () => {
    rpc.mockResolvedValue({
      data: {
        succeeded: ['a'],
        failed: [{ ticket_id: 'b', error: 'boom' }],
        partial: true,
      },
      error: null,
    })
    const result = await governTicketBulkAssign({
      ticketIds: ['a', 'b'],
      assigneeId: 'tech-1',
    })
    expect(result.partial).toBe(true)
    expect(result.succeeded).toEqual(['a'])
    expect(result.failed).toEqual([{ ticket_id: 'b', error: 'boom' }])
  })
})

/**
 * Support ticket-read path: staff use getAllTickets (RLS: owner|assignee|admin|support).
 * Customers use getUserTickets (own rows only). Browser must not broaden access.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

import { getUserTickets } from '@/lib/ticketApi'
import { getAllTickets } from '@/lib/adminTicketApi'

describe('support ticket read paths', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('getUserTickets scopes the query to the caller user_id (customer path)', async () => {
    const eq = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
    })
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq }),
    })
    await getUserTickets('customer-1')
    expect(fromMock).toHaveBeenCalledWith('service_tickets')
    expect(eq).toHaveBeenCalledWith('user_id', 'customer-1')
  })

  it('getAllTickets does not filter by a single customer user_id (staff path; RLS enforces)', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order,
    }
    fromMock.mockImplementation((table: string) => {
      if (table === 'service_tickets') return chain
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }
    })
    await getAllTickets()
    expect(fromMock).toHaveBeenCalledWith('service_tickets')
    // Staff list must not hard-code a customer user_id filter in the client query.
    expect(chain.eq).not.toHaveBeenCalledWith('user_id', expect.anything())
  })
})

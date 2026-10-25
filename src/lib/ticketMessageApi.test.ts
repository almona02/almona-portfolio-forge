import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ticketMessageApi } from './ticketMessageApi'

const { insert, from, rpc } = vi.hoisted(() => ({ insert: vi.fn(), from: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from, rpc } }))

beforeEach(() => {
  vi.resetAllMocks()
  from.mockReturnValue({ insert })
  insert.mockResolvedValue({ error: null })
})

describe('ticket message API query contracts', () => {
  it('preserves attachment evidence and the public message flag', async () => {
    const attachment = { filename: 'machine.jpg', url: 'https://example.test/machine.jpg', size: 42, type: 'image/jpeg' }
    await ticketMessageApi.sendMessage({ ticketId: 'ticket', authorId: 'owner', message: 'Photo evidence', attachments: [attachment] })
    expect(from).toHaveBeenCalledWith('ticket_messages')
    expect(insert).toHaveBeenCalledWith({ ticket_id: 'ticket', author_id: 'owner', message: 'Photo evidence', message_type: 'message', is_internal_note: false, attachments: [attachment] })
  })

  it('propagates rejected message writes', async () => {
    const failure = new Error('Write denied')
    insert.mockResolvedValue({ error: failure })
    await expect(ticketMessageApi.sendMessage({ ticketId: 'ticket', authorId: 'owner', message: 'Evidence' })).rejects.toBe(failure)
  })

  it('returns the RPC payload and propagates invalid share errors', async () => {
    const payload = { ticket: { id: 'ticket' }, messages: [] }
    rpc.mockResolvedValueOnce({ data: payload, error: null })
    await expect(ticketMessageApi.getSharedTicket('valid')).resolves.toBe(payload)
    expect(rpc).toHaveBeenCalledWith('get_shared_ticket', { p_token: 'valid' })
    const failure = new Error('Invalid or expired share link')
    rpc.mockResolvedValueOnce({ data: null, error: failure })
    await expect(ticketMessageApi.getSharedTicket('expired')).rejects.toBe(failure)
  })
})

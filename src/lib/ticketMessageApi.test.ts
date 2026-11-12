import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ticketMessageApi } from './ticketMessageApi'

const { insert, from, rpc, storageFrom, authGetUser } = vi.hoisted(() => ({
  insert: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  storageFrom: vi.fn(),
  authGetUser: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from,
    rpc,
    auth: { getUser: authGetUser },
    storage: { from: storageFrom },
    functions: { invoke: vi.fn() },
  },
}))

beforeEach(() => {
  vi.resetAllMocks()
  from.mockReturnValue({ insert })
  insert.mockResolvedValue({ error: null })
  authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
})

describe('ticket message API query contracts', () => {
  it('stores storage_path and never persists a public URL fallback', async () => {
    const attachment = {
      filename: 'machine.jpg',
      url: 'https://example.test/storage/v1/object/public/ticket-attachments/ticket/machine.jpg',
      size: 42,
      type: 'image/jpeg',
    }
    await ticketMessageApi.sendMessage({
      ticketId: 'ticket',
      authorId: 'owner',
      message: 'Photo evidence',
      attachments: [attachment],
    })
    expect(from).toHaveBeenCalledWith('ticket_messages')
    expect(insert).toHaveBeenCalledWith({
      ticket_id: 'ticket',
      author_id: 'owner',
      message: 'Photo evidence',
      message_type: 'message',
      is_internal_note: false,
      attachments: [
        {
          filename: 'machine.jpg',
          size: 42,
          type: 'image/jpeg',
          storage_path: 'ticket/machine.jpg',
        },
      ],
    })
  })

  it('propagates rejected message writes', async () => {
    const failure = new Error('Write denied')
    insert.mockResolvedValue({ error: failure })
    await expect(
      ticketMessageApi.sendMessage({ ticketId: 'ticket', authorId: 'owner', message: 'Evidence' }),
    ).rejects.toBe(failure)
  })

  it('strips legacy public URLs from shared ticket payloads', async () => {
    const payload = {
      ticket: { id: 'ticket', ticket_number: 'T-1', title: 't', description: 'd', status: 'open', priority: 'medium', type: 'general', machine_serial_number: null, site_location: null, created_at: '', updated_at: '' },
      messages: [
        {
          id: 'm1',
          message: 'hello',
          message_type: 'message',
          created_at: '',
          attachments: [
            {
              filename: 'a.jpg',
              url: 'https://example.test/storage/v1/object/public/ticket-attachments/abc/a.jpg',
              size: 1,
              type: 'image/jpeg',
            },
          ],
        },
      ],
    }
    rpc.mockResolvedValueOnce({ data: payload, error: null })
    const shared = await ticketMessageApi.getSharedTicket('valid-token-value')
    expect(rpc).toHaveBeenCalledWith('get_shared_ticket', { p_token: 'valid-token-value' })
    expect(shared.messages[0].attachments[0].url).toBeUndefined()
    expect(shared.messages[0].attachments[0].storage_path).toBe('abc/a.jpg')
    const failure = new Error('Invalid or expired share link')
    rpc.mockResolvedValueOnce({ data: null, error: failure })
    await expect(ticketMessageApi.getSharedTicket('expired')).rejects.toBe(failure)
  })

  it('revokes shares through the trusted RPC', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    await ticketMessageApi.revokeShare('token-to-revoke-123456')
    expect(rpc).toHaveBeenCalledWith('revoke_ticket_share', { p_token: 'token-to-revoke-123456' })
  })
})

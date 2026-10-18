import { beforeEach, describe, expect, it, vi } from 'vitest'
import { changeAdminUserRole, listAdminUsers } from './adminUsersApi'

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>(),
}))
vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke } } }))

const fallback = 'Admin users service unavailable. Confirm the function and migration are deployed.'
beforeEach(() => { invoke.mockReset() })

describe('admin users API response boundary', () => {
  it('preserves paginated data and request arguments', async () => {
    const page = { users: [], total: 0 }
    invoke.mockResolvedValue({ data: page, error: null })
    await expect(listAdminUsers(2, 'workshop')).resolves.toBe(page)
    expect(invoke).toHaveBeenCalledWith('admin-users', { body: { operation: 'list', page: 2, search: 'workshop' } })
  })

  it('preserves role changes and request arguments', async () => {
    const user = { id: 'user-1', role: 'technician' }
    invoke.mockResolvedValue({ data: user, error: null })
    await expect(changeAdminUserRole('user-1', 'technician')).resolves.toBe(user)
    expect(invoke).toHaveBeenCalledWith('admin-users', { body: { operation: 'change-role', userId: 'user-1', role: 'technician' } })
  })

  it('reports a nonempty server error string', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ error: 'Role change denied' }), { status: 403 }) } })
    await expect(listAdminUsers(1, '')).rejects.toThrow('Role change denied')
  })

  it.each([null, [], { error: 42 }, { error: { message: 'not a string' } }, { error: '' }])(
    'keeps the fallback for an unsupported error payload: %j', async payload => {
      invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify(payload), { status: 403 }) } })
      await expect(listAdminUsers(1, '')).rejects.toThrow(fallback)
    },
  )

  it('keeps the fallback for a non-JSON gateway response', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: new Response('<html>unavailable</html>', { status: 502 }) } })
    await expect(listAdminUsers(1, '')).rejects.toThrow(fallback)
  })

  it('keeps the fallback for transport errors without a response', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('network failure') })
    await expect(listAdminUsers(1, '')).rejects.toThrow(fallback)
  })

  it('rejects an empty successful response', async () => {
    invoke.mockResolvedValue({ data: null, error: null })
    await expect(listAdminUsers(1, '')).rejects.toThrow('Admin users service returned an empty response')
  })
})

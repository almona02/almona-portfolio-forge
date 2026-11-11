import { beforeEach, describe, expect, it, vi } from 'vitest'

const { upload, createSignedUrl, getPublicUrl, from } = vi.hoisted(() => {
  const upload = vi.fn()
  const createSignedUrl = vi.fn()
  const getPublicUrl = vi.fn()
  const from = vi.fn(() => ({ upload, createSignedUrl, getPublicUrl }))
  return { upload, createSignedUrl, getPublicUrl, from }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from },
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}))

import { api } from './api'

beforeEach(() => {
  vi.clearAllMocks()
  from.mockImplementation(() => ({ upload, createSignedUrl, getPublicUrl }))
})

describe('uploadMachinePhoto', () => {
  it('uploads to private machine-photos under the owner folder and returns a signed evidence URL', async () => {
    upload.mockResolvedValue({ error: null })
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.test/signed/plate.png' },
      error: null,
    })

    const file = new File([new Uint8Array([1, 2, 3])], 'plate.png', { type: 'image/png' })
    const url = await api.uploadMachinePhoto(file, 'owner-uid-1', 'unassigned')

    expect(from).toHaveBeenCalledWith('machine-photos')
    expect(upload).toHaveBeenCalledTimes(1)
    const [path, , opts] = upload.mock.calls[0]
    expect(String(path).startsWith('owner-uid-1/')).toBe(true)
    expect(opts).toMatchObject({ upsert: true, contentType: 'image/png' })
    expect(createSignedUrl).toHaveBeenCalled()
    expect(url).toBe('https://example.test/signed/plate.png')
  })

  it('surfaces storage upload failures without inventing an evidence URL', async () => {
    upload.mockResolvedValue({ error: { message: 'Bucket not found' } })

    const file = new File([new Uint8Array([1])], 'plate.png', { type: 'image/png' })
    await expect(api.uploadMachinePhoto(file, 'owner-uid-1', 'unassigned')).rejects.toMatchObject({
      message: 'Bucket not found',
    })
    expect(createSignedUrl).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({
  rpc: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc },
}))

import { registerMachineIdentity } from './registerMachineIdentity'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('registerMachineIdentity missing-serial evidence', () => {
  it('cannot complete without persisted plate-area photo evidence', async () => {
    await expect(
      registerMachineIdentity({
        name: 'No plate',
        model: 'Unknown',
        serial_number: null,
        missing_serial_reason: 'plate_missing_or_illegible',
        photo_urls: null,
      }),
    ).rejects.toThrow(/plate_area_photo_evidence_required/)

    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects blank-only photo_urls as missing evidence', async () => {
    await expect(
      registerMachineIdentity({
        name: 'No plate',
        model: 'Unknown',
        serial_number: '   ',
        missing_serial_reason: 'plate_missing_or_illegible',
        photo_urls: ['  ', ''],
      }),
    ).rejects.toThrow(/plate_area_photo_evidence_required/)

    expect(rpc).not.toHaveBeenCalled()
  })

  it('keeps ALM provisional reference separate from manufacturer serial on success', async () => {
    rpc.mockResolvedValue({
      data: {
        machine_id: 'mach-prov-1',
        idempotent: false,
        identity_review_status: 'clear',
        identity_confidence: 'provisional',
        provisional_asset_ref: 'ALM-000042',
        catalog_link_status: 'uncatalogued',
      },
      error: null,
    })

    const result = await registerMachineIdentity({
      name: 'No plate',
      model: 'Unknown press',
      serial_number: null,
      missing_serial_reason: 'plate_missing_or_illegible',
      photo_urls: ['https://evidence.example/plate.jpg'],
    })

    expect(rpc).toHaveBeenCalledWith(
      'register_machine_identity',
      expect.objectContaining({
        p_serial_raw: null,
        p_photo_urls: ['https://evidence.example/plate.jpg'],
        p_missing_serial_reason: 'plate_missing_or_illegible',
      }),
    )
    expect(result.identity_confidence).toBe('provisional')
    expect(result.provisional_asset_ref).toBe('ALM-000042')
    expect(result.provisional_asset_ref).not.toMatch(/^YM-/i)
  })
})

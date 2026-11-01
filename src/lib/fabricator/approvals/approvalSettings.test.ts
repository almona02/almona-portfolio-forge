/**
 * Admin-confirmed kerf / trim / stock at manufacturing approval.
 * AICS-001: values are validated before they can become authority; the
 * server still fails closed when manufacturingSettings is missing.
 */
import { describe, expect, it } from 'vitest'
import {
  APPROVAL_SETTING_LIMITS,
  DEFAULT_APPROVAL_SETTINGS,
  approvalSettingsFromTuning,
  buildRequestAuthorityPayload,
  draftFromSettings,
  resolveApprovalSettings,
  validateApprovalSettings,
} from './approvalSettings'
import { VENDOR_AUTHORITY_DEFAULT_SETTINGS, buildVendorAuthorityPayload, VENDOR_CATALOGUE_PACKS } from '@/lib/fabricator/manufacturing/vendorCataloguePacks'

describe('validateApprovalSettings', () => {
  it('accepts platform defaults', () => {
    const r = validateApprovalSettings(draftFromSettings(DEFAULT_APPROVAL_SETTINGS))
    expect(r.ok).toBe(true)
    expect(r.value).toEqual(DEFAULT_APPROVAL_SETTINGS)
  })

  it('rejects empty, non-numeric and out-of-range values per field', () => {
    const r = validateApprovalSettings({ sawKerfMm: '', trimCutMm: 'abc', stockLengthMm: '500' })
    expect(r.ok).toBe(false)
    expect(r.errors.sawKerfMm).toMatch(/required/)
    expect(r.errors.trimCutMm).toMatch(/required/)
    expect(r.errors.stockLengthMm).toMatch(new RegExp(`${APPROVAL_SETTING_LIMITS.stockLengthMm.min}`))
  })

  it('rejects negative kerf and over-limit trim', () => {
    expect(validateApprovalSettings({ sawKerfMm: -1, trimCutMm: 0, stockLengthMm: 6000 }).errors.sawKerfMm).toMatch(/between/)
    expect(validateApprovalSettings({ sawKerfMm: 4, trimCutMm: 500, stockLengthMm: 6000 }).errors.trimCutMm).toMatch(/between/)
  })
})

describe('workshop tuning pre-fill', () => {
  it('maps fabricator_tuning keys and records provenance per field', () => {
    const partial = approvalSettingsFromTuning([
      { key: 'saw_kerf_mm', value: 3.2 },
      { key: 'bar_end_trim_mm', value: 15 },
      { key: 'yield_margin_pct', value: 5 },
    ])
    expect(partial).toEqual({ sawKerfMm: 3.2, trimCutMm: 15 })
    const resolved = resolveApprovalSettings(partial)
    expect(resolved.settings).toEqual({ sawKerfMm: 3.2, trimCutMm: 15, stockLengthMm: 6000 })
    expect(resolved.source).toEqual({ sawKerfMm: 'workshop', trimCutMm: 'workshop', stockLengthMm: 'platform' })
  })

  it('ignores out-of-range workshop defaults and falls back to platform', () => {
    const resolved = resolveApprovalSettings({ sawKerfMm: 99 })
    expect(resolved.settings.sawKerfMm).toBe(DEFAULT_APPROVAL_SETTINGS.sawKerfMm)
    expect(resolved.source.sawKerfMm).toBe('platform')
  })
})

describe('buildRequestAuthorityPayload', () => {
  const settings = { sawKerfMm: 3.5, trimCutMm: 10, stockLengthMm: 6500 }

  it('carries admin settings into manufacturingSettings and every profile stock length (generic pack)', () => {
    const payload = buildRequestAuthorityPayload('my-pack', 'a0000000-0000-4000-8000-000000000001', settings) as {
      manufacturingSettings: { sawKerfMm: number; trimCutMm: number }
      profiles: Array<{ stockLengthMm: number }>
      systemPack: { id: string; approvalId: string }
      schema: string
    }
    expect(payload.schema).toBe('almona.manufacturing-authority')
    expect(payload.systemPack).toMatchObject({ id: 'my-pack', approvalId: 'a0000000-0000-4000-8000-000000000001' })
    expect(payload.manufacturingSettings).toEqual({ sawKerfMm: 3.5, trimCutMm: 10 })
    expect(payload.profiles.length).toBeGreaterThanOrEqual(2)
    for (const p of payload.profiles) expect(p.stockLengthMm).toBe(6500)
  })

  it('uses the vendor catalogue profile list for built-in packs, with admin settings applied', () => {
    const pack = VENDOR_CATALOGUE_PACKS.find((p) => p.id === 'caluminium-ps')!
    const payload = buildRequestAuthorityPayload(pack.id, 'a0000000-0000-4000-8000-000000000002', settings) as {
      manufacturingSettings: { sawKerfMm: number; trimCutMm: number }
      profiles: Array<{ profileId: string; stockLengthMm: number }>
    }
    expect(payload.profiles.map((p) => p.profileId)).toContain(pack.frameProfileId)
    expect(payload.profiles.length).toBe(2 + (pack.extraProfiles?.length ?? 0))
    expect(payload.manufacturingSettings).toEqual({ sawKerfMm: 3.5, trimCutMm: 10 })
    for (const p of payload.profiles) expect(p.stockLengthMm).toBe(6500)
  })

  it('keeps the one-click vendor defaults aligned with the server payload builder', () => {
    const pack = VENDOR_CATALOGUE_PACKS[1]
    const payload = buildVendorAuthorityPayload(pack, 'a0000000-0000-4000-8000-000000000003', 1) as {
      manufacturingSettings: { sawKerfMm: number; trimCutMm: number }
      profiles: Array<{ stockLengthMm: number }>
    }
    expect(VENDOR_AUTHORITY_DEFAULT_SETTINGS).toEqual({ sawKerfMm: 4, trimCutMm: 0, stockLengthMm: 6000 })
    expect(payload.manufacturingSettings).toEqual({ sawKerfMm: 4, trimCutMm: 0 })
    for (const p of payload.profiles) expect(p.stockLengthMm).toBe(6000)
  })
})

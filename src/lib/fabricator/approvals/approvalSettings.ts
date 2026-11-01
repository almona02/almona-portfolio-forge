/**
 * Admin-editable manufacturing settings confirmed at approval time.
 *
 * AICS-001 / FP-023A: production kerf and trim come ONLY from the approved
 * manufacturing authority payload; the server RPC
 * `authority_machining_settings` fails closed when they are missing. These
 * helpers let the admin review and set those values (plus permitted stock
 * length) before the payload is submitted, instead of a hard-coded 4 / 0 /
 * 6000 buried in the client. Validation runs before the RPC call so an
 * out-of-range value never reaches the authority table.
 */

import type { TuningParam } from '@/lib/fabricatorConfigApi'
import { PLATFORM_MANUFACTURING_DEFAULTS } from '@/lib/fabricator/ManufacturingSettings'
import {
  VENDOR_CATALOGUE_PACKS,
  buildVendorAuthorityPayload,
} from '@/lib/fabricator/manufacturing/vendorCataloguePacks'

export interface ApprovalManufacturingSettings {
  /** Saw blade width per cut (mm). */
  sawKerfMm: number
  /** Bar-end trim reserved during packing (mm). */
  trimCutMm: number
  /** Permitted stock bar length for every approved profile (mm). */
  stockLengthMm: number
}

export type ApprovalSettingKey = keyof ApprovalManufacturingSettings

export interface ApprovalSettingLimit {
  label: string
  unit: 'mm'
  min: number
  max: number
}

export const APPROVAL_SETTING_LIMITS: Record<ApprovalSettingKey, ApprovalSettingLimit> = {
  sawKerfMm: { label: 'Saw kerf', unit: 'mm', min: 0, max: 20 },
  trimCutMm: { label: 'Trim cut', unit: 'mm', min: 0, max: 200 },
  stockLengthMm: { label: 'Stock length', unit: 'mm', min: 1000, max: 13000 },
}

export const APPROVAL_SETTING_KEYS: readonly ApprovalSettingKey[] = ['sawKerfMm', 'trimCutMm', 'stockLengthMm']

/** Platform fallback when the requesting workshop has no tuning defaults. */
export const DEFAULT_APPROVAL_SETTINGS: ApprovalManufacturingSettings = Object.freeze({
  sawKerfMm: PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm,
  trimCutMm: PLATFORM_MANUFACTURING_DEFAULTS.trimCutMm,
  stockLengthMm: 6000,
})

export type ApprovalSettingsDraft = Record<ApprovalSettingKey, string>

export function draftFromSettings(settings: ApprovalManufacturingSettings): ApprovalSettingsDraft {
  return {
    sawKerfMm: String(settings.sawKerfMm),
    trimCutMm: String(settings.trimCutMm),
    stockLengthMm: String(settings.stockLengthMm),
  }
}

export type ApprovalSettingsValidation =
  | { ok: true; value: ApprovalManufacturingSettings; errors: Partial<Record<ApprovalSettingKey, string>> }
  | { ok: false; value: null; errors: Partial<Record<ApprovalSettingKey, string>> }

export function validateApprovalSettings(draft: Partial<Record<ApprovalSettingKey, string | number>>): ApprovalSettingsValidation {
  const errors: Partial<Record<ApprovalSettingKey, string>> = {}
  const value = {} as ApprovalManufacturingSettings
  for (const key of APPROVAL_SETTING_KEYS) {
    const limit = APPROVAL_SETTING_LIMITS[key]
    const raw = draft[key]
    const n = typeof raw === 'number' ? raw : raw === undefined || String(raw).trim() === '' ? NaN : Number(raw)
    if (!Number.isFinite(n)) {
      errors[key] = `${limit.label} is required (number in ${limit.unit}).`
      continue
    }
    if (n < limit.min || n > limit.max) {
      errors[key] = `${limit.label} must be between ${limit.min} and ${limit.max} ${limit.unit}.`
      continue
    }
    value[key] = n
  }
  if (Object.keys(errors).length > 0) return { ok: false, value: null, errors }
  return { ok: true, value, errors }
}

/** Map a workshop's `fabricator_tuning` rows to approval settings (partial). */
export function approvalSettingsFromTuning(rows: readonly Pick<TuningParam, 'key' | 'value'>[]): Partial<ApprovalManufacturingSettings> {
  const out: Partial<ApprovalManufacturingSettings> = {}
  for (const row of rows) {
    const value = Number(row.value)
    if (!Number.isFinite(value)) continue
    if (row.key === 'saw_kerf_mm') out.sawKerfMm = value
    else if (row.key === 'bar_end_trim_mm') out.trimCutMm = value
    else if (row.key === 'stock_length_mm') out.stockLengthMm = value
  }
  return out
}

export type ApprovalSettingsSource = 'workshop' | 'platform'

export interface ResolvedApprovalSettings {
  settings: ApprovalManufacturingSettings
  /** Per-field provenance so the admin sees which values the workshop proposed. */
  source: Record<ApprovalSettingKey, ApprovalSettingsSource>
}

export function resolveApprovalSettings(workshop: Partial<ApprovalManufacturingSettings>): ResolvedApprovalSettings {
  const settings = { ...DEFAULT_APPROVAL_SETTINGS }
  const source = { sawKerfMm: 'platform', trimCutMm: 'platform', stockLengthMm: 'platform' } as Record<ApprovalSettingKey, ApprovalSettingsSource>
  for (const key of APPROVAL_SETTING_KEYS) {
    const candidate = workshop[key]
    if (candidate === undefined) continue
    const check = validateApprovalSettings({ ...DEFAULT_APPROVAL_SETTINGS, [key]: candidate })
    if (check.ok) {
      settings[key] = candidate
      source[key] = 'workshop'
    }
  }
  return { settings, source }
}

/**
 * Build the authority payload for a pending request. Vendor packs reuse the
 * catalogue profile list; unknown packs get the generic frame/sash pair.
 * `settings` must already be validated.
 */
export function buildRequestAuthorityPayload(
  packId: string,
  approvalId: string,
  settings: ApprovalManufacturingSettings,
): Record<string, unknown> {
  const pack = VENDOR_CATALOGUE_PACKS.find((p) => p.id === packId)
  if (pack) {
    return buildVendorAuthorityPayload(pack, approvalId, 1, settings)
  }
  return {
    schema: 'almona.manufacturing-authority',
    schemaVersion: 1,
    system: { id: packId },
    systemPack: {
      id: packId,
      revision: 1,
      evidenceStatus: 'approved',
      approvalId,
    },
    profiles: [
      {
        role: 'frame',
        profileId: `${packId}-FRAME`,
        stockLengthMm: settings.stockLengthMm,
        evidenceStatus: 'approved',
        approvalId: 'b1000000-0000-4000-8000-000000000001',
      },
      {
        role: 'sash',
        profileId: `${packId}-SASH`,
        stockLengthMm: settings.stockLengthMm,
        evidenceStatus: 'approved',
        approvalId: 'b1000000-0000-4000-8000-000000000002',
      },
    ],
    cuttingRules: [
      {
        ruleId: `${packId}-cut`,
        revision: 1,
        evidenceStatus: 'approved',
        approvalId: 'c1000000-0000-4000-8000-000000000001',
        deductions: { endDeductionMm: 20 },
        allowances: { weldMm: 3 },
        applicability: { materials: ['aluminum'] },
      },
    ],
    toleranceRule: {
      ruleId: `${packId}-tolerance`,
      revision: 1,
      evidenceStatus: 'approved',
      approvalId: 'c1000000-0000-4000-8000-000000000002',
    },
    manufacturingSettings: {
      sawKerfMm: settings.sawKerfMm,
      trimCutMm: settings.trimCutMm,
    },
  }
}

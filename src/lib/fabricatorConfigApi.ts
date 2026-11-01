import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/**
 * Workshop configurator data access (Factory Admin / Admin → Manufacturing Config).
 *
 * Every table behind this API is owner-scoped by RLS and has a NOT NULL owner
 * column without a database default (`fabricator_profiles.user_id`,
 * `fabricator_accessories.user_id`, `manufacturing_rules.owner_id`,
 * `fabricator_tuning.owner_id`). Writes therefore MUST carry the signed-in
 * user id; omitting it was the reason every "Add …" / "Save" in the
 * configurator failed silently with a NOT NULL / RLS violation.
 *
 * Tuning values are workshop *defaults*. They pre-fill a manufacturing
 * approval; the approved authority payload stays the only Tier-3 source of
 * kerf / trim (AICS-001, FP-023A). Nothing here bypasses that gate.
 */

export class FabricatorConfigError extends Error {
  constructor(message: string, readonly code: 'NOT_AUTHENTICATED' | 'INVALID_INPUT' = 'INVALID_INPUT') {
    super(message)
    this.name = 'FabricatorConfigError'
  }
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  const id = data?.user?.id
  if (error || !id) {
    throw new FabricatorConfigError('Sign in required to edit workshop configuration.', 'NOT_AUTHENTICATED')
  }
  return id
}

export interface FabricatorProfile {
  id: string
  name: string
  material: 'aluminum' | 'upvc' | 'wood'
  system_brand: string | null
  width: number
  height: number | null
  cost_per_meter: number
  cutting_allowance: number | null
  color: string | null
}

export interface FabricatorAccessory {
  id: string
  name: string
  type: 'hinge' | 'lock' | 'handle' | 'seal' | 'spacer' | 'corner' | 'other'
  unit_price: number
  base_cost: number
  sku: string | null
}

export interface ProfileAccessory {
  accessory: FabricatorAccessory
}

export const ACCESSORY_TYPES = ['hinge', 'lock', 'handle', 'seal', 'spacer', 'corner', 'other'] as const
export const MATERIALS = ['aluminum', 'upvc', 'wood'] as const
export const RULE_TYPES = ['machining', 'assembly', 'cutting', 'quality'] as const

export interface TuningParamDef {
  key: string
  label: string
  unit: string
  min: number
  max: number
  description: string
}

/**
 * Admin-editable workshop defaults. Bounds are sanity limits for saw/profile
 * work, not manufacturing truth — the approval step re-validates.
 */
export const TUNING_PARAM_DEFS: readonly TuningParamDef[] = [
  { key: 'saw_kerf_mm', label: 'Saw kerf', unit: 'mm', min: 0, max: 20, description: 'Blade width lost per cut. Pre-fills the kerf proposed at manufacturing approval.' },
  { key: 'bar_end_trim_mm', label: 'Bar end trim', unit: 'mm', min: 0, max: 200, description: 'Trim reserved at bar ends during packing. Pre-fills the trim proposed at approval.' },
  { key: 'min_remnant_mm', label: 'Min remnant length', unit: 'mm', min: 0, max: 3000, description: 'Offcuts shorter than this are scrap, longer ones return to stock.' },
  { key: 'yield_margin_pct', label: 'Yield margin', unit: '%', min: 0, max: 50, description: 'Extra material margin applied to estimates.' },
]

export function validateTuningValue(key: string, value: unknown): string | null {
  const def = TUNING_PARAM_DEFS.find((d) => d.key === key)
  if (!def) return `Unknown tuning key "${key}".`
  const n = typeof value === 'number' ? value : Number(value)
  if (value === '' || value === null || value === undefined || !Number.isFinite(n)) return `${def.label} must be a number.`
  if (n < def.min || n > def.max) return `${def.label} must be between ${def.min} and ${def.max} ${def.unit}.`
  return null
}

function assertPositiveName(name: string, what: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new FabricatorConfigError(`Enter a ${what} name.`)
  return trimmed
}

function assertNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new FabricatorConfigError(`${label} must be a non-negative number.`)
  return value
}

export const fabricatorConfigApi = {
  async listProfiles(): Promise<FabricatorProfile[]> {
    const { data, error } = await supabase.from('fabricator_profiles').select('*').order('name')
    if (error) throw error
    return (data ?? []) as FabricatorProfile[]
  },

  async createProfile(input: {
    name: string
    material: FabricatorProfile['material']
    system_brand?: string | null
    width: number
    height?: number | null
    cost_per_meter: number
    cutting_allowance?: number | null
  }): Promise<FabricatorProfile> {
    const user_id = await requireUserId()
    const name = assertPositiveName(input.name, 'profile')
    if (!Number.isFinite(input.width) || input.width <= 0) throw new FabricatorConfigError('Width must be greater than 0 mm.')
    assertNonNegative(input.cost_per_meter, 'Cost per metre')
    if (input.cutting_allowance != null) assertNonNegative(input.cutting_allowance, 'Cutting allowance')
    const { data, error } = await db.from('fabricator_profiles').insert({ ...input, name, user_id }).select().single()
    if (error) throw error
    return data as FabricatorProfile
  },

  async deleteProfile(id: string): Promise<void> {
    const { error } = await db.from('fabricator_profiles').delete().eq('id', id)
    if (error) throw error
  },

  async listAccessories(): Promise<FabricatorAccessory[]> {
    const { data, error } = await supabase.from('fabricator_accessories').select('*').order('name')
    if (error) throw error
    return (data ?? []) as FabricatorAccessory[]
  },

  async createAccessory(input: {
    name: string
    type: FabricatorAccessory['type']
    unit_price: number
    base_cost: number
    sku?: string | null
  }): Promise<FabricatorAccessory> {
    const user_id = await requireUserId()
    const name = assertPositiveName(input.name, 'accessory')
    assertNonNegative(input.unit_price, 'Unit price')
    assertNonNegative(input.base_cost, 'Base cost')
    const { data, error } = await db.from('fabricator_accessories').insert({ ...input, name, user_id }).select().single()
    if (error) throw error
    return data as FabricatorAccessory
  },

  async deleteAccessory(id: string): Promise<void> {
    const { error } = await db.from('fabricator_accessories').delete().eq('id', id)
    if (error) throw error
  },

  async listProfileAccessories(profileId: string): Promise<ProfileAccessory[]> {
    const { data, error } = await supabase
      .from('profile_accessory_compatibility')
      .select('accessory:fabricator_accessories(*)')
      .eq('profile_id', profileId)
    if (error) throw error
    return (data ?? []) as ProfileAccessory[]
  },

  async linkAccessory(profileId: string, accessoryId: string): Promise<void> {
    const { error } = await db.from('profile_accessory_compatibility').upsert({ profile_id: profileId, accessory_id: accessoryId }, { onConflict: 'profile_id,accessory_id' })
    if (error) throw error
  },

  async unlinkAccessory(profileId: string, accessoryId: string): Promise<void> {
    const { error } = await db.from('profile_accessory_compatibility').delete().eq('profile_id', profileId).eq('accessory_id', accessoryId)
    if (error) throw error
  },

  async listRules(): Promise<ManufacturingRule[]> {
    const { data, error } = await supabase.from('manufacturing_rules').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ManufacturingRule[]
  },

  async createRule(input: { name: string; rule_type: string; description?: string | null; applies_to?: string | null; details?: Record<string, unknown> }): Promise<void> {
    const owner_id = await requireUserId()
    const name = assertPositiveName(input.name, 'rule')
    if (!(RULE_TYPES as readonly string[]).includes(input.rule_type)) {
      throw new FabricatorConfigError(`Rule type must be one of ${RULE_TYPES.join(', ')}.`)
    }
    const { error } = await db.from('manufacturing_rules').insert({ ...input, name, owner_id })
    if (error) throw error
  },

  /** Approval here is the workshop-rule draft gate; it is NOT manufacturing authority (see Approvals page). */
  async setRuleStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    const approved_by = await requireUserId()
    const { error } = await db.from('manufacturing_rules').update({ status, approved_by, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
  },

  async deleteRule(id: string): Promise<void> {
    const { error } = await db.from('manufacturing_rules').delete().eq('id', id)
    if (error) throw error
  },

  /** Own tuning rows (RLS also returns every owner's rows to platform admins). */
  async listTuning(): Promise<TuningParam[]> {
    const { data, error } = await supabase.from('fabricator_tuning').select('*').order('key')
    if (error) throw error
    return (data ?? []) as TuningParam[]
  },

  /** Tuning rows of one workshop owner — used by admins to pre-fill an approval. */
  async listTuningForOwner(ownerId: string): Promise<TuningParam[]> {
    const { data, error } = await supabase.from('fabricator_tuning').select('*').eq('owner_id', ownerId).order('key')
    if (error) throw error
    return (data ?? []) as TuningParam[]
  },

  async saveTuning(key: string, value: number, unit?: string): Promise<void> {
    const problem = validateTuningValue(key, value)
    if (problem) throw new FabricatorConfigError(problem)
    const owner_id = await requireUserId()
    const def = TUNING_PARAM_DEFS.find((d) => d.key === key)
    const { error } = await db
      .from('fabricator_tuning')
      .upsert(
        { owner_id, key, value, unit: unit ?? def?.unit ?? '', description: def?.description ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'owner_id,key' },
      )
    if (error) throw error
  },

  /**
   * System packs visible to this user: global vendor rows plus own tenant packs.
   * Creating a pack happens in the Custom Profile Studio / system pack library
   * (`addCustomSystemAsync`) so the `spec` is a complete SystemPack — an empty
   * `spec: {}` row would break every consumer of `loadCustomSystemsFromSupabase`.
   */
  async listPacks(): Promise<SystemPack[]> {
    const { data, error } = await supabase.from('fabricator_system_packs').select('id,label,brands,scope,is_active,owner_user_id').order('label')
    if (error) throw error
    return (data ?? []) as SystemPack[]
  },

  async togglePack(id: string, is_active: boolean): Promise<void> {
    const { error } = await db.from('fabricator_system_packs').update({ is_active, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
  },

  async deletePack(id: string): Promise<void> {
    const { error } = await db.from('fabricator_system_packs').delete().eq('id', id)
    if (error) throw error
  },
}

export interface SystemPack {
  id: string
  label: string
  brands: string[] | null
  scope: string
  is_active: boolean
  owner_user_id: string | null
}

export interface ManufacturingRule {
  id: string
  name: string
  rule_type: string
  description: string | null
  applies_to: string | null
  status: 'draft' | 'approved' | 'rejected'
  created_at: string
}

export interface TuningParam {
  id: string
  key: string
  value: number
  unit: string
  description: string | null
  owner_id?: string
}

import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

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
    const { data, error } = await db.from('fabricator_profiles').insert(input).select().single()
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
    const { data, error } = await db.from('fabricator_accessories').insert(input).select().single()
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
    const { error } = await db.from('manufacturing_rules').insert(input)
    if (error) throw error
  },

  async setRuleStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    const { error } = await db.from('manufacturing_rules').update({ status, approved_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
  },

  async deleteRule(id: string): Promise<void> {
    const { error } = await db.from('manufacturing_rules').delete().eq('id', id)
    if (error) throw error
  },

  async listTuning(): Promise<TuningParam[]> {
    const { data, error } = await supabase.from('fabricator_tuning').select('*').order('key')
    if (error) throw error
    return (data ?? []) as TuningParam[]
  },

  async saveTuning(key: string, value: number, unit = ''): Promise<void> {
    const { error } = await db.from('fabricator_tuning').upsert({ key, value, unit }, { onConflict: 'owner_id,key' })
    if (error) throw error
  },
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
}

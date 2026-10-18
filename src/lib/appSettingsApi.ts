import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export type SettingType = 'text' | 'number' | 'boolean'

export interface AppSetting {
  id: string
  category: string
  key: string
  value: string
  type: SettingType
  description: string | null
}

export const appSettingsApi = {
  async listSettings(): Promise<AppSetting[]> {
    const { data, error } = await supabase.from('app_settings').select('*').order('category').order('key')
    if (error) throw error
    return (data ?? []) as AppSetting[]
  },

  async saveSetting(category: string, key: string, value: string, type: SettingType, description?: string | null): Promise<void> {
    const { error } = await db.from('app_settings').upsert({ category, key, value, type, description }, { onConflict: 'category,key' })
    if (error) throw error
  },

  async addSetting(input: { category: string; key: string; value: string; type: SettingType; description?: string | null }): Promise<void> {
    const { error } = await db.from('app_settings').insert(input)
    if (error) throw error
  },

  async deleteSetting(id: string): Promise<void> {
    const { error } = await db.from('app_settings').delete().eq('id', id)
    if (error) throw error
  },
}

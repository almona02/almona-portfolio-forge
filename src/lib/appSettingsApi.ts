import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// Local contract for 20261018240000_app_settings.sql until database types are regenerated.
type AppSettingRow = { [Key in keyof AppSetting]: AppSetting[Key] } & { updated_at: string; updated_by: string | null }
type AppSettingInsert = Pick<AppSettingRow, 'category' | 'key' | 'value'> & Partial<Omit<AppSettingRow, 'category' | 'key' | 'value'>>
type AppSettingsDatabase = {
  public: {
    Tables: {
      app_settings: {
        Row: AppSettingRow
        Insert: AppSettingInsert
        Update: Partial<AppSettingRow>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
  }
}
const db = supabase as unknown as SupabaseClient<AppSettingsDatabase>

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
    const { data, error } = await db.from('app_settings').select('*').order('category').order('key')
    if (error) throw error
    return data ?? []
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

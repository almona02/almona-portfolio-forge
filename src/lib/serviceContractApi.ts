import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ServiceContract {
  id: string
  owner_id: string
  machine_id: string | null
  factory_name: string
  machine_name: string
  status: 'active' | 'expired' | 'cancelled'
  visit_frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual'
  start_date: string
  end_date: string | null
  terms: string | null
  price: number | null
  currency: string
  created_at: string
}

export interface ServiceVisit {
  id: string
  contract_id: string
  scheduled_at: string
  completed_at: string | null
  status: 'scheduled' | 'completed' | 'cancelled'
  type: 'preventive' | 'corrective' | 'inspection' | 'installation' | 'training'
  technician: string | null
  summary: string | null
  photos: string[]
  created_at: string
}

export const VISIT_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'annual'] as const
export const VISIT_TYPES = ['preventive', 'corrective', 'inspection', 'installation', 'training'] as const

// Local contracts from 20261018183000_service_contracts.sql until generated types
// include these tables. Reuse the existing client and retain database defaults.
type ServiceContractRow = { [Key in keyof ServiceContract]: ServiceContract[Key] } & { updated_at: string }
type ServiceVisitRow = { [Key in keyof ServiceVisit]: ServiceVisit[Key] } & { updated_at: string }
type ServiceContractInsert = Pick<ServiceContractRow, 'owner_id'> & Partial<Omit<ServiceContractRow, 'owner_id'>>
type ServiceVisitInsert = Pick<ServiceVisitRow, 'contract_id' | 'scheduled_at'> & Partial<Omit<ServiceVisitRow, 'contract_id' | 'scheduled_at'>>
type ServiceContractDatabase = {
  public: {
    Tables: {
      service_contracts: {
        Row: ServiceContractRow
        Insert: ServiceContractInsert
        Update: Partial<ServiceContractRow>
        Relationships: [{
          foreignKeyName: 'service_contracts_machine_id_fkey'
          columns: ['machine_id']
          isOneToOne: false
          referencedRelation: 'machine_profiles'
          referencedColumns: ['id']
        }]
      }
      service_visits: {
        Row: ServiceVisitRow
        Insert: ServiceVisitInsert
        Update: Partial<ServiceVisitRow>
        Relationships: [{
          foreignKeyName: 'service_visits_contract_id_fkey'
          columns: ['contract_id']
          isOneToOne: false
          referencedRelation: 'service_contracts'
          referencedColumns: ['id']
        }]
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
  }
}
const db = supabase as unknown as SupabaseClient<ServiceContractDatabase>

export const serviceContractApi = {
  async listContracts(ownerId?: string): Promise<ServiceContract[]> {
    let q = db.from('service_contracts').select('*').order('created_at', { ascending: false })
    if (ownerId) q = q.eq('owner_id', ownerId)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  async createContract(input: {
    owner_id: string
    machine_id?: string | null
    factory_name: string
    machine_name: string
    visit_frequency: ServiceContract['visit_frequency']
    start_date: string
    end_date?: string | null
    terms?: string | null
    price?: number | null
  }): Promise<ServiceContract> {
    const { data, error } = await db.from('service_contracts').insert(input).select().single()
    if (error) throw error
    return data
  },

  async updateContract(id: string, patch: Partial<Pick<ServiceContract, 'status' | 'visit_frequency' | 'end_date' | 'terms' | 'price' | 'factory_name' | 'machine_name'>>): Promise<void> {
    const { error } = await db.from('service_contracts').update(patch).eq('id', id)
    if (error) throw error
  },

  async deleteContract(id: string): Promise<void> {
    const { error } = await db.from('service_contracts').delete().eq('id', id)
    if (error) throw error
  },

  async listVisits(contractId: string): Promise<ServiceVisit[]> {
    const { data, error } = await db.from('service_visits').select('*').eq('contract_id', contractId).order('scheduled_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async createVisit(input: { contract_id: string; scheduled_at: string; type?: ServiceVisit['type']; technician?: string | null }): Promise<ServiceVisit> {
    const { data, error } = await db.from('service_visits').insert(input).select().single()
    if (error) throw error
    return data
  },

  async completeVisit(id: string, patch: { summary?: string | null; technician?: string | null; photos?: string[] }): Promise<void> {
    const { error } = await db.from('service_visits').update({ ...patch, status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
  },

  async cancelVisit(id: string): Promise<void> {
    const { error } = await db.from('service_visits').update({ status: 'cancelled' }).eq('id', id)
    if (error) throw error
  },

  async uploadPhoto(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.')
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
    const { error } = await supabase.storage.from('service-visit-photos').upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('service-visit-photos').getPublicUrl(path)
    return data.publicUrl
  },
}

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// Local contract for 20261018200000_ticket_messaging_sharing.sql until schema types are regenerated.
type TicketShareRow = {
  id: string
  ticket_id: string
  token: string
  created_by: string | null
  expires_at: string | null
  created_at: string
}
type TicketMessagingDatabase = {
  public: {
    Tables: {
      ticket_messages: Database['public']['Tables']['ticket_messages'] & { Relationships: [] }
      ticket_shares: {
        Row: TicketShareRow
        Insert: Pick<TicketShareRow, 'ticket_id' | 'token'> & Partial<Omit<TicketShareRow, 'ticket_id' | 'token'>>
        Update: Partial<TicketShareRow>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      get_shared_ticket: { Args: { p_token: string }; Returns: SharedTicket }
    }
  }
}
const db = supabase as unknown as SupabaseClient<TicketMessagingDatabase>

export interface TicketAttachment {
  filename: string
  url: string
  size: number
  type: string
}

export interface SharedTicket {
  ticket: {
    id: string
    ticket_number: string
    title: string
    description: string
    status: string
    priority: string
    type: string
    machine_serial_number: string | null
    site_location: string | null
    created_at: string
    updated_at: string
  }
  messages: Array<{
    id: string
    author_id: string | null
    message: string
    message_type: string | null
    attachments: TicketAttachment[]
    created_at: string
  }>
}

export const ticketMessageApi = {
  async uploadAttachment(file: File): Promise<TicketAttachment> {
    if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.')
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
    const { error } = await supabase.storage.from('ticket-attachments').upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('ticket-attachments').getPublicUrl(path)
    return { filename: file.name, url: data.publicUrl, size: file.size, type: file.type }
  },

  async sendMessage(input: { ticketId: string; authorId: string; message: string; attachments?: TicketAttachment[] }): Promise<void> {
    const { error } = await db.from('ticket_messages').insert({
      ticket_id: input.ticketId,
      author_id: input.authorId,
      message: input.message,
      message_type: 'message',
      is_internal_note: false,
      attachments: input.attachments ?? [],
    })
    if (error) throw error
  },

  async sendSparePartsRequest(input: {
    ticketId: string
    authorId: string
    note?: string
    parts: Array<{ sku: string; name: string; quantity: number; urgency: string }>
  }): Promise<void> {
    const { error } = await db.from('ticket_messages').insert({
      ticket_id: input.ticketId,
      author_id: input.authorId,
      message: input.note || 'Spare parts request',
      message_type: 'spare_parts_request',
      is_internal_note: false,
      attachments: [],
      spare_parts_details: { parts: input.parts },
    })
    if (error) throw error
  },

  async createShare(ticketId: string, expiresInDays = 14): Promise<{ token: string; url: string }> {
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString()
    const { error } = await db.from('ticket_shares').insert({ ticket_id: ticketId, token, expires_at: expiresAt })
    if (error) throw error
    return { token, url: `${window.location.origin}/support/tickets/${ticketId}?share=${token}` }
  },

  async getSharedTicket(token: string): Promise<SharedTicket> {
    const { data, error } = await db.rpc('get_shared_ticket', { p_token: token })
    if (error) throw error
    return data
  },
}

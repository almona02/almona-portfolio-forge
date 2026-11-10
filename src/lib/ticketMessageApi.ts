import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// Local contract for ticket messaging / sharing until schema types are regenerated.
type TicketShareRow = {
  id: string
  ticket_id: string
  token: string
  created_by: string | null
  expires_at: string | null
  revoked_at: string | null
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
      revoke_ticket_share: { Args: { p_token: string }; Returns: void }
    }
  }
}
const db = supabase as unknown as SupabaseClient<TicketMessagingDatabase>

export interface TicketAttachment {
  filename: string
  /** Present only for authenticated signed downloads; never a permanent public URL. */
  url?: string
  storage_path?: string
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
    machine_model?: string | null
    site_location: string | null
    created_at: string
    updated_at: string
  }
  messages: Array<{
    id: string
    message: string
    message_type: string | null
    attachments: TicketAttachment[]
    created_at: string
  }>
}

function extractStoragePath(urlOrPath: string | undefined | null): string | undefined {
  if (!urlOrPath) return undefined
  if (!urlOrPath.includes('://') && !urlOrPath.startsWith('/')) return urlOrPath.replace(/^\/+/, '')
  const marker = 'ticket-attachments/'
  const idx = urlOrPath.indexOf(marker)
  if (idx >= 0) return urlOrPath.slice(idx + marker.length).replace(/^\/+/, '')
  return undefined
}

export const ticketMessageApi = {
  /**
   * Upload to private ticket-attachments bucket.
   * Path convention: `{ownerScope}/{uuid}.ext` where ownerScope is ticketId or userId/draft.
   * Returns storage_path only — callers must request a signed URL to download.
   */
  async uploadAttachment(file: File, ownerScope: string): Promise<TicketAttachment> {
    if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.')
    if (!ownerScope?.trim()) throw new Error('Attachment owner scope is required.')
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${ownerScope.replace(/^\/+|\/+$/g, '')}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('ticket-attachments').upload(path, file, { upsert: false })
    if (error) throw error
    return { filename: file.name, storage_path: path, size: file.size, type: file.type }
  },

  async createSignedAttachmentUrl(storagePath: string, expiresIn = 60): Promise<string> {
    const path = extractStoragePath(storagePath) || storagePath
    const { data, error } = await supabase.storage.from('ticket-attachments').createSignedUrl(path, expiresIn)
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Unable to sign attachment URL')
    return data.signedUrl
  },

  async createSharedAttachmentUrl(token: string, storagePath: string): Promise<string> {
    const path = extractStoragePath(storagePath) || storagePath
    const { data, error } = await supabase.functions.invoke('ticket-share-attachment', {
      body: { token, path },
    })
    if (error) throw new Error(error.message)
    const url = (data as { url?: string } | null)?.url
    if (!url) throw new Error('Unable to sign shared attachment URL')
    return url
  },

  async sendMessage(input: { ticketId: string; authorId: string; message: string; attachments?: TicketAttachment[] }): Promise<void> {
    const attachments = (input.attachments ?? []).map((a) => ({
      filename: a.filename,
      size: a.size,
      type: a.type,
      storage_path: a.storage_path || extractStoragePath(a.url),
    }))
    const { error } = await db.from('ticket_messages').insert({
      ticket_id: input.ticketId,
      author_id: input.authorId,
      message: input.message,
      message_type: 'message',
      is_internal_note: false,
      attachments,
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
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await db.from('ticket_shares').insert({
      ticket_id: ticketId,
      token,
      expires_at: expiresAt,
      created_by: userData.user?.id ?? null,
    })
    if (error) throw error
    return { token, url: `${window.location.origin}/support/tickets/${ticketId}?share=${token}` }
  },

  async revokeShare(token: string): Promise<void> {
    const { error } = await db.rpc('revoke_ticket_share', { p_token: token })
    if (error) throw error
  },

  async getSharedTicket(token: string): Promise<SharedTicket> {
    const { data, error } = await db.rpc('get_shared_ticket', { p_token: token })
    if (error) throw error
    const shared = data as SharedTicket
    // Defense in depth: never surface legacy public URLs from cached payloads.
    shared.messages = (shared.messages ?? []).map((m) => ({
      ...m,
      attachments: (m.attachments ?? []).map((a) => ({
        filename: a.filename,
        size: a.size,
        type: a.type,
        storage_path: a.storage_path || extractStoragePath(a.url),
      })),
    }))
    return shared
  },
}

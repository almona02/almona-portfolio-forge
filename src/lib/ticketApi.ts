/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CreateTicketData,
  CreateMessageData,
  TicketFilters,
  TicketStatus,
  ServiceTicket,
  TicketMessage,
  TicketWithDetails,
  MessageWithAuthor
} from '@/types/tickets'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type DBServiceTicketRow = Database['public']['Tables']['service_tickets']['Row'] & { source?: string | null; maintenance_type?: string | null }
type DBTicketMessageRow = Database['public']['Tables']['ticket_messages']['Row']

// ---------- Helpers ----------
function mapTicket(row: DBServiceTicketRow): ServiceTicket {
  return {
    id: row.id,
    ticket_number: row.ticket_number,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
  type: row.type as ServiceTicket['type'],
  priority: row.priority as ServiceTicket['priority'],
  status: row.status as ServiceTicket['status'],
  source: (row as any).source ?? null,
  maintenance_type: (row as any).maintenance_type ?? null,
    related_quote_id: row.related_quote_id,
    related_order_id: row.related_order_id,
    related_product_id: row.related_product_id,
    assigned_to: row.assigned_to,
    assigned_at: row.assigned_at,
    assigned_by: row.assigned_by,
    sla_response_due: row.sla_response_due,
    sla_resolution_due: row.sla_resolution_due,
    first_response_at: row.first_response_at,
    sla_breached: row.sla_breached ?? false,
    escalated: row.escalated ?? false,
    escalated_at: row.escalated_at,
    contact_phone: row.contact_phone,
    contact_email: row.contact_email,
    preferred_contact_method: row.preferred_contact_method || 'email',
    site_location: row.site_location,
    machine_serial_number: row.machine_serial_number,
    resolution_summary: row.resolution_summary,
    customer_satisfaction_rating: row.customer_satisfaction_rating,
    customer_feedback: row.customer_feedback,
    created_at: row.created_at,
    updated_at: row.updated_at,
    resolved_at: row.resolved_at,
    closed_at: row.closed_at
  }
}

// ---------- Ticket CRUD ----------
export const createTicket = async (ticketData: CreateTicketData, userId: string): Promise<ServiceTicket> => {
  const insertPayload = {
    user_id: userId,
    title: ticketData.title,
    description: ticketData.description,
    type: ticketData.type,
    priority: ticketData.priority,
    status: 'open',
    related_quote_id: ticketData.related_quote_id || null,
    related_order_id: ticketData.related_order_id || null,
    related_product_id: ticketData.related_product_id || null,
    contact_phone: ticketData.contact_phone || null,
    contact_email: ticketData.contact_email || null,
    preferred_contact_method: ticketData.preferred_contact_method || 'email',
    site_location: ticketData.site_location || null,
    machine_serial_number: ticketData.machine_serial_number || null
  }
  // Casting supabase to any to bypass strict table inference issues until generated types include custom columns
  const { data, error } = await (supabase as any)
    .from('service_tickets')
    .insert([insertPayload])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return mapTicket(data)
}

export const getUserTickets = async (
  userId: string,
  filters?: TicketFilters
): Promise<TicketWithDetails[]> => {
  let query = (supabase as any).from('service_tickets').select('*').eq('user_id', userId)
  if (filters?.status?.length) query = query.in('status', filters.status)
  if (filters?.type?.length) query = query.in('type', filters.type)
  if (filters?.priority?.length) query = query.in('priority', filters.priority)
  if (filters?.search) {
    const s = `%${filters.search}%`
    query = query.or(`title.ilike.${s},description.ilike.${s},ticket_number.ilike.${s}`)
  }
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  // Fetch message counts
  const ids = (data || []).map(r => r.id)
  let counts: Record<string, number> = {}
  if (ids.length) {
  const { data: msgAgg, error: msgErr } = await (supabase as any)
      .from('ticket_messages')
      .select('ticket_id, count:ticket_id')
      .in('ticket_id', ids)
    if (!msgErr && msgAgg) {
  counts = msgAgg.reduce((acc: Record<string, number>, row: any) => {
        acc[row.ticket_id] = (acc[row.ticket_id] || 0) + 1
        return acc
      }, {})
    }
  }

  return (data || []).map(row => ({
    ...mapTicket(row),
    message_count: counts[row.id] || 0
  }))
}

export const getTicketById = async (ticketId: string): Promise<TicketWithDetails | null> => {
  const { data, error } = await (supabase as any).from('service_tickets').select('*').eq('id', ticketId).single()
  if (error) return null
  return mapTicket(data)
}

export const updateTicketStatus = async (
  ticketId: string,
  status: TicketStatus,
  resolution_summary?: string
): Promise<ServiceTicket> => {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'resolved') patch['resolved_at'] = new Date().toISOString()
  if (status === 'closed') patch['closed_at'] = new Date().toISOString()
  if (resolution_summary) patch['resolution_summary'] = resolution_summary
  const { data, error } = await (supabase as any)
    .from('service_tickets')
    .update(patch)
    .eq('id', ticketId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return mapTicket(data)
}

// ---------- Messages ----------
export const getTicketMessages = async (ticketId: string): Promise<MessageWithAuthor[]> => {
  const { data, error } = await (supabase as any)
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data || []).map(row => ({
    id: row.id,
    ticket_id: row.ticket_id,
    author_id: row.author_id,
    message: row.message,
    message_type: row.message_type,
    is_internal_note: row.is_internal_note,
    attachments: row.attachments || [],
    spare_parts_details: row.spare_parts_details,
    status_change: row.status_change,
    time_spent_minutes: row.time_spent_minutes,
    created_at: row.created_at,
    edited_at: row.edited_at,
    author: { full_name: null, role: 'user', avatar_url: null }
  }))
}

export const createMessage = async (messageData: CreateMessageData & { author_id: string }): Promise<TicketMessage> => {
  const insertPayload = {
    ticket_id: messageData.ticket_id,
    author_id: messageData.author_id,
    message: messageData.message,
    message_type: messageData.message_type || 'message',
    is_internal_note: messageData.is_internal_note || false,
    attachments: messageData.attachments || [],
    spare_parts_details: messageData.spare_parts_details || null,
    time_spent_minutes: messageData.time_spent_minutes || null
  }
  const { data, error } = await (supabase as any)
    .from('ticket_messages')
    .insert([insertPayload])
    .select()
    .single()
  if (error) throw new Error(error.message)
  const row = data as DBTicketMessageRow
  return {
    id: row.id,
    ticket_id: row.ticket_id,
    author_id: row.author_id,
    message: row.message,
    message_type: row.message_type,
    is_internal_note: row.is_internal_note,
  attachments: (row.attachments as any[]) || [],
    spare_parts_details: row.spare_parts_details,
    status_change: row.status_change,
    time_spent_minutes: row.time_spent_minutes,
    created_at: row.created_at,
    edited_at: row.edited_at
  }
}

// ---------- Analytics ----------
export const getTicketStats = async (userId: string) => {
  const { data, error } = await (supabase as any)
    .from('service_tickets')
    .select('id,status,priority,type,resolved_at')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  const tickets = data || []
  const total = tickets.length
  const open = tickets.filter(t => ['open','assigned','in_progress'].includes(t.status)).length
  const resolved = tickets.filter(t => t.status === 'resolved').length
  const closed = tickets.filter(t => t.status === 'closed').length
  const byPriority: Record<string, number> = { low:0, medium:0, high:0, critical:0, urgent:0 }
  tickets.forEach(t => { byPriority[t.priority] = (byPriority[t.priority]||0)+1 })
  const byTypeKeys = ['general','technical','billing','sales','spare_parts','warranty','complaint','installation','maintenance']
  const byType: Record<string, number> = {}
  byTypeKeys.forEach(k => { byType[k]=0 })
  tickets.forEach(t => { byType[t.type] = (byType[t.type]||0)+1 })
  return {
    total, open, resolved, closed,
  byPriority: byPriority as any,
  byType: byType as any,
    avgResolutionTime: 0
  }
}

// ---------- Attachments ----------
export const uploadTicketAttachment = async (file: File, ticketId: string): Promise<string> => {
  const path = `${ticketId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('ticket-attachments').upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  const { data: pub } = supabase.storage.from('ticket-attachments').getPublicUrl(path)
  return pub.publicUrl
}

// ---------- Search Helper ----------
export const searchTickets = async (
  userId: string,
  searchTerm: string,
  filters?: Omit<TicketFilters, 'search'>
) => getUserTickets(userId, { ...filters, search: searchTerm })

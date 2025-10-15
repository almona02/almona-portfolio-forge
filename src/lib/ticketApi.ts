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
import { ticketsV2Api } from '@/lib/api/ticketsV2'

type DBServiceTicketRow = Database['public']['Tables']['service_tickets']['Row'] & { source?: string | null }
type DBTicketMessageRow = Database['public']['Tables']['ticket_messages']['Row']

// ---------- Helpers ----------
function mapTicket(row: DBServiceTicketRow): ServiceTicket {
  return {
    id: row.id,
    ticket_number: row.ticket_number,
    digital_twin_code: (row as any).digital_twin_code ?? null,
    category: (row as any).category ?? null,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
  type: row.type as ServiceTicket['type'],
  priority: row.priority as ServiceTicket['priority'],
  status: row.status as ServiceTicket['status'],
  source: (row as any).source ?? null,
  // maintenance_type: (row as any).maintenance_type ?? null, // Removed - column doesn't exist
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
  machine_model: (row as any).machine_model ?? null,
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
  // Attempt V2 path first only if explicitly enabled
  const ENABLE_V2 = (import.meta as any).env?.VITE_ENABLE_V2_TICKETS === 'true'
  if (ENABLE_V2) try {
    let category: string | null = null
    if (ticketData.type === 'maintenance') {
      // const mt = (ticketData as any).maintenance_type // Removed - column doesn't exist
      // if (mt === 'emergency') category = 'emergency_service'
      // else if (mt === 'preventive') category = 'preventive_maintenance'
      // else if (mt) category = 'scheduled_maintenance'
      category = 'scheduled_maintenance' // Default for maintenance tickets
    } else if (ticketData.type === 'sales') category = 'product_quote'
    else if (['general', 'technical'].includes(ticketData.type)) category = 'support'

    if (category) {
      const payload: any = {
        category,
        payload: {
          title: ticketData.title,
          description: ticketData.description,
          priority: ticketData.priority,
          machine_id: (ticketData as any).machine_id || undefined,
          machine_serial_number: ticketData.machine_serial_number || undefined,
        },
      }
      if (category === 'preventive_maintenance') {
        // payload.maintenance_metadata = { maintenance_type: (ticketData as any).maintenance_type } // Removed - column doesn't exist
      }
      const v2 = await ticketsV2Api.create(payload)
      return {
        id: v2.id,
        ticket_number: v2.ticket_number,
        digital_twin_code: (v2 as any).digital_twin_code || null,
        category: v2.category || null,
        user_id: userId,
        title: v2.title,
        description: v2.description || null,
        type: ticketData.type,
        priority: v2.priority,
        status: v2.status as TicketStatus,
        source: null,
        // maintenance_type: (ticketData as any).maintenance_type || null, // Removed - column doesn't exist
        related_quote_id: null,
        related_order_id: null,
        related_product_id: null,
        assigned_to: null,
        assigned_at: null,
        assigned_by: null,
        sla_response_due: null,
        sla_resolution_due: null,
        first_response_at: null,
        sla_breached: false,
        escalated: false,
        escalated_at: null,
        contact_phone: ticketData.contact_phone || null,
        contact_email: ticketData.contact_email || null,
        preferred_contact_method: ticketData.preferred_contact_method || 'email',
        site_location: ticketData.site_location || null,
        machine_serial_number: ticketData.machine_serial_number || null,
  machine_model: (ticketData as any).machine_model || null,
        resolution_summary: null,
        customer_satisfaction_rating: null,
        customer_feedback: null,
        created_at: v2.created_at,
        updated_at: v2.updated_at,
        resolved_at: null,
        closed_at: null,
      }
    }
  } catch (err) {
    // Silent fallback to legacy without noisy logs when disabled/missing backend
  }
  // Get user ID once to avoid multiple async calls
  const currentUser = (await supabase.auth.getUser()).data.user;
  const currentUserId = currentUser?.id || undefined;

  // Generate ticket number on client side (database trigger not working)
  const generateTicketNumber = () => {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `TKT-${year}-${timestamp}${randomSuffix}`;
  };

  // Generate digital twin code for maintenance tickets (more unique)
  const generateDigitalTwinCode = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const user = currentUserId || 'anonymous';
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = now.getTime().toString().slice(-6);
    return `ST-${year}${month}${day}-${hour}${minute}${second}-${randomSuffix}${timestamp}`;
  };

  // Minimal, schema-safe payload to avoid 400 due to column diffs
  // Let database trigger handle ticket_number generation
  const insertPayload = {
    title: ticketData.title?.toString().slice(0, 200) || 'Support Ticket',
    description: ticketData.description || 'Support ticket created via services page',
    // Provide safe defaults for likely NOT NULL columns
    type: (ticketData.type as any) || 'general',
    priority: (ticketData.priority as any) || 'medium',
    status: 'open' as const,
    preferred_contact_method: ticketData.preferred_contact_method || 'email',
    user_id: currentUserId,
    // Generate ticket_number on client side (database trigger not working)
    ticket_number: generateTicketNumber(),
    digital_twin_code: generateDigitalTwinCode(),
    // Additional optional fields
    contact_phone: ticketData.contact_phone || null,
    contact_email: ticketData.contact_email || null,
    site_location: ticketData.site_location || null,
    machine_serial_number: ticketData.machine_serial_number || null,
    machine_model: (ticketData as any).machine_model || null,
    // maintenance_type: (ticketData as any).maintenance_type || null, // Removed - column doesn't exist in database
  }
  
  // Debug: Log the payload being sent
  console.log('[tickets.createTicket] Insert payload:', insertPayload);
  
  // Casting supabase to any to bypass strict table inference issues until generated types include custom columns
  // Select all columns including digital_twin_code and ticket_number
  const selectColumns = 'id, title, description, type, priority, status, preferred_contact_method, user_id, ticket_number, digital_twin_code, contact_phone, contact_email, site_location, machine_serial_number, machine_model, created_at, updated_at'
  let { data, error } = await (supabase as any)
    .from('service_tickets')
    .insert([insertPayload])
    .select(selectColumns)
    .single()
  // No retry needed; first attempt already minimal
  if (error) {
    console.error('[tickets.createTicket] insert error (after retry)', { message: error.message, details: (error as any).details, hint: (error as any).hint })
    throw new Error(error.message)
  }
  
  // Debug: Log the response data
  console.log('[tickets.createTicket] Response data:', data);
  console.log('[tickets.createTicket] Digital twin code in response:', data?.digital_twin_code);
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
  try {
    const updated = await ticketsV2Api.updateStatus(ticketId, status, resolution_summary)
    const existing = await getTicketById(ticketId)
    if (existing) {
      return {
        ...existing,
        status: updated.status as TicketStatus,
        updated_at: updated.updated_at,
        resolved_at: status === 'resolved' ? updated.updated_at : existing.resolved_at,
        closed_at: status === 'closed' ? updated.updated_at : existing.closed_at,
        resolution_summary: resolution_summary || existing.resolution_summary,
      }
    }
  } catch (err) {
    console.warn('V2 status update failed, legacy fallback:', err)
  }
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
  // Try V2 first
  try {
    const v2 = await ticketsV2Api.listMessages(ticketId)
    // Assume v2 returns array with at least: id, message, created_at, author_id
    return v2.map((m: any) => ({
      id: m.id,
      ticket_id: ticketId,
      author_id: m.author_id || m.user_id || 'unknown',
      message: m.message || m.content || '',
      message_type: m.message_type || 'message',
      is_internal_note: m.is_internal_note || false,
      attachments: m.attachments || [],
      spare_parts_details: m.spare_parts_details || null,
      status_change: m.status_change || null,
      time_spent_minutes: m.time_spent_minutes || null,
      created_at: m.created_at,
      edited_at: m.edited_at || null,
      author: { full_name: m.author_name || null, role: 'user', avatar_url: m.author_avatar || null }
    }))
  } catch (err) {
    console.warn('V2 listMessages failed, legacy fallback:', err)
  }
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
  try {
    await ticketsV2Api.addMessage(messageData.ticket_id, messageData.message, {
      message_type: messageData.message_type,
      is_internal: messageData.is_internal_note,
    })
    // Re-fetch via V2 for consistent shape
    const msgs = await getTicketMessages(messageData.ticket_id)
    return msgs[msgs.length - 1] as TicketMessage
  } catch (err) {
    console.warn('V2 addMessage failed, legacy fallback:', err)
  }
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
  const row: DBTicketMessageRow = data as DBTicketMessageRow
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

export const assignTicket = async (ticketId: string, assigneeId: string): Promise<ServiceTicket> => {
  try {
    const updated = await ticketsV2Api.assign(ticketId, assigneeId)
    const existing = await getTicketById(ticketId)
    if (existing) {
      return { ...existing, assigned_to: assigneeId, updated_at: updated.updated_at }
    }
  } catch (err) {
    console.warn('V2 assign failed, legacy fallback:', err)
  }
  const { data, error } = await (supabase as any)
    .from('service_tickets')
    .update({ assigned_to: assigneeId, assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return mapTicket(data)
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

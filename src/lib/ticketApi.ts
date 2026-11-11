import {
  governedCreateTicket,
} from '@/lib/ticketing/TicketGovernanceService'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import {
    CreateMessageData,
    CreateTicketData,
    MessageWithAuthor,
    ServiceTicket,
    TicketFilters,
    TicketMessage,
    TicketPriority,
    TicketStatus,
    TicketType,
    TicketWithDetails
} from '@/types/tickets'

export type DBServiceTicketRow = Database['public']['Tables']['service_tickets']['Row'] & {
  digital_twin_code?: string | null;
  category?: string | null;
  machine_model?: string | null;
  source?: string | null;
};
type DBTicketMessageRow = Database['public']['Tables']['ticket_messages']['Row'];

// ---------- Helpers ----------
export function mapTicket(row: DBServiceTicketRow): ServiceTicket {
  return {
    id: row.id,
    ticket_number: row.ticket_number,
    digital_twin_code: row.digital_twin_code ?? null,
    category: row.category ?? null,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
  type: row.type as ServiceTicket['type'],
  priority: row.priority as ServiceTicket['priority'],
  status: row.status as ServiceTicket['status'],
  source: row.source ?? null,
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
    machine_id: (row as { machine_id?: string | null }).machine_id ?? null,
    machine_serial_number: row.machine_serial_number,
  machine_model: row.machine_model ?? null,
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
/**
 * Canonical ticket creation — always routes through TicketGovernanceService.
 * V2 ticket create bypass removed (P0.10.2); no alternate create authority.
 */
export const createTicket = async (ticketData: CreateTicketData, userId: string): Promise<ServiceTicket> => {
  const currentUser = (await supabase.auth.getUser()).data.user;
  const currentUserId = currentUser?.id || undefined;
  const result = await governedCreateTicket(ticketData, userId, currentUserId);
  return mapTicket(result.row as DBServiceTicketRow);
}

export const getUserTickets = async (
  userId: string,
  filters?: TicketFilters
): Promise<TicketWithDetails[]> => {
  let query = supabase.from('service_tickets').select('*').eq('user_id', userId);
  if (filters?.status?.length) query = query.in('status', filters.status)
  if (filters?.type?.length) query = query.in('type', filters.type)
  if (filters?.priority?.length) query = query.in('priority', filters.priority)
  if (filters?.search) {
    const s = `%${filters.search}%`
    query = query.or(`title.ilike.${s},description.ilike.${s},ticket_number.ilike.${s}`)
  }
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  const ids = (data || []).map((r: { id: string }) => r.id)
  let counts: Record<string, number> = {}
  if (ids.length) {
  const { data: msgAgg, error: msgErr } = await supabase
      .from('ticket_messages')
      .select('ticket_id, count:ticket_id')
      .in('ticket_id', ids)
    if (!msgErr && msgAgg) {
  counts = msgAgg.reduce((acc: Record<string, number>, row: { ticket_id: string }) => {
        acc[row.ticket_id] = (acc[row.ticket_id] || 0) + 1
        return acc
      }, {})
    }
  }

  const rows = (data || []) as DBServiceTicketRow[];
  return rows.map(row => ({
    ...mapTicket(row),
    message_count: counts[row.id] || 0
  }));
}

export const getTicketById = async (ticketId: string): Promise<TicketWithDetails | null> => {
  const { data, error } = await supabase.from('service_tickets').select('*').eq('id', ticketId).single();
  if (error || !data) return null;
  return mapTicket(data as DBServiceTicketRow);
}

export const updateTicketStatus = async (
  ticketId: string,
  status: TicketStatus,
  resolution_summary?: string,
  actorId?: string,
): Promise<ServiceTicket> => {
  const { governTicketTransition } = await import('@/lib/ticketGovernanceApi')
  return governTicketTransition({
    ticketId,
    toStatus: status,
    rationale: actorId ? `Status change by ${actorId}` : 'Status change',
    resolutionSummary: resolution_summary,
  })
}

// ---------- Messages ----------
export const getTicketMessages = async (ticketId: string): Promise<MessageWithAuthor[]> => {
  const { data, error } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data || []).map((row: DBTicketMessageRow) => ({
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
  const { data, error } = await supabase
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
    attachments: (row.attachments as TicketMessage['attachments']) || [],
    spare_parts_details: row.spare_parts_details,
    status_change: row.status_change,
    time_spent_minutes: row.time_spent_minutes,
    created_at: row.created_at,
    edited_at: row.edited_at
  }
}

export const assignTicket = async (
  ticketId: string,
  assigneeId: string,
  _assignedBy?: string,
): Promise<ServiceTicket> => {
  const { governTicketAssign } = await import('@/lib/ticketGovernanceApi')
  return governTicketAssign({
    ticketId,
    assigneeId,
    rationale: 'Manual assignment',
  })
}

// ---------- Analytics ----------
export const getTicketStats = async (userId: string) => {
  const { data, error } = await supabase
    .from('service_tickets')
    .select('id,status,priority,type,resolved_at')
    .eq('user_id', userId)
  if (error) throw new Error(error.message);
  const tickets = (data || []) as DBServiceTicketRow[];
  const mapped = tickets.map(mapTicket);
  const total = mapped.length;
  const open = mapped.filter(t => ['open','assigned','in_progress'].includes(t.status)).length;
  const resolved = mapped.filter(t => t.status === 'resolved').length;
  const closed = mapped.filter(t => t.status === 'closed').length;
  const byPriority: Record<string, number> = { low:0, medium:0, high:0, critical:0, urgent:0 };
  mapped.forEach(t => { byPriority[t.priority] = (byPriority[t.priority]||0)+1; });
  const byTypeKeys = ['general','technical','billing','sales','spare_parts','warranty','complaint','installation','maintenance'] as const;
  const byType: Record<string, number> = {};
  byTypeKeys.forEach(k => { byType[k]=0; });
  mapped.forEach(t => { byType[t.type] = (byType[t.type]||0)+1; });
  return {
    total, open, resolved, closed,
  byPriority: byPriority as Record<TicketPriority, number>,
  byType: byType as Record<TicketType, number>,
    avgResolutionTime: 0
  }
}

// ---------- Attachments ----------
/** Uploads to the private ticket-attachments bucket and returns storage_path (not a public URL). */
export const uploadTicketAttachment = async (file: File, ticketId: string): Promise<string> => {
  const attachment = await (await import('@/lib/ticketMessageApi')).ticketMessageApi.uploadAttachment(file, ticketId)
  if (!attachment.storage_path) throw new Error('Upload did not return a storage path')
  return attachment.storage_path
}

export const searchTickets = async (
  userId: string,
  searchTerm: string,
  filters?: Omit<TicketFilters, 'search'>
) => getUserTickets(userId, { ...filters, search: searchTerm })

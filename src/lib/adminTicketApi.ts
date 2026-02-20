import { 
  ServiceTicket,
  TicketWithDetails,
  TicketStatus,
  TicketPriority,
  TicketFilters
} from '@/types/tickets'
import { supabase } from '@/lib/supabase'
 

// Helper: map raw ticket row to ServiceTicket/TicketWithDetails
function baseMap(row: any): ServiceTicket {
  return {
    id: row.id,
    ticket_number: row.ticket_number,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    type: row.type,
    priority: row.priority,
    status: row.status,
    source: row.source ?? null,
    maintenance_type: row.maintenance_type ?? null,
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

// Build dynamic filter query
function buildTicketQuery(filters?: TicketFilters) {
  let query: any = (supabase as any).from('service_tickets').select('*')
  if (filters?.status?.length) query = query.in('status', filters.status)
  if (filters?.type?.length) query = query.in('type', filters.type)
  if (filters?.priority?.length) query = query.in('priority', filters.priority)
  if (filters?.search) {
    const s = `%${filters.search}%`
    query = query.or(`title.ilike.${s},description.ilike.${s},ticket_number.ilike.${s}`)
  }
  if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom)
  if (filters?.dateTo) query = query.lte('created_at', filters.dateTo)
  return query.order('created_at', { ascending: false })
}

// Admin ticket operations
export const getAllTickets = async (filters?: TicketFilters): Promise<TicketWithDetails[]> => {
  const { data, error } = await buildTicketQuery(filters)
  if (error) throw new Error(error.message)
  const ids = (data || []).map(r => r.id)
  let counts: Record<string, number> = {}
  if (ids.length) {
  const { data: msgAgg } = await (supabase as any)
      .from('ticket_messages')
      .select('ticket_id, count:ticket_id')
      .in('ticket_id', ids)
    if (msgAgg) {
  counts = msgAgg.reduce((acc: Record<string, number>, row: any) => {
        acc[row.ticket_id] = (acc[row.ticket_id] || 0) + 1
        return acc
      }, {})
    }
  }
  // Optional profile fetch for display (batch)
  const userIds = [...new Set((data||[]).map(r => r.user_id))]
  let profiles: Record<string, { full_name: string | null; company_name: string | null; phone: string | null }> = {}
  if (userIds.length) {
  const { data: prof } = await (supabase as any).from('profiles').select('id,full_name,company_name,phone').in('id', userIds)
    if (prof) {
  profiles = prof.reduce((acc: Record<string, any>, p: any) => {
        acc[p.id] = { full_name: p.full_name, company_name: p.company_name, phone: p.phone }
        return acc
      }, {})
    }
  }
  return (data || []).map(row => ({
    ...baseMap(row),
    user_profile: profiles[row.user_id],
    message_count: counts[row.id] || 0
  }))
}

export const assignTicket = async (
  ticketId: string,
  assigneeId: string,
  assignedBy: string
): Promise<ServiceTicket> => {
  const patch: Record<string, unknown> = {
    assigned_to: assigneeId,
    assigned_by: assignedBy,
    assigned_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  // Fetch current status to decide if move to assigned
  const { data: current } = await (supabase as any).from('service_tickets').select('status').eq('id', ticketId).single()
  if (current && current.status === 'open') patch['status'] = 'assigned'
  const { data, error } = await (supabase as any).from('service_tickets').update(patch).eq('id', ticketId).select().single()
  if (error) throw new Error(error.message)
  return baseMap(data)
}

export const updateTicketStatusAndPriority = async (
  ticketId: string,
  updates: { status?: TicketStatus; priority?: TicketPriority; resolution_summary?: string }
): Promise<ServiceTicket> => {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.status) {
    patch['status'] = updates.status
    if (updates.status === 'resolved' || updates.status === 'closed') {
      patch['resolved_at'] = new Date().toISOString()
      if (updates.resolution_summary) patch['resolution_summary'] = updates.resolution_summary
    }
    if (updates.status === 'closed') {
      patch['closed_at'] = new Date().toISOString()
    }
  }
  if (updates.priority) patch['priority'] = updates.priority
  const { data, error } = await (supabase as any).from('service_tickets').update(patch).eq('id', ticketId).select().single()
  if (error) throw new Error(error.message)
  return baseMap(data)
}

export const getAvailableAssignees = async (): Promise<Array<{id: string, full_name: string | null, role: string | null}>> => {
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('id,full_name,role')
    .in('role', ['technician','admin','support'])
  if (error) throw new Error(error.message)
  return (data || []).map(p => ({ id: p.id, full_name: p.full_name, role: p.role }))
}

export const getTicketMetrics = async (): Promise<{
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  resolvedTickets: number
  overdueTickets: number
  avgResponseTime: number
  avgResolutionTime: number
  slaBreachRate: number
  byPriority: Record<string, number>
  byStatus: Record<string, number>
  byType: Record<string, number>
}> => {
  const { data, error } = await (supabase as any)
    .from('service_tickets')
    .select('id,status,priority,type,created_at,first_response_at,resolved_at,sla_resolution_due,sla_breached')
  if (error) throw new Error(error.message)
  const tickets = data || []
  const now = new Date()
  const totalTickets = tickets.length
  const openTickets = tickets.filter(t => ['open','assigned'].includes(t.status)).length
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length
  const overdueTickets = tickets.filter(t => t.sla_resolution_due && new Date(t.sla_resolution_due) < now && !['resolved','closed'].includes(t.status)).length
  const ticketsWithResponse = tickets.filter(t => t.first_response_at)
  const avgResponseTime = ticketsWithResponse.length
    ? ticketsWithResponse.reduce((acc, t) => acc + ((new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / 36e5), 0) / ticketsWithResponse.length
    : 0
  const resolvedList = tickets.filter(t => t.resolved_at)
  const avgResolutionTime = resolvedList.length
    ? resolvedList.reduce((acc, t) => acc + ((new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 36e5), 0) / resolvedList.length
    : 0
  const slaBreachedCount = tickets.filter(t => t.sla_breached).length
  const slaBreachRate = totalTickets ? (slaBreachedCount / totalTickets) * 100 : 0
  const byPriority: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  const byType: Record<string, number> = {}
  tickets.forEach(t => {
    byPriority[t.priority] = (byPriority[t.priority]||0)+1
    byStatus[t.status] = (byStatus[t.status]||0)+1
    byType[t.type] = (byType[t.type]||0)+1
  })
  return {
    totalTickets,
    openTickets,
    inProgressTickets,
    resolvedTickets,
    overdueTickets,
    avgResponseTime: Math.round(avgResponseTime*100)/100,
    avgResolutionTime: Math.round(avgResolutionTime*100)/100,
    slaBreachRate: Math.round(slaBreachRate*100)/100,
    byPriority,
    byStatus,
    byType
  }
}

// Real-time subscription helper
export const subscribeToTicketUpdates = (callback: (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: Record<string, unknown>
  old?: Record<string, unknown>
}) => void) => {
  return supabase
    .channel('admin-tickets')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_tickets'
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old
        })
      }
    )
    .subscribe()
}

// Bulk operations
export const bulkAssignTickets = async (ticketIds: string[], assigneeId: string, assignedBy: string): Promise<ServiceTicket[]> => {
  const now = new Date().toISOString()
  const patch = { assigned_to: assigneeId, assigned_by: assignedBy, assigned_at: now, updated_at: now }
  const { data, error } = await (supabase as any)
    .from('service_tickets')
    .update(patch)
    .in('id', ticketIds)
    .select()
  if (error) throw new Error(error.message)
  return (data||[]).map(baseMap)
}

export const bulkUpdateStatus = async (ticketIds: string[], status: TicketStatus): Promise<ServiceTicket[]> => {
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status, updated_at: now }
  if (status === 'resolved' || status === 'closed') patch['resolved_at'] = now
  if (status === 'closed') patch['closed_at'] = now
  const { data, error } = await (supabase as any)
    .from('service_tickets')
    .update(patch)
    .in('id', ticketIds)
    .select()
  if (error) throw new Error(error.message)
  return (data||[]).map(baseMap)
}

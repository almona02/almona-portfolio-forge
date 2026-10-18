import {
  buildGovernedTransitionPatch,
  checkAndApplyEscalation,
  validateStatusTransition,
} from '@/lib/ticketing/TicketGovernanceService';
import { recordServiceEvent } from '@/lib/ticketing/serviceEventLedger';
import {
  ServiceTicket,
  TicketWithDetails,
  TicketStatus,
  TicketPriority,
  TicketFilters,
} from '@/types/tickets';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type ServiceTicketRow = Database['public']['Tables']['service_tickets']['Row'];
type ProfileRow = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'company_name' | 'phone'>;

// Helper: map raw ticket row to ServiceTicket/TicketWithDetails
function baseMap(row: ServiceTicketRow): ServiceTicket {
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
  let query = supabase.from('service_tickets').select('*')
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
  const { data, error: err } = await buildTicketQuery(filters);
  if (err) throw new Error(String((err as { message?: string }).message ?? 'Unknown error'));
  const rows: ServiceTicketRow[] = (data ?? []) as ServiceTicketRow[];
  const ids = rows.map((r) => r.id);
  let counts: Record<string, number> = {};
  if (ids.length) {
    const { data: msgData } = await supabase
      .from('ticket_messages')
      .select('ticket_id')
      .in('ticket_id', ids);
    if (msgData) {
      const rows = msgData as Array<{ ticket_id: string }>;
      counts = rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.ticket_id] = (acc[row.ticket_id] ?? 0) + 1;
        return acc;
      }, {});
    }
  }
  // Optional profile fetch for display (batch)
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  let profiles: Record<string, { full_name: string | null; company_name: string | null; phone: string | null }> = {};
  if (userIds.length) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id,full_name,company_name,phone')
      .in('id', userIds);
    if (prof) {
      profiles = (prof as ProfileRow[]).reduce<Record<string, { full_name: string | null; company_name: string | null; phone: string | null }>>(
        (acc, p) => {
          acc[p.id] = { full_name: p.full_name, company_name: p.company_name, phone: p.phone };
          return acc;
        },
        {}
      );
    }
  }
  return rows.map((row: ServiceTicketRow) => ({
    ...baseMap(row),
    user_profile: profiles[row.user_id],
    message_count: counts[row.id] ?? 0,
  }));
}

export const assignTicket = async (
  ticketId: string,
  assigneeId: string,
  assignedBy: string
): Promise<ServiceTicket> => {
  const { data: current } = await supabase.from('service_tickets').select('status').eq('id', ticketId).single();
  const currentStatus = current?.status ?? 'open';

  const statusPatch =
    currentStatus === 'open'
      ? buildGovernedTransitionPatch({
          ticketId,
          currentStatus,
          targetStatus: 'assigned',
          actorId: assignedBy,
          rationale: 'Admin assignment',
        })
      : { updated_at: new Date().toISOString() };

  const patch: Record<string, unknown> = {
    ...statusPatch,
    assigned_to: assigneeId,
    assigned_by: assignedBy,
    assigned_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('service_tickets').update(patch).eq('id', ticketId).select().single();
  if (error) throw new Error(error.message);

  await recordServiceEvent({
    eventType: 'VERIFICATION',
    entityId: ticketId,
    payload: { kind: 'ticket_assigned', assignedTo: assigneeId, manual: true },
    verifiedBy: assignedBy,
  });

  return baseMap(data);
}

export const updateTicketStatusAndPriority = async (
  ticketId: string,
  updates: { status?: TicketStatus; priority?: TicketPriority; resolution_summary?: string },
  actorId: string = 'admin',
): Promise<ServiceTicket> => {
  const { data: currentRow, error: fetchErr } = await supabase
    .from('service_tickets')
    .select('*')
    .eq('id', ticketId)
    .single();
  if (fetchErr || !currentRow) throw new Error(fetchErr?.message ?? 'Ticket not found');

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.status) {
    validateStatusTransition(currentRow.status, updates.status);
    Object.assign(
      patch,
      buildGovernedTransitionPatch({
        ticketId,
        currentStatus: currentRow.status,
        targetStatus: updates.status,
        actorId,
        resolution_summary: updates.resolution_summary,
      }),
    );
  }

  if (updates.priority) patch['priority'] = updates.priority;

  const { data, error } = await supabase.from('service_tickets').update(patch).eq('id', ticketId).select().single();
  if (error) throw new Error(error.message);

  if (updates.status) {
    await recordServiceEvent({
      eventType: 'VERIFICATION',
      entityId: ticketId,
      payload: {
        kind: 'ticket_status_transition',
        previousStatus: currentRow.status,
        newStatus: updates.status,
      },
      verifiedBy: actorId,
    });
  }

  const mapped = baseMap(data);

  const escalation = await checkAndApplyEscalation({
    id: mapped.id,
    status: mapped.status,
    sla_resolution_due: mapped.sla_resolution_due,
    escalated: mapped.escalated ?? false,
  });
  if (escalation.escalated && escalation.patch) {
    const { data: escalatedRow } = await supabase
      .from('service_tickets')
      .update(escalation.patch)
      .eq('id', ticketId)
      .select()
      .single();
    if (escalatedRow) {
      await recordServiceEvent({
        eventType: 'FAULT',
        entityId: ticketId,
        payload: { kind: 'sla_escalation', ruleId: 'SLA_BREACH_ESCALATION' },
        verifiedBy: actorId,
      });
      return baseMap(escalatedRow);
    }
  }

  return mapped;
}

export const getAvailableAssignees = async (): Promise<Array<{ id: string; full_name: string | null; role: string | null }>> => {
  const { data, error: err } = await supabase
    .from('profiles')
    .select('id,full_name,role')
    .in('role', ['technician', 'admin', 'support']);
  if (err) throw new Error(String((err as { message?: string }).message ?? 'Unknown error'));
  const list = (data ?? []) as Array<{ id: string; full_name: string | null; role: string | null }>;
  return list.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role,
  }));
};

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
  const { data, error } = await supabase
    .from('service_tickets')
    .select('id,status,priority,type,created_at,first_response_at,resolved_at,sla_resolution_due,sla_breached');
  if (error) throw new Error(error.message);
  const tickets = (data ?? []) as Array<{
    id: string;
    status: string;
    priority: string;
    type: string;
    created_at: string;
    first_response_at: string | null;
    resolved_at: string | null;
    sla_resolution_due: string | null;
    sla_breached: boolean;
  }>;
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
  const { data, error } = await supabase
    .from('service_tickets')
    .update(patch)
    .in('id', ticketIds)
    .select();
  if (error) throw new Error(error.message);
  return (data ?? []).map(baseMap);
}

export const bulkUpdateStatus = async (
  ticketIds: string[],
  status: TicketStatus,
  actorId: string = 'admin',
): Promise<ServiceTicket[]> => {
  const results: ServiceTicket[] = [];
  for (const id of ticketIds) {
    results.push(await updateTicketStatusAndPriority(id, { status }, actorId));
  }
  return results;
}

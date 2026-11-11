import { supabase } from '@/lib/supabase'
import type { ServiceTicket, TicketStatus } from '@/types/tickets'
import { mapTicket, type DBServiceTicketRow } from '@/lib/ticketApi'

export interface BulkAssignResult {
  succeeded: string[]
  failed: Array<{ ticket_id: string; error: string }>
  partial: boolean
}

function asTicket(row: unknown): ServiceTicket {
  return mapTicket(row as DBServiceTicketRow)
}

export async function governTicketTransition(input: {
  ticketId: string
  toStatus: TicketStatus
  rationale?: string
  resolutionSummary?: string
}): Promise<ServiceTicket> {
  if (input.toStatus === 'pending_approval') {
    throw new Error('pending_approval is not an approved transition policy; action removed pending product decision')
  }
  const { data, error } = await supabase.rpc('govern_ticket_transition', {
    p_ticket_id: input.ticketId,
    p_to_status: input.toStatus,
    p_rationale: input.rationale ?? null,
    p_resolution_summary: input.resolutionSummary ?? null,
  })
  if (error) throw new Error(error.message)
  return asTicket(data)
}

export async function governTicketAssign(input: {
  ticketId: string
  assigneeId: string
  rationale?: string
}): Promise<ServiceTicket> {
  const { data, error } = await supabase.rpc('govern_ticket_assign', {
    p_ticket_id: input.ticketId,
    p_assignee_id: input.assigneeId,
    p_rationale: input.rationale ?? null,
  })
  if (error) throw new Error(error.message)
  return asTicket(data)
}

export async function governTicketBulkAssign(input: {
  ticketIds: string[]
  assigneeId: string
  rationale?: string
}): Promise<BulkAssignResult> {
  const { data, error } = await supabase.rpc('govern_ticket_bulk_assign', {
    p_ticket_ids: input.ticketIds,
    p_assignee_id: input.assigneeId,
    p_rationale: input.rationale ?? null,
  })
  if (error) throw new Error(error.message)
  const payload = (data ?? {}) as {
    succeeded?: string[]
    failed?: Array<{ ticket_id: string; error: string }>
    partial?: boolean
  }
  return {
    succeeded: payload.succeeded ?? [],
    failed: payload.failed ?? [],
    partial: Boolean(payload.partial),
  }
}

export async function governTicketSetEscalated(ticketId: string, escalated = true): Promise<ServiceTicket> {
  const { data, error } = await supabase.rpc('govern_ticket_set_escalated', {
    p_ticket_id: ticketId,
    p_escalated: escalated,
  })
  if (error) throw new Error(error.message)
  return asTicket(data)
}

export async function governTicketSetPriority(input: {
  ticketId: string
  priority: string
  rationale?: string
}): Promise<ServiceTicket> {
  const { data, error } = await supabase.rpc('govern_ticket_set_priority', {
    p_ticket_id: input.ticketId,
    p_priority: input.priority,
    p_rationale: input.rationale ?? null,
  })
  if (error) throw new Error(error.message)
  return asTicket(data)
}

export async function governTicketBulkTransition(input: {
  ticketIds: string[]
  toStatus: TicketStatus
  rationale?: string
  resolutionSummary?: string
}): Promise<BulkAssignResult> {
  if (input.toStatus === 'pending_approval') {
    throw new Error('pending_approval is not an approved transition policy; action removed pending product decision')
  }
  const { data, error } = await supabase.rpc('govern_ticket_bulk_transition', {
    p_ticket_ids: input.ticketIds,
    p_to_status: input.toStatus,
    p_rationale: input.rationale ?? null,
    p_resolution_summary: input.resolutionSummary ?? null,
  })
  if (error) throw new Error(error.message)
  const payload = (data ?? {}) as {
    succeeded?: string[]
    failed?: Array<{ ticket_id: string; error: string }>
    partial?: boolean
  }
  return {
    succeeded: payload.succeeded ?? [],
    failed: payload.failed ?? [],
    partial: Boolean(payload.partial),
  }
}

/** B2: opt-in Job 1 create/assign. Does not change ticket.assigned_to. */
export async function ensureDefaultServiceJob(input: {
  ticketId: string
  technicianId?: string | null
  title?: string
  rationale?: string
}): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('ensure_default_service_job', {
    p_ticket_id: input.ticketId,
    p_technician_id: input.technicianId ?? null,
    p_title: input.title ?? 'Job 1',
    p_rationale: input.rationale ?? null,
  })
  if (error) throw new Error(error.message)
  const row = data as { id?: string } | null
  if (!row?.id) throw new Error('ensure_default_service_job returned no id')
  return { id: row.id }
}

/** B2: assign/reassign job technician only. */
export async function assignServiceJob(input: {
  jobId: string
  technicianId: string
  rationale?: string
}): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('assign_service_job', {
    p_job_id: input.jobId,
    p_technician_id: input.technicianId,
    p_rationale: input.rationale ?? null,
  })
  if (error) throw new Error(error.message)
  const row = data as { id?: string } | null
  if (!row?.id) throw new Error('assign_service_job returned no id')
  return { id: row.id }
}

/** B2: technician declines own job. */
export async function declineServiceJob(input: {
  jobId: string
  reason: string
}): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('decline_service_job', {
    p_job_id: input.jobId,
    p_reason: input.reason,
  })
  if (error) throw new Error(error.message)
  const row = data as { id?: string } | null
  if (!row?.id) throw new Error('decline_service_job returned no id')
  return { id: row.id }
}

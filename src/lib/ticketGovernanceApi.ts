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

export type ServiceJobRow = {
  id: string
  ticket_id: string
  job_sequence: number
  title: string
  required: boolean
  state: string
  assigned_technician_id: string | null
  created_at: string
  updated_at: string
  technician_name?: string | null
}

function asJob(row: unknown): ServiceJobRow {
  const r = row as ServiceJobRow
  if (!r?.id) throw new Error('service job row missing id')
  return r
}

function mapJobRpcError(message: string): Error {
  const lower = message.toLowerCase()
  if (lower.includes('in_progress') || lower.includes('in progress') || lower.includes('active visit')) {
    return new Error(
      'Cannot change job assignment while a visit is in progress. End or abort the visit in the visit workflow first.',
    )
  }
  if (lower.includes('42501') || lower.includes('only admin') || lower.includes('only the assigned')) {
    return new Error(message)
  }
  return new Error(message)
}

/** B2: list jobs for a ticket (independent assignees/states). Does not touch ticket.assigned_to. */
export async function listServiceJobsForTicket(ticketId: string): Promise<ServiceJobRow[]> {
  const { data, error } = await supabase
    .from('service_jobs')
    .select('id, ticket_id, job_sequence, title, required, state, assigned_technician_id, created_at, updated_at')
    .eq('ticket_id', ticketId)
    .order('job_sequence', { ascending: true })
  if (error) throw new Error(error.message)
  const jobs = (data ?? []) as ServiceJobRow[]
  const techIds = [...new Set(jobs.map((j) => j.assigned_technician_id).filter(Boolean))] as string[]
  if (techIds.length === 0) return jobs
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', techIds)
  if (pErr) return jobs
  const names = new Map((profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]))
  return jobs.map((j) => ({
    ...j,
    technician_name: j.assigned_technician_id ? names.get(j.assigned_technician_id) ?? null : null,
  }))
}

/** B2: list jobs assigned to the current technician (any ticket). */
export async function listServiceJobsForTechnician(technicianId: string): Promise<ServiceJobRow[]> {
  const { data, error } = await supabase
    .from('service_jobs')
    .select('id, ticket_id, job_sequence, title, required, state, assigned_technician_id, created_at, updated_at')
    .eq('assigned_technician_id', technicianId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ServiceJobRow[]
}

/** B1/B2: create an additional job on a ticket (admin/support). */
export async function createServiceJob(input: {
  ticketId: string
  title: string
  required?: boolean
  rationale?: string
}): Promise<ServiceJobRow> {
  const { data, error } = await supabase.rpc('create_service_job', {
    p_ticket_id: input.ticketId,
    p_title: input.title,
    p_required: input.required ?? true,
    p_rationale: input.rationale ?? null,
  })
  if (error) throw mapJobRpcError(error.message)
  return asJob(data)
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
  if (error) throw mapJobRpcError(error.message)
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
  if (error) throw mapJobRpcError(error.message)
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
  if (error) throw mapJobRpcError(error.message)
  const row = data as { id?: string } | null
  if (!row?.id) throw new Error('decline_service_job returned no id')
  return { id: row.id }
}

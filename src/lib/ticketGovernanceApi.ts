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

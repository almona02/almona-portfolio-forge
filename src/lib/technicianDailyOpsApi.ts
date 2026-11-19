import { supabase } from '@/lib/supabase'

export const TECHNICIAN_DAILY_OPS_DETAIL_CODES = ['technician_daily_ops_authz_denied'] as const
export type TechnicianDailyOpsDetailCode = (typeof TECHNICIAN_DAILY_OPS_DETAIL_CODES)[number]

export type TechnicianDailyOpsRpcError = Error & {
  code?: string
  status?: number
  details?: string | null
  detailCode?: TechnicianDailyOpsDetailCode | string | null
}

export type TechnicianAssignedJobItem = {
  job_id: string
  ticket_id: string
  job_sequence: number
  job_title: string
  job_state: string
  assigned_technician_id: string | null
  updated_at: string
  ticket_number: string | null
  ticket_title: string | null
  ticket_status: string
  href: string
}

export type TechnicianUpcomingVisitItem = {
  visit_id: string
  job_id: string
  ticket_id: string
  visit_sequence: number
  visit_state: string
  scheduled_start: string
  scheduled_end: string | null
  job_title: string
  job_sequence: number
  ticket_number: string | null
  ticket_title: string | null
  ticket_status: string
  href: string
}

export type TechnicianNeedsAttentionItem = {
  visit_id: string
  job_id: string
  ticket_id: string
  visit_sequence: number
  visit_state: string
  scheduled_start: string | null
  scheduled_end: string | null
  job_title: string
  job_sequence: number
  ticket_number: string | null
  ticket_title: string | null
  ticket_status: string
  reason_code: 'report_revision' | 'report_submit' | 'in_progress_or_checklist' | 'overdue_scheduled' | string
  panel: 'visit' | 'checklist' | 'report' | string
  href: string
}

export type TechnicianDailyOpsQueue<T> = {
  count: number
  items: T[]
}

export type TechnicianDailyOpsWorkspace = {
  as_of: string
  window_end: string
  timezone: string
  assigned_jobs: TechnicianDailyOpsQueue<TechnicianAssignedJobItem>
  upcoming_visits: TechnicianDailyOpsQueue<TechnicianUpcomingVisitItem>
  needs_attention: TechnicianDailyOpsQueue<TechnicianNeedsAttentionItem>
}

export type TechnicianDailyOpsQueueKey = 'assigned_jobs' | 'upcoming_visits' | 'needs_attention'

export type TechnicianTicketFocusResolution = {
  focused: boolean
  job_id?: string | null
  visit_id?: string | null
  panel?: 'visit' | 'checklist' | 'report' | string | null
}

function mapError(error: { message: string; code?: string; details?: string | null }): TechnicianDailyOpsRpcError {
  const err = new Error(error.message) as TechnicianDailyOpsRpcError
  err.code = error.code
  err.details = error.details ?? null
  const detail = (error.details ?? '').trim()
  if (detail) err.detailCode = detail
  if (error.code === '42501' || detail === 'technician_daily_ops_authz_denied') {
    err.status = 403
  } else if (detail) {
    err.status = 422
  }
  return err
}

/** Read-only. Does not create tickets, jobs, visits, or revisions. */
export async function getTechnicianDailyOpsWorkspace(options?: {
  asOf?: string | null
}): Promise<TechnicianDailyOpsWorkspace> {
  const { data, error } = await supabase.rpc('get_technician_daily_ops_workspace', {
    p_as_of: options?.asOf ?? null,
    p_actor_id: null,
  })
  if (error) {
    throw mapError({
      message: error.message,
      code: error.code,
      details: (error as { details?: string | null }).details ?? null,
    })
  }
  return data as TechnicianDailyOpsWorkspace
}

/**
 * Resolve focus params through the authorized getter only.
 * Unauthorized / invalid / cross-ticket targets return focused=false (no disclosure).
 */
export async function resolveTechnicianTicketFocus(input: {
  ticketId: string
  jobId?: string | null
  visitId?: string | null
  panel?: string | null
}): Promise<TechnicianTicketFocusResolution> {
  const { data, error } = await supabase.rpc('resolve_technician_ticket_focus', {
    p_ticket_id: input.ticketId,
    p_job_id: input.jobId ?? null,
    p_visit_id: input.visitId ?? null,
    p_panel: input.panel ?? null,
  })
  if (error) {
    // Safe fallback — do not surface whether the target exists.
    return { focused: false }
  }
  const row = (data ?? { focused: false }) as TechnicianTicketFocusResolution
  return row?.focused ? row : { focused: false }
}

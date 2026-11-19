import { supabase } from '@/lib/supabase'

export const CUSTOMER_DAILY_OPS_DETAIL_CODES = ['customer_daily_ops_authz_denied'] as const
export type CustomerDailyOpsDetailCode = (typeof CUSTOMER_DAILY_OPS_DETAIL_CODES)[number]

export type CustomerDailyOpsRpcError = Error & {
  code?: string
  status?: number
  details?: string | null
  detailCode?: CustomerDailyOpsDetailCode | string | null
}

export type CustomerActiveTicketItem = {
  ticket_id: string
  ticket_number: string | null
  title: string
  status: string
  updated_at: string
  href: string
}

export type CustomerIssuedHeadItem = {
  revision_id: string
  report_id: string
  revision_number: number
  submitted_at: string
  visit_id: string
  job_id: string
  ticket_id: string
  job_sequence: number
  job_title: string
  visit_sequence: number
  ticket_number: string | null
  ticket_title: string | null
  ticket_status: string
  href: string
}

export type CustomerUpcomingServiceItem = {
  coverage_id: string
  machine_id: string
  sequence: number
  planned_due_date: string
  bucket: 'upcoming' | 'due' | string
  coverage_status: string
  generated: boolean
  ticket_id: string | null
  job_id: string | null
  routine_version_id: string | null
  href: string | null
}

export type CustomerDailyOpsQueue<T> = {
  count: number
  items: T[]
}

export type CustomerDailyOpsWorkspace = {
  as_of: string
  timezone: string
  active_tickets: CustomerDailyOpsQueue<CustomerActiveTicketItem>
  issued_reports: CustomerDailyOpsQueue<CustomerIssuedHeadItem>
  awaiting_acknowledgment: CustomerDailyOpsQueue<CustomerIssuedHeadItem>
  upcoming_service: CustomerDailyOpsQueue<CustomerUpcomingServiceItem>
}

export type CustomerDailyOpsQueueKey =
  | 'active_tickets'
  | 'issued_reports'
  | 'awaiting_acknowledgment'
  | 'upcoming_service'

export type CustomerTicketFocusResolution = {
  focused: boolean
  visit_id?: string | null
  revision_id?: string | null
  revision_number?: number | null
  panel?: 'issued' | string | null
}

function mapError(error: { message: string; code?: string; details?: string | null }): CustomerDailyOpsRpcError {
  const err = new Error(error.message) as CustomerDailyOpsRpcError
  err.code = error.code
  err.details = error.details ?? null
  const detail = (error.details ?? '').trim()
  if (detail) err.detailCode = detail
  if (error.code === '42501' || detail === 'customer_daily_ops_authz_denied') {
    err.status = 403
  } else if (detail) {
    err.status = 422
  }
  return err
}

/** Read-only. Does not create tickets, acknowledgments, coverage rows, or generations. */
export async function getCustomerDailyOpsWorkspace(options?: {
  asOf?: string | null
}): Promise<CustomerDailyOpsWorkspace> {
  const { data, error } = await supabase.rpc('get_customer_daily_ops_workspace', {
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
  return data as CustomerDailyOpsWorkspace
}

/**
 * Resolve issued-panel focus through the authorized getter only.
 * Unauthorized / superseded / cross-ticket targets return focused=false (no disclosure).
 */
export async function resolveCustomerTicketFocus(input: {
  ticketId: string
  visitId?: string | null
  revisionId?: string | null
  panel?: string | null
}): Promise<CustomerTicketFocusResolution> {
  const { data, error } = await supabase.rpc('resolve_customer_ticket_focus', {
    p_ticket_id: input.ticketId,
    p_visit_id: input.visitId ?? null,
    p_revision_id: input.revisionId ?? null,
    p_panel: input.panel ?? null,
  })
  if (error) {
    return { focused: false }
  }
  const row = (data ?? { focused: false }) as CustomerTicketFocusResolution
  return row?.focused ? row : { focused: false }
}

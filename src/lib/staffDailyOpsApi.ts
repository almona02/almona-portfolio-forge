import { supabase } from '@/lib/supabase'

export const STAFF_DAILY_OPS_DETAIL_CODES = ['staff_daily_ops_authz_denied'] as const
export type StaffDailyOpsDetailCode = (typeof STAFF_DAILY_OPS_DETAIL_CODES)[number]

export type StaffDailyOpsRpcError = Error & {
  code?: string
  status?: number
  details?: string | null
  detailCode?: StaffDailyOpsDetailCode | string | null
}

export type OverdueOccurrenceItem = {
  occurrence_id: string
  coverage_id: string
  sequence: number
  planned_due_date: string
  ticket_id: string
  job_id: string
  ticket_number: string | null
  ticket_title: string | null
  ticket_status: string
}

export type UnassignedJobItem = {
  job_id: string
  ticket_id: string
  job_sequence: number
  job_title: string
  job_state: string
  assigned_technician_id: string | null
  ticket_number: string | null
  ticket_title: string | null
  ticket_status: string
}

export type JobAwaitingReviewItem = {
  job_id: string
  ticket_id: string
  job_sequence: number
  job_title: string
  job_state: string
  assigned_technician_id: string | null
  ticket_number: string | null
  ticket_title: string | null
  ticket_status: string
}

export type AwaitingCustomerItem = {
  ticket_id: string
  ticket_number: string | null
  ticket_title: string | null
  ticket_status: string
  priority: string | null
}

export type StaffDailyOpsQueue<T> = {
  count: number
  items: T[]
}

export type StaffDailyOpsWorkspace = {
  as_of: string
  overdue_occurrences: StaffDailyOpsQueue<OverdueOccurrenceItem>
  unassigned_jobs: StaffDailyOpsQueue<UnassignedJobItem>
  jobs_awaiting_review: StaffDailyOpsQueue<JobAwaitingReviewItem>
  awaiting_customer: StaffDailyOpsQueue<AwaitingCustomerItem>
}

export type StaffDailyOpsQueueKey =
  | 'overdue_occurrences'
  | 'unassigned_jobs'
  | 'jobs_awaiting_review'
  | 'awaiting_customer'

function mapError(error: { message: string; code?: string; details?: string | null }): StaffDailyOpsRpcError {
  const err = new Error(error.message) as StaffDailyOpsRpcError
  err.code = error.code
  err.details = error.details ?? null
  const detail = (error.details ?? '').trim()
  if (detail) err.detailCode = detail
  if (error.code === '42501' || detail === 'staff_daily_ops_authz_denied') {
    err.status = 403
  } else if (detail) {
    err.status = 422
  }
  return err
}

/** Read-only. Does not create tickets, jobs, or occurrences. */
export async function getStaffDailyOpsWorkspace(options?: {
  asOf?: string | null
}): Promise<StaffDailyOpsWorkspace> {
  const { data, error } = await supabase.rpc('get_staff_daily_ops_workspace', {
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
  return data as StaffDailyOpsWorkspace
}

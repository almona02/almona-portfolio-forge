import { supabase } from '@/lib/supabase'

/** Frozen Lane B DETAIL codes (contract §10.2). */
export const LANE_B_PIN_DETAIL_CODES = [
  'routine_job_pin_authz_denied',
  'routine_pin_version_not_published',
  'routine_pin_version_retired',
  'routine_pin_machine_unlinked',
  'routine_pin_machine_uncatalogued',
  'routine_pin_applicability_denied',
  'routine_pin_reason_required',
  'routine_pin_cardinality',
  'routine_pin_locked_after_start',
] as const

export type LaneBPinDetailCode = (typeof LANE_B_PIN_DETAIL_CODES)[number]

export type JobRoutinePinRpcError = Error & {
  code?: string
  status?: number
  details?: string | null
  detailCode?: LaneBPinDetailCode | string | null
}

export type JobRoutinePinActive = {
  pin_id: string
  routine_id: string
  routine_code: string
  routine_name_en: string
  routine_version_id: string
  version_ordinal: number | null
  version_status: string
  status: string
  reason: string
  pinned_by: string
  pinned_at: string
  retired_badge: boolean
}

export type JobRoutinePinView = {
  job_id: string
  work_started_boundary_at: string | null
  pin_locked: boolean
  active: JobRoutinePinActive | null
}

function mapError(error: { message: string; code?: string; details?: string | null }): JobRoutinePinRpcError {
  const err = new Error(error.message) as JobRoutinePinRpcError
  err.code = error.code
  err.details = error.details ?? null
  const detail = (error.details ?? '').trim()
  if (detail) err.detailCode = detail
  if (error.code === '42501' || detail === 'routine_job_pin_authz_denied') {
    err.status = 403
  } else if (detail) {
    err.status = 422
  }
  return err
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    throw mapError({
      message: error.message,
      code: error.code,
      details: (error as { details?: string | null }).details ?? null,
    })
  }
  return data as T
}

export async function getServiceJobRoutinePin(jobId: string): Promise<JobRoutinePinView> {
  return rpc<JobRoutinePinView>('get_service_job_routine_pin', {
    p_job_id: jobId,
    p_actor_id: null,
  })
}

export async function listServiceJobRoutinePinHistory(jobId: string): Promise<{
  job_id: string
  history: Array<Record<string, unknown>>
}> {
  return rpc('list_service_job_routine_pin_history', {
    p_job_id: jobId,
    p_actor_id: null,
  })
}

export async function pinServiceJobRoutine(input: {
  jobId: string
  routineVersionId: string
  reason: string
}): Promise<Record<string, unknown>> {
  return rpc('pin_service_job_routine', {
    p_job_id: input.jobId,
    p_routine_version_id: input.routineVersionId,
    p_reason: input.reason,
    p_actor_id: null,
  })
}

export async function replaceServiceJobRoutinePin(input: {
  jobId: string
  routineVersionId: string
  reason: string
}): Promise<Record<string, unknown>> {
  return rpc('replace_service_job_routine_pin', {
    p_job_id: input.jobId,
    p_routine_version_id: input.routineVersionId,
    p_reason: input.reason,
    p_actor_id: null,
  })
}

export async function unpinServiceJobRoutine(input: {
  jobId: string
  reason: string
}): Promise<Record<string, unknown>> {
  return rpc('unpin_service_job_routine', {
    p_job_id: input.jobId,
    p_reason: input.reason,
    p_actor_id: null,
  })
}

/** Prefer exact DETAIL code for UI; never substring-match for acceptance. */
export function pinErrorDetailCode(error: unknown): string | null {
  const e = error as JobRoutinePinRpcError | null
  if (!e) return null
  if (e.detailCode) return String(e.detailCode)
  if (e.details) return String(e.details)
  return null
}

import { supabase } from '@/lib/supabase'

export const COVERAGE_DETAIL_CODES = [
  'coverage_authz_denied',
  'coverage_applicability_denied',
  'coverage_machine_unlinked',
  'coverage_machine_uncatalogued',
  'coverage_version_retired',
  'coverage_version_not_published',
  'coverage_cadence_invalid',
  'coverage_dates_invalid',
  'coverage_terminal',
  'coverage_routine_mismatch',
  'coverage_gen_forced_fail',
] as const

export type CoverageDetailCode = (typeof COVERAGE_DETAIL_CODES)[number]

export type CoverageRpcError = Error & {
  code?: string
  status?: number
  details?: string | null
  detailCode?: CoverageDetailCode | string | null
}

export type MachineCoverage = {
  coverage_id: string
  machine_id: string
  routine_id: string
  routine_version_id: string
  status: 'active' | 'paused' | 'ended' | string
  start_date: string
  end_date: string | null
  cadence_interval: number
  cadence_unit: 'days' | 'weeks' | 'months' | string
  first_planned_due_date: string
  schedule_anchor_day: number
}

export type CoverageScheduleItem = {
  coverage_id: string
  machine_id: string
  sequence: number
  planned_due_date: string
  bucket: 'upcoming' | 'due' | 'overdue' | string
  coverage_status: string
  generated: boolean
  ticket_id: string | null
  job_id: string | null
  routine_version_id: string
}

function mapError(error: { message: string; code?: string; details?: string | null }): CoverageRpcError {
  const err = new Error(error.message) as CoverageRpcError
  err.code = error.code
  err.details = error.details ?? null
  const detail = (error.details ?? '').trim()
  if (detail) err.detailCode = detail
  if (error.code === '42501' || detail === 'coverage_authz_denied') {
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

export async function createMachineCoverage(input: {
  machineId: string
  routineVersionId: string
  startDate: string
  firstPlannedDueDate: string
  cadenceInterval: number
  cadenceUnit: 'days' | 'weeks' | 'months'
  endDate?: string | null
}): Promise<MachineCoverage> {
  return rpc<MachineCoverage>('create_machine_coverage', {
    p_machine_id: input.machineId,
    p_routine_version_id: input.routineVersionId,
    p_start_date: input.startDate,
    p_first_planned_due_date: input.firstPlannedDueDate,
    p_cadence_interval: input.cadenceInterval,
    p_cadence_unit: input.cadenceUnit,
    p_end_date: input.endDate ?? null,
    p_actor_id: null,
  })
}

export async function pauseMachineCoverage(coverageId: string) {
  return rpc<{ coverage_id: string; status: string; changed: boolean }>('pause_machine_coverage', {
    p_coverage_id: coverageId,
    p_actor_id: null,
  })
}

export async function resumeMachineCoverage(coverageId: string) {
  return rpc<{ coverage_id: string; status: string; changed: boolean }>('resume_machine_coverage', {
    p_coverage_id: coverageId,
    p_actor_id: null,
  })
}

export async function endMachineCoverage(coverageId: string) {
  return rpc<{ coverage_id: string; status: string; changed: boolean }>('end_machine_coverage', {
    p_coverage_id: coverageId,
    p_actor_id: null,
  })
}

export async function adoptMachineCoverageRoutineVersion(coverageId: string, routineVersionId: string) {
  return rpc('adopt_machine_coverage_routine_version', {
    p_coverage_id: coverageId,
    p_routine_version_id: routineVersionId,
    p_actor_id: null,
  })
}

export async function changeMachineCoverageCadence(input: {
  coverageId: string
  cadenceInterval: number
  cadenceUnit: 'days' | 'weeks' | 'months'
  reanchorFirstDue?: string | null
}) {
  return rpc('change_machine_coverage_cadence', {
    p_coverage_id: input.coverageId,
    p_cadence_interval: input.cadenceInterval,
    p_cadence_unit: input.cadenceUnit,
    p_reanchor_first_due: input.reanchorFirstDue ?? null,
    p_actor_id: null,
  })
}

export async function getMachineCoverage(coverageId: string): Promise<MachineCoverage> {
  return rpc<MachineCoverage>('get_machine_coverage', {
    p_coverage_id: coverageId,
    p_actor_id: null,
  })
}

export async function generateMachineCoverageOccurrences(input?: {
  asOf?: string | null
  coverageId?: string | null
}) {
  return rpc<{
    as_of: string
    created: number
    skipped: number
    failed: number
    results: unknown[]
  }>('generate_machine_coverage_occurrences', {
    p_as_of: input?.asOf ?? null,
    p_coverage_id: input?.coverageId ?? null,
    p_actor_id: null,
  })
}

export async function listMachineCoverageSchedule(input?: {
  asOf?: string | null
  machineId?: string | null
  coverageId?: string | null
}): Promise<{ as_of: string; horizon_end: string; items: CoverageScheduleItem[] }> {
  return rpc('list_machine_coverage_schedule', {
    p_as_of: input?.asOf ?? null,
    p_machine_id: input?.machineId ?? null,
    p_coverage_id: input?.coverageId ?? null,
    p_actor_id: null,
  })
}

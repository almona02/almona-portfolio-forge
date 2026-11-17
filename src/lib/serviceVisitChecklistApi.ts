import { supabase } from '@/lib/supabase'

/** Frozen Lane C DETAIL codes (contract §3.4.1). */
export const LANE_C_CHECKLIST_DETAIL_CODES = [
  'routine_checklist_authz_denied',
  'routine_checklist_validation_denied',
  'routine_checklist_version_skew',
  'routine_checklist_stale_revision',
] as const

export type LaneCChecklistDetailCode = (typeof LANE_C_CHECKLIST_DETAIL_CODES)[number]

export type ChecklistRpcError = Error & {
  code?: string
  status?: number
  details?: string | null
  detailCode?: LaneCChecklistDetailCode | string | null
}

export type VisitChecklistWorkspace = {
  visit_id: string
  job_id: string
  ticket_id: string
  has_active_pin: boolean
  checklist_revision: number
  pinned_routine_version_id: string | null
  routine_version_id?: string
  routine_id?: string
  routine_code?: string
  routine_name_en?: string
  version_ordinal?: number | null
  version_status?: string
  payload?: {
    sections: Array<{
      id?: string
      kind?: string
      title?: string
      items?: Array<Record<string, unknown>>
    }>
  } | null
  current?: {
    routine_version_id: string
    items: Array<Record<string, unknown>>
  } | null
  can_write?: boolean
}

function mapError(error: { message: string; code?: string; details?: string | null }): ChecklistRpcError {
  const err = new Error(error.message) as ChecklistRpcError
  err.code = error.code
  err.details = error.details ?? null
  const detail = (error.details ?? '').trim()
  if (detail) err.detailCode = detail
  if (error.code === '42501' || detail === 'routine_checklist_authz_denied') {
    err.status = 403
  } else if (error.code === 'PT409' || detail === 'routine_checklist_stale_revision') {
    err.status = 409
  } else if (detail) {
    err.status = 400
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

export function isChecklistStaleRevision(error: unknown): error is ChecklistRpcError {
  const e = error as ChecklistRpcError | null
  if (!e) return false
  if (e.code === 'PT409') return true
  if (e.detailCode === 'routine_checklist_stale_revision') return true
  return (e.details ?? '').includes('routine_checklist_stale_revision')
}

export async function getVisitChecklistWorkspace(visitId: string): Promise<VisitChecklistWorkspace> {
  return rpc<VisitChecklistWorkspace>('get_visit_checklist_workspace', {
    p_visit_id: visitId,
    p_actor_id: null,
  })
}

export async function recordVisitChecklistAnswer(args: {
  visitId: string
  itemKey: string
  outcome: 'passed' | 'failed' | 'not_applicable'
  expectedChecklistRevision: number
  value?: number | null
  unit?: string | null
  evidencePaths?: string[] | null
  note?: string | null
}): Promise<Record<string, unknown>> {
  return rpc<Record<string, unknown>>('record_visit_checklist_answer', {
    p_visit_id: args.visitId,
    p_item_key: args.itemKey,
    p_outcome: args.outcome,
    p_expected_checklist_revision: args.expectedChecklistRevision,
    p_value: args.value ?? null,
    p_unit: args.unit ?? null,
    p_evidence_paths: args.evidencePaths ?? null,
    p_note: args.note ?? null,
    p_actor_id: null,
  })
}

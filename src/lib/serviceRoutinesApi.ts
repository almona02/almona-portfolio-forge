import { supabase } from '@/lib/supabase'

export type RoutinePayload = {
  sections: Array<{
    id: string
    kind: string
    title: string
    items: Array<Record<string, unknown>>
  }>
  cadence?: { interval?: number; unit?: string }
}

export type RoutineListRow = {
  id: string
  code: string
  name_en: string
  name_ar: string
  description: string
  status: string
  updated_at: string
}

export type RoutineVersionRow = {
  id: string
  routine_id: string
  version_ordinal: number | null
  status: string
  draft_revision: string
  author_id: string
  published_at: string | null
  retired_at: string | null
  created_at: string
  payload: RoutinePayload
}

/** Stable STG-01 / contract identifier for optimistic draft conflicts. */
export const ROUTINE_DRAFT_STALE_REVISION = 'routine_draft_stale_revision'

export type ServiceRoutineRpcError = Error & {
  code?: string
  status?: number
  conflictCode?: typeof ROUTINE_DRAFT_STALE_REVISION
  details?: string | null
  hint?: string | null
}

export function isRoutineDraftStaleConflict(error: unknown): error is ServiceRoutineRpcError {
  const e = error as ServiceRoutineRpcError | null
  if (!e) return false
  if (e.conflictCode === ROUTINE_DRAFT_STALE_REVISION) return true
  if (e.code === 'PT409') return true
  const detail = (e.details ?? '').toLowerCase()
  if (detail.includes(ROUTINE_DRAFT_STALE_REVISION)) return true
  return (e.message ?? '').toLowerCase().includes('stale draft')
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const err = new Error(error.message) as ServiceRoutineRpcError
    err.code = error.code
    err.details = (error as { details?: string | null }).details ?? null
    err.hint = (error as { hint?: string | null }).hint ?? null
    if (
      error.code === 'PT409' ||
      (err.details ?? '').includes(ROUTINE_DRAFT_STALE_REVISION) ||
      error.message.toLowerCase().includes('stale draft')
    ) {
      err.status = 409
      err.conflictCode = ROUTINE_DRAFT_STALE_REVISION
    }
    throw err
  }
  return data as T
}

/**
 * Starter payload for Admin draft create (F-02).
 * Structurally valid for publish validation: dedicated safety section + non-waivable
 * safety_gate with required type/requirement_class. No invented manufacturer
 * instructions, tolerances, limits, or review approval.
 */
export function defaultRoutinePayload(): RoutinePayload {
  return {
    sections: [
      {
        id: 'safety',
        kind: 'safety',
        title: 'Safety',
        items: [
          {
            id: 'gate-1',
            type: 'safety_gate',
            requirement_class: 'safety_gate',
            title: 'Lockout / tagout confirmed',
            instruction: 'Confirm energy isolation before work.',
            waivable: false,
            evidence: 'none',
          },
        ],
      },
      {
        id: 'checks',
        kind: 'inspection',
        title: 'Checks',
        items: [
          {
            id: 'check-1',
            type: 'inspection',
            requirement_class: 'required',
            title: 'Visual inspection',
            instruction: 'Inspect guards and covers.',
            evidence: 'none',
          },
        ],
      },
    ],
  }
}

export const serviceRoutinesApi = {
  async listRoutines(): Promise<RoutineListRow[]> {
    const { data, error } = await supabase
      .from('service_routines')
      .select('id,code,name_en,name_ar,description,status,updated_at')
      .order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as RoutineListRow[]
  },

  async listVersions(routineId: string): Promise<RoutineVersionRow[]> {
    const { data, error } = await supabase
      .from('service_routine_versions')
      .select(
        'id,routine_id,version_ordinal,status,draft_revision,author_id,published_at,retired_at,created_at,payload',
      )
      .eq('routine_id', routineId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as RoutineVersionRow[]
  },

  /** Support/Admin queue of versions awaiting independent review (not a general admin surface). */
  async listVersionsInReview(): Promise<Array<RoutineVersionRow & { routine_code?: string; routine_name?: string }>> {
    const { data, error } = await supabase
      .from('service_routine_versions')
      .select(
        'id,routine_id,version_ordinal,status,draft_revision,author_id,published_at,retired_at,created_at,payload,service_routines(code,name_en)',
      )
      .eq('status', 'in_review')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: Record<string, unknown>) => {
      const routine = row.service_routines as { code?: string; name_en?: string } | null
      const { service_routines: _join, ...rest } = row
      return {
        ...(rest as RoutineVersionRow),
        routine_code: routine?.code,
        routine_name: routine?.name_en,
      }
    })
  },

  async listApplicability(routineId: string) {
    const { data, error } = await supabase
      .from('service_routine_applicability')
      .select('id,kind,value,value_family,override_reason,overridden_at')
      .eq('routine_id', routineId)
      .order('kind')
    if (error) throw new Error(error.message)
    return data ?? []
  },

  createDraft(input: {
    code: string
    nameEn: string
    nameAr?: string
    description?: string
    payload: RoutinePayload
    families: string[]
  }) {
    return rpc<Record<string, unknown>>('create_service_routine_draft', {
      p_code: input.code,
      p_name_en: input.nameEn,
      p_name_ar: input.nameAr ?? '',
      p_description: input.description ?? '',
      p_payload: input.payload,
      p_families: input.families,
      p_actor_id: null,
    })
  },

  updateDraft(input: {
    versionId: string
    expectedDraftRevision: string
    payload: RoutinePayload
    nameEn?: string
    nameAr?: string
    description?: string
  }) {
    return rpc<Record<string, unknown>>('update_service_routine_draft', {
      p_version_id: input.versionId,
      p_expected_draft_revision: input.expectedDraftRevision,
      p_payload: input.payload,
      p_name_en: input.nameEn ?? null,
      p_name_ar: input.nameAr ?? null,
      p_description: input.description ?? null,
      p_actor_id: null,
    })
  },

  submitForReview(versionId: string) {
    return rpc<Record<string, unknown>>('submit_service_routine_for_review', {
      p_version_id: versionId,
      p_actor_id: null,
    })
  },

  recordReview(versionId: string, rationale: string) {
    return rpc<Record<string, unknown>>('record_service_routine_review', {
      p_version_id: versionId,
      p_rationale: rationale,
      p_actor_id: null,
    })
  },

  publish(versionId: string) {
    return rpc<Record<string, unknown>>('publish_service_routine_version', {
      p_version_id: versionId,
      p_actor_id: null,
    })
  },

  retire(versionId: string) {
    return rpc<Record<string, unknown>>('retire_service_routine_version', {
      p_version_id: versionId,
      p_actor_id: null,
    })
  },

  setApplicability(input: {
    routineId: string
    kind: 'family' | 'manufacturer' | 'catalog_model'
    value: string
    valueFamily?: string
    overrideReason?: string
  }) {
    return rpc<Record<string, unknown>>('set_service_routine_applicability', {
      p_routine_id: input.routineId,
      p_kind: input.kind,
      p_value: input.value,
      p_value_family: input.valueFamily ?? null,
      p_override_reason: input.overrideReason ?? null,
      p_actor_id: null,
    })
  },

  setManufacturerRestrictions(input: {
    routineId: string
    allowList?: string[]
    denyList?: string[]
  }) {
    return rpc<Record<string, unknown>>('set_service_routine_manufacturer_restrictions', {
      p_routine_id: input.routineId,
      p_allow_list: input.allowList ?? null,
      p_deny_list: input.denyList ?? null,
      p_actor_id: null,
    })
  },

  preview(versionId: string) {
    return rpc<Record<string, unknown>>('get_service_routine_preview', {
      p_version_id: versionId,
      p_actor_id: null,
    })
  },

  createNextDraft(routineId: string, payload?: RoutinePayload) {
    return rpc<Record<string, unknown>>('create_next_service_routine_draft', {
      p_routine_id: routineId,
      p_payload: payload ?? null,
      p_actor_id: null,
    })
  },
}

export default serviceRoutinesApi

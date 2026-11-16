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

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const err = new Error(error.message) as Error & { code?: string; status?: number }
    err.code = error.code
    if (error.message.toLowerCase().includes('stale draft')) err.status = 409
    throw err
  }
  return data as T
}

/** Minimal valid publishable payload (safety section + gate). */
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
            kind: 'safety_gate',
            title: 'Lockout / tagout confirmed',
            instructions: 'Confirm energy isolation before work.',
          },
        ],
      },
      {
        id: 'checks',
        kind: 'checklist',
        title: 'Checks',
        items: [
          {
            id: 'check-1',
            kind: 'check',
            title: 'Visual inspection',
            instructions: 'Inspect guards and covers.',
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

// Cursor evidence: Lane A API binding tests (not Spark evidence).
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import { defaultRoutinePayload, serviceRoutinesApi } from './serviceRoutinesApi'

const rpcMock = supabase.rpc as unknown as ReturnType<typeof vi.fn>
const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('serviceRoutinesApi Lane A bindings (Cursor evidence)', () => {
  it('createDraft binds exact RPC signature', async () => {
    const payload = defaultRoutinePayload()
    rpcMock.mockResolvedValue({ data: { version_id: 'v1' }, error: null })
    await serviceRoutinesApi.createDraft({
      code: 'RA-SAW-01',
      nameEn: 'Saw PM',
      payload,
      families: ['saw'],
    })
    expect(rpcMock).toHaveBeenCalledWith('create_service_routine_draft', {
      p_code: 'RA-SAW-01',
      p_name_en: 'Saw PM',
      p_name_ar: '',
      p_description: '',
      p_payload: payload,
      p_families: ['saw'],
      p_actor_id: null,
    })
  })

  it('updateDraft binds draft_revision concurrency token', async () => {
    rpcMock.mockResolvedValue({ data: { draft_revision: 'abc' }, error: null })
    await serviceRoutinesApi.updateDraft({
      versionId: 'ver-1',
      expectedDraftRevision: 'old-rev',
      payload: defaultRoutinePayload(),
      nameEn: 'Updated',
    })
    expect(rpcMock).toHaveBeenCalledWith('update_service_routine_draft', {
      p_version_id: 'ver-1',
      p_expected_draft_revision: 'old-rev',
      p_payload: defaultRoutinePayload(),
      p_name_en: 'Updated',
      p_name_ar: null,
      p_description: null,
      p_actor_id: null,
    })
  })

  it('submit / review / publish / retire bind lifecycle RPCs', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null })
    await serviceRoutinesApi.submitForReview('ver-1')
    expect(rpcMock).toHaveBeenCalledWith('submit_service_routine_for_review', {
      p_version_id: 'ver-1',
      p_actor_id: null,
    })
    await serviceRoutinesApi.recordReview('ver-1', 'feasible')
    expect(rpcMock).toHaveBeenCalledWith('record_service_routine_review', {
      p_version_id: 'ver-1',
      p_rationale: 'feasible',
      p_actor_id: null,
    })
    await serviceRoutinesApi.publish('ver-1')
    expect(rpcMock).toHaveBeenCalledWith('publish_service_routine_version', {
      p_version_id: 'ver-1',
      p_actor_id: null,
    })
    await serviceRoutinesApi.retire('ver-1')
    expect(rpcMock).toHaveBeenCalledWith('retire_service_routine_version', {
      p_version_id: 'ver-1',
      p_actor_id: null,
    })
  })

  it('setApplicability and preview bind metadata + read-only preview', async () => {
    rpcMock.mockResolvedValue({ data: { read_only: true }, error: null })
    await serviceRoutinesApi.setApplicability({
      routineId: 'r1',
      kind: 'catalog_model',
      value: 'DC 550',
      valueFamily: 'saw',
      overrideReason: 'catalog family soft note',
    })
    expect(rpcMock).toHaveBeenCalledWith('set_service_routine_applicability', {
      p_routine_id: 'r1',
      p_kind: 'catalog_model',
      p_value: 'DC 550',
      p_value_family: 'saw',
      p_override_reason: 'catalog family soft note',
      p_actor_id: null,
    })
    await serviceRoutinesApi.preview('ver-1')
    expect(rpcMock).toHaveBeenCalledWith('get_service_routine_preview', {
      p_version_id: 'ver-1',
      p_actor_id: null,
    })
  })

  it('maps stale draft conflict to status 409', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'stale draft_revision', code: 'P0001' },
    })
    await expect(
      serviceRoutinesApi.updateDraft({
        versionId: 'ver-1',
        expectedDraftRevision: 'stale',
        payload: defaultRoutinePayload(),
      }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('listRoutines queries service_routines select surface', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const select = vi.fn(() => ({ order }))
    fromMock.mockReturnValue({ select })
    await serviceRoutinesApi.listRoutines()
    expect(fromMock).toHaveBeenCalledWith('service_routines')
    expect(select).toHaveBeenCalledWith('id,code,name_en,name_ar,description,status,updated_at')
  })
})

// Spark independent Lane A component checks (RA-A bindings, errors, default payload).
// C4 is it.fails: F-LANEA-02 ΓÇö default gate lacks a server-recognized marker.
// Remove .fails when the default payload carries type/requirement_class.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }))
import { supabase } from '@/lib/supabase'
import { defaultRoutinePayload, serviceRoutinesApi } from '@/lib/serviceRoutinesApi'

const rpcMock = supabase.rpc as unknown as ReturnType<typeof vi.fn>
beforeEach(() => { vi.clearAllMocks(); rpcMock.mockResolvedValue({ data: { ok: true }, error: null }) })

describe('Spark Lane A component (independent)', () => {
  it('C1: every mutating binding sends p_actor_id null (no client impersonation)', async () => {
    const payload = defaultRoutinePayload()
    await serviceRoutinesApi.createDraft({ code: 'X', nameEn: 'Y', payload, families: ['saw'] })
    await serviceRoutinesApi.updateDraft({ versionId: 'v', expectedDraftRevision: 'r', payload })
    await serviceRoutinesApi.submitForReview('v')
    await serviceRoutinesApi.recordReview('v', 'ok')
    await serviceRoutinesApi.publish('v')
    await serviceRoutinesApi.retire('v')
    await serviceRoutinesApi.setApplicability({ routineId: 'r', kind: 'family', value: 'saw' })
    await serviceRoutinesApi.setManufacturerRestrictions({ routineId: 'r', denyList: ['Z'] })
    await serviceRoutinesApi.preview('v')
    await serviceRoutinesApi.createNextDraft('r')
    expect(rpcMock).toHaveBeenCalledTimes(10)
    for (const call of rpcMock.mock.calls) {
      expect(call[1]).toMatchObject({ p_actor_id: null })
    }
  })

  it('C2: lifecycle bindings call exact freeze-doc RPC names', async () => {
    const payload = defaultRoutinePayload()
    const cases: Array<[string, () => Promise<unknown>]> = [
      ['submit_service_routine_for_review', () => serviceRoutinesApi.submitForReview('v')],
      ['record_service_routine_review', () => serviceRoutinesApi.recordReview('v', 'r')],
      ['publish_service_routine_version', () => serviceRoutinesApi.publish('v')],
      ['retire_service_routine_version', () => serviceRoutinesApi.retire('v')],
      ['get_service_routine_preview', () => serviceRoutinesApi.preview('v')],
      ['create_next_service_routine_draft', () => serviceRoutinesApi.createNextDraft('r', payload)],
      ['set_service_routine_applicability', () => serviceRoutinesApi.setApplicability({ routineId: 'r', kind: 'family', value: 'saw' })],
      ['set_service_routine_manufacturer_restrictions', () => serviceRoutinesApi.setManufacturerRestrictions({ routineId: 'r' })],
    ]
    for (const [fn, call] of cases) { vi.clearAllMocks(); await call(); expect(rpcMock).toHaveBeenCalledTimes(1); expect(rpcMock.mock.calls[0][0]).toBe(fn) }
  })

  it('C3: stale-draft error maps to 409; authz error stays explicit with code', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'Stale draft revision', code: '40001' } })
    const stale = await serviceRoutinesApi.updateDraft({ versionId: 'v', expectedDraftRevision: 'old', payload: defaultRoutinePayload() }).then(() => null, (e) => e)
    expect(stale).not.toBeNull(); expect(stale.status).toBe(409); expect(stale.code).toBe('40001')
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'Admin required', code: '42501' } })
    const denied = await serviceRoutinesApi.publish('v').then(() => null, (e) => e)
    expect(denied).not.toBeNull(); expect(denied.code).toBe('42501'); expect(denied.message).toMatch(/Admin required/)
    expect('data' in denied).toBe(false)
  })

  it('C4: default payload gate carries a server-recognized safety_gate marker (F-LANEA-02 fixed)', () => {
    const payload = defaultRoutinePayload()
    const safety = payload.sections.find((s) => s.kind === 'safety')
    expect(safety).toBeDefined()
    const gate = (safety?.items ?? []).find((it) => it.type === 'safety_gate' || it.requirement_class === 'safety_gate')
    expect(gate).toBeDefined()
  })

  it('C5: updateDraft passes the expected revision token through unchanged', async () => {
    await serviceRoutinesApi.updateDraft({ versionId: 'v', expectedDraftRevision: 'rev-123', payload: defaultRoutinePayload() })
    expect(rpcMock).toHaveBeenCalledWith('update_service_routine_draft', expect.objectContaining({ p_expected_draft_revision: 'rev-123' }))
  })
})

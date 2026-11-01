/**
 * Workshop configurator save paths. Every table has a NOT NULL owner column
 * with no DB default and owner-scoped RLS, so writes must carry the user id
 * and validation must reject bad input before it reaches Supabase.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const calls: Array<{ table: string; op: string; payload: unknown; options?: unknown }> = []
  const getUser = vi.fn()
  const makeQuery = (table: string) => {
    const q: Record<string, unknown> = {}
    const chain = () => q
    q.select = chain
    q.order = chain
    q.eq = chain
    q.single = chain
    q.insert = (payload: unknown) => { calls.push({ table, op: 'insert', payload }); return q }
    q.upsert = (payload: unknown, options?: unknown) => { calls.push({ table, op: 'upsert', payload, options }); return q }
    q.update = (payload: unknown) => { calls.push({ table, op: 'update', payload }); return q }
    q.delete = () => { calls.push({ table, op: 'delete', payload: null }); return q }
    q.then = (resolve: (v: unknown) => void) => resolve({ data: { id: 'row-1' }, error: null })
    return q
  }
  return { calls, getUser, from: vi.fn((table: string) => makeQuery(table)) }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from, auth: { getUser: mocks.getUser } },
}))

import { FabricatorConfigError, TUNING_PARAM_DEFS, fabricatorConfigApi, validateTuningValue } from './fabricatorConfigApi'

beforeEach(() => {
  mocks.calls.length = 0
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-42' } }, error: null })
})

describe('fabricatorConfigApi owner scoping', () => {
  it('stamps user_id on new profiles', async () => {
    await fabricatorConfigApi.createProfile({ name: ' PS-6601 ', material: 'aluminum', width: 60, cost_per_meter: 10, cutting_allowance: 3 })
    const call = mocks.calls.find((c) => c.table === 'fabricator_profiles' && c.op === 'insert')
    expect(call?.payload).toMatchObject({ user_id: 'user-42', name: 'PS-6601', material: 'aluminum' })
  })

  it('stamps user_id on new accessories', async () => {
    await fabricatorConfigApi.createAccessory({ name: 'Hinge set', type: 'hinge', unit_price: 5, base_cost: 3 })
    const call = mocks.calls.find((c) => c.table === 'fabricator_accessories' && c.op === 'insert')
    expect(call?.payload).toMatchObject({ user_id: 'user-42', name: 'Hinge set' })
  })

  it('stamps owner_id on manufacturing rules and rejects unknown rule types', async () => {
    await fabricatorConfigApi.createRule({ name: 'Frame end-mill', rule_type: 'machining' })
    const call = mocks.calls.find((c) => c.table === 'manufacturing_rules' && c.op === 'insert')
    expect(call?.payload).toMatchObject({ owner_id: 'user-42', rule_type: 'machining' })
    await expect(fabricatorConfigApi.createRule({ name: 'x', rule_type: 'magic' })).rejects.toBeInstanceOf(FabricatorConfigError)
  })

  it('upserts tuning with owner_id on the (owner_id,key) conflict target', async () => {
    await fabricatorConfigApi.saveTuning('saw_kerf_mm', 4.2)
    const call = mocks.calls.find((c) => c.table === 'fabricator_tuning' && c.op === 'upsert')
    expect(call?.payload).toMatchObject({ owner_id: 'user-42', key: 'saw_kerf_mm', value: 4.2, unit: 'mm' })
    expect(call?.options).toEqual({ onConflict: 'owner_id,key' })
  })

  it('fails closed when not signed in instead of sending an ownerless row', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(fabricatorConfigApi.saveTuning('saw_kerf_mm', 4)).rejects.toMatchObject({ code: 'NOT_AUTHENTICATED' })
    expect(mocks.calls.filter((c) => c.op !== 'select')).toHaveLength(0)
  })

  it('does not expose a create-pack path that would write an empty spec', () => {
    expect('createPack' in fabricatorConfigApi).toBe(false)
  })
})

describe('tuning validation', () => {
  it('bounds every admin-editable default', () => {
    for (const def of TUNING_PARAM_DEFS) {
      expect(validateTuningValue(def.key, def.min)).toBeNull()
      expect(validateTuningValue(def.key, def.max)).toBeNull()
      expect(validateTuningValue(def.key, def.max + 1)).toMatch(/between/)
      expect(validateTuningValue(def.key, -1)).toMatch(/between/)
      expect(validateTuningValue(def.key, 'abc')).toMatch(/number/)
      expect(validateTuningValue(def.key, '')).toMatch(/number/)
    }
    expect(validateTuningValue('nope', 1)).toMatch(/Unknown/)
  })

  it('rejects before hitting the database', async () => {
    await expect(fabricatorConfigApi.saveTuning('saw_kerf_mm', 99)).rejects.toBeInstanceOf(FabricatorConfigError)
    expect(mocks.calls).toHaveLength(0)
  })
})

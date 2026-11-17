import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}))

import {
  getServiceJobRoutinePin,
  pinErrorDetailCode,
  pinServiceJobRoutine,
  replaceServiceJobRoutinePin,
  unpinServiceJobRoutine,
} from './serviceJobRoutinePinsApi'

describe('serviceJobRoutinePinsApi', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('calls pin / replace / unpin / get RPCs with frozen arg names', async () => {
    rpcMock.mockResolvedValue({ data: { status: 'active' }, error: null })
    await pinServiceJobRoutine({ jobId: 'j1', routineVersionId: 'v1', reason: 'r' })
    expect(rpcMock).toHaveBeenCalledWith('pin_service_job_routine', {
      p_job_id: 'j1',
      p_routine_version_id: 'v1',
      p_reason: 'r',
      p_actor_id: null,
    })
    await replaceServiceJobRoutinePin({ jobId: 'j1', routineVersionId: 'v2', reason: 'r2' })
    expect(rpcMock).toHaveBeenCalledWith('replace_service_job_routine_pin', expect.any(Object))
    await unpinServiceJobRoutine({ jobId: 'j1', reason: 'u' })
    expect(rpcMock).toHaveBeenCalledWith('unpin_service_job_routine', expect.any(Object))
    await getServiceJobRoutinePin('j1')
    expect(rpcMock).toHaveBeenCalledWith('get_service_job_routine_pin', {
      p_job_id: 'j1',
      p_actor_id: null,
    })
  })

  it('surfaces exact DETAIL codes without substring matching', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        message: 'Pin locked after work start',
        code: '22023',
        details: 'routine_pin_locked_after_start',
      },
    })
    await expect(
      pinServiceJobRoutine({ jobId: 'j', routineVersionId: 'v', reason: 'x' }),
    ).rejects.toMatchObject({
      detailCode: 'routine_pin_locked_after_start',
      status: 422,
    })
    try {
      await pinServiceJobRoutine({ jobId: 'j', routineVersionId: 'v', reason: 'x' })
    } catch (e) {
      expect(pinErrorDetailCode(e)).toBe('routine_pin_locked_after_start')
    }
  })

  it('maps authz DETAIL to 403', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        message: 'Not permitted',
        code: '42501',
        details: 'routine_job_pin_authz_denied',
      },
    })
    await expect(
      unpinServiceJobRoutine({ jobId: 'j', reason: 'x' }),
    ).rejects.toMatchObject({ status: 403, detailCode: 'routine_job_pin_authz_denied' })
  })
})

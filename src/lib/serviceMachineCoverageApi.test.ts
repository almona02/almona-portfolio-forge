import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
  },
}))

import {
  COVERAGE_DETAIL_CODES,
  adoptMachineCoverageRoutineVersion,
  changeMachineCoverageCadence,
  createMachineCoverage,
  endMachineCoverage,
  generateMachineCoverageOccurrences,
  getMachineCoverage,
  listMachineCoverageSchedule,
  pauseMachineCoverage,
  resumeMachineCoverage,
} from './serviceMachineCoverageApi'

describe('serviceMachineCoverageApi', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('exposes frozen coverage detail codes including authz deny', () => {
    expect(COVERAGE_DETAIL_CODES).toContain('coverage_authz_denied')
    expect(COVERAGE_DETAIL_CODES).toContain('coverage_applicability_denied')
    expect(COVERAGE_DETAIL_CODES).not.toContain('coverage_override_allowed')
  })

  it('createMachineCoverage maps RPC args', async () => {
    rpc.mockResolvedValue({ data: { coverage_id: 'c1', status: 'active' }, error: null })
    const row = await createMachineCoverage({
      machineId: 'm1',
      routineVersionId: 'v1',
      startDate: '2026-01-01',
      firstPlannedDueDate: '2026-01-31',
      cadenceInterval: 1,
      cadenceUnit: 'months',
      endDate: null,
    })
    expect(row.status).toBe('active')
    expect(rpc).toHaveBeenCalledWith('create_machine_coverage', expect.objectContaining({
      p_machine_id: 'm1',
      p_routine_version_id: 'v1',
      p_cadence_unit: 'months',
    }))
  })

  it('maps coverage_authz_denied to 403', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'denied', code: '42501', details: 'coverage_authz_denied' },
    })
    await expect(pauseMachineCoverage('c1')).rejects.toMatchObject({
      status: 403,
      detailCode: 'coverage_authz_denied',
    })
  })

  it('wires pause/resume/end/adopt/cadence/generate/list/get', async () => {
    rpc.mockResolvedValue({ data: { ok: true }, error: null })
    await resumeMachineCoverage('c1')
    await endMachineCoverage('c1')
    await adoptMachineCoverageRoutineVersion('c1', 'v2')
    await changeMachineCoverageCadence({
      coverageId: 'c1',
      cadenceInterval: 14,
      cadenceUnit: 'days',
    })
    await generateMachineCoverageOccurrences({ asOf: '2026-03-15', coverageId: 'c1' })
    await listMachineCoverageSchedule({ asOf: '2026-03-15' })
    await getMachineCoverage('c1')
    const names = rpc.mock.calls.map((c) => c[0])
    expect(names).toEqual([
      'resume_machine_coverage',
      'end_machine_coverage',
      'adopt_machine_coverage_routine_version',
      'change_machine_coverage_cadence',
      'generate_machine_coverage_occurrences',
      'list_machine_coverage_schedule',
      'get_machine_coverage',
    ])
  })
})

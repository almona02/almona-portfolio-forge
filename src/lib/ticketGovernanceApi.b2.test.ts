// Spark independent phase-2 verification for B2 ticketGovernanceApi wrappers:
// error mapping, create defaults, and job-list enrichment tolerance.
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import {
  assignServiceJob,
  createServiceJob,
  declineServiceJob,
  listServiceJobsForTechnician,
  listServiceJobsForTicket,
} from '@/lib/ticketGovernanceApi'

const rpcMock = supabase.rpc as unknown as ReturnType<typeof vi.fn>
const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>

function selectChain(final: { data: unknown; error: null }) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ order: vi.fn(async () => final) })),
      in: vi.fn(async () => final),
    })),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ticketGovernanceApi B2 wrappers (Spark independent)', () => {
  it('U16a active-visit RPC errors map to the clear user message', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'Cannot reassign job with an in-progress visit' },
    })
    await expect(assignServiceJob({ jobId: 'j', technicianId: 't' })).rejects.toThrow(
      /visit is in progress.*visit workflow first/i,
    )
  })

  it('U16b decline active-visit errors map the same way', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'Cannot decline job with an in-progress visit' },
    })
    await expect(declineServiceJob({ jobId: 'j', reason: 'x' })).rejects.toThrow(
      /visit is in progress/i,
    )
  })

  it('U16c authorization errors pass through with the original message', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'Only admin/support may assign jobs' },
    })
    await expect(assignServiceJob({ jobId: 'j', technicianId: 't' })).rejects.toThrow(
      'Only admin/support may assign jobs',
    )
  })

  it('U16d unknown errors keep a safe passthrough fallback (not active-visit)', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'Assignee must be technician/admin/support' },
    })
    await expect(assignServiceJob({ jobId: 'j', technicianId: 't' })).rejects.toThrow(
      'Assignee must be technician/admin/support',
    )
    await expect(assignServiceJob({ jobId: 'j', technicianId: 't' })).rejects.not.toThrow(
      /visit is in progress/i,
    )
  })

  it('U17 createServiceJob defaults additional jobs to required', async () => {
    rpcMock.mockResolvedValue({ data: { id: 'j9' }, error: null })
    await createServiceJob({ ticketId: 't-1', title: 'Extra' })
    expect(rpcMock).toHaveBeenCalledWith(
      'create_service_job',
      expect.objectContaining({ p_required: true }),
    )
    await createServiceJob({ ticketId: 't-1', title: 'Opt', required: false })
    expect(rpcMock).toHaveBeenLastCalledWith(
      'create_service_job',
      expect.objectContaining({ p_required: false }),
    )
  })

  it('U18a job list enriches technician names from profiles', async () => {
    const jobs = [
      { id: 'j1', assigned_technician_id: 'tech-1' },
      { id: 'j2', assigned_technician_id: null },
    ]
    fromMock
      .mockReturnValueOnce(selectChain({ data: jobs, error: null }))
      .mockReturnValueOnce(
        selectChain({ data: [{ id: 'tech-1', full_name: 'Tech One' }], error: null }),
      )
    const rows = await listServiceJobsForTicket('t-1')
    expect(rows[0].technician_name).toBe('Tech One')
    expect(rows[1].technician_name).toBeNull()
    expect(fromMock).toHaveBeenCalledWith('service_jobs')
    expect(fromMock).toHaveBeenCalledWith('profiles')
  })

  it('U18b profile lookup failure still returns jobs without names', async () => {
    const jobs = [{ id: 'j1', assigned_technician_id: 'tech-1' }]
    fromMock
      .mockReturnValueOnce(selectChain({ data: jobs, error: null }))
      .mockImplementationOnce(() => ({
        select: () => ({ in: async () => ({ data: null, error: { message: 'denied' } }) }),
      }))
    const rows = await listServiceJobsForTicket('t-1')
    expect(rows).toHaveLength(1)
    expect(rows[0].technician_name).toBeUndefined()
  })

  it('U18c technician list filters by assignee and merges attended completed visits', async () => {
    const orderMock = vi.fn(async () => ({
      data: [{ id: 'j-assigned', assigned_technician_id: 'tech-1' }],
      error: null,
    }))
    const eqMock = vi.fn(() => ({ order: orderMock }))
    const visitEq2 = vi.fn(async () => ({
      data: [{ job_id: 'j-hist' }, { job_id: 'j-assigned' }],
      error: null,
    }))
    const visitEq1 = vi.fn(() => ({ eq: visitEq2 }))
    fromMock
      .mockReturnValueOnce({ select: vi.fn(() => ({ eq: eqMock })) })
      .mockReturnValueOnce({ select: vi.fn(() => ({ eq: visitEq1 })) })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          in: vi.fn(async () => ({
            data: [{ id: 'j-hist', assigned_technician_id: 'tech-2' }],
            error: null,
          })),
        })),
      })
    const rows = await listServiceJobsForTechnician('tech-1')
    expect(fromMock).toHaveBeenCalledWith('service_jobs')
    expect(fromMock).toHaveBeenCalledWith('service_job_visits')
    expect(eqMock).toHaveBeenCalledWith('assigned_technician_id', 'tech-1')
    expect(rows.map((r) => r.id)).toEqual(['j-assigned', 'j-hist'])
  })
})

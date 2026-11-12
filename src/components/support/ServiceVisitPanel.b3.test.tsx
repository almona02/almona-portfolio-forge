// B3 visit panel: reason gates + mapped RPC error surfacing.
// Run: npx vitest run src/components/support/ServiceVisitPanel.b3.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServiceVisitPanel } from './ServiceVisitPanel'
import type { ServiceVisitRow } from '@/lib/ticketGovernanceApi'

vi.mock('@/lib/ticketGovernanceApi', () => ({
  listServiceVisitsForJob: vi.fn(),
  scheduleServiceJobVisit: vi.fn(),
  rescheduleServiceJobVisit: vi.fn(),
  startServiceJobVisit: vi.fn(),
  completeServiceJobVisit: vi.fn(),
  abortServiceJobVisit: vi.fn(),
  recordVisitNoAccess: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import {
  abortServiceJobVisit,
  listServiceVisitsForJob,
  startServiceJobVisit,
} from '@/lib/ticketGovernanceApi'
import { toast } from 'sonner'

const listMock = listServiceVisitsForJob as unknown as ReturnType<typeof vi.fn>
const startMock = startServiceJobVisit as unknown as ReturnType<typeof vi.fn>
const abortMock = abortServiceJobVisit as unknown as ReturnType<typeof vi.fn>
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>

function visit(partial: Partial<ServiceVisitRow> & Pick<ServiceVisitRow, 'id' | 'state'>): ServiceVisitRow {
  return {
    job_id: 'job-1',
    visit_sequence: 1,
    scheduled_start: '2026-11-13T10:00:00Z',
    scheduled_end: '2026-11-13T12:00:00Z',
    actual_start: null,
    actual_end: null,
    attending_technician_id: 'tech-1',
    outcome_reason: null,
    updated_at: '2026-11-12T00:00:00Z',
    ...partial,
  }
}

function setup(role: 'admin' | 'technician' = 'technician', canExecute = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ServiceVisitPanel jobId="job-1" viewerRole={role} canExecute={canExecute} />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup() }
}

beforeEach(() => {
  vi.clearAllMocks()
  listMock.mockResolvedValue([
    visit({ id: 'visit-1', state: 'scheduled', visit_sequence: 1 }),
    visit({ id: 'visit-2', state: 'in_progress', visit_sequence: 2, actual_start: '2026-11-13T10:05:00Z' }),
  ])
  startMock.mockResolvedValue(visit({ id: 'visit-1', state: 'in_progress' }))
  abortMock.mockResolvedValue(visit({ id: 'visit-2', state: 'aborted' }))
})

describe('ServiceVisitPanel B3', () => {
  it('lists visits and shows execute controls for assigned technician', async () => {
    setup('technician', true)
    expect(await screen.findByText(/Visit 1: scheduled/)).toBeInTheDocument()
    expect(screen.getByText(/Visit 2: in_progress/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Complete visit' })).toBeInTheDocument()
  })

  it('blocks abort without a reason (client gate)', async () => {
    const { user } = setup('technician', true)
    await screen.findByText(/Visit 2: in_progress/)
    const abortButtons = screen.getAllByRole('button', { name: 'Abort' })
    await user.click(abortButtons[1])
    expect(abortMock).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent(/reason is required/i)
    expect(toastError).toHaveBeenCalled()
  })

  it('aborts when reason is provided', async () => {
    const { user } = setup('technician', true)
    await screen.findByText(/Visit 2: in_progress/)
    const reasonBoxes = screen.getAllByPlaceholderText(/Required for abort/)
    await user.type(reasonBoxes[1], 'parts missing')
    const abortButtons = screen.getAllByRole('button', { name: 'Abort' })
    await user.click(abortButtons[1])
    await waitFor(() =>
      expect(abortMock).toHaveBeenCalledWith({ visitId: 'visit-2', reason: 'parts missing' }),
    )
  })

  it('surfaces mapped start concurrency errors', async () => {
    startMock.mockRejectedValueOnce(
      new Error('Another visit is already in progress on this job. Finish or abort it first.'),
    )
    const { user } = setup('technician', true)
    await screen.findByText(/Visit 1: scheduled/)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/already in progress/i)
  })

  it('shows schedule form for staff only', async () => {
    setup('admin', false)
    expect(await screen.findByText(/Schedule additional visit/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
  })
})

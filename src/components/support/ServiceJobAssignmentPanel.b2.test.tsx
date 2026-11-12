// B2 full job-assignment panel UI (additional jobs, assign/reassign, decline).
// Run: npx vitest run src/components/support/ServiceJobAssignmentPanel.b2.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServiceJobAssignmentPanel } from './ServiceJobAssignmentPanel'
import type { ServiceJobRow } from '@/lib/ticketGovernanceApi'

if (typeof window !== 'undefined') {
  const proto = window.HTMLElement.prototype as HTMLElement & {
    hasPointerCapture?: (pointerId: number) => boolean
    setPointerCapture?: (pointerId: number) => void
    releasePointerCapture?: (pointerId: number) => void
  }
  proto.hasPointerCapture ??= () => false
  proto.setPointerCapture ??= () => undefined
  proto.releasePointerCapture ??= () => undefined
  if (!proto.scrollIntoView) proto.scrollIntoView = () => undefined
}

vi.mock('@/lib/adminTicketApi', () => ({
  getAvailableAssignees: vi.fn(),
}))
vi.mock('@/lib/ticketGovernanceApi', () => ({
  listServiceJobsForTicket: vi.fn(),
  createServiceJob: vi.fn(),
  assignServiceJob: vi.fn(),
  declineServiceJob: vi.fn(),
  listServiceVisitsForJob: vi.fn().mockResolvedValue([]),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { getAvailableAssignees } from '@/lib/adminTicketApi'
import {
  assignServiceJob,
  createServiceJob,
  declineServiceJob,
  listServiceJobsForTicket,
} from '@/lib/ticketGovernanceApi'
import { toast } from 'sonner'

const listMock = listServiceJobsForTicket as unknown as ReturnType<typeof vi.fn>
const createMock = createServiceJob as unknown as ReturnType<typeof vi.fn>
const assignMock = assignServiceJob as unknown as ReturnType<typeof vi.fn>
const declineMock = declineServiceJob as unknown as ReturnType<typeof vi.fn>
const assigneesMock = getAvailableAssignees as unknown as ReturnType<typeof vi.fn>
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>

const TECHS = [
  { id: 'tech-1', full_name: 'Tech One', role: 'technician', phone: null },
  { id: 'tech-2', full_name: 'Tech Two', role: 'technician', phone: null },
]

function job(partial: Partial<ServiceJobRow> & Pick<ServiceJobRow, 'id' | 'job_sequence'>): ServiceJobRow {
  return {
    ticket_id: 'ticket-1',
    title: `Job ${partial.job_sequence}`,
    required: true,
    state: 'planned',
    assigned_technician_id: null,
    created_at: '2026-11-11T00:00:00Z',
    updated_at: '2026-11-11T00:00:00Z',
    technician_name: null,
    ...partial,
  }
}

function setup(role: string, currentUserId = 'support-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ServiceJobAssignmentPanel
        ticketId="ticket-1"
        currentUserId={currentUserId}
        viewerRole={role}
        ticketAssigneeName="Case Contact"
      />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup() }
}

beforeEach(() => {
  vi.clearAllMocks()
  assigneesMock.mockResolvedValue(TECHS)
  listMock.mockResolvedValue([
    job({
      id: 'job-1',
      job_sequence: 1,
      title: 'Job 1',
      assigned_technician_id: 'tech-1',
      technician_name: 'Tech One',
      state: 'planned',
    }),
    job({
      id: 'job-2',
      job_sequence: 2,
      title: 'Extra hinge',
      assigned_technician_id: 'tech-2',
      technician_name: 'Tech Two',
      state: 'unassigned',
    }),
  ])
  createMock.mockResolvedValue(job({ id: 'job-3', job_sequence: 3, title: 'Job 3' }))
  assignMock.mockResolvedValue({ id: 'job-2' })
  declineMock.mockResolvedValue({ id: 'job-1' })
})

describe('ServiceJobAssignmentPanel B2', () => {
  it('P1 lists all jobs with independent assignees and states', async () => {
    setup('admin')
    expect(await screen.findByText(/Job 1: Job 1/)).toBeInTheDocument()
    expect(screen.getByText(/Job 2: Extra hinge/)).toBeInTheDocument()
    expect(screen.getByText('Tech One')).toBeInTheDocument()
    expect(screen.getByText('Tech Two')).toBeInTheDocument()
    expect(screen.getByText(/State: planned/)).toBeInTheDocument()
    expect(screen.getByText(/State: unassigned/)).toBeInTheDocument()
    expect(screen.getByText(/independent of ticket case contact/)).toBeInTheDocument()
    expect(screen.getByText(/Case Contact/)).toBeInTheDocument()
  })

  it('P2 admin can create an additional job', async () => {
    const { user } = setup('admin')
    await screen.findByText(/Job 1/)
    await user.type(screen.getByLabelText(/Additional job title/), 'Follow-up')
    await user.click(screen.getByRole('button', { name: /Create job/ }))
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    expect(createMock).toHaveBeenCalledWith({
      ticketId: 'ticket-1',
      title: 'Follow-up',
      rationale: 'Additional job from assignment panel',
    })
    await waitFor(() => expect(listMock.mock.calls.length).toBeGreaterThan(1))
  })

  it('P3 technician can decline own eligible job with mandatory reason', async () => {
    listMock.mockResolvedValue([
      job({
        id: 'job-1',
        job_sequence: 1,
        assigned_technician_id: 'tech-1',
        technician_name: 'Tech One',
        state: 'planned',
      }),
    ])
    const { user } = setup('technician', 'tech-1')
    await screen.findByText(/Job 1/)
    expect(screen.queryByRole('button', { name: /Create job/ })).not.toBeInTheDocument()
    const declineBtn = screen.getByRole('button', { name: /Decline job/ })
    expect(declineBtn).toBeDisabled()
    await user.type(screen.getByLabelText(/Decline reason/), 'Schedule conflict')
    expect(declineBtn).toBeEnabled()
    await user.click(declineBtn)
    await waitFor(() => expect(declineMock).toHaveBeenCalledTimes(1))
    expect(declineMock).toHaveBeenCalledWith({
      jobId: 'job-1',
      reason: 'Schedule conflict',
    })
  })

  it('P4 surfaces active-visit restriction errors', async () => {
    listMock.mockResolvedValue([
      job({ id: 'job-2', job_sequence: 2, state: 'planned', assigned_technician_id: null }),
    ])
    assignMock.mockRejectedValue(
      new Error(
        'Cannot change job assignment while a visit is in progress. End or abort the visit in the visit workflow first.',
      ),
    )
    const { user } = setup('support')
    await screen.findByText(/Job 2/)
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /Tech One/ }))
    await user.click(screen.getByRole('button', { name: /Save/ }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(await screen.findByRole('alert')).toHaveTextContent(/visit is in progress/i)
  })

  it('P5a denied roles cannot create or decline others jobs', async () => {
    setup('technician', 'tech-9')
    await screen.findByText(/Job 1/)
    expect(screen.queryByRole('button', { name: /Create job/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Decline job/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument()
  })

  it('P5b authorization failure from RPC is shown clearly', async () => {
    createMock.mockRejectedValue(new Error('Only admin/support may create jobs'))
    const { user } = setup('admin')
    await screen.findByText(/Job 1/)
    await user.click(screen.getByRole('button', { name: /Create job/ }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(await screen.findByRole('alert')).toHaveTextContent(/Only admin\/support may create jobs/)
  })

  it('P6 repeated create submission is safe and refreshes list', async () => {
    const { user } = setup('admin')
    await screen.findByText(/Job 1/)
    await user.click(screen.getByRole('button', { name: /Create job/ }))
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: /Create job/ }))
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(2))
    expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(3)
  })
})

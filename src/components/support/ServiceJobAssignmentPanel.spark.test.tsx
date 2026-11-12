// Spark independent phase-2 verification for ServiceJobAssignmentPanel.
// Complements Cursor's P-series with different fixtures and extra legs:
// per-job independence, denied roles (customer/sales), decline gating,
// busy-guard determinism, and ticket/job call-shape separation.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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
const toastSuccess = toast.success as unknown as ReturnType<typeof vi.fn>
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>

const TECHS = [
  { id: 'tech-1', full_name: 'Tech One', role: 'technician', phone: null },
  { id: 'tech-2', full_name: 'Tech Two', role: 'technician', phone: null },
]

const JOBS: ServiceJobRow[] = [
  {
    id: 'job-1', ticket_id: 't-1', job_sequence: 1, title: 'Hinge refit',
    required: true, state: 'planned', assigned_technician_id: 'tech-1',
    created_at: '', updated_at: '', technician_name: 'Tech One',
  },
  {
    id: 'job-2', ticket_id: 't-1', job_sequence: 2, title: 'Seal check',
    required: true, state: 'unassigned', assigned_technician_id: null,
    created_at: '', updated_at: '', technician_name: null,
  },
  {
    id: 'job-3', ticket_id: 't-1', job_sequence: 3, title: 'Old calibration',
    required: false, state: 'completed', assigned_technician_id: 'tech-2',
    created_at: '', updated_at: '', technician_name: 'Tech Two',
  },
]

function setup(role: string, currentUserId = 'support-1', jobs: ServiceJobRow[] = JOBS) {
  listMock.mockResolvedValue(jobs)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ServiceJobAssignmentPanel
        ticketId="t-1"
        currentUserId={currentUserId}
        viewerRole={role}
        ticketAssigneeName="Case Contact"
      />
    </QueryClientProvider>,
  )
  return { ...view, user: userEvent.setup() }
}

async function selectTechIn(
  user: ReturnType<typeof userEvent.setup>,
  scope: HTMLElement,
  name: RegExp,
) {
  await user.click(within(scope).getByRole('combobox'))
  await user.click(await screen.findByRole('option', { name }))
}

beforeEach(() => {
  vi.clearAllMocks()
  assigneesMock.mockResolvedValue(TECHS)
  createMock.mockResolvedValue({ id: 'job-4' })
  assignMock.mockResolvedValue({ id: 'job-2' })
  declineMock.mockResolvedValue({ id: 'job-1' })
})

describe('ServiceJobAssignmentPanel (Spark independent)', () => {
  it('U7 lists every job with its own assignee, state, and the case-contact note', async () => {
    setup('support')
    expect(await screen.findByText('Job 1: Hinge refit')).toBeInTheDocument()
    expect(screen.getByText('Job 2: Seal check')).toBeInTheDocument()
    expect(screen.getByText(/Job 3: Old calibration/)).toBeInTheDocument()
    expect(screen.getByText(/\(optional\)/)).toBeInTheDocument()
    const job1 = screen.getByTestId('service-job-1')
    const job2 = screen.getByTestId('service-job-2')
    expect(within(job1).getByText('Tech One')).toBeInTheDocument()
    expect(within(job1).getByText(/State: planned/)).toBeInTheDocument()
    expect(within(job2).getByText('Unassigned')).toBeInTheDocument()
    expect(within(job2).getByText(/State: unassigned/)).toBeInTheDocument()
    expect(screen.getByText(/independent of ticket case contact/)).toBeInTheDocument()
    expect(screen.getByText(/\(Case Contact\)/)).toBeInTheDocument()
  })

  it('U8 staff creates an additional job with default numbering and the list refreshes', async () => {
    const extra: ServiceJobRow = {
      id: 'job-4', ticket_id: 't-1', job_sequence: 4, title: 'Job 4',
      required: true, state: 'unassigned', assigned_technician_id: null,
      created_at: '', updated_at: '', technician_name: null,
    }
    listMock.mockResolvedValueOnce(JOBS).mockResolvedValue([...JOBS, extra])
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <ServiceJobAssignmentPanel
          ticketId="t-1" currentUserId="support-1" viewerRole="admin"
          ticketAssigneeName="Case Contact"
        />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    expect(await screen.findByText('Job 1: Hinge refit')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Create job/ }))
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    expect(createMock).toHaveBeenCalledWith({
      ticketId: 't-1', title: 'Job 4', rationale: 'Additional job from assignment panel',
    })
    expect(await screen.findByText('Job 4: Job 4')).toBeInTheDocument()
    expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(toastSuccess).toHaveBeenCalledWith('Additional job created')
  })

  it('U9 assigning one job leaves the others untouched; terminal jobs offer no assign', async () => {
    const { user } = setup('support')
    expect(await screen.findByText('Job 2: Seal check')).toBeInTheDocument()
    const job2 = screen.getByTestId('service-job-2')
    await selectTechIn(user, job2, /Tech Two/)
    await user.click(within(job2).getByRole('button', { name: /Save/ }))
    await waitFor(() => expect(assignMock).toHaveBeenCalledTimes(1))
    expect(assignMock).toHaveBeenCalledWith({
      jobId: 'job-2', technicianId: 'tech-2', rationale: 'Assigned from job panel',
    })
    expect(Object.keys(assignMock.mock.calls[0][0]).sort()).toEqual(
      ['jobId', 'rationale', 'technicianId'],
    )
    // Job 1 still shows its own technician; terminal Job 3 has no Save control.
    expect(within(screen.getByTestId('service-job-1')).getByText('Tech One')).toBeInTheDocument()
    expect(within(screen.getByTestId('service-job-3')).queryByRole('button', { name: /Save/ })).not.toBeInTheDocument()
    expect(toastSuccess).toHaveBeenCalledWith('Job technician updated')
  })

  it('U10 technician declines only the own eligible job with a mandatory reason', async () => {
    const { user } = setup('technician', 'tech-1')
    expect(await screen.findByText('Job 1: Hinge refit')).toBeInTheDocument()
    // No staff controls for technicians.
    expect(screen.queryByRole('button', { name: /Create job/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument()
    const job1 = screen.getByTestId('service-job-1')
    const declineBtn = within(job1).getByRole('button', { name: /Decline job/ })
    expect(declineBtn).toBeDisabled()
    await user.type(within(job1).getByLabelText(/Decline reason/), 'overloaded shifts')
    expect(declineBtn).toBeEnabled()
    await user.click(declineBtn)
    await waitFor(() => expect(declineMock).toHaveBeenCalledTimes(1))
    expect(declineMock).toHaveBeenCalledWith({ jobId: 'job-1', reason: 'overloaded shifts' })
    expect(toastSuccess).toHaveBeenCalledWith('Job declined')
    // Other jobs offer no decline: unassigned-not-own and terminal-other.
    expect(within(screen.getByTestId('service-job-2')).queryByRole('button', { name: /Decline job/ })).not.toBeInTheDocument()
    expect(within(screen.getByTestId('service-job-3')).queryByRole('button', { name: /Decline job/ })).not.toBeInTheDocument()
  })

  it('U11 customer and sales viewers get a read-only list with no action controls', async () => {
    for (const role of ['customer', 'sales']) {
      const { unmount, user: _u } = setup(role, role === 'customer' ? 'cust-1' : 'sales-1')
      void _u
      expect(await screen.findByText('Job 1: Hinge refit')).toBeInTheDocument()
      expect(screen.getByText('Tech One')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Create job/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Decline job/ })).not.toBeInTheDocument()
      expect(createMock).not.toHaveBeenCalled()
      expect(assignMock).not.toHaveBeenCalled()
      expect(declineMock).not.toHaveBeenCalled()
      unmount()
    }
  })

  it('U12 active-visit restriction error is shown clearly and the list stays intact', async () => {
    const { user } = setup('support')
    assignMock.mockRejectedValue(
      new Error('Cannot change job assignment while a visit is in progress. End or abort the visit in the visit workflow first.'),
    )
    expect(await screen.findByText('Job 2: Seal check')).toBeInTheDocument()
    const job2 = screen.getByTestId('service-job-2')
    await selectTechIn(user, job2, /Tech Two/)
    await user.click(within(job2).getByRole('button', { name: /Save/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/visit is in progress/i)
    expect(toastError).toHaveBeenCalled()
    expect(screen.getByText('Job 1: Hinge refit')).toBeInTheDocument()
    expect(screen.getByText('Job 2: Seal check')).toBeInTheDocument()
  })

  it('U13 authorization failure is shown clearly without losing panel state', async () => {
    const { user } = setup('support')
    createMock.mockRejectedValue(new Error('Only admin/support may create jobs'))
    expect(await screen.findByText('Job 1: Hinge refit')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Additional job title/), 'Extra')
    await user.click(screen.getByRole('button', { name: /Create job/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Only admin\/support may create jobs/)
    expect(screen.getByLabelText(/Additional job title/)).toHaveValue('Extra')
  })

  it('U14 repeated create submission is safe: pending guards, then each success refreshes', async () => {
    const { user } = setup('support')
    expect(await screen.findByText('Job 1: Hinge refit')).toBeInTheDocument()
    let release!: (v: unknown) => void
    createMock.mockReturnValueOnce(new Promise((res) => { release = res }))
    const titleInput = screen.getByLabelText(/Additional job title/)
    await user.type(titleInput, 'Guarded')
    const createBtn = screen.getByRole('button', { name: /Create job/ })
    await user.click(createBtn)
    await waitFor(() => expect(titleInput).toBeDisabled())
    await user.click(createBtn)
    release({ id: 'job-4' })
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Job 1: Hinge refit')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Additional job title/), 'Again')
    await user.click(screen.getByRole('button', { name: /Create job/ }))
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(2))
    expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('U15 job calls never carry ticket case-contact fields', async () => {
    const { user } = setup('support')
    expect(await screen.findByText('Job 2: Seal check')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Additional job title/), 'Separate')
    await user.click(screen.getByRole('button', { name: /Create job/ }))
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    const createArg = createMock.mock.calls[0][0] as Record<string, unknown>
    expect(createArg).not.toHaveProperty('assigneeId')
    expect(createArg).not.toHaveProperty('assignedTo')
    expect(createArg).not.toHaveProperty('technicianId')
  })
})

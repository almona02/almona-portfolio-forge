// Spark independent phase-2 verification for the technician dashboard
// "My service jobs" decline surface (separate from the panel's tech view).
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TechnicianDashboard from './TechnicianDashboard'
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

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'tech-1', email: 'tech-1@example.com' } }),
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))
vi.mock('@/lib/ticketMessageApi', () => ({
  ticketMessageApi: { createShare: vi.fn() },
}))
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(),
}))
vi.mock('@/lib/ticketGovernanceApi', () => ({
  declineServiceJob: vi.fn(),
  governTicketSetEscalated: vi.fn(),
  governTicketTransition: vi.fn(),
  listServiceJobsForTechnician: vi.fn(),
}))

import { supabase } from '@/lib/supabase'
import {
  declineServiceJob,
  listServiceJobsForTechnician,
} from '@/lib/ticketGovernanceApi'
import { useToast } from '@/hooks/use-toast'

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
const listMock = listServiceJobsForTechnician as unknown as ReturnType<typeof vi.fn>
const declineMock = declineServiceJob as unknown as ReturnType<typeof vi.fn>
const useToastMock = useToast as unknown as ReturnType<typeof vi.fn>
const toastMock = vi.fn()

const JOBS: ServiceJobRow[] = [
  {
    id: 'job-1', ticket_id: 't-1', job_sequence: 1, title: 'Hinge refit',
    required: true, state: 'planned', assigned_technician_id: 'tech-1',
    created_at: '', updated_at: '',
  },
  {
    id: 'job-9', ticket_id: 't-9', job_sequence: 1, title: 'Sealed unit',
    required: true, state: 'completed', assigned_technician_id: 'tech-1',
    created_at: '', updated_at: '',
  },
]

function ticketsChain() {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ order: vi.fn(async () => ({ data: [], error: null })) })),
    })),
  }
}

function setup(jobs: ServiceJobRow[] | Error = JOBS) {
  useToastMock.mockReturnValue({ toast: toastMock })
  fromMock.mockReturnValue(ticketsChain())
  if (jobs instanceof Error) listMock.mockRejectedValue(jobs)
  else listMock.mockResolvedValue(jobs)
  render(<TechnicianDashboard />)
  return { user: userEvent.setup(), toast: toastMock }
}

function jobItem(title: RegExp): HTMLElement {
  return screen.getByText(title).closest('li') as HTMLElement
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  declineMock.mockResolvedValue({ id: 'job-1' })
})

describe('TechnicianDashboard service jobs (Spark independent)', () => {
  it('U19 technician sees own jobs and completes a decline with reason + refresh', async () => {
    const { user, toast } = setup()
    expect(await screen.findByText('My service jobs')).toBeInTheDocument()
    expect(screen.getByText('Job 1: Hinge refit')).toBeInTheDocument()
    expect(screen.getByText(/State: planned/)).toBeInTheDocument()
    const item = jobItem(/Job 1: Hinge refit/)
    await user.click(within(item).getByRole('button', { name: /Decline job/ }))
    const confirm = within(item).getByRole('button', { name: /Confirm decline/ })
    expect(confirm).toBeDisabled()
    await user.type(within(item).getByLabelText(/Decline reason/), 'route conflict')
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    await waitFor(() => expect(declineMock).toHaveBeenCalledTimes(1))
    expect(declineMock).toHaveBeenCalledWith({ jobId: 'job-1', reason: 'route conflict' })
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Job declined' }))
    await waitFor(() => expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('U20 decline failure shows a clear error and keeps the form open', async () => {
    const { user, toast } = setup()
    declineMock.mockRejectedValue(
      new Error('Cannot change job assignment while a visit is in progress. End or abort the visit in the visit workflow first.'),
    )
    expect(await screen.findByText('My service jobs')).toBeInTheDocument()
    const item = jobItem(/Job 1: Hinge refit/)
    await user.click(within(item).getByRole('button', { name: /Decline job/ }))
    await user.type(within(item).getByLabelText(/Decline reason/), 'try anyway')
    await user.click(within(item).getByRole('button', { name: /Confirm decline/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/visit is in progress/i)
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Decline failed' }))
    expect(within(jobItem(/Job 1: Hinge refit/)).getByRole('button', { name: /Confirm decline/ })).toBeInTheDocument()
    expect(declineMock).toHaveBeenCalledTimes(1)
  })

  it('U21 terminal jobs offer no decline control', async () => {
    setup()
    expect(await screen.findByText('My service jobs')).toBeInTheDocument()
    expect(screen.getByText('Job 1: Sealed unit')).toBeInTheDocument()
    const terminal = jobItem(/Job 1: Sealed unit/)
    expect(within(terminal).queryByRole('button', { name: /Decline job/ })).not.toBeInTheDocument()
  })

  it('U22 job-list failure hides the section without crashing the dashboard', async () => {
    setup(new Error('jobs unavailable'))
    await waitFor(() => expect(listMock).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText('My service jobs')).not.toBeInTheDocument())
  })

  it('U23 repeat decline is guarded while pending, then works again', async () => {
    const { user } = setup()
    expect(await screen.findByText('My service jobs')).toBeInTheDocument()
    let release!: (v: unknown) => void
    declineMock.mockReturnValueOnce(new Promise((res) => { release = res }))
    const item = jobItem(/Job 1: Hinge refit/)
    await user.click(within(item).getByRole('button', { name: /Decline job/ }))
    await user.type(within(item).getByLabelText(/Decline reason/), 'first')
    const confirm = within(item).getByRole('button', { name: /Confirm decline/ })
    await user.click(confirm)
    await user.click(confirm)
    release({ id: 'job-1' })
    await waitFor(() => expect(declineMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(2))
  })
})

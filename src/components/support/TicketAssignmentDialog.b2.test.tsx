// B2 opt-in UI verification for TicketAssignmentDialog (freeze 8f2acc4e).
// Run: npx vitest run src/components/support/TicketAssignmentDialog.b2.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TicketAssignmentDialog } from './TicketAssignmentDialog'
import type { TicketWithDetails } from '@/types/tickets'

// jsdom lacks Pointer Capture + scrollIntoView; Radix Select requires them.
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

// Spark B2 UI verification (DB acceptance is separate, via the disposable
// SQL/K battery). Mocks the API boundary; asserts the dialog wires the
// opt-in checkbox, legacy path, auth-failure surfacing, and retry behavior.
vi.mock('@/lib/adminTicketApi', () => ({
  assignTicket: vi.fn(),
  getAvailableAssignees: vi.fn(),
  buildTicketAssignmentMessage: vi.fn(() => null),
  buildTicketWhatsAppLink: vi.fn(() => null),
}))
vi.mock('@/lib/ticketGovernanceApi', () => ({
  ensureDefaultServiceJob: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { assignTicket, getAvailableAssignees } from '@/lib/adminTicketApi'
import { ensureDefaultServiceJob } from '@/lib/ticketGovernanceApi'
import { toast } from 'sonner'

const assignMock = assignTicket as unknown as ReturnType<typeof vi.fn>
const assigneesMock = getAvailableAssignees as unknown as ReturnType<typeof vi.fn>
const ensureMock = ensureDefaultServiceJob as unknown as ReturnType<typeof vi.fn>
const toastSuccess = toast.success as unknown as ReturnType<typeof vi.fn>
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>

const TECHS = [
  { id: 'tech-1', full_name: 'Tech One', role: 'technician', phone: null },
  { id: 'tech-2', full_name: 'Tech Two', role: 'technician', phone: null },
]
const TICKET = {
  id: 'ticket-1',
  ticket_number: 'TKT-2026-000001',
  title: 'Fix hinge',
  priority: 'high',
  user_profile: { full_name: 'Cust One' },
} as unknown as TicketWithDetails

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <TicketAssignmentDialog
        ticket={TICKET}
        isOpen
        onClose={onClose}
        currentUserId="support-1"
      />
    </QueryClientProvider>,
  )
  return { onClose, user: userEvent.setup() }
}

async function selectTech(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('combobox'))
  await user.click(await screen.findByRole('option', { name }))
}

beforeEach(() => {
  vi.clearAllMocks()
  assigneesMock.mockResolvedValue(TECHS)
  assignMock.mockResolvedValue({ id: 'ticket-1' })
  ensureMock.mockResolvedValue({ id: 'job-1' })
})

describe('TicketAssignmentDialog B2 opt-in', () => {
  it('U1 legacy unchecked path assigns the ticket without Job 1', async () => {
    const { onClose, user } = setup()
    await selectTech(user, /Tech One/)
    expect(screen.getByRole('checkbox', { name: /Start service workflow/ })).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Assign Ticket' }))

    await waitFor(() => expect(assignMock).toHaveBeenCalledTimes(1))
    expect(assignMock).toHaveBeenCalledWith('ticket-1', 'tech-1', 'support-1')
    expect(ensureMock).not.toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith('Ticket assigned successfully')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('U2 checked path assigns the ticket and starts Job 1 for the assignee', async () => {
    const { onClose, user } = setup()
    await selectTech(user, /Tech Two/)
    await user.click(screen.getByRole('checkbox', { name: /Start service workflow/ }))

    await user.click(screen.getByRole('button', { name: 'Assign Ticket' }))

    await waitFor(() => expect(assignMock).toHaveBeenCalledTimes(1))
    expect(ensureMock).toHaveBeenCalledTimes(1)
    expect(ensureMock).toHaveBeenCalledWith({
      ticketId: 'ticket-1',
      technicianId: 'tech-2',
      rationale: 'Opt-in Job 1 on assignment',
    })
    expect(toastSuccess).toHaveBeenCalledWith('Ticket assigned; Job 1 started')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('U3 assign denial surfaces the auth error and never starts Job 1', async () => {
    const { onClose, user } = setup()
    assignMock.mockRejectedValue(new Error('Only admin/support may assign tickets'))
    await selectTech(user, /Tech One/)
    await user.click(screen.getByRole('checkbox', { name: /Start service workflow/ }))

    await user.click(screen.getByRole('button', { name: 'Assign Ticket' }))

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1))
    expect(toastError).toHaveBeenCalledWith(
      'Failed to assign ticket: Only admin/support may assign tickets',
    )
    expect(ensureMock).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    // Dialog stays open with the selection preserved for retry.
    expect(screen.getByRole('button', { name: 'Assign Ticket' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Start service workflow/ })).toBeChecked()
  })

  it('U4 Job 1 failure after a successful assign keeps the dialog open for retry', async () => {
    const { onClose, user } = setup()
    ensureMock.mockRejectedValue(new Error('Terminal tickets cannot receive Job 1'))
    await selectTech(user, /Tech One/)
    await user.click(screen.getByRole('checkbox', { name: /Start service workflow/ }))

    await user.click(screen.getByRole('button', { name: 'Assign Ticket' }))

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1))
    expect(assignMock).toHaveBeenCalledTimes(1)
    expect(toastError).toHaveBeenCalledWith(
      'Failed to assign ticket: Terminal tickets cannot receive Job 1',
    )
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox', { name: /Start service workflow/ })).toBeChecked()
  })

  it('U5 failed Job 1 can be retried without reselecting; retry succeeds once', async () => {
    const { onClose, user } = setup()
    ensureMock
      .mockRejectedValueOnce(new Error('Terminal tickets cannot receive Job 1'))
      .mockResolvedValue({ id: 'job-1' })
    await selectTech(user, /Tech One/)
    await user.click(screen.getByRole('checkbox', { name: /Start service workflow/ }))

    await user.click(screen.getByRole('button', { name: 'Assign Ticket' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()

    // Retry with the preserved selection; no reselect needed.
    await user.click(screen.getByRole('button', { name: 'Assign Ticket' }))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1))
    expect(toastSuccess).toHaveBeenCalledWith('Ticket assigned; Job 1 started')
    expect(assignMock).toHaveBeenCalledTimes(2)
    expect(ensureMock).toHaveBeenCalledTimes(2)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('U6 repeated full submission re-runs the idempotent path', async () => {
    const { onClose, user } = setup()
    await selectTech(user, /Tech One/)
    await user.click(screen.getByRole('checkbox', { name: /Start service workflow/ }))
    await user.click(screen.getByRole('button', { name: 'Assign Ticket' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))

    // Parent keeps the dialog open; state reset requires reselect + recheck.
    await selectTech(user, /Tech One/)
    await user.click(screen.getByRole('checkbox', { name: /Start service workflow/ }))
    await user.click(screen.getByRole('button', { name: 'Assign Ticket' }))
    await waitFor(() => expect(assignMock).toHaveBeenCalledTimes(2))
    expect(ensureMock).toHaveBeenCalledTimes(2)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

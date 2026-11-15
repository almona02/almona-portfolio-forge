// @vitest-environment jsdom
// Run: npx vitest run src/components/support/TicketWorkflowClosurePanel.b6.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TicketWorkflowClosurePanel } from './TicketWorkflowClosurePanel'

const evaluate = vi.fn()
const listJobs = vi.fn()
const listVisits = vi.fn()
const getReport = vi.fn()
const getAck = vi.fn()
const getDisp = vi.fn()
const recordDisp = vi.fn()
const recordUnavail = vi.fn()
const govern = vi.fn()

vi.mock('@/lib/ticketGovernanceApi', () => ({
  evaluateTicketWorkflowPrerequisites: (...args: unknown[]) => evaluate(...args),
  listServiceJobsForTicket: (...args: unknown[]) => listJobs(...args),
  listServiceVisitsForJob: (...args: unknown[]) => listVisits(...args),
  getServiceReportForVisit: (...args: unknown[]) => getReport(...args),
  getEffectiveAcknowledgment: (...args: unknown[]) => getAck(...args),
  getEffectiveAcknowledgmentDisposition: (...args: unknown[]) => getDisp(...args),
  recordAcknowledgmentDisposition: (...args: unknown[]) => recordDisp(...args),
  recordServiceAcknowledgmentUnavailable: (...args: unknown[]) => recordUnavail(...args),
  governTicketTransition: (...args: unknown[]) => govern(...args),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TicketWorkflowClosurePanel
        ticketId="t-1"
        currentStatus="in_progress"
        currentUserId="mgr-1"
        resolutionSummary=""
      />
    </QueryClientProvider>,
  )
}

describe('TicketWorkflowClosurePanel B6', () => {
  beforeEach(() => {
    evaluate.mockReset()
    listJobs.mockReset()
    listVisits.mockReset()
    getReport.mockReset()
    getAck.mockReset()
    getDisp.mockReset()
    recordDisp.mockReset()
    recordUnavail.mockReset()
    govern.mockReset()
    listJobs.mockResolvedValue([])
    evaluate.mockResolvedValue([
      {
        code: 'acknowledgment_refusal_disposition_pending',
        detail: 'Job 1 (x) issued revision 1 refused — manager disposition required',
      },
    ])
  })

  it('shows named prerequisite failures from the backend', async () => {
    renderPanel()
    expect(await screen.findByTestId('closure-prereq-list')).toHaveTextContent(
      'acknowledgment_refusal_disposition_pending',
    )
  })

  it('records disposition with rationale', async () => {
    listJobs.mockResolvedValue([
      {
        id: 'j1',
        ticket_id: 't-1',
        job_sequence: 1,
        title: 'x',
        required: true,
        state: 'completed',
        assigned_technician_id: 'tech-1',
        created_at: '',
        updated_at: '',
      },
    ])
    listVisits.mockResolvedValue([{ id: 'v1', job_id: 'j1', visit_sequence: 1, state: 'completed' }])
    getReport.mockResolvedValue({
      report: { id: 'r1', visit_id: 'v1' },
      revisions: [{ id: 'rev-1', revision_number: 1 }],
    })
    getAck.mockResolvedValue({ response: 'refused' })
    getDisp.mockResolvedValue(null)
    recordDisp.mockResolvedValue({
      id: 'd1',
      disposition: 'accept_refusal_and_proceed',
    })
    const user = userEvent.setup()
    renderPanel()
    await screen.findByTestId('closure-disposition')
    await user.type(screen.getByTestId('closure-disposition-rationale'), 'accepted refusal')
    await user.click(screen.getByRole('button', { name: /Accept refusal/i }))
    await waitFor(() =>
      expect(recordDisp).toHaveBeenCalledWith({
        issuedRevisionId: 'rev-1',
        disposition: 'accept_refusal_and_proceed',
        rationale: 'accepted refusal',
      }),
    )
  })

  it('surfaces govern transition errors with named failures', async () => {
    evaluate.mockResolvedValue([])
    govern.mockRejectedValue(
      new Error('Workflow prerequisites unsatisfied for closed:\nrequired_job_unsatisfied: Job 2'),
    )
    const user = userEvent.setup()
    renderPanel()
    await screen.findByTestId('closure-prereq-clear')
    await user.type(screen.getByTestId('closure-resolution-summary'), 'done')
    await user.click(screen.getByTestId('closure-close'))
    expect(await screen.findByTestId('closure-error')).toHaveTextContent('required_job_unsatisfied')
  })
})

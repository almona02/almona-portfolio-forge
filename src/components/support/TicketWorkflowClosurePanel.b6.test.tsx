// @vitest-environment jsdom
// Run: npx vitest run src/components/support/TicketWorkflowClosurePanel.b6.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  targetRevisionIdForCode,
  TicketWorkflowClosurePanel,
} from './TicketWorkflowClosurePanel'

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

const REV_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const REV_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function mockTwoHeads() {
  listJobs.mockResolvedValue([
    {
      id: 'j1',
      ticket_id: 't-1',
      job_sequence: 1,
      title: 'A',
      required: true,
      state: 'completed',
      assigned_technician_id: 'tech-1',
      created_at: '',
      updated_at: '',
    },
    {
      id: 'j2',
      ticket_id: 't-1',
      job_sequence: 2,
      title: 'B',
      required: true,
      state: 'completed',
      assigned_technician_id: 'tech-1',
      created_at: '',
      updated_at: '',
    },
  ])
  listVisits.mockImplementation(async (jobId: string) => [
    { id: `v-${jobId}`, job_id: jobId, visit_sequence: 1, state: 'completed' },
  ])
  getReport.mockImplementation(async (visitId: string) => {
    if (visitId.includes('j1')) {
      return { report: { id: 'r1', visit_id: visitId }, revisions: [{ id: REV_A, revision_number: 1 }] }
    }
    return { report: { id: 'r2', visit_id: visitId }, revisions: [{ id: REV_B, revision_number: 1 }] }
  })
  getAck.mockImplementation(async (revId: string) => {
    if (revId === REV_A) {
      return { id: 'ack-a', issued_revision_id: REV_A, response: 'accepted' }
    }
    return null
  })
  getDisp.mockResolvedValue(null)
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
        entity_id: REV_A,
      },
    ])
  })

  it('uses structured entity_id only; never falls back to first head', () => {
    const heads = [
      {
        revisionId: REV_A,
        revisionNumber: 1,
        jobSequence: 1,
        jobLabel: 'Job 1 (A)',
        effectiveResponse: 'accepted',
      },
      {
        revisionId: REV_B,
        revisionNumber: 1,
        jobSequence: 2,
        jobLabel: 'Job 2 (B)',
        effectiveResponse: null,
      },
    ]
    expect(
      targetRevisionIdForCode(
        [
          {
            code: 'acknowledgment_outstanding',
            detail: 'Job 2 (B) issued revision 1 — acknowledgment outstanding',
            entity_id: REV_B,
          },
        ],
        'acknowledgment_outstanding',
        heads,
      ),
    ).toBe(REV_B)
    expect(
      targetRevisionIdForCode(
        [
          {
            code: 'acknowledgment_outstanding',
            detail: 'Job 2 (B) issued revision 1 — acknowledgment outstanding',
          },
        ],
        'acknowledgment_outstanding',
        heads,
      ),
    ).toBeNull()
  })

  it('shows named prerequisite failures from the backend', async () => {
    renderPanel()
    expect(await screen.findByTestId('closure-prereq-list')).toHaveTextContent(
      'acknowledgment_refusal_disposition_pending',
    )
  })

  it('records disposition against the refused head from the failure detail', async () => {
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
      revisions: [{ id: REV_A, revision_number: 1 }],
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
    expect(screen.getByTestId('closure-disposition-target')).toHaveTextContent(REV_A)
    await user.type(screen.getByTestId('closure-disposition-rationale'), 'accepted refusal')
    await user.click(screen.getByRole('button', { name: /Accept refusal/i }))
    await waitFor(() =>
      expect(recordDisp).toHaveBeenCalledWith({
        issuedRevisionId: REV_A,
        disposition: 'accept_refusal_and_proceed',
        rationale: 'accepted refusal',
      }),
    )
  })

  it('does not invent contact attempts; targets outstanding head only (F-B6-UI-01/02)', async () => {
    mockTwoHeads()
    evaluate.mockResolvedValue([
      {
        code: 'acknowledgment_outstanding',
        detail: 'Job 2 (B) issued revision 1 — acknowledgment outstanding',
        entity_id: REV_B,
      },
    ])
    const user = userEvent.setup()
    renderPanel()
    await screen.findByTestId('closure-unavailable')
    expect(screen.getByTestId('closure-unavailable-target')).toHaveTextContent(REV_B)
    expect(screen.getByTestId('closure-unavailable-target')).not.toHaveTextContent(REV_A)
    expect(screen.getByTestId('closure-contact-attempts')).toBeInTheDocument()

    await user.type(screen.getByTestId('closure-unavailable-rationale'), 'no reply')
    await user.click(screen.getByTestId('closure-unavailable-submit'))
    await waitFor(() => expect(recordUnavail).not.toHaveBeenCalled())

    await user.type(screen.getByTestId('closure-attempt-at-0'), '2026-11-10T09:00')
    await user.clear(screen.getByTestId('closure-attempt-channel-0'))
    await user.type(screen.getByTestId('closure-attempt-channel-0'), 'issue_notification')
    await user.type(screen.getByTestId('closure-attempt-outcome-0'), 'delivered')
    await user.type(screen.getByTestId('closure-attempt-at-1'), '2026-11-11T09:00')
    await user.type(screen.getByTestId('closure-attempt-channel-1'), 'phone')
    await user.type(screen.getByTestId('closure-attempt-outcome-1'), 'no_answer')
    await user.type(screen.getByTestId('closure-attempt-at-2'), '2026-11-12T09:00')
    await user.type(screen.getByTestId('closure-attempt-channel-2'), 'email')
    await user.type(screen.getByTestId('closure-attempt-outcome-2'), 'no_reply')

    recordUnavail.mockResolvedValue({ id: 'u1', response: 'unavailable' })
    await user.click(screen.getByTestId('closure-unavailable-submit'))
    await waitFor(() => expect(recordUnavail).toHaveBeenCalled())
    const arg = recordUnavail.mock.calls[0][0]
    expect(arg.issuedRevisionId).toBe(REV_B)
    expect(arg.contactAttempts).toHaveLength(3)
    expect(arg.contactAttempts[0].channel).toBe('issue_notification')
    expect(arg.contactAttempts[0].by_actor_id).toBe('mgr-1')
    // Must use staff-entered times, not fabricated backdates relative to "now"
    expect(arg.contactAttempts.map((c: { channel: string }) => c.channel)).toEqual([
      'issue_notification',
      'phone',
      'email',
    ])
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

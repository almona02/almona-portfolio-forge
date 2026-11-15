// @vitest-environment jsdom
// STAGING-B5-01: returned → revise/resubmit through ServiceReportPanel
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServiceReportPanel } from './ServiceReportPanel'

const getReport = vi.fn()
const submitReport = vi.fn()
const uploadEvidence = vi.fn()
const listReviews = vi.fn()

vi.mock('@/lib/ticketGovernanceApi', () => ({
  getServiceReportForVisit: (...args: unknown[]) => getReport(...args),
  submitServiceReportRevision: (...args: unknown[]) => submitReport(...args),
  uploadReportEvidence: (...args: unknown[]) => uploadEvidence(...args),
  listServiceReportReviewsForRevisions: (...args: unknown[]) => listReviews(...args),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'tech-1' } }, error: null })),
    },
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderPanel(canSubmit = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ServiceReportPanel visitId="visit-1" ticketId="ticket-1" canSubmit={canSubmit} />
    </QueryClientProvider>,
  )
}

const returnedRev = {
  id: 'rev-1',
  report_id: 'r1',
  revision_number: 1,
  findings: 'old findings',
  work_performed: 'old work',
  labour: [],
  no_labour: true,
  verification_outcome: 'verified_fixed',
  verification_reason: null,
  technician_declaration: 'decl',
  evidence_paths: ['ticket-1/b4/a.jpg'],
  checklist_results: null,
  client_submission_id: 'cid-old',
  submitted_by: 'tech-1',
  submitted_at: '2026-11-13T12:00:00.000Z',
}

const returnReview = {
  id: 'rw-1',
  revision_id: 'rev-1',
  reviewer_id: 'mgr-1',
  decision: 'returned' as const,
  comments: 'Need clearer photos of the belt',
  decided_at: '2026-11-13T13:00:00.000Z',
}

describe('ServiceReportPanel B5 revise/resubmit', () => {
  beforeEach(() => {
    getReport.mockReset()
    submitReport.mockReset()
    uploadEvidence.mockReset()
    listReviews.mockReset()
    sessionStorage.clear()
  })

  it('shows return comments and offers a new revision form to the attending tech', async () => {
    getReport.mockResolvedValue({
      report: { id: 'r1', visit_id: 'visit-1', created_at: '2026-11-13T00:00:00Z' },
      revisions: [returnedRev],
    })
    listReviews.mockResolvedValue([returnReview])
    renderPanel(true)
    expect(await screen.findByTestId('service-report-return-banner')).toBeInTheDocument()
    expect(screen.getByTestId('service-report-return-comments')).toHaveTextContent(
      /Need clearer photos of the belt/i,
    )
    expect(screen.getByTestId('service-report-form')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Resubmit report/i })).toBeInTheDocument()
  })

  it('uses a new client_submission_id retained across failed retry', async () => {
    getReport.mockResolvedValue({
      report: { id: 'r1', visit_id: 'visit-1', created_at: '2026-11-13T00:00:00Z' },
      revisions: [returnedRev],
    })
    listReviews.mockResolvedValue([returnReview])
    submitReport.mockRejectedValue(new Error('transient'))
    const user = userEvent.setup()
    renderPanel(true)
    await screen.findByTestId('service-report-form')
    const bannerId = screen.getByText(/New submission id/i).textContent ?? ''
    const match = bannerId.match(/New submission id ([0-9a-f-]{36})/i)
    expect(match?.[1]).toBeTruthy()
    const cid = match![1]
    expect(cid).not.toBe('cid-old')

    const textareas = screen.getAllByRole('textbox')
    await user.type(textareas[0], 'new findings')
    await user.type(textareas[1], 'new work')
    await user.click(screen.getByLabelText(/No labour to declare/i))
    await user.click(screen.getByText(/I declare that the findings/i))
    await user.click(screen.getByRole('button', { name: /Resubmit report/i }))
    await waitFor(() => expect(screen.getByText(/transient/i)).toBeTruthy())
    expect(submitReport.mock.calls[0][0].clientSubmissionId).toBe(cid)

    await user.click(screen.getByRole('button', { name: /Resubmit report/i }))
    await waitFor(() => expect(submitReport).toHaveBeenCalledTimes(2))
    expect(submitReport.mock.calls[1][0].clientSubmissionId).toBe(cid)
  })

  it('after successful resubmit shows the new revision status', async () => {
    getReport.mockResolvedValue({
      report: { id: 'r1', visit_id: 'visit-1', created_at: '2026-11-13T00:00:00Z' },
      revisions: [returnedRev],
    })
    listReviews.mockResolvedValue([returnReview])
    const user = userEvent.setup()
    renderPanel(true)
    await screen.findByTestId('service-report-form')

    submitReport.mockImplementation(async (input: { clientSubmissionId: string }) => ({
      ...returnedRev,
      id: 'rev-2',
      revision_number: 2,
      findings: 'new findings',
      client_submission_id: input.clientSubmissionId,
      submitted_at: '2026-11-14T12:00:00.000Z',
    }))
    getReport.mockResolvedValue({
      report: { id: 'r1', visit_id: 'visit-1', created_at: '2026-11-13T00:00:00Z' },
      revisions: [
        returnedRev,
        {
          ...returnedRev,
          id: 'rev-2',
          revision_number: 2,
          findings: 'new findings',
          client_submission_id: 'will-be-overwritten',
          submitted_at: '2026-11-14T12:00:00.000Z',
        },
      ],
    })
    listReviews.mockResolvedValue([returnReview])

    const textareas = screen.getAllByRole('textbox')
    await user.type(textareas[0], 'new findings')
    await user.type(textareas[1], 'new work')
    await user.click(screen.getByLabelText(/No labour to declare/i))
    await user.click(screen.getByText(/I declare that the findings/i))
    await user.click(screen.getByRole('button', { name: /Resubmit report/i }))

    await waitFor(() => {
      expect(screen.getByTestId('service-report-status')).toBeInTheDocument()
    })
    expect(screen.getByText(/Revision 2/i)).toBeInTheDocument()
    expect(screen.queryByTestId('service-report-form')).toBeNull()
  })

  it('remount keeps the same post-return submission identity (no duplicate key)', async () => {
    getReport.mockResolvedValue({
      report: { id: 'r1', visit_id: 'visit-1', created_at: '2026-11-13T00:00:00Z' },
      revisions: [returnedRev],
    })
    listReviews.mockResolvedValue([returnReview])
    const { unmount } = renderPanel(true)
    await screen.findByTestId('service-report-form')
    const first = (screen.getByText(/New submission id/i).textContent ?? '').match(
      /([0-9a-f-]{36})/i,
    )?.[1]
    expect(first).toBeTruthy()
    unmount()
    renderPanel(true)
    await screen.findByTestId('service-report-form')
    const second = (screen.getByText(/New submission id/i).textContent ?? '').match(
      /([0-9a-f-]{36})/i,
    )?.[1]
    expect(second).toBe(first)
  })
})

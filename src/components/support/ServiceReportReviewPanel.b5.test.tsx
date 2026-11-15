// @vitest-environment jsdom
// Run: npx vitest run src/components/support/ServiceReportReviewPanel.b5.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServiceReportReviewPanel } from './ServiceReportReviewPanel'

const getReport = vi.fn()
const review = vi.fn()
const listReviews = vi.fn()

vi.mock('@/lib/ticketGovernanceApi', () => ({
  getServiceReportForVisit: (...args: unknown[]) => getReport(...args),
  reviewServiceReportRevision: (...args: unknown[]) => review(...args),
  listServiceReportReviewsForRevisions: (...args: unknown[]) => listReviews(...args),
  createReportEvidenceSignedUrl: vi.fn(async () => 'https://example.test/signed'),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderPanel(opts?: { canReview?: boolean; userId?: string }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ServiceReportReviewPanel
        visitId="visit-1"
        canReview={opts?.canReview ?? true}
        currentUserId={opts?.userId ?? 'mgr-1'}
      />
    </QueryClientProvider>,
  )
}

const submitted = {
  id: 'rev-1',
  report_id: 'r1',
  revision_number: 1,
  findings: 'noise',
  work_performed: 'adjusted',
  labour: [],
  no_labour: true,
  verification_outcome: 'verified_fixed',
  verification_reason: null,
  technician_declaration: 'decl',
  evidence_paths: ['t/b4/a.jpg'],
  checklist_results: null,
  client_submission_id: 'cid',
  submitted_by: 'tech-1',
  submitted_at: '2026-11-13T12:00:00.000Z',
}

describe('ServiceReportReviewPanel B5', () => {
  beforeEach(() => {
    getReport.mockReset()
    review.mockReset()
    listReviews.mockReset()
    listReviews.mockResolvedValue([])
  })

  it('renders submitted revision and calls approve', async () => {
    getReport.mockResolvedValue({ report: { id: 'r1', visit_id: 'visit-1' }, revisions: [submitted] })
    review.mockResolvedValue({
      id: 'rw-1',
      revision_id: 'rev-1',
      reviewer_id: 'mgr-1',
      decision: 'approved_issued',
      comments: null,
      decided_at: '2026-11-13T13:00:00.000Z',
    })
    const user = userEvent.setup()
    renderPanel()
    expect(await screen.findByTestId('service-report-review-panel')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Approve & issue/i }))
    await waitFor(() =>
      expect(review).toHaveBeenCalledWith({
        revisionId: 'rev-1',
        decision: 'approved_issued',
        comments: undefined,
      }),
    )
  })

  it('blocks return without comments', async () => {
    getReport.mockResolvedValue({ report: { id: 'r1', visit_id: 'visit-1' }, revisions: [submitted] })
    renderPanel()
    expect(await screen.findByRole('button', { name: /Return for correction/i })).toBeDisabled()
  })

  it('hides decide controls for author', async () => {
    getReport.mockResolvedValue({ report: { id: 'r1', visit_id: 'visit-1' }, revisions: [submitted] })
    renderPanel({ userId: 'tech-1' })
    expect(await screen.findByText(/self-review is not allowed/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Approve & issue/i })).toBeNull()
  })
})

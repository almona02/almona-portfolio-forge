// @vitest-environment jsdom
// Run: npx vitest run src/components/support/ServiceReportPanel.b4.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServiceReportPanel } from './ServiceReportPanel'

const getReport = vi.fn()
const submitReport = vi.fn()
const uploadEvidence = vi.fn()

vi.mock('@/lib/ticketGovernanceApi', () => ({
  getServiceReportForVisit: (...args: unknown[]) => getReport(...args),
  submitServiceReportRevision: (...args: unknown[]) => submitReport(...args),
  uploadReportEvidence: (...args: unknown[]) => uploadEvidence(...args),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'tech-1' } }, error: null })),
    },
    from: vi.fn(),
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderPanel(canSubmit = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ServiceReportPanel visitId="visit-1" ticketId="ticket-1" canSubmit={canSubmit} />
    </QueryClientProvider>,
  )
}

const submittedRevision = {
  id: 'rev-1',
  report_id: 'r1',
  revision_number: 1,
  findings: 'ok',
  work_performed: 'fixed',
  labour: [],
  no_labour: true,
  verification_outcome: 'verified_fixed',
  verification_reason: null,
  technician_declaration: 'decl',
  evidence_paths: ['ticket-1/b4/a.jpg'],
  checklist_results: null,
  client_submission_id: 'cid-stable',
  submitted_by: 'tech-1',
  submitted_at: '2026-11-12T12:00:00.000Z',
}

describe('ServiceReportPanel B4', () => {
  beforeEach(() => {
    getReport.mockReset()
    submitReport.mockReset()
    uploadEvidence.mockReset()
    sessionStorage.clear()
  })

  it('shows truthful submitted status when a revision exists', async () => {
    getReport.mockResolvedValue({
      report: { id: 'r1', visit_id: 'visit-1', created_at: new Date().toISOString() },
      revisions: [submittedRevision],
    })
    renderPanel(true)
    await waitFor(() => {
      expect(screen.getByText(/Report status: submitted/i)).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /Submit report/i })).toBeNull()
  })

  it('keeps submit available and surfaces recoverable submit failure', async () => {
    getReport.mockResolvedValue({ report: null, revisions: [] })
    submitReport.mockRejectedValue(new Error('Evidence object not found'))
    const user = userEvent.setup()
    renderPanel(true)
    await waitFor(() => screen.getByRole('button', { name: /Submit report/i }))
    const textareas = screen.getAllByRole('textbox')
    await user.type(textareas[0], 'noise')
    await user.type(textareas[1], 'adjusted')
    await user.click(screen.getByLabelText(/No labour to declare/i))
    await user.click(screen.getByText(/I declare that the findings/i))
    await user.click(screen.getByRole('button', { name: /Submit report/i }))
    await waitFor(() => {
      expect(screen.getByText(/Evidence object not found/i)).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: /Submit report/i })).toBeTruthy()
  })

  it('retains submitted identity when refetch fails and does not rotate request key', async () => {
    getReport.mockResolvedValue({ report: null, revisions: [] })
    submitReport.mockImplementation(async (input: { clientSubmissionId: string }) => ({
      ...submittedRevision,
      client_submission_id: input.clientSubmissionId,
    }))
    const user = userEvent.setup()
    renderPanel(true)
    await waitFor(() => screen.getByRole('button', { name: /Submit report/i }))
    const textareas = screen.getAllByRole('textbox')
    await user.type(textareas[0], 'noise')
    await user.type(textareas[1], 'adjusted')
    await user.click(screen.getByLabelText(/No labour to declare/i))
    await user.click(screen.getByText(/I declare that the findings/i))

    // After submit succeeds, make subsequent report fetches fail
    getReport.mockRejectedValue(new Error('refetch boom'))
    await user.click(screen.getByRole('button', { name: /Submit report/i }))

    await waitFor(() => {
      expect(screen.getByText(/Report status: submitted/i)).toBeTruthy()
    })
    expect(screen.getByText(/Submission id/i).textContent).toMatch(
      submitReport.mock.calls[0][0].clientSubmissionId,
    )
    const stored = JSON.parse(sessionStorage.getItem('b4-submitted:visit-1') || '{}')
    expect(stored.clientSubmissionId).toBe(submitReport.mock.calls[0][0].clientSubmissionId)
    expect(stored.revision.id).toBe('rev-1')
  })

  it('recovers submitted status on remount from session storage', async () => {
    sessionStorage.setItem(
      'b4-submitted:visit-1',
      JSON.stringify({
        revision: submittedRevision,
        clientSubmissionId: 'cid-stable',
      }),
    )
    getReport.mockRejectedValue(new Error('offline'))
    renderPanel(true)
    await waitFor(() => {
      expect(screen.getByText(/Report status: submitted/i)).toBeTruthy()
    })
    expect(screen.getByText(/Submission id cid-stable/i)).toBeTruthy()
  })

  it('does not offer submit controls when canSubmit is false and nothing submitted', async () => {
    getReport.mockResolvedValue({ report: null, revisions: [] })
    renderPanel(false)
    await waitFor(() => {
      expect(
        screen.getByText(/Only the attending technician can submit/i),
      ).toBeTruthy()
    })
  })
})

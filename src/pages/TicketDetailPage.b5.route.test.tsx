// @vitest-environment jsdom
// STAGING-B5-02: owner issued-report mount on real ticket route (not via staff gate)
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TicketDetailPage from './TicketDetailPage'

const authState = {
  user: null as null | { id: string; role: string },
  supabaseUser: null as null | { id: string },
  loading: false,
  isProfileResolved: true,
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: 'tkt-1',
              user_id: 'owner-1',
              ticket_number: 'B5-OWN-1',
              title: 'Owner ticket',
              description: 'desc',
              type: 'technical',
              priority: 'medium',
              status: 'open',
              source: null,
              maintenance_type: null,
              machine_id: null,
              machine_serial_number: null,
              site_location: null,
              contact_phone: null,
              contact_email: null,
              resolution_summary: null,
              resolved_at: null,
              created_at: '2026-11-12T00:00:00Z',
              updated_at: '2026-11-12T00:00:00Z',
            },
            error: null,
          }),
          order: async () => ({ data: [], error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/ticketMessageApi', () => ({
  ticketMessageApi: {
    createSignedAttachmentUrl: vi.fn(),
    createSharedAttachmentUrl: vi.fn(),
    getSharedTicket: vi.fn(),
    createShare: vi.fn(),
    sendMessage: vi.fn(),
    uploadAttachment: vi.fn(),
  },
}))

vi.mock('@/components/support/ServiceJobAssignmentPanel', () => ({
  ServiceJobAssignmentPanel: (props: { ticketId: string; viewerRole: string }) => (
    <div data-testid="job-panel" data-ticket={props.ticketId} data-role={props.viewerRole}>
      job-panel
    </div>
  ),
}))

const listJobs = vi.fn()
const listVisits = vi.fn()
const getReport = vi.fn()
const signedUrl = vi.fn(async () => 'https://example.test/signed')

vi.mock('@/lib/ticketGovernanceApi', () => ({
  listServiceJobsForTicket: (...args: unknown[]) => listJobs(...args),
  listServiceVisitsForJob: (...args: unknown[]) => listVisits(...args),
  getServiceReportForVisit: (...args: unknown[]) => getReport(...args),
  createReportEvidenceSignedUrl: (...args: unknown[]) => signedUrl(...args),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const openSpy = vi.fn()
vi.stubGlobal('open', openSpy)

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/support/tickets/tkt-1']}>
        <Routes>
          <Route path="/support/tickets/:ticketId" element={<TicketDetailPage />} />
          <Route path="/login" element={<div>login-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TicketDetailPage B5 customer issued-report route', () => {
  beforeEach(() => {
    authState.loading = false
    authState.isProfileResolved = true
    listJobs.mockReset()
    listVisits.mockReset()
    getReport.mockReset()
    signedUrl.mockClear()
    openSpy.mockClear()
    listJobs.mockResolvedValue([{ id: 'job-1', ticket_id: 'tkt-1', job_sequence: 1, title: 'Job 1' }])
    listVisits.mockResolvedValue([
      {
        id: 'visit-1',
        job_id: 'job-1',
        visit_sequence: 1,
        state: 'completed',
        attending_technician_id: 'tech-1',
      },
    ])
  })

  it('mounts owner issued-report card without staff job controls', async () => {
    authState.user = { id: 'owner-1', role: 'customer' }
    authState.supabaseUser = { id: 'owner-1' }
    getReport.mockResolvedValue({
      report: { id: 'r1', visit_id: 'visit-1' },
      revisions: [
        {
          id: 'rev-1',
          report_id: 'r1',
          revision_number: 1,
          findings: 'owner-visible findings',
          work_performed: 'work',
          labour: [],
          no_labour: true,
          verification_outcome: 'verified_fixed',
          verification_reason: null,
          technician_declaration: 'decl',
          evidence_paths: ['tkt-1/b4/a.jpg'],
          checklist_results: null,
          client_submission_id: 'cid',
          submitted_by: 'tech-1',
          submitted_at: '2026-11-13T12:00:00.000Z',
        },
      ],
    })
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByTestId('customer-issued-reports-card')).toBeInTheDocument()
    expect(screen.queryByTestId('job-panel')).not.toBeInTheDocument()
    expect(await screen.findByText(/owner-visible findings/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Download evidence/i }))
    await waitFor(() => expect(signedUrl).toHaveBeenCalledWith('tkt-1/b4/a.jpg'))
    expect(openSpy).toHaveBeenCalled()
  })

  it('preserves last issued when getter returns only issued rows (pending correction omitted)', async () => {
    authState.user = { id: 'owner-1', role: 'customer' }
    authState.supabaseUser = { id: 'owner-1' }
    getReport.mockResolvedValue({
      report: { id: 'r1', visit_id: 'visit-1' },
      revisions: [
        {
          id: 'rev-1',
          report_id: 'r1',
          revision_number: 1,
          findings: 'still issued while correction pending',
          work_performed: 'work',
          labour: [],
          no_labour: true,
          verification_outcome: 'verified_fixed',
          verification_reason: null,
          technician_declaration: 'decl',
          evidence_paths: [],
          checklist_results: null,
          client_submission_id: 'cid',
          submitted_by: 'tech-1',
          submitted_at: '2026-11-13T12:00:00.000Z',
        },
      ],
    })
    renderPage()
    expect(await screen.findByText(/still issued while correction pending/i)).toBeInTheDocument()
    expect(screen.queryByText(/returned/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Need photos/i)).not.toBeInTheDocument()
  })

  it('shows empty issued state when owner has no issued revisions', async () => {
    authState.user = { id: 'owner-1', role: 'customer' }
    authState.supabaseUser = { id: 'owner-1' }
    getReport.mockResolvedValue({ report: { id: 'r1', visit_id: 'visit-1' }, revisions: [] })
    renderPage()
    expect(await screen.findByTestId('customer-issued-report-empty')).toBeInTheDocument()
  })

  it('does not mount issued card for unrelated customer', async () => {
    authState.user = { id: 'other-cust', role: 'customer' }
    authState.supabaseUser = { id: 'other-cust' }
    renderPage()
    await waitFor(() => expect(screen.getByText('Owner ticket')).toBeInTheDocument())
    expect(screen.queryByTestId('customer-issued-reports-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('job-panel')).not.toBeInTheDocument()
  })

  it('keeps staff job panel for support (issued card is customer-only)', async () => {
    authState.user = { id: 'support-1', role: 'support' }
    authState.supabaseUser = { id: 'support-1' }
    renderPage()
    expect(await screen.findByTestId('job-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('customer-issued-reports-card')).not.toBeInTheDocument()
  })
})

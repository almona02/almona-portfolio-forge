// @vitest-environment jsdom
// Branch B5 UI tests (independently executed by Spark) — freeze tip f8fb9358 / correction d2743078
// Not authored by Spark; Cursor-authored Vitest against branch UI. Run:
//   npx vitest run src/components/support/CustomerIssuedReportView.b5.spark.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerIssuedReportView } from './CustomerIssuedReportView'

const getReport = vi.fn()

vi.mock('@/lib/ticketGovernanceApi', () => ({
  getServiceReportForVisit: (...args: unknown[]) => getReport(...args),
  createReportEvidenceSignedUrl: vi.fn(async () => 'https://example.test/signed'),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <CustomerIssuedReportView visitId="visit-1" />
    </QueryClientProvider>,
  )
}

describe('CustomerIssuedReportView Spark B5', () => {
  beforeEach(() => {
    getReport.mockReset()
  })

  it('shows empty state when getter returns no issued revisions', async () => {
    getReport.mockResolvedValue({ report: { id: 'r1', visit_id: 'visit-1' }, revisions: [] })
    renderView()
    expect(await screen.findByTestId('customer-issued-report-empty')).toBeInTheDocument()
  })

  it('renders latest issued revision from getter payload only', async () => {
    getReport.mockResolvedValue({
      report: { id: 'r1', visit_id: 'visit-1' },
      revisions: [
        {
          id: 'rev-issued',
          report_id: 'r1',
          revision_number: 1,
          findings: 'issued findings',
          work_performed: 'issued work',
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
        },
      ],
    })
    renderView()
    expect(await screen.findByTestId('customer-issued-report')).toBeInTheDocument()
    expect(screen.getByText(/issued findings/i)).toBeInTheDocument()
    expect(screen.getByTestId('customer-issued-helper-copy').textContent).toMatch(
      /latest customer-visible issued report/i,
    )
    expect(screen.getByRole('button', { name: /Download evidence/i })).toBeInTheDocument()
  })

  it('keeps prior issued revision visible when getter returns multiple issued rows', async () => {
    getReport.mockResolvedValue({
      report: { id: 'r1', visit_id: 'visit-1' },
      revisions: [
        {
          id: 'rev-1',
          report_id: 'r1',
          revision_number: 1,
          findings: 'first issued',
          work_performed: 'w1',
          labour: [],
          no_labour: true,
          verification_outcome: 'verified_fixed',
          verification_reason: null,
          technician_declaration: 'decl',
          evidence_paths: [],
          checklist_results: null,
          client_submission_id: 'cid-1',
          submitted_by: 'tech-1',
          submitted_at: '2026-11-13T12:00:00.000Z',
        },
        {
          id: 'rev-3',
          report_id: 'r1',
          revision_number: 3,
          findings: 'reissued after correction',
          work_performed: 'w3',
          labour: [],
          no_labour: true,
          verification_outcome: 'verified_fixed',
          verification_reason: null,
          technician_declaration: 'decl',
          evidence_paths: ['t/b4/b.jpg'],
          checklist_results: null,
          client_submission_id: 'cid-3',
          submitted_by: 'tech-1',
          submitted_at: '2026-11-14T12:00:00.000Z',
        },
      ],
    })
    renderView()
    expect(await screen.findByTestId('customer-issued-revision-1')).toBeInTheDocument()
    expect(screen.getByTestId('customer-issued-revision-3')).toBeInTheDocument()
    expect(screen.getByText(/first issued/i)).toBeInTheDocument()
    expect(screen.getByText(/reissued after correction/i)).toBeInTheDocument()
  })
})

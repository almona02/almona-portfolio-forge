// @vitest-environment jsdom
// Spark sanitized UI probe — B5 freeze f8fb9358
// Run: npx vitest run src/components/support/CustomerIssuedReportView.b5.spark.test.tsx
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
    expect(screen.getByText(/Newer unissued corrections are not shown/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Download evidence/i })).toBeInTheDocument()
  })
})

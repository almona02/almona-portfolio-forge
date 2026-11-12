// @vitest-environment jsdom
// Run: npx vitest run src/components/support/ServiceVisitPanel.b4.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServiceVisitPanel } from './ServiceVisitPanel'
import type { ServiceVisitRow } from '@/lib/ticketGovernanceApi'

const getReport = vi.fn()
const listMock = vi.fn()

vi.mock('@/lib/ticketGovernanceApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ticketGovernanceApi')>(
    '@/lib/ticketGovernanceApi',
  )
  return {
    ...actual,
    listServiceVisitsForJob: (...args: unknown[]) => listMock(...args),
    getServiceReportForVisit: (...args: unknown[]) => getReport(...args),
    scheduleServiceJobVisit: vi.fn(),
    rescheduleServiceJobVisit: vi.fn(),
    startServiceJobVisit: vi.fn(),
    completeServiceJobVisit: vi.fn(),
    abortServiceJobVisit: vi.fn(),
    recordVisitNoAccess: vi.fn(),
    recordVisitSafetyCheck: vi.fn(),
    submitServiceReportRevision: vi.fn(),
    uploadReportEvidence: vi.fn(),
  }
})

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'tech-1' } }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: 'job-1',
              ticket_id: 'ticket-1',
              assigned_technician_id: 'tech-2',
              state: 'awaiting_review',
            },
            error: null,
          }),
        }),
      }),
    }),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'tech-1' } }, error: null })),
    },
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function visit(partial: Partial<ServiceVisitRow> & Pick<ServiceVisitRow, 'id' | 'state'>): ServiceVisitRow {
  return {
    job_id: 'job-1',
    visit_sequence: 1,
    scheduled_start: '2026-11-13T10:00:00Z',
    scheduled_end: '2026-11-13T12:00:00Z',
    actual_start: null,
    actual_end: null,
    attending_technician_id: 'tech-1',
    outcome_reason: null,
    updated_at: '2026-11-12T00:00:00Z',
    ...partial,
  }
}

function setup(opts?: { role?: 'admin' | 'technician' | 'customer'; canExecute?: boolean }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ServiceVisitPanel
        jobId="job-1"
        viewerRole={opts?.role ?? 'technician'}
        canExecute={opts?.canExecute ?? false}
      />
    </QueryClientProvider>,
  )
}

describe('ServiceVisitPanel B4 report mount', () => {
  beforeEach(() => {
    listMock.mockReset()
    getReport.mockReset()
    getReport.mockResolvedValue({ report: null, revisions: [] })
    sessionStorage.clear()
  })

  it('completed eligible visit renders report form and calls getter', async () => {
    listMock.mockResolvedValue([
      visit({
        id: 'visit-done',
        state: 'completed',
        attending_technician_id: 'tech-1',
        actual_start: '2026-11-13T10:05:00Z',
        actual_end: '2026-11-13T11:00:00Z',
      }),
    ])
    setup({ role: 'technician', canExecute: false })
    expect(await screen.findByTestId('service-report-mount-visit-done')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Submit report/i })).toBeInTheDocument()
    await waitFor(() => expect(getReport).toHaveBeenCalledWith('visit-done'))
  })

  it('scheduled and in_progress visits do not offer submission prematurely', async () => {
    listMock.mockResolvedValue([
      visit({ id: 'visit-sched', state: 'scheduled', visit_sequence: 1 }),
      visit({
        id: 'visit-ip',
        state: 'in_progress',
        visit_sequence: 2,
        actual_start: '2026-11-13T10:05:00Z',
      }),
    ])
    setup({ role: 'technician', canExecute: true })
    await screen.findByText(/Visit 1: scheduled/)
    expect(screen.queryByTestId('service-report-mount-visit-sched')).toBeNull()
    expect(screen.queryByTestId('service-report-mount-visit-ip')).toBeNull()
    expect(screen.queryByRole('button', { name: /Submit report/i })).toBeNull()
    expect(getReport).not.toHaveBeenCalled()
  })

  it('historical attending technician retains report access after reassignment', async () => {
    listMock.mockResolvedValue([
      visit({
        id: 'visit-hist',
        state: 'completed',
        attending_technician_id: 'tech-1',
        actual_start: '2026-11-13T10:05:00Z',
        actual_end: '2026-11-13T11:00:00Z',
      }),
    ])
    // Job reassigned away: canExecute false; attending still tech-1 (auth mock).
    setup({ role: 'technician', canExecute: false })
    expect(await screen.findByTestId('service-report-mount-visit-hist')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Submit report/i })).toBeInTheDocument()
  })

  it('unrelated technician cannot submit (no report mount)', async () => {
    listMock.mockResolvedValue([
      visit({
        id: 'visit-other',
        state: 'completed',
        attending_technician_id: 'tech-other',
        actual_start: '2026-11-13T10:05:00Z',
        actual_end: '2026-11-13T11:00:00Z',
      }),
    ])
    setup({ role: 'technician', canExecute: true })
    await screen.findByText(/Visit 1: completed/)
    expect(screen.queryByTestId('service-report-mount-visit-other')).toBeNull()
    expect(screen.queryByRole('button', { name: /Submit report/i })).toBeNull()
    expect(getReport).not.toHaveBeenCalled()
  })

  it('submitted remount remains truthful via getter revisions', async () => {
    getReport.mockResolvedValue({
      report: { id: 'r1', visit_id: 'visit-sub', created_at: '2026-11-13T12:00:00Z' },
      revisions: [
        {
          id: 'rev-1',
          report_id: 'r1',
          revision_number: 1,
          findings: 'ok',
          work_performed: 'done',
          labour: [],
          no_labour: true,
          verification_outcome: 'verified_fixed',
          verification_reason: null,
          technician_declaration: 'decl',
          evidence_paths: ['ticket-1/b4/a.jpg'],
          checklist_results: null,
          client_submission_id: 'cid-1',
          submitted_by: 'tech-1',
          submitted_at: '2026-11-13T12:00:00Z',
        },
      ],
    })
    listMock.mockResolvedValue([
      visit({
        id: 'visit-sub',
        state: 'completed',
        attending_technician_id: 'tech-1',
        actual_start: '2026-11-13T10:05:00Z',
        actual_end: '2026-11-13T11:00:00Z',
      }),
    ])
    setup({ role: 'technician', canExecute: false })
    await waitFor(() => {
      expect(screen.getByText(/Report status: submitted/i)).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /Submit report/i })).toBeNull()
  })
})

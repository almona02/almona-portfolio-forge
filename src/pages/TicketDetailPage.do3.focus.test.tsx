import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveCustomerFocus = vi.fn()
const resolveTechFocus = vi.fn()
const listJobs = vi.fn()
const listVisits = vi.fn()

vi.mock('@/lib/customerDailyOpsApi', () => ({
  resolveCustomerTicketFocus: (...a: unknown[]) => resolveCustomerFocus(...a),
}))

vi.mock('@/lib/technicianDailyOpsApi', () => ({
  resolveTechnicianTicketFocus: (...a: unknown[]) => resolveTechFocus(...a),
}))

vi.mock('@/lib/technicianTicketHeaderApi', () => ({
  getTechnicianTicketHeader: vi.fn(),
}))

vi.mock('@/lib/ticketGovernanceApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ticketGovernanceApi')>(
    '@/lib/ticketGovernanceApi',
  )
  return {
    ...actual,
    listServiceJobsForTicket: (...a: unknown[]) => listJobs(...a),
    listServiceVisitsForJob: (...a: unknown[]) => listVisits(...a),
    getServiceReportForVisit: vi.fn(async () => ({
      report: { id: 'rep1', visit_id: 'v1' },
      revisions: [
        {
          id: 'rev2',
          report_id: 'rep1',
          revision_number: 2,
          findings: 'issued head',
          work_performed: 'w',
          labour: [],
          no_labour: true,
          verification_outcome: 'verified_fixed',
          verification_reason: null,
          technician_declaration: 'decl',
          evidence_paths: [],
          checklist_results: null,
          client_submission_id: null,
          submitted_by: 'tech-1',
          submitted_at: '2026-11-14T12:00:00.000Z',
        },
      ],
    })),
    getEffectiveAcknowledgment: vi.fn(async () => null),
  }
})

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'cust-1', role: 'customer' },
    supabaseUser: { id: 'cust-1' },
    loading: false,
    isProfileResolved: true,
  }),
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
              id: 't1',
              user_id: 'cust-1',
              ticket_number: 'T-1',
              title: 'Owned',
              description: '',
              type: 'maintenance',
              priority: 'medium',
              status: 'in_progress',
              source: null,
              maintenance_type: null,
              machine_id: null,
              machine_serial_number: null,
              site_location: null,
              contact_phone: null,
              contact_email: null,
              resolution_summary: null,
              resolved_at: null,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
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
    getSharedTicket: vi.fn(),
    createSignedAttachmentUrl: vi.fn(),
    createSharedAttachmentUrl: vi.fn(),
    sendMessage: vi.fn(),
    uploadAttachment: vi.fn(),
    createShare: vi.fn(),
  },
}))

import TicketDetailPage from './TicketDetailPage'

function wrap(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/support/tickets/:ticketId" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TicketDetailPage DO-3 issued focus', () => {
  beforeEach(() => {
    resolveCustomerFocus.mockReset()
    resolveTechFocus.mockReset()
    listJobs.mockReset()
    listVisits.mockReset()
    listJobs.mockResolvedValue([{ id: 'j1', ticket_id: 't1', job_sequence: 1, title: 'Job', state: 'completed' }])
    listVisits.mockResolvedValue([
      { id: 'v1', job_id: 'j1', visit_sequence: 1, state: 'completed' },
    ])
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('focuses issued revision via customer resolver', async () => {
    resolveCustomerFocus.mockResolvedValue({
      focused: true,
      visit_id: 'v1',
      revision_id: 'rev2',
      revision_number: 2,
      panel: 'issued',
    })
    wrap('/support/tickets/t1?visit=v1&panel=issued&revision=rev2')
    await waitFor(() => expect(resolveCustomerFocus).toHaveBeenCalled())
    expect(resolveTechFocus).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByTestId('customer-issued-reports-card')).toBeTruthy())
    await waitFor(() => expect(screen.getByTestId('customer-issued-revision-2')).toBeTruthy())
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('safe fallback when customer focus rejects superseded/foreign target', async () => {
    resolveCustomerFocus.mockResolvedValue({ focused: false })
    wrap('/support/tickets/t1?visit=foreign&panel=issued&revision=old')
    await waitFor(() => expect(resolveCustomerFocus).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTestId('customer-issued-reports-card')).toBeTruthy())
    expect(screen.queryByTestId('customer-issued-revision-2')).toBeNull()
  })
})

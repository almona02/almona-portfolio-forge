import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getHeader = vi.fn()
const resolveFocus = vi.fn()
const listJobs = vi.fn()
const listVisits = vi.fn()

vi.mock('@/lib/technicianTicketHeaderApi', () => ({
  getTechnicianTicketHeader: (...a: unknown[]) => getHeader(...a),
}))

vi.mock('@/lib/technicianDailyOpsApi', () => ({
  resolveTechnicianTicketFocus: (...a: unknown[]) => resolveFocus(...a),
}))

vi.mock('@/lib/ticketGovernanceApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ticketGovernanceApi')>(
    '@/lib/ticketGovernanceApi',
  )
  return {
    ...actual,
    listServiceJobsForTicket: (...a: unknown[]) => listJobs(...a),
    listServiceVisitsForJob: (...a: unknown[]) => listVisits(...a),
    getServiceReportForVisit: vi.fn(async () => ({ report: null, revisions: [] })),
  }
})

vi.mock('@/lib/serviceJobRoutinePinsApi', () => ({
  getServiceJobRoutinePin: vi.fn(async () => ({ active: null, history: [] })),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'tech-1', role: 'technician' },
    supabaseUser: { id: 'tech-1' },
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
              id: 'j1',
              ticket_id: 't1',
              assigned_technician_id: 'tech-2',
              state: 'in_progress',
            },
            error: null,
          }),
          order: async () => ({ data: [], error: { message: 'denied' } }),
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

describe('TicketDetailPage DO-2 focus', () => {
  beforeEach(() => {
    getHeader.mockReset()
    resolveFocus.mockReset()
    listJobs.mockReset()
    listVisits.mockReset()
    getHeader.mockResolvedValue({
      id: 't1',
      ticket_number: 'T-1',
      title: 'Ticket',
      status: 'in_progress',
      priority: 'medium',
      type: 'maintenance',
      description: 'd',
      machine_id: null,
      machine_serial_number: null,
      site_location: null,
      created_at: '2026-03-15T00:00:00Z',
      maintenance_type: null,
    })
    listJobs.mockResolvedValue([
      {
        id: 'j1',
        ticket_id: 't1',
        job_sequence: 1,
        title: 'Job 1',
        required: true,
        state: 'in_progress',
        assigned_technician_id: 'tech-2',
        created_at: '2026-03-15T00:00:00Z',
        updated_at: '2026-03-15T00:00:00Z',
      },
    ])
    listVisits.mockResolvedValue([
      {
        id: 'v1',
        job_id: 'j1',
        visit_sequence: 1,
        state: 'completed',
        scheduled_start: '2026-03-15T10:00:00Z',
        scheduled_end: '2026-03-15T12:00:00Z',
        actual_start: null,
        actual_end: null,
        attending_technician_id: 'tech-1',
        outcome_reason: null,
        updated_at: '2026-03-15T00:00:00Z',
      },
    ])
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('DO2-08 expands and scrolls report focus for authorized visit', async () => {
    resolveFocus.mockResolvedValue({
      focused: true,
      job_id: 'j1',
      visit_id: 'v1',
      panel: 'report',
    })
    wrap('/support/tickets/t1?job=j1&visit=v1&panel=report')
    await waitFor(() => expect(screen.getByTestId('ticket-focus-report')).toBeTruthy())
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(resolveFocus).toHaveBeenCalledWith({
      ticketId: 't1',
      jobId: 'j1',
      visitId: 'v1',
      panel: 'report',
    })
  })

  it('DO2-13 invalid focus falls back without foreign content disclosure', async () => {
    resolveFocus.mockResolvedValue({ focused: false })
    wrap('/support/tickets/t1?job=foreign&visit=x&panel=report')
    await waitFor(() => expect(screen.getByText('Ticket')).toBeTruthy())
    expect(screen.queryByTestId('ticket-focus-report')).toBeNull()
    expect(screen.queryByText(/not found|forbidden|unauthorized|cross-ticket/i)).toBeNull()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const getHeader = vi.fn()
const fromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

vi.mock('@/lib/technicianTicketHeaderApi', () => ({
  getTechnicianTicketHeader: (...args: unknown[]) => getHeader(...args),
}))

vi.mock('@/lib/ticketMessageApi', () => ({
  ticketMessageApi: {
    createSignedAttachmentUrl: vi.fn(),
    createSharedAttachmentUrl: vi.fn(),
    getSharedTicket: vi.fn(),
    sendMessage: vi.fn(),
    uploadAttachment: vi.fn(),
    createShare: vi.fn(),
  },
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

vi.mock('@/components/support/ServiceJobAssignmentPanel', () => ({
  ServiceJobAssignmentPanel: () => null,
}))
vi.mock('@/components/support/CustomerIssuedReportsSection', () => ({
  CustomerIssuedReportsSection: () => null,
}))
vi.mock('@/components/support/TicketWorkflowClosurePanel', () => ({
  TicketWorkflowClosurePanel: () => null,
}))

import TicketDetailPage from './TicketDetailPage'

describe('TicketDetailPage technician header path (TR-07)', () => {
  beforeEach(() => {
    getHeader.mockReset()
    fromMock.mockReset()
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: [], error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    })
  })

  it('loads via getTechnicianTicketHeader and never select(*) on service_tickets', async () => {
    getHeader.mockResolvedValue({
      id: 't-1',
      ticket_number: 'T-100',
      title: 'Job ticket',
      status: 'assigned',
      priority: 'high',
      type: 'maintenance',
      description: 'May contain personal notes',
      machine_id: null,
      machine_serial_number: 'SN-1',
      site_location: 'Plant',
      created_at: '2026-01-01T00:00:00Z',
      maintenance_type: 'preventive',
    })

    render(
      <MemoryRouter initialEntries={['/support/tickets/t-1']}>
        <Routes>
          <Route path="/support/tickets/:ticketId" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Job ticket')).toBeInTheDocument()
    })
    expect(getHeader).toHaveBeenCalledWith('t-1')
    const ticketFromCalls = fromMock.mock.calls.filter((c) => c[0] === 'service_tickets')
    expect(ticketFromCalls).toHaveLength(0)
    expect(screen.queryByText('secret@example.com')).not.toBeInTheDocument()
  })
})

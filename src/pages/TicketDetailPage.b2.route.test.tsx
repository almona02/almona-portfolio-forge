// Route-level: ServiceJobAssignmentPanel must mount on authenticated ticket detail for staff.
import { render, screen, waitFor } from '@testing-library/react'
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
              ticket_number: 'B2-BR-MULTI',
              title: 'Multi job ticket',
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

describe('TicketDetailPage B2 route integration', () => {
  beforeEach(() => {
    authState.loading = false
    authState.isProfileResolved = true
  })

  it('mounts ServiceJobAssignmentPanel for support on the ticket-detail route', async () => {
    authState.user = { id: 'support-1', role: 'support' }
    authState.supabaseUser = { id: 'support-1' }
    renderPage()
    await waitFor(() => expect(screen.getByTestId('job-panel')).toBeInTheDocument())
    expect(screen.getByTestId('job-panel')).toHaveAttribute('data-ticket', 'tkt-1')
    expect(screen.getByTestId('job-panel')).toHaveAttribute('data-role', 'support')
  })

  it('does not mount the job panel for customers', async () => {
    authState.user = { id: 'cust-1', role: 'customer' }
    authState.supabaseUser = { id: 'cust-1' }
    renderPage()
    await waitFor(() => expect(screen.getByText('Multi job ticket')).toBeInTheDocument())
    expect(screen.queryByTestId('job-panel')).not.toBeInTheDocument()
  })

  it('sends unauthenticated viewers to login (non-share)', async () => {
    authState.user = null
    authState.supabaseUser = null
    renderPage()
    await waitFor(() => expect(screen.getByText('login-page')).toBeInTheDocument())
  })
})

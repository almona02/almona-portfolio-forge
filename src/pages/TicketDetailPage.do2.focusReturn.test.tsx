/**
 * DO-2 regression: auth redirect must preserve job/visit/panel query so focus
 * restores after login. Uses the same safeReturnPath gate as Login.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { safeReturnPath } from '@/lib/auth/safeReturnPath'
import { roleHomePath } from '@/lib/roleRouting'

const authState = {
  user: null as { id: string; role?: string } | null,
  supabaseUser: null as { id: string } | null,
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
          maybeSingle: async () => ({ data: null, error: null }),
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

vi.mock('@/lib/technicianTicketHeaderApi', () => ({
  getTechnicianTicketHeader: vi.fn(async () => null),
}))

vi.mock('@/lib/technicianDailyOpsApi', () => ({
  resolveTechnicianTicketFocus: vi.fn(async () => ({ focused: false })),
}))

import TicketDetailPage from './TicketDetailPage'

function LocationProbe({ label }: { label: string }) {
  const location = useLocation()
  return (
    <div>
      <span>{label}</span>
      <span data-testid="path">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
      <span data-testid="from">{String((location.state as { from?: string } | null)?.from ?? '')}</span>
    </div>
  )
}

function LoginReturnStub() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const postLoginPath = safeReturnPath(from, roleHomePath(authState.user?.role))

  if (authState.user && authState.isProfileResolved) {
    return <Navigate to={postLoginPath} replace />
  }

  return <LocationProbe label="login-page" />
}

const FOCUS_PATH =
  '/support/tickets/t-chain?job=j-chain&visit=v-chain&panel=report'

describe('TicketDetailPage DO-2 focus return through auth', () => {
  beforeEach(() => {
    authState.loading = false
    authState.isProfileResolved = true
    authState.user = null
    authState.supabaseUser = null
  })

  it('stores job, visit, and panel in login return state', () => {
    render(
      <MemoryRouter initialEntries={[FOCUS_PATH]}>
        <Routes>
          <Route path="/login" element={<LoginReturnStub />} />
          <Route path="/support/tickets/:ticketId" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('login-page')).toBeInTheDocument()
    expect(screen.getByTestId('from').textContent).toBe(FOCUS_PATH)
  })

  it('restores job, visit, and panel after authenticated return', async () => {
    authState.user = { id: 'tech-1', role: 'technician' }
    authState.supabaseUser = { id: 'tech-1' }

    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: FOCUS_PATH } }]}>
        <Routes>
          <Route path="/login" element={<LoginReturnStub />} />
          <Route path="/support/tickets/:ticketId" element={<LocationProbe label="ticket-ok" />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('ticket-ok')).toBeInTheDocument()
    })
    expect(screen.getByTestId('path').textContent).toBe('/support/tickets/t-chain')
    expect(screen.getByTestId('search').textContent).toBe(
      '?job=j-chain&visit=v-chain&panel=report',
    )
  })

  it('rejects arbitrary external return destinations', async () => {
    authState.user = { id: 'tech-1', role: 'technician' }
    authState.supabaseUser = { id: 'tech-1' }

    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/login', state: { from: 'https://evil.example/phish' } },
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginReturnStub />} />
          <Route path="/technician" element={<LocationProbe label="tech-home" />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('tech-home')).toBeInTheDocument()
    })
    expect(screen.getByTestId('path').textContent).toBe('/technician')
    expect(screen.getByTestId('search').textContent).toBe('')
  })
})

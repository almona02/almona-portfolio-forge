import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute'
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

function LocationProbe({ label }: { label: string }) {
  const location = useLocation()
  return (
    <div>
      <span>{label}</span>
      <span data-testid="path">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
      <span data-testid="hash">{location.hash}</span>
      <span data-testid="from">{String((location.state as { from?: string } | null)?.from ?? '')}</span>
    </div>
  )
}

/** Mirrors Login’s post-auth navigate using safeReturnPath + roleHomePath. */
function LoginReturnStub() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const postLoginPath = safeReturnPath(from, roleHomePath(authState.user?.role))

  if (authState.user && authState.isProfileResolved) {
    return <Navigate to={postLoginPath} replace />
  }

  return <LocationProbe label="login-page" />
}

describe('login return path (ProtectedRoute → login → destination)', () => {
  beforeEach(() => {
    authState.loading = false
    authState.isProfileResolved = true
    authState.user = null
    authState.supabaseUser = null
  })

  it('cold-load /admin?tab=service-routines preserves query through login for admin', async () => {
    authState.user = null
    authState.supabaseUser = null

    const first = render(
      <MemoryRouter initialEntries={['/admin?tab=service-routines']}>
        <Routes>
          <Route path="/login" element={<LoginReturnStub />} />
          <Route
            path="/admin"
            element={(
              <ProtectedRoute requireAdmin>
                <LocationProbe label="admin-ok" />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('login-page')).toBeInTheDocument()
    expect(screen.getByTestId('from').textContent).toBe('/admin?tab=service-routines')
    first.unmount()

    authState.user = { id: 'admin-1', role: 'admin' }
    authState.supabaseUser = { id: 'admin-1' }

    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/login', state: { from: '/admin?tab=service-routines' } }]}
      >
        <Routes>
          <Route path="/login" element={<LoginReturnStub />} />
          <Route
            path="/admin"
            element={(
              <ProtectedRoute requireAdmin>
                <LocationProbe label="admin-ok" />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('admin-ok')).toBeInTheDocument()
    })
    expect(screen.getByTestId('path').textContent).toBe('/admin')
    expect(screen.getByTestId('search').textContent).toBe('?tab=service-routines')
  })

  it('preserves Support /support/routines through login', async () => {
    authState.user = { id: 'support-1', role: 'support' }
    authState.supabaseUser = { id: 'support-1' }

    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/login', state: { from: '/support/routines' } }]}
      >
        <Routes>
          <Route path="/login" element={<LoginReturnStub />} />
          <Route
            path="/support/routines"
            element={(
              <ProtectedRoute requireRoles={['admin', 'support']}>
                <LocationProbe label="support-routines-ok" />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('support-routines-ok')).toBeInTheDocument()
    })
    expect(screen.getByTestId('path').textContent).toBe('/support/routines')
  })

  it('preserves ordinary internal navigation with query and fragment', async () => {
    authState.user = { id: 'c1', role: 'customer' }
    authState.supabaseUser = { id: 'c1' }

    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/login', state: { from: '/portal?ref=nav#section' } }]}
      >
        <Routes>
          <Route path="/login" element={<LoginReturnStub />} />
          <Route path="/portal" element={<LocationProbe label="portal-ok" />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('portal-ok')).toBeInTheDocument()
    })
    expect(screen.getByTestId('path').textContent).toBe('/portal')
    expect(screen.getByTestId('search').textContent).toBe('?ref=nav')
    expect(screen.getByTestId('hash').textContent).toBe('#section')
  })

  it('denied-role access still bounces home (authorization unchanged)', () => {
    authState.user = { id: 'c1', role: 'customer' }
    authState.supabaseUser = { id: 'c1' }

    render(
      <MemoryRouter initialEntries={['/admin?tab=service-routines']}>
        <Routes>
          <Route path="/" element={<div>home-page</div>} />
          <Route
            path="/admin"
            element={(
              <ProtectedRoute requireAdmin>
                <div>admin-ok</div>
              </ProtectedRoute>
            )}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('home-page')).toBeInTheDocument()
    expect(screen.queryByText('admin-ok')).not.toBeInTheDocument()
  })

  it('ProtectedRoute stores full return path including hash on unauthenticated hit', () => {
    authState.user = null
    authState.supabaseUser = null

    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/admin', search: '?tab=service-routines', hash: '#drafts' },
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginReturnStub />} />
          <Route
            path="/admin"
            element={(
              <ProtectedRoute requireAdmin>
                <LocationProbe label="admin-ok" />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('login-page')).toBeInTheDocument()
    expect(screen.getByTestId('from').textContent).toBe('/admin?tab=service-routines#drafts')
  })
})

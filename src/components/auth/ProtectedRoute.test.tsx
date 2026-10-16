import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute';

const authState = {
  user: null as { id: string; role?: string } | null,
  supabaseUser: null as { id: string } | null,
  loading: false,
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}));

function renderAt(path: string, requireAdmin = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>home-page</div>} />
        <Route path="/login" element={<div>login-page</div>} />
        <Route
          path="/portal"
          element={(
            <ProtectedRoute requireAdmin={requireAdmin}>
              <div>portal-ok</div>
            </ProtectedRoute>
          )}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it.each([
    { id: 'customer-1', role: 'customer' },
    null,
  ])('denies admin pages when the profile is not an admin: %j', (user) => {
    authState.loading = false;
    authState.user = user;
    authState.supabaseUser = { id: 'session-1' };
    renderAt('/portal', true);
    expect(screen.getByText('home-page')).toBeInTheDocument();
    expect(screen.queryByText('portal-ok')).not.toBeInTheDocument();
  });

  it('allows an admin profile to open an admin page', () => {
    authState.loading = false;
    authState.user = { id: 'admin-1', role: 'admin' };
    authState.supabaseUser = { id: 'admin-1' };
    renderAt('/portal', true);
    expect(screen.getByText('portal-ok')).toBeInTheDocument();
  });
  it('shows loading and does not bounce to login while auth is unresolved', () => {
    authState.loading = true;
    authState.user = null;
    authState.supabaseUser = null;
    renderAt('/portal');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('login-page')).not.toBeInTheDocument();
  });

  it('renders children when a user is present', () => {
    authState.loading = false;
    authState.user = { id: 'u1' };
    authState.supabaseUser = { id: 'u1' };
    renderAt('/portal');
    expect(screen.getByText('portal-ok')).toBeInTheDocument();
  });

  it('keeps a valid session on the page even before the profile row exists', () => {
    authState.loading = false;
    authState.user = null;
    authState.supabaseUser = { id: 'u1' };
    renderAt('/portal');
    expect(screen.getByText('portal-ok')).toBeInTheDocument();
  });

  it('redirects to login only after loading finishes without a session', () => {
    authState.loading = false;
    authState.user = null;
    authState.supabaseUser = null;
    renderAt('/portal');
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });
});

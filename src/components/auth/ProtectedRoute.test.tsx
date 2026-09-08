import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute';

const authState = {
  user: null as { id: string } | null,
  supabaseUser: null as { id: string } | null,
  loading: false,
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>login-page</div>} />
        <Route
          path="/portal"
          element={(
            <ProtectedRoute>
              <div>portal-ok</div>
            </ProtectedRoute>
          )}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
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

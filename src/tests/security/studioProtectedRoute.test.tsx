import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const authState = {
  user: null as { id: string } | null,
  supabaseUser: null as { id: string } | null,
  loading: false,
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}));

describe('Studio ProtectedRoute (FP-025A)', () => {
  it('redirects unauthenticated visitors away from Studio', () => {
    authState.loading = false;
    authState.user = null;
    authState.supabaseUser = null;
    render(
      <MemoryRouter initialEntries={['/fabricator/studio/projects']}>
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route
            path="/fabricator/studio/*"
            element={(
              <ProtectedRoute>
                <div>studio-ok</div>
              </ProtectedRoute>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });

  it('renders Studio when a session exists', () => {
    authState.loading = false;
    authState.user = { id: 'u1' };
    authState.supabaseUser = { id: 'u1' };
    render(
      <MemoryRouter initialEntries={['/fabricator/studio/projects']}>
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route
            path="/fabricator/studio/*"
            element={(
              <ProtectedRoute>
                <div>studio-ok</div>
              </ProtectedRoute>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('studio-ok')).toBeInTheDocument();
  });
});

/**
 * Approvals queue must own the studio outlet scrollport so approve actions
 * stay reachable under overflow-hidden shell chrome (phone → desktop).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ManufacturingApprovalsPage from './ManufacturingApprovalsPage';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1' }, loading: false }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: mocks.rpc },
}));

vi.mock('@/components/fabricator/hardener/HardenerApprovalsPanel', () => ({
  HardenerApprovalsPanel: () => <div data-testid="hardener-approvals-panel">Hardener</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ManufacturingApprovalsPage scroll shell', () => {
  beforeEach(() => {
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'admin_list_manufacturing_approval_requests') {
        return Promise.resolve({ data: [], error: null });
      }
      if (name === 'admin_list_active_manufacturing_authority') {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  it('uses a bounded overflow-y scrollport with sticky jump nav', async () => {
    render(
      <MemoryRouter>
        {/* StudioLayout clips the outlet; page must scroll inside. */}
        <div className="h-[480px] overflow-hidden">
          <ManufacturingApprovalsPage />
        </div>
      </MemoryRouter>,
    );

    const root = await screen.findByTestId('manufacturing-approvals-admin');
    expect(root.className).toMatch(/h-full/);
    expect(root.className).toMatch(/min-h-0/);
    expect(root.className).toMatch(/overflow-y-auto/);

    await waitFor(() => {
      expect(screen.getByTestId('approvals-jump-nav')).toBeInTheDocument();
    });
    expect(screen.getByTestId('approvals-jump-approvals-pending')).toBeInTheDocument();
    expect(screen.getByTestId('approvals-jump-approvals-hardener')).toBeInTheDocument();
    expect(screen.getByTestId('vendor-catalogue-section')).toBeInTheDocument();
    expect(document.getElementById('approvals-hardener')).toBeTruthy();
  });
});

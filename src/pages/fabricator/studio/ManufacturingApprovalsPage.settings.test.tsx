/**
 * Admin can review and set kerf / trim / stock before approving a pending
 * manufacturing authority request. Values pre-fill from the requesting
 * workshop's tuning defaults; invalid values block the Approve RPC.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ManufacturingApprovalsPage from './ManufacturingApprovalsPage';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), listTuningForOwner: vi.fn(), auth: { user: { id: 'admin-1' }, loading: false } }));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mocks.rpc,
    auth: {
      getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));
vi.mock('@/lib/fabricatorConfigApi', () => ({
  fabricatorConfigApi: { listTuningForOwner: mocks.listTuningForOwner },
}));
vi.mock('@/components/fabricator/hardener/HardenerApprovalsPanel', () => ({
  HardenerApprovalsPanel: () => <div>Hardener</div>,
}));
// AICS-001: non-vendor approve binds live pack profiles — never invent codes in the test.
vi.mock('@/hooks/fabricator/useEngineeringSystemPacks', () => ({
  useEngineeringSystemPacks: () => [
    {
      meta: { id: 'my-pack', name: 'My Pack' },
      profiles: [
        { id: 'MY-FRAME', type: 'frame', barLength: 6000, specifications: { profileRole: 'frame' } },
        { id: 'MY-SASH', type: 'sash', barLength: 6000, specifications: { profileRole: 'sash' } },
      ],
    },
  ],
}));

const REQUEST = {
  id: 'req-1',
  owner_user_id: 'owner-7',
  position_id: 'pos-1',
  position_revision: 3,
  system_pack_id: 'my-pack',
  catalogue_reference: 'cat',
  rule_reference: 'rule',
  notes: '',
  status: 'pending',
  approval_id: null,
  requested_at: '2026-11-01T00:00:00Z',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mocks.listTuningForOwner.mockResolvedValue([
    { id: 't1', key: 'saw_kerf_mm', value: 3.2, unit: 'mm', description: null },
    { id: 't2', key: 'bar_end_trim_mm', value: 12, unit: 'mm', description: null },
  ]);
  mocks.rpc.mockImplementation((name: string) => {
    if (name === 'admin_list_manufacturing_approval_requests') return Promise.resolve({ data: [REQUEST], error: null });
    if (name === 'admin_list_active_manufacturing_authority') return Promise.resolve({ data: [], error: null });
    if (name === 'admin_approve_fabricator_manufacturing_approval') {
      return Promise.resolve({ data: 'a0000000-0000-4000-8000-000000000009', error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
});

function setup() {
  return render(
    <MemoryRouter>
      <ManufacturingApprovalsPage />
    </MemoryRouter>,
  );
}

describe('ManufacturingApprovalsPage approval settings', () => {
  it('pre-fills kerf and trim from the workshop tuning and stock from platform default', async () => {
    setup();
    const kerf = (await screen.findByTestId('approval-req-1-sawKerfMm-input')) as HTMLInputElement;
    await waitFor(() => expect(kerf.value).toBe('3.2'));
    expect((screen.getByTestId('approval-req-1-trimCutMm-input') as HTMLInputElement).value).toBe('12');
    expect((screen.getByTestId('approval-req-1-stockLengthMm-input') as HTMLInputElement).value).toBe('6000');
    expect(mocks.listTuningForOwner).toHaveBeenCalledWith('owner-7');
    expect(screen.getByTestId('approval-settings-req-1')).toHaveTextContent(/workshop default/);
    expect(screen.getByTestId('approval-settings-req-1')).toHaveTextContent(/platform default/);
  });

  it('blocks approval while a setting is out of range and shows the field error', async () => {
    setup();
    const kerf = (await screen.findByTestId('approval-req-1-sawKerfMm-input')) as HTMLInputElement;
    await waitFor(() => expect(kerf.value).toBe('3.2'));
    fireEvent.change(kerf, { target: { value: '99' } });
    expect(screen.getByText(/Saw kerf must be between 0 and 20 mm/)).toBeInTheDocument();
    expect(screen.getByTestId('approve-request-req-1')).toBeDisabled();
    expect(mocks.rpc).not.toHaveBeenCalledWith('admin_approve_fabricator_manufacturing_approval', expect.anything());
  });

  it('submits the admin-confirmed settings inside the authority payload', async () => {
    setup();
    const kerf = (await screen.findByTestId('approval-req-1-sawKerfMm-input')) as HTMLInputElement;
    await waitFor(() => expect(kerf.value).toBe('3.2'));
    fireEvent.change(screen.getByTestId('approval-req-1-stockLengthMm-input'), { target: { value: '6500' } });
    fireEvent.click(screen.getByTestId('approve-request-req-1'));

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith(
        'admin_approve_fabricator_manufacturing_approval',
        expect.objectContaining({ p_request_id: 'req-1' }),
      );
    });
    const call = mocks.rpc.mock.calls.find((c) => c[0] === 'admin_approve_fabricator_manufacturing_approval')!;
    const payload = call[1].p_authority_payload as {
      manufacturingSettings: { sawKerfMm: number; trimCutMm: number };
      profiles: Array<{ stockLengthMm: number }>;
    };
    expect(payload.manufacturingSettings).toEqual({ sawKerfMm: 3.2, trimCutMm: 12 });
    for (const p of payload.profiles) expect(p.stockLengthMm).toBe(6500);
    await waitFor(() => expect(screen.getByTestId('approvals-status')).toHaveTextContent(/kerf 3.2 mm · trim 12 mm · stock 6500 mm/));
  });
});

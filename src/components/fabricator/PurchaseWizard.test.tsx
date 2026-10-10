import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseWizard } from './PurchaseWizard';

const mocks = vi.hoisted(() => ({ catalogue: vi.fn(), intake: vi.fn(), toast: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/catalog/UnifiedProfileCatalog', () => ({ UnifiedProfileCatalog: { getAllSystems: mocks.catalogue } }));
vi.mock('sonner', () => ({ toast: { success: mocks.toast, error: mocks.toast, message: mocks.toast } }));
vi.mock('@/lib/supabase', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'owner' }, error: null }) }) }) }),
  rpc: mocks.rpc,
} }));
vi.mock('@/lib/fabricator/inventory/stockIntake', () => ({ hashIntakePayload: async () => 'hash', recordAtomicStockIntake: mocks.intake }));
vi.mock('@/lib/fabricator/inventory/stockIntakeRequest', () => ({ resolveIntakeRequestId: () => 'request', clearPendingStockIntake: vi.fn() }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.catalogue.mockResolvedValue(['Alpha', 'Beta'].map(name => ({
    id: name, name, brand: `${name} vendor`, category: 'window',
    profiles: [{ profileCode: '100', systemPackId: name, systemName: name, name: `${name} track`, category: 'window', role: 'screen_track', specifications: { profileRole: 'obsolete' } }],
  })));
  mocks.intake.mockResolvedValue({ ok: true });
  mocks.rpc.mockResolvedValue({ error: null });
});

async function addFrom(name: string) {
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`${name}.*vendor`) }));
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
}

describe('PurchaseWizard stock intake', () => {
  it('keeps same-code profiles in different packs, exposes other roles, and records per-line metadata', async () => {
    const complete = vi.fn();
    render(<PurchaseWizard open userId="owner" onOpenChange={vi.fn()} onPurchaseComplete={complete} />);
    await addFrom('Alpha');
    fireEvent.click(screen.getByRole('button', { name: 'Change System' }));
    await addFrom('Beta');
    fireEvent.click(screen.getByRole('button', { name: /Review Purchase/ }));
    expect(screen.getAllByLabelText(/Bars for/)).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Supplier (optional)'), { target: { value: 'Workshop supplier' } });
    fireEvent.change(screen.getByLabelText('Invoice / reference (optional)'), { target: { value: 'INV-42' } });
    fireEvent.click(screen.getByRole('button', { name: /Record stock intake/ }));
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    const lines = mocks.intake.mock.calls[0][0].lines;
    expect(lines.map((line: { pack: string }) => line.pack)).toEqual(['Alpha', 'Beta']);
    expect(lines[0]).toMatchObject({ quantity: 1, barLengthM: 6, supplier: 'Workshop supplier', invoice: 'INV-42', systemBrand: 'Alpha', specifications: { profileRole: 'screen_track' } });
  });

  it('blocks invalid input and retains the cart when the atomic intake fails', async () => {
    mocks.intake.mockResolvedValue({ ok: false, error: 'Stock service unavailable' });
    const complete = vi.fn();
    render(<PurchaseWizard open userId="owner" onOpenChange={vi.fn()} onPurchaseComplete={complete} />);
    await addFrom('Alpha');
    fireEvent.click(screen.getByRole('button', { name: /Review Purchase/ }));
    fireEvent.change(screen.getByLabelText('Bars for Alpha track'), { target: { value: '1.5' } });
    expect(screen.getByRole('button', { name: /Record stock intake/ })).toBeDisabled();
    expect(mocks.intake).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Bars for Alpha track'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Record stock intake/ }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('Stock service unavailable')));
    expect(complete).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Bars for Alpha track')).toHaveValue(2);
  });

  it('offers catalogue retry instead of leaving an empty wizard', async () => {
    mocks.catalogue.mockRejectedValueOnce(new Error('Offline'));
    render(<PurchaseWizard open userId="owner" onOpenChange={vi.fn()} onPurchaseComplete={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load');
    fireEvent.click(screen.getByRole('button', { name: 'Retry catalogue' }));
    expect(await screen.findByRole('button', { name: /Alpha.*vendor/ })).toBeInTheDocument();
  });

  it('does not report a committed receipt as a failed intake when refresh throws', async () => {
    const close = vi.fn();
    render(<PurchaseWizard open userId="owner" onOpenChange={close} onPurchaseComplete={() => { throw new Error('refresh failed'); }} />);
    await addFrom('Alpha');
    fireEvent.click(screen.getByRole('button', { name: /Review Purchase/ }));
    fireEvent.click(screen.getByRole('button', { name: /Record stock intake/ }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    expect(mocks.intake).toHaveBeenCalledOnce();
    expect(mocks.toast).toHaveBeenCalledWith('Stock was recorded. Reload the inventory dashboard to refresh balances.');
  });
});

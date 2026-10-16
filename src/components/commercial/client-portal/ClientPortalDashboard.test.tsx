import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientPortalDashboard } from './ClientPortalDashboard';

const mocks = vi.hoisted(() => ({
  user: { id: 'owner-1' } as { id: string } | null,
  from: vi.fn(),
  eq: vi.fn(),
  summary: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/lib/data/clientPortalClient', () => ({ getClientPortalSummary: mocks.summary }));
vi.mock('./ClientCommunicationCenter', () => ({ ClientCommunicationCenter: () => null }));
vi.mock('./ClientDocumentCenter', () => ({ ClientDocumentCenter: () => null }));
vi.mock('./ClientInvoiceViewer', () => ({ ClientInvoiceViewer: () => null }));
vi.mock('./ClientPaymentProcessor', () => ({ ClientPaymentProcessor: () => null }));
vi.mock('./ClientQuoteViewer', () => ({ ClientQuoteViewer: () => null }));

function respond(error: { message: string } | null) {
  mocks.from.mockImplementation(() => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: mocks.eq.mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: error ? null : [], error }),
    };
    return query;
  });
}

describe('ClientPortalDashboard data availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 'owner-1' };
    respond(null);
    mocks.summary.mockResolvedValue({
      totalQuotes: 0, pendingQuotes: 0, totalInvoices: 0, paidInvoices: 0,
      pendingInvoices: 0, overdueInvoices: 0, currencies: [],
    });
  });

  it('shows database failures instead of reporting an empty account and allows retry', async () => {
    respond({ message: 'relation does not exist' });
    render(<ClientPortalDashboard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Account data unavailable');
    expect(screen.queryByText('No invoices found')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Revenue')).not.toBeInTheDocument();
    respond(null);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(await screen.findByText('No invoices found')).toBeInTheDocument();
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'owner-1');
  });

  it('does not request private data without an authenticated profile', () => {
    mocks.user = null;
    render(<ClientPortalDashboard />);
    expect(screen.getByRole('status')).toHaveTextContent('Sign in');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('uses complete-account metrics and keeps different currencies separate', async () => {
    mocks.summary.mockResolvedValue({
      totalQuotes: 34, pendingQuotes: 2, totalInvoices: 25, paidInvoices: 23,
      pendingInvoices: 2, overdueInvoices: 0,
      currencies: [
        { currency: 'EGP', totalRevenue: 1500, pendingAmount: 100 },
        { currency: 'USD', totalRevenue: 50, pendingAmount: 10 },
      ],
    });
    render(<ClientPortalDashboard />);
    expect(await screen.findByText('34')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText(/1,500/)).toHaveTextContent('1,500');
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });

  it('ignores requests completed after the user signs out', async () => {
    let resolve!: (value: { data: never[]; error: null }) => void;
    const pending = new Promise<{ data: never[]; error: null }>((done) => { resolve = done; });
    mocks.from.mockImplementation(() => ({
      select() { return this; },
      eq() { return this; },
      order() { return this; },
      limit() { return pending; },
    }));
    const view = render(<ClientPortalDashboard />);
    mocks.user = null;
    view.rerender(<ClientPortalDashboard />);
    resolve({ data: [], error: null });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Sign in'));
    expect(screen.queryByText('No invoices found')).not.toBeInTheDocument();
  });
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientInvoiceViewer } from './ClientInvoiceViewer';

const mocks = vi.hoisted(() => ({ order: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ order: mocks.order }) }) } }));
vi.mock('@/services/commercial/CommercialPDFService', () => ({ CommercialPDFService: {} }));

describe('invoice loading isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers retry for resolved database errors instead of an empty invoice list', async () => {
    mocks.order.mockResolvedValueOnce({ data: null, error: { message: 'database unavailable' } });
    render(<ClientInvoiceViewer customerId="account-a" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load invoices');
    expect(screen.queryByText('No invoices found')).not.toBeInTheDocument();
    mocks.order.mockResolvedValueOnce({ data: [], error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No invoices found')).toBeInTheDocument();
  });

  it('ignores a previous account request after identity changes', async () => {
    let resolve!: (value: unknown) => void;
    mocks.order.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const view = render(<ClientInvoiceViewer customerId="account-a" />);
    mocks.order.mockResolvedValueOnce({ data: [], error: null });
    view.rerender(<ClientInvoiceViewer customerId="account-b" />);
    expect(await screen.findByText('No invoices found')).toBeInTheDocument();
    await act(async () => resolve({ data: null, error: { message: 'late account-a error' } }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('No invoices found')).toBeInTheDocument();
  });
});

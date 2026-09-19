import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuotePage from './QuotePage';

const quote = vi.hoisted(() => ({
  quoteItems: [{ id: 'line-1', product_id: 'machine-1', product_name_en: 'Test Machine', product_sku: 'TM1', quantity: 2, unit_price: 90, total_price: 180 }],
  subtotal: 180,
  removeFromQuote: vi.fn(), updateQuantity: vi.fn(), clearQuote: vi.fn(),
}));
vi.mock('@/context/QuoteContext', () => ({ useQuote: () => quote }));
vi.mock('@/hocs/withErrorBoundary', () => ({ withErrorBoundary: (component: unknown) => component }));

describe('Public quote enquiry', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses quote line IDs and ignores invalid quantities', () => {
    render(<MemoryRouter><QuotePage /></MemoryRouter>);
    const quantity = screen.getByRole('spinbutton', { name: 'Quantity for Test Machine' });
    fireEvent.change(quantity, { target: { value: '3' } });
    expect(quote.updateQuantity).toHaveBeenCalledWith('line-1', 3);
    quote.updateQuantity.mockClear();
    for (const value of ['', '0', '-1', '1.5']) fireEvent.change(quantity, { target: { value } });
    expect(quote.updateQuantity).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Test Machine' }));
    expect(quote.removeFromQuote).toHaveBeenCalledWith('line-1');
  });
  it('preserves the basket and prepares a draft instead of pretending to submit', () => {
    render(<MemoryRouter><QuotePage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test Buyer' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '+201000000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare Quote Email' }));
    const href = screen.getByRole('link', { name: 'Open quote email draft' }).getAttribute('href')!;
    expect(decodeURIComponent(href)).toContain('2 x Test Machine (TM1)');
    expect(screen.getByRole('status')).toHaveTextContent('Your request has not been sent');
    expect(quote.clearQuote).not.toHaveBeenCalled();
    expect(screen.getByText('Priced items subtotal: 180 EGP')).toBeInTheDocument();
  });
});

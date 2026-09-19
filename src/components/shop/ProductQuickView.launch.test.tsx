import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductQuickView } from './ProductQuickView';
import type { Machine } from '@/types';

const mocks = vi.hoisted(() => ({ add: vi.fn(), close: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/context/QuoteContext', () => ({ useQuote: () => ({ addToQuote: mocks.add }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }) }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('@/lib/analytics/quickViewAnalytics', () => ({ quickViewAnalytics: {
  trackQuickViewOpen: vi.fn(), trackQuickViewClose: vi.fn(), trackQuickViewConversion: vi.fn(), trackTabSwitch: vi.fn(),
} }));
const product: Machine = {
  id: 'test-machine', name: 'Test Machine', description: 'Test description', imageUrl: '/placeholder.svg',
  category: 'cutting', releaseDate: '2026-01-01', type: 'Machine',
  powerSpec: { voltage: '380V', frequency: '50Hz', phase: '3', consumption: '1kW' },
};

describe('Machine quick view', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses supplied catalogue price and stock instead of hard-coded promises', () => {
    render(<ProductQuickView product={product} isOpen onClose={mocks.close} priceLabel="EGP 32,000" stock={0} />);
    expect(screen.getByText('EGP 32,000')).toBeInTheDocument();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.queryByText('In Stock')).not.toBeInTheDocument();
    expect(screen.queryByText('2-4 weeks delivery')).not.toBeInTheDocument();
  });
  it('does not confirm or close a failed quote addition', async () => {
    mocks.add.mockRejectedValue(new Error('Stock lookup failed'));
    render(<ProductQuickView product={product} isOpen onClose={mocks.close} onAddToQuote={mocks.add} />);
    fireEvent.click(screen.getByRole('button', { name: /Add to Quote/ }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.close).not.toHaveBeenCalled();
  });
});

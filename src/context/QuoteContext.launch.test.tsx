import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteProvider, useQuote } from './QuoteContext';

const mocks = vi.hoisted(() => ({ stock: vi.fn(), database: vi.fn(), create: vi.fn() }));
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: null, supabaseUser: null }) }));
vi.mock('@/lib/inventory', () => ({ validateStock: mocks.stock }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.database } }));
vi.mock('@/lib/data/quotesClient', () => ({ createQuote: mocks.create, updateQuoteStatus: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Public catalogue enquiry basket', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
  it('adds and merges catalogue items without reserving stock or contacting a database', async () => {
    const { result } = renderHook(useQuote, { wrapper: QuoteProvider });
    await act(async () => { await result.current.addCatalogueToQuote({ id: 'ym-004', name: 'KM-212' }, 2); });
    await act(async () => { await result.current.addCatalogueToQuote({ id: 'ym-004', name: 'KM-212' }); });
    expect(result.current.quoteItems).toHaveLength(1);
    expect(result.current.quoteItems[0]).toMatchObject({ quantity: 3, enquiry_only: true, unit_price: 0 });
    expect(mocks.stock).not.toHaveBeenCalled();
    expect(mocks.database).not.toHaveBeenCalled();
    await expect(result.current.createNewQuote()).rejects.toThrow('email draft');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('preserves enquiries on remount and supports quantity edits and removal', async () => {
    const first = renderHook(useQuote, { wrapper: QuoteProvider });
    await act(async () => { await first.result.current.addCatalogueToQuote({ id: 'ym-004', name: 'KM-212' }); });
    first.unmount();
    const next = renderHook(useQuote, { wrapper: QuoteProvider });
    await waitFor(() => expect(next.result.current.quoteItems).toHaveLength(1));
    const id = next.result.current.quoteItems[0].id;
    act(() => next.result.current.updateQuantity(id, 5));
    expect(next.result.current.quoteItems[0].quantity).toBe(5);
    act(() => next.result.current.removeFromQuote(id));
    expect(next.result.current.quoteItems).toHaveLength(0);
  });
  it('rejects invalid input and safely ignores corrupt saved data', async () => {
    localStorage.setItem('almona_quote_items', '{broken');
    const { result } = renderHook(useQuote, { wrapper: QuoteProvider });
    await expect(result.current.addCatalogueToQuote({ id: 'x', name: 'Machine' }, 1.5)).rejects.toThrow('whole-number');
    expect(result.current.quoteItems).toHaveLength(0);
  });
  it('keeps stock validation on the existing database-product path', async () => {
    mocks.stock.mockResolvedValue({ isValid: false, message: 'Stock unavailable' });
    const { result } = renderHook(useQuote, { wrapper: QuoteProvider });
    const product = { id: 'database-id', sku: 'DB-1', name_en: 'Database product', stock_quantity: 0 };
    await expect(result.current.addToQuote(product as Parameters<typeof result.current.addToQuote>[0])).rejects.toThrow('Stock unavailable');
    expect(mocks.stock).toHaveBeenCalledWith('database-id', 1);
    expect(result.current.quoteItems).toHaveLength(0);
  });
});

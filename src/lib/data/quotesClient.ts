import type { Database, QuoteStatus } from '@/types/database';
import { z } from 'zod';
import { table } from './clientCore';

const quoteItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  variant_id: z.string().uuid().nullable().optional(),
  product_name_ar: z.string().min(1),
  product_name_en: z.string().min(1),
  product_sku: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  total_price: z.number().nonnegative(),
  configurations: z.record(z.unknown()).optional().default({}),
  specifications: z.record(z.unknown()).optional().default({}),
  notes: z.string().optional().nullable(),
});

export const quoteCreateSchema = z.object({
  user_id: z.string().uuid(),
  status: z.custom<QuoteStatus>().optional(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
  subtotal: z.number().nonnegative().default(0),
  tax_amount: z.number().nonnegative().default(0),
  discount_amount: z.number().nonnegative().default(0),
  shipping_cost: z.number().nonnegative().default(0),
  total_amount: z.number().nonnegative().default(0),
  currency: z.string().default('EGP'),
  delivery_timeline: z.string().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  // Allow zero items for initial draft quotes; UI can add later
  items: z.array(quoteItemSchema).default([]),
});

export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;

type QuoteRow = Database['public']['Tables']['quotes']['Row'];

export async function createQuote(input: QuoteCreateInput): Promise<QuoteRow> {
  const parsed = quoteCreateSchema.parse(input);
  const { items: _items, ...quoteCore } = parsed;
  const { data, error } = await (table('quotes') as any)
    .insert(quoteCore as any)
    .select('*')
    .single();
  if (error) throw error;
  // Items persistence could be added here if needed; omitted for brevity.
  return data as QuoteRow;
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<QuoteRow> {
  const { data, error } = await (table('quotes') as any)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error; return data as QuoteRow;
}

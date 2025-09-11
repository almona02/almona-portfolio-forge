import { z } from 'zod';
import type { Database, OrderStatus } from '@/types/database';
import { table } from './clientCore';

const orderItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  variant_id: z.string().uuid().nullable().optional(),
  product_name_ar: z.string().min(1),
  product_name_en: z.string().min(1),
  product_sku: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  total_price: z.number().nonnegative(),
  configurations: z.record(z.unknown()).optional().default({}),
});

export const orderCreateSchema = z.object({
  user_id: z.string().uuid(),
  quote_id: z.string().uuid().optional().nullable(),
  status: z.custom<OrderStatus>().optional(),
  subtotal: z.number().nonnegative(),
  tax_amount: z.number().nonnegative().default(0),
  discount_amount: z.number().nonnegative().default(0),
  shipping_cost: z.number().nonnegative().default(0),
  total_amount: z.number().nonnegative(),
  currency: z.string().default('EGP'),
  payment_method: z.string().optional().nullable(),
  payment_status: z.string().optional().default('pending'),
  payment_reference: z.string().optional().nullable(),
  shipping_method: z.string().optional().nullable(),
  tracking_number: z.string().optional().nullable(),
  estimated_delivery: z.string().optional().nullable(),
  customer_notes: z.string().optional().nullable(),
  admin_notes: z.string().optional().nullable(),
  billing_address: z.record(z.unknown()),
  shipping_address: z.record(z.unknown()),
  items: z.array(orderItemSchema).min(1),
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

type OrderRow = Database['public']['Tables']['orders']['Row'];

export async function createOrder(input: OrderCreateInput): Promise<OrderRow> {
  const parsed = orderCreateSchema.parse(input);
  const { items, ...core } = parsed;
  const { data, error } = await (table('orders') as any)
    .insert(core as any)
    .select('*')
    .single();
  if (error) throw error; return data as OrderRow;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<OrderRow> {
  const { data, error } = await (table('orders') as any)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error; return data as OrderRow;
}

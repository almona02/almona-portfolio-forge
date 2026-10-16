import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const count = z.number().int().nonnegative();
const money = z.number().finite().nonnegative();
export const clientPortalSummarySchema = z.object({
  totalQuotes: count,
  pendingQuotes: count,
  totalInvoices: count,
  paidInvoices: count,
  pendingInvoices: count,
  overdueInvoices: count,
  currencies: z.array(z.object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    totalRevenue: money,
    pendingAmount: money,
  })),
});
export type ClientPortalSummary = z.infer<typeof clientPortalSummarySchema>;

export async function getClientPortalSummary(): Promise<ClientPortalSummary> {
  const rpc = supabase as unknown as {
    rpc(name: 'get_client_portal_summary'): PromiseLike<{
      data: unknown; error: { message: string } | null;
    }>;
  };
  const { data, error } = await rpc.rpc('get_client_portal_summary');
  if (error) throw new Error('Account summary unavailable');
  return clientPortalSummarySchema.parse(data);
}

// Processor responses may contain provider details and are server-only.
export const PAYMENT_PUBLIC_COLUMNS = 'id,invoice_id,customer_id,amount,currency,method,status,transaction_id,created_at,updated_at,completed_at,refunded_at,notes';

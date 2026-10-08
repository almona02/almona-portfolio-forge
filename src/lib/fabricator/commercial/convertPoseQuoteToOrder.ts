/**
 * UP-16 / #57 — Convert a persisted pose quote into one order via server RPC.
 * Fail-closed: durable optimized position required (not a client boolean).
 */

import { supabase } from '@/lib/supabase';
import type { WorkflowQuote } from '@/store/workflowStore';

export interface ConvertPoseQuoteToOrderInput {
  ownerUserId: string;
  projectId: string;
  positionId: string;
  revision: number;
  quote: WorkflowQuote;
  taxRate?: number;
  markupPercent?: number;
  customerName?: string;
  projectTitle?: string;
  /** @deprecated Client hint only — server ignores this and checks durable status. */
  optimizationApproved?: boolean;
}

export type ConvertPoseQuoteToOrderResult =
  | { ok: true; orderId: string; poseQuoteId: string; reused: boolean }
  | { ok: false; error: string };

type RpcClient = {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

/**
 * Server transactional convert. Money validated client-side then again in RPC.
 */
export async function convertPoseQuoteToOrder(
  input: ConvertPoseQuoteToOrderInput,
): Promise<ConvertPoseQuoteToOrderResult> {
  if (input.optimizationApproved === false) {
    return {
      ok: false,
      error: 'Convert to Order is blocked until optimization is approved and reconciled.',
    };
  }

  const taxRate = input.taxRate ?? 0.14;
  const subtotal = Number(input.quote.subtotal ?? (input.quote.total - (input.quote.tax ?? 0)));
  const taxAmount = Number(input.quote.tax ?? Math.max(0, input.quote.total - subtotal));
  const totalAmount = Number(input.quote.total);

  if (![subtotal, taxAmount, totalAmount].every((n) => Number.isFinite(n) && n >= 0)) {
    return { ok: false, error: 'Quote money fields must be finite and non-negative.' };
  }
  if (Math.abs(totalAmount - (subtotal + taxAmount)) > 0.02) {
    return {
      ok: false,
      error: `Quote totals inconsistent (subtotal ${subtotal} + tax ${taxAmount} ≠ total ${totalAmount}).`,
    };
  }

  const notes = [
    input.projectTitle ? `Project: ${input.projectTitle}` : null,
    input.customerName ? `Customer: ${input.customerName}` : null,
    `project=${input.projectId}`,
    `position=${input.positionId}`,
    `revision=${input.revision}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const rpc = supabase as unknown as RpcClient;
  const { data, error } = await rpc.rpc('convert_fabricator_pose_quote_to_order', {
    p_project_id: input.projectId,
    p_position_id: input.positionId,
    p_revision: input.revision,
    p_subtotal: subtotal,
    p_tax_amount: taxAmount,
    p_total_amount: totalAmount,
    p_currency: input.quote.currency || 'EGP',
    p_tax_rate: taxRate,
    p_markup_percent: input.markupPercent ?? null,
    p_line_items: input.quote.lineItems ?? [],
    p_quote_payload: { ...input.quote, taxInclusiveTotal: true },
    p_customer_notes: notes,
  });

  if (error) {
    return { ok: false, error: error.message || 'Convert to order failed.' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = row as {
    order_id?: string;
    pose_quote_id?: string;
    reused?: boolean;
  } | null;

  if (!parsed?.order_id || !parsed?.pose_quote_id) {
    return { ok: false, error: 'Convert RPC returned no order id.' };
  }

  return {
    ok: true,
    orderId: String(parsed.order_id),
    poseQuoteId: String(parsed.pose_quote_id),
    reused: Boolean(parsed.reused),
  };
}

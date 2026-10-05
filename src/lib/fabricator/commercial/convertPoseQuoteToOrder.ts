/**
 * UP-16 — Convert a persisted pose quote into one order (idempotent, no double tax).
 */

import { supabase } from '@/lib/supabase';
import type { WorkflowQuote } from '@/store/workflowStore';
import { upsertPoseQuote, type PoseQuoteStatus } from './poseQuotesClient';

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
}

export type ConvertPoseQuoteToOrderResult =
  | { ok: true; orderId: string; poseQuoteId: string; reused: boolean }
  | { ok: false; error: string };

/**
 * Upsert priced→accepted pose quote, then create order once.
 * Money uses quote.subtotal / tax / total as-is (already VAT-split by quote builder).
 */
export async function convertPoseQuoteToOrder(
  input: ConvertPoseQuoteToOrderInput,
): Promise<ConvertPoseQuoteToOrderResult> {
  const taxRate = input.taxRate ?? 0.14;

  const persisted = await upsertPoseQuote({
    ownerUserId: input.ownerUserId,
    projectId: input.projectId,
    positionId: input.positionId,
    revision: input.revision,
    status: 'accepted' as PoseQuoteStatus,
    quote: input.quote,
    taxRate,
    markupPercent: input.markupPercent,
  });

  if (!persisted.ok) {
    return { ok: false, error: persisted.error };
  }

  const poseQuoteId = persisted.id;
  const db = supabase as any;

  // Idempotent: return existing order for this pose quote.
  const { data: existing, error: existingErr } = await db
    .from('orders')
    .select('id')
    .eq('fabricator_pose_quote_id', poseQuoteId)
    .eq('user_id', input.ownerUserId)
    .maybeSingle();

  if (existingErr) {
    return { ok: false, error: existingErr.message || 'Failed to check existing order.' };
  }
  if (existing?.id) {
    return { ok: true, orderId: String(existing.id), poseQuoteId, reused: true };
  }

  const subtotal = Number(input.quote.subtotal ?? (input.quote.total - (input.quote.tax ?? 0)));
  const taxAmount = Number(input.quote.tax ?? Math.max(0, input.quote.total - subtotal));
  const totalAmount = Number(input.quote.total);

  if (![subtotal, taxAmount, totalAmount].every((n) => Number.isFinite(n) && n >= 0)) {
    return { ok: false, error: 'Quote money fields must be finite and non-negative.' };
  }
  // Guard: total must equal subtotal + tax (within 1 cent) — prevents double-tax inserts.
  if (Math.abs(totalAmount - (subtotal + taxAmount)) > 0.02) {
    return {
      ok: false,
      error: `Quote totals inconsistent (subtotal ${subtotal} + tax ${taxAmount} ≠ total ${totalAmount}).`,
    };
  }

  const notes = [
    input.projectTitle ? `Project: ${input.projectTitle}` : null,
    input.customerName ? `Customer: ${input.customerName}` : null,
    `Pose quote ${poseQuoteId}`,
    `project=${input.projectId}`,
    `position=${input.positionId}`,
    `revision=${input.revision}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const { data: order, error: orderErr } = await db
    .from('orders')
    .insert({
      user_id: input.ownerUserId,
      fabricator_pose_quote_id: poseQuoteId,
      status: 'pending',
      subtotal,
      tax_amount: taxAmount,
      discount_amount: 0,
      shipping_cost: 0,
      total_amount: totalAmount,
      currency: input.quote.currency || 'EGP',
      payment_status: 'pending',
      customer_notes: notes,
      billing_address: {},
      shipping_address: {},
    })
    .select('id')
    .single();

  if (orderErr) {
    // Unique race: another request won — fetch that order.
    if (String(orderErr.code) === '23505' || /duplicate|unique/i.test(orderErr.message || '')) {
      const { data: raced } = await db
        .from('orders')
        .select('id')
        .eq('fabricator_pose_quote_id', poseQuoteId)
        .eq('user_id', input.ownerUserId)
        .maybeSingle();
      if (raced?.id) {
        return { ok: true, orderId: String(raced.id), poseQuoteId, reused: true };
      }
    }
    return { ok: false, error: orderErr.message || 'Failed to create order.' };
  }

  if (!order?.id) {
    return { ok: false, error: 'Order insert returned no id.' };
  }

  return { ok: true, orderId: String(order.id), poseQuoteId, reused: false };
}

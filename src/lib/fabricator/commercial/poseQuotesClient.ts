/**
 * UP-15 — Persist pose quotes bound to project / position / revision.
 */

import { supabase } from '@/lib/supabase';
import type { WorkflowQuote } from '@/store/workflowStore';

export type PoseQuoteStatus = 'draft' | 'priced' | 'accepted' | 'superseded' | 'expired';

export interface UpsertPoseQuoteInput {
  ownerUserId: string;
  projectId: string;
  positionId: string;
  revision: number;
  status: PoseQuoteStatus;
  quote: WorkflowQuote;
  taxRate?: number;
  markupPercent?: number;
}

export type UpsertPoseQuoteResult =
  | { ok: true; id: string; status: PoseQuoteStatus }
  | { ok: false; error: string };

export async function upsertPoseQuote(
  input: UpsertPoseQuoteInput,
): Promise<UpsertPoseQuoteResult> {
  const {
    ownerUserId,
    projectId,
    positionId,
    revision,
    status,
    quote,
    taxRate = 0.14,
    markupPercent,
  } = input;

  if (!ownerUserId || !projectId || !positionId) {
    return { ok: false, error: 'Owner, project, and position are required.' };
  }
  if (!Number.isInteger(revision) || revision < 1) {
    return { ok: false, error: 'A positive integer revision is required.' };
  }

  const subtotal = Number(quote.subtotal ?? (quote.total - (quote.tax ?? 0)));
  const taxAmount = Number(quote.tax ?? Math.max(0, quote.total - subtotal));
  const totalAmount = Number(quote.total);
  if (![subtotal, taxAmount, totalAmount].every((n) => Number.isFinite(n))) {
    return { ok: false, error: 'Quote money fields must be finite numbers.' };
  }

  const row = {
    owner_user_id: ownerUserId,
    project_id: projectId,
    position_id: positionId,
    revision,
    status,
    currency: quote.currency || 'EGP',
    subtotal,
    tax_amount: taxAmount,
    tax_rate: taxRate,
    total_amount: totalAmount,
    markup_percent: markupPercent ?? quote.markupPercentage ?? null,
    line_items: quote.lineItems ?? [],
    quote_payload: {
      ...quote,
      taxInclusiveTotal: true,
    },
    updated_at: new Date().toISOString(),
  };

  const db = supabase as any;
  const { data, error } = await db
    .from('fabricator_pose_quotes')
    .upsert(row, { onConflict: 'project_id,position_id,revision' })
    .select('id, status')
    .single();

  if (error || !data?.id) {
    return { ok: false, error: error?.message || 'Failed to upsert pose quote.' };
  }

  return { ok: true, id: String(data.id), status: data.status as PoseQuoteStatus };
}

/**
 * Payment Service (browser-safe)
 *
 * Client may read payment history and record manual payments via Supabase.
 * Stripe PaymentIntents and webhook verification are SERVER-ONLY — never load
 * the Stripe Node SDK or Stripe secret keys in the Vite bundle (FP-014 / Gate 1).
 */

import { ActivityLogger } from '@/core/activity/ActivityLogger';
import { ActivityEventTypes } from '@/core/activity/activityTypes';
import { supabase } from '@/lib/supabase';
import type { Payment, PaymentIntentResult } from './paymentTypes';

export type { Payment, PaymentIntentResult };

const STRIPE_SERVER_ONLY =
  'Stripe PaymentIntents/webhooks cannot run in the browser. Use a server endpoint that holds the Stripe secret key (never expose secret keys via Vite public env).';

// payments table may not exist in generated schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const payments = () => supabase.from('payments') as any;

function mapPaymentRow(p: Record<string, unknown>): Payment {
  return {
    id: String(p.id || ''),
    invoiceId: (p.invoice_id as string) || null,
    amount: parseFloat(String(p.amount || 0)),
    currency: String(p.currency || 'USD'),
    method: (p.method || 'cash') as Payment['method'],
    status: (p.status || 'pending') as Payment['status'],
    transactionId: (p.transaction_id as string) || null,
    processorResponse: p.processor_response || undefined,
    createdAt: new Date(String(p.created_at || Date.now())),
    updatedAt: new Date(String(p.updated_at || Date.now())),
    completedAt: p.completed_at ? new Date(String(p.completed_at)) : null,
    refundedAt: p.refunded_at ? new Date(String(p.refunded_at)) : null,
    notes: (p.notes as string) || null,
  };
}

export class PaymentService {
  /**
   * Create a payment intent — not available in the browser bundle.
   * Call a backend/edge function that holds the Stripe secret key.
   */
  static async createPaymentIntent(
    _invoiceId: string | null,
    _amount: number,
    _currency: string = 'usd',
  ): Promise<PaymentIntentResult> {
    throw new Error(STRIPE_SERVER_ONLY);
  }

  /**
   * Stripe webhook verification — server-only (signature + webhook secret).
   */
  static async handleStripeWebhook(
    _payload: string | Buffer,
    _signature: string,
  ): Promise<void> {
    throw new Error(STRIPE_SERVER_ONLY);
  }

  static async getPaymentsByPeriod(
    startDate: Date,
    endDate: Date,
    status?: Payment['status'],
    method?: Payment['method'],
  ): Promise<Payment[]> {
    try {
      let query = payments()
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (method) query = query.eq('method', method);

      const { data, error } = await query;
      if (error) {
        console.error('Failed to fetch payments by period:', error);
        return [];
      }
      return (data || []).map((p: Record<string, unknown>) => mapPaymentRow(p));
    } catch (error) {
      console.error('Failed to fetch payments by period:', error);
      return [];
    }
  }

  static async getPaymentHistory(invoiceId: string): Promise<Payment[]> {
    try {
      const { data, error } = await payments()
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch payment history:', error);
        return [];
      }
      return (data || []).map((p: Record<string, unknown>) => mapPaymentRow(p));
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      return [];
    }
  }

  static async getPayment(paymentId: string): Promise<Payment | null> {
    try {
      const { data, error } = await payments().select('*').eq('id', paymentId).single();
      if (error || !data) {
        if (error) console.error('Failed to fetch payment:', error);
        return null;
      }
      return mapPaymentRow(data as Record<string, unknown>);
    } catch (error) {
      console.error('Failed to fetch payment:', error);
      return null;
    }
  }

  static async createManualPayment(
    invoiceId: string | null,
    amount: number,
    currency: string = 'USD',
    method: Payment['method'] = 'cash',
    notes?: string,
  ): Promise<string> {
    try {
      const { data: payment, error } = await payments()
        .insert({
          invoice_id: invoiceId,
          amount,
          currency: currency.toUpperCase(),
          method,
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create manual payment:', error);
        throw error;
      }
      if (!payment) throw new Error('Failed to create payment record');

      const paymentData = payment as { id: string };

      if (invoiceId) {
        await ActivityLogger.log({
          entityType: 'invoice',
          entityId: invoiceId,
          eventType: ActivityEventTypes.INVOICE_PAID,
          metadata: {
            description: `Manual payment received: ${currency} ${amount} via ${method}`,
            payment_id: paymentData.id,
            method,
          },
        });
      }

      await ActivityLogger.log({
        entityType: 'payment',
        entityId: paymentData.id,
        eventType: ActivityEventTypes.PAYMENT_COMPLETED,
        metadata: {
          description: `Manual payment: ${currency} ${amount} via ${method}`,
          invoice_id: invoiceId,
          method,
        },
      });

      return paymentData.id;
    } catch (error) {
      console.error('Failed to create manual payment:', error);
      throw error;
    }
  }
}

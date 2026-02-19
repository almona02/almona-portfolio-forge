/**
 * Payment Service
 * 
 * Centralized service for payment processing with Stripe integration.
 * Provides payment intent creation, webhook handling, and payment history.
 * 
 * Usage:
 * ```typescript
 * const { clientSecret, paymentId } = await PaymentService.createPaymentIntent(
 *   invoiceId,
 *   amount,
 *   'usd'
 * );
 * ```
 */

import { ActivityLogger } from '@/core/activity/ActivityLogger';
import { ActivityEventTypes } from '@/core/activity/activityTypes';
import { supabase } from '@/lib/supabase';
import type { Payment, PaymentIntentResult } from './paymentTypes';

// Stripe will be loaded dynamically to avoid bundle bloat
let stripeInstance: any = null;

const loadStripe = async () => {
  if (stripeInstance) return stripeInstance;
  
  try {
    // Dynamic import to avoid bundling Stripe in initial load
    const Stripe = (await import('stripe')).default;
    const secretKey = import.meta.env.STRIPE_SECRET_KEY || import.meta.env.VITE_STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      console.warn('Stripe secret key not configured. Payment processing will be limited.');
      return null;
    }
    
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover' as any,
    });
    
    return stripeInstance;
  } catch (error) {
    console.error('Failed to load Stripe:', error);
    return null;
  }
};

// Re-export types for backward compatibility
export type { Payment, PaymentIntentResult };

/**
 * Payment Service
 * 
 * Handles payment processing, webhook handling, and payment history.
 */
export class PaymentService {
  /**
   * Create a payment intent for Stripe
   * 
   * @param invoiceId - ID of the invoice being paid
   * @param amount - Payment amount
   * @param currency - Currency code (default: 'usd')
   * @returns Promise that resolves to client secret and payment ID
   * 
   * @example
   * ```typescript
   * const { clientSecret, paymentId } = await PaymentService.createPaymentIntent(
   *   invoiceId,
   *   100.00,
   *   'usd'
   * );
   * ```
   */
  static async createPaymentIntent(
    invoiceId: string | null,
    amount: number,
    currency: string = 'usd'
  ): Promise<PaymentIntentResult> {
    try {
      const stripe = await loadStripe();
      
      if (!stripe) {
        throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          invoice_id: invoiceId || '',
          source: 'almona_portfolio_forge'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create payment record in database (table may not exist in types)
      const { data: payment, error } = await (supabase.from('payments') as any)
        .insert({
          invoice_id: invoiceId,
          amount,
          currency: currency.toUpperCase(),
          method: 'stripe',
          status: 'pending',
          transaction_id: paymentIntent.id,
          processor_response: { 
            payment_intent_id: paymentIntent.id,
            client_secret: paymentIntent.client_secret 
          }
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create payment record:', error);
        throw error;
      }

      if (!payment) {
        throw new Error('Failed to create payment record');
      }

      const paymentData = payment;

      // Log activity
      if (invoiceId) {
        await ActivityLogger.log({
          entityType: 'invoice',
          entityId: invoiceId,
          eventType: ActivityEventTypes.PAYMENT_INITIATED,
          metadata: {
            description: `Payment initiated for ${currency.toUpperCase()} ${amount}`,
            payment_id: paymentData.id,
            method: 'stripe',
            transaction_id: paymentIntent.id
          }
        });
      }

      // Also log payment activity
      await ActivityLogger.log({
        entityType: 'payment',
        entityId: paymentData.id,
        eventType: ActivityEventTypes.PAYMENT_INITIATED,
        metadata: {
          description: `Payment initiated: ${currency.toUpperCase()} ${amount}`,
          invoice_id: invoiceId,
          method: 'stripe'
        }
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentId: paymentData.id
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payment intent';
      console.error('PaymentService.createPaymentIntent error:', error);
      
      // Log payment failure activity
      if (invoiceId) {
        await ActivityLogger.log({
          entityType: 'invoice',
          entityId: invoiceId,
          eventType: ActivityEventTypes.PAYMENT_FAILED,
          metadata: {
            description: `Payment intent creation failed: ${errorMessage}`,
            error: errorMessage
          }
        }).catch(() => {
          // Don't fail if activity logging fails
        });
      }

      // Re-throw with user-friendly message
      throw new Error(
        errorMessage.includes('Stripe') 
          ? 'Payment processing is temporarily unavailable. Please try again or contact support.'
          : 'Failed to initialize payment. Please try again.'
      );
    }
  }

  /**
   * Handle Stripe webhook event
   * 
   * @param payload - Raw webhook payload
   * @param signature - Webhook signature for verification
   * @returns Promise that resolves when webhook is processed
   * 
   * @example
   * ```typescript
   * await PaymentService.handleStripeWebhook(payload, signature);
   * ```
   */
  static async handleStripeWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<void> {
    try {
      const stripe = await loadStripe();
      
      if (!stripe) {
        throw new Error('Stripe is not configured');
      }

      const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET || import.meta.env.VITE_STRIPE_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        throw new Error('Stripe webhook secret not configured');
      }

      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      // Store webhook for audit (table may not exist in types)
      try {
        await (supabase.from('payment_webhooks') as any).insert({
          event_type: event.type,
          payload: event,
          processed: false
        });
      } catch {
        // Webhook table may not exist, continue processing
        console.warn('Payment webhooks table not found, skipping audit log');
      }

      // Process webhook based on type
      if (event.type === 'payment_intent.succeeded') {
        await this.handlePaymentSuccess(event.data.object);
      } else if (event.type === 'payment_intent.payment_failed') {
        await this.handlePaymentFailure(event.data.object);
      } else if (event.type === 'payment_intent.canceled') {
        await this.handlePaymentCancellation(event.data.object);
      }

      // Mark webhook as processed (table may not exist in types)
      try {
        await (supabase.from('payment_webhooks') as any)
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('event_type', event.type)
          .eq('processed', false)
          .order('created_at', { ascending: false })
          .limit(1);
      } catch {
        // Webhook table may not exist, continue processing
        console.warn('Payment webhooks table not found, skipping update');
      }
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSuccess(paymentIntent: any): Promise<void> {
    const invoiceId = paymentIntent.metadata?.invoice_id;
    const transactionId = paymentIntent.id;

    // Update payment record (table may not exist in types)
    const { data: payment } = await ((supabase.from('payments') as any)
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processor_response: paymentIntent
      })
      .eq('transaction_id', transactionId)
      .select()
      .single());

    if (payment && typeof payment === 'object' && 'id' in payment) {
      const paymentData = payment;
      // Log activity for invoice
      if (invoiceId) {
        await ActivityLogger.log({
          entityType: 'invoice',
          entityId: invoiceId,
          eventType: ActivityEventTypes.INVOICE_PAID,
          metadata: {
            description: `Payment received: ${paymentData.currency} ${paymentData.amount}`,
            payment_id: paymentData.id,
            transaction_id: transactionId
          }
        });
      }

      // Log payment activity
      await ActivityLogger.log({
        entityType: 'payment',
        entityId: paymentData.id,
        eventType: ActivityEventTypes.PAYMENT_COMPLETED,
        metadata: {
          description: `Payment completed: ${paymentData.currency} ${paymentData.amount}`,
          invoice_id: invoiceId,
          transaction_id: transactionId
        }
      });
    }
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailure(paymentIntent: any): Promise<void> {
    const transactionId = paymentIntent.id;

    const { data: payment } = await (supabase.from('payments') as any)
      .update({
        status: 'failed',
        processor_response: paymentIntent
      })
      .eq('transaction_id', transactionId)
      .select()
      .single();

    if (payment && typeof payment === 'object' && 'id' in payment) {
      const paymentData = payment;
      await ActivityLogger.log({
        entityType: 'payment',
        entityId: paymentData.id,
        eventType: ActivityEventTypes.PAYMENT_FAILED,
        metadata: {
          description: `Payment failed: ${paymentData.currency} ${paymentData.amount}`,
          error: paymentIntent.last_payment_error?.message || 'Unknown error',
          transaction_id: transactionId
        }
      });
    }
  }

  /**
   * Handle cancelled payment
   */
  private static async handlePaymentCancellation(paymentIntent: any): Promise<void> {
    const transactionId = paymentIntent.id;

    const { data: payment } = await ((supabase.from('payments') as any)
      .update({
        status: 'cancelled',
        processor_response: paymentIntent
      })
      .eq('transaction_id', transactionId)
      .select()
      .single());

    if (payment && typeof payment === 'object' && 'id' in payment) {
      const paymentData = payment;
      await ActivityLogger.log({
        entityType: 'payment',
        entityId: paymentData.id,
        eventType: ActivityEventTypes.PAYMENT_CANCELLED,
        metadata: {
          description: `Payment cancelled: ${paymentData.currency} ${paymentData.amount}`,
          transaction_id: transactionId
        }
      });
    }
  }

  /**
   * Get payments by period
   * 
   * @param startDate - Start date of the period
   * @param endDate - End date of the period
   * @param status - Optional status filter
   * @param method - Optional method filter
   * @returns Promise that resolves to array of payments
   */
  static async getPaymentsByPeriod(
    startDate: Date,
    endDate: Date,
    status?: Payment['status'],
    method?: Payment['method']
  ): Promise<Payment[]> {
    try {
      let query = (supabase.from('payments') as any)
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (method) {
        query = query.eq('method', method);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch payments by period:', error);
        return [];
      }

      return (data || []).map((p: any) => ({
        id: String(p.id || ''),
        invoiceId: p.invoice_id || null,
        amount: parseFloat(String(p.amount || 0)),
        currency: String(p.currency || 'USD'),
        method: (p.method || 'cash') as Payment['method'],
        status: (p.status || 'pending') as Payment['status'],
        transactionId: p.transaction_id || null,
        processorResponse: p.processor_response || undefined,
        createdAt: new Date(p.created_at || Date.now()),
        updatedAt: new Date(p.updated_at || Date.now()),
        completedAt: p.completed_at ? new Date(p.completed_at) : null,
        refundedAt: p.refunded_at ? new Date(p.refunded_at) : null,
        notes: p.notes || null
      }));
    } catch (error) {
      console.error('Failed to fetch payments by period:', error);
      return [];
    }
  }

  /**
   * Get payment history for an invoice
   * 
   * @param invoiceId - ID of the invoice
   * @returns Promise that resolves to array of payments
   */
  static async getPaymentHistory(invoiceId: string): Promise<Payment[]> {
    try {
      const { data, error } = await (supabase.from('payments') as any)
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch payment history:', error);
        return [];
      }

      return (data || []).map((p: any) => ({
        id: String(p.id || ''),
        invoiceId: p.invoice_id || null,
        amount: parseFloat(String(p.amount || 0)),
        currency: String(p.currency || 'USD'),
        method: (p.method || 'cash') as Payment['method'],
        status: (p.status || 'pending') as Payment['status'],
        transactionId: p.transaction_id || null,
        processorResponse: p.processor_response || undefined,
        createdAt: new Date(p.created_at || Date.now()),
        updatedAt: new Date(p.updated_at || Date.now()),
        completedAt: p.completed_at ? new Date(p.completed_at) : null,
        refundedAt: p.refunded_at ? new Date(p.refunded_at) : null,
        notes: p.notes || null
      }));
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      return [];
    }
  }

  /**
   * Get payment by ID
   * 
   * @param paymentId - ID of the payment
   * @returns Promise that resolves to payment or null
   */
  static async getPayment(paymentId: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) {
        console.error('Failed to fetch payment:', error);
        return null;
      }

      if (!data) return null;

      const paymentData = data as any;

      return {
        id: String(paymentData.id || ''),
        invoiceId: paymentData.invoice_id || null,
        amount: parseFloat(String(paymentData.amount || 0)),
        currency: String(paymentData.currency || 'USD'),
        method: (paymentData.method || 'cash') as Payment['method'],
        status: (paymentData.status || 'pending') as Payment['status'],
        transactionId: paymentData.transaction_id || null,
        processorResponse: paymentData.processor_response || undefined,
        createdAt: new Date(paymentData.created_at || Date.now()),
        updatedAt: new Date(paymentData.updated_at || Date.now()),
        completedAt: paymentData.completed_at ? new Date(paymentData.completed_at) : null,
        refundedAt: paymentData.refunded_at ? new Date(paymentData.refunded_at) : null,
        notes: paymentData.notes || null
      };
    } catch (error) {
      console.error('Failed to fetch payment:', error);
      return null;
    }
  }

  /**
   * Create manual payment (cash, check, bank transfer)
   * 
   * @param invoiceId - ID of the invoice
   * @param amount - Payment amount
   * @param currency - Currency code
   * @param method - Payment method
   * @param notes - Optional notes
   * @returns Promise that resolves to payment ID
   */
  static async createManualPayment(
    invoiceId: string | null,
    amount: number,
    currency: string = 'USD',
    method: 'cash' | 'check' | 'bank_transfer' = 'cash',
    notes?: string
  ): Promise<string> {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          amount,
          currency: currency.toUpperCase(),
          method,
          status: 'completed', // Manual payments are immediately completed
          completed_at: new Date().toISOString(),
          notes
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Failed to create manual payment:', error);
        throw error;
      }

      if (!payment) {
        throw new Error('Failed to create payment record');
      }

      const paymentData = payment as any;

      // Log activity
      if (invoiceId) {
        await ActivityLogger.log({
          entityType: 'invoice',
          entityId: invoiceId,
          eventType: ActivityEventTypes.INVOICE_PAID,
          metadata: {
            description: `Manual payment received: ${currency} ${amount} via ${method}`,
            payment_id: paymentData.id,
            method
          }
        });
      }

      await ActivityLogger.log({
        entityType: 'payment',
        entityId: paymentData.id,
        eventType: ActivityEventTypes.PAYMENT_COMPLETED,
        metadata: {
          description: `Manual payment: ${currency} ${amount} via ${method}`,
          invoice_id: invoiceId,
          method
        }
      });

      return paymentData.id;
    } catch (error) {
      console.error('Failed to create manual payment:', error);
      throw error;
    }
  }
}


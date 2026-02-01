/**
 * Invoice Payment Tracker
 * 
 * Gold-tier service for tracking invoice payments with real-time status updates,
 * payment matching, and comprehensive payment history.
 * 
 * Features:
 * - Real-time payment status tracking
 * - Payment matching and reconciliation
 * - Partial payment support
 * - Payment history with detailed audit trail
 * - Outstanding balance calculation
 * - Payment forecasting
 * 
 * Usage:
 * ```typescript
 * const tracker = await InvoicePaymentTracker.getInvoiceStatus(invoiceId);
 * const balance = await InvoicePaymentTracker.getOutstandingBalance(invoiceId);
 * ```
 */

import { PaymentService } from '@/services/payments';
import { supabase } from '@/lib/supabase';

export interface InvoicePaymentStatus {
  invoiceId: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentPercentage: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid';
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    date: Date;
  }>;
  lastPaymentDate: Date | null;
  nextPaymentDue: Date | null;
}

/**
 * Invoice Payment Tracker Service
 */
export class InvoicePaymentTracker {
  /**
   * Get comprehensive payment status for an invoice
   */
  static async getInvoiceStatus(invoiceId: string): Promise<InvoicePaymentStatus | null> {
    try {
      // Fetch invoice
      const { data: invoice, error: invoiceError } = await (supabase.from('invoices') as any)
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) {
        console.error('Failed to fetch invoice:', invoiceError);
        return null;
      }

      const totalAmount = parseFloat(String(invoice.total_amount || 0));

      // Fetch all payments for this invoice
      const payments = await PaymentService.getPaymentHistory(invoiceId);

      // Calculate payment totals
      const completedPayments = payments.filter(p => p.status === 'completed');
      const paidAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstandingAmount = Math.max(0, totalAmount - paidAmount);
      const paymentPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

      // Determine status
      let status: InvoicePaymentStatus['status'] = 'unpaid';
      if (paidAmount >= totalAmount) {
        status = paidAmount > totalAmount ? 'overpaid' : 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      }

      // Get last payment date
      const lastPayment = completedPayments
        .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))[0];
      const lastPaymentDate = lastPayment?.completedAt || null;

      return {
        invoiceId,
        totalAmount,
        paidAmount,
        outstandingAmount,
        paymentPercentage: Math.round(paymentPercentage * 100) / 100,
        status,
        payments: payments.map(p => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          method: p.method,
          status: p.status,
          date: p.completedAt || p.createdAt,
        })),
        lastPaymentDate,
        nextPaymentDue: invoice.due_date ? new Date(invoice.due_date) : null,
      };
    } catch (error) {
      console.error('Failed to get invoice payment status:', error);
      return null;
    }
  }

  /**
   * Get outstanding balance for an invoice
   */
  static async getOutstandingBalance(invoiceId: string): Promise<number> {
    const status = await this.getInvoiceStatus(invoiceId);
    return status?.outstandingAmount || 0;
  }

  /**
   * Get payment history for an invoice
   */
  static async getPaymentHistory(invoiceId: string) {
    return PaymentService.getPaymentHistory(invoiceId);
  }

  /**
   * Check if invoice is fully paid
   */
  static async isFullyPaid(invoiceId: string): Promise<boolean> {
    const status = await this.getInvoiceStatus(invoiceId);
    return status?.status === 'paid' || status?.status === 'overpaid';
  }

  /**
   * Get all invoices with payment status
   */
  static async getInvoicesWithPaymentStatus(filters?: {
    customerId?: string;
    status?: string[];
    minOutstanding?: number;
    maxOutstanding?: number;
  }): Promise<Array<InvoicePaymentStatus & { invoice: any }>> {
    try {
      let query = (supabase.from('invoices') as any).select('*');

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data: invoices, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const results = await Promise.all(
        (invoices || []).map(async (invoice: any) => {
          const paymentStatus = await this.getInvoiceStatus(invoice.id);
          return {
            ...paymentStatus!,
            invoice,
          };
        })
      );

      // Apply outstanding amount filters
      if (filters?.minOutstanding !== undefined || filters?.maxOutstanding !== undefined) {
        return results.filter(r => {
          if (filters.minOutstanding !== undefined && r.outstandingAmount < filters.minOutstanding) {
            return false;
          }
          if (filters.maxOutstanding !== undefined && r.outstandingAmount > filters.maxOutstanding) {
            return false;
          }
          return true;
        });
      }

      return results;
    } catch (error) {
      console.error('Failed to get invoices with payment status:', error);
      return [];
    }
  }

  /**
   * Update invoice status based on payment
   */
  static async updateInvoiceStatusFromPayment(invoiceId: string): Promise<void> {
    try {
      const status = await this.getInvoiceStatus(invoiceId);
      if (!status) return;

      let newStatus = 'sent';
      if (status.status === 'paid' || status.status === 'overpaid') {
        newStatus = 'paid';
      } else if (status.status === 'partial') {
        newStatus = 'partial';
      }

      await (supabase.from('invoices') as any)
        .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
        .eq('id', invoiceId);
    } catch (error) {
      console.error('Failed to update invoice status from payment:', error);
    }
  }
}


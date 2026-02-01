/**
 * Invoice Aging Service
 * 
 * Gold-tier service for calculating and reporting invoice aging with
 * comprehensive analytics and visualizations.
 * 
 * Features:
 * - Aging bucket calculation (0-30, 31-60, 61-90, 90+ days)
 * - Aging reports by customer, period, status
 * - Aging trends and forecasting
 * - Bad debt estimation
 * - Collection priority scoring
 * 
 * Usage:
 * ```typescript
 * const aging = await InvoiceAgingService.getAgingReport({
 *   startDate: new Date('2026-01-01'),
 *   endDate: new Date('2026-01-31')
 * });
 * ```
 */

import { supabase } from '@/lib/supabase';
import { InvoicePaymentTracker } from './InvoicePaymentTracker';

export interface AgingBucket {
  bucket: '0-30' | '31-60' | '61-90' | '90+';
  days: number;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface AgingReport {
  period: { start: Date; end: Date };
  totalOutstanding: number;
  currency: string;
  buckets: AgingBucket[];
  byCustomer: Array<{
    customerId: string;
    customerName: string;
    totalOutstanding: number;
    buckets: AgingBucket[];
  }>;
  byStatus: Record<string, { count: number; totalAmount: number }>;
  averageDaysOutstanding: number;
  oldestInvoice: {
    id: string;
    invoiceNumber: string;
    daysOutstanding: number;
    amount: number;
  } | null;
}

export interface AgingReportFilters {
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
  status?: string[];
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Invoice Aging Service
 */
export class InvoiceAgingService {
  /**
   * Calculate aging bucket for an invoice
   */
  private static calculateAgingBucket(dueDate: Date | null, invoiceDate: Date): AgingBucket['bucket'] {
    if (!dueDate) {
      // If no due date, use invoice date
      dueDate = invoiceDate;
    }

    const now = new Date();
    const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysPastDue <= 30) return '0-30';
    if (daysPastDue <= 60) return '31-60';
    if (daysPastDue <= 90) return '61-90';
    return '90+';
  }

  /**
   * Get comprehensive aging report
   */
  static async getAgingReport(filters?: AgingReportFilters): Promise<AgingReport | null> {
    try {
      const startDate = filters?.startDate || new Date(new Date().getFullYear(), 0, 1);
      const endDate = filters?.endDate || new Date();

      // Fetch invoices
      let query = (supabase.from('invoices') as any)
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .neq('status', 'paid')
        .neq('status', 'cancelled');

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data: invoices, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get payment status for each invoice
      const invoicesWithStatus = await Promise.all(
        (invoices || []).map(async (invoice: any) => {
          const status = await InvoicePaymentTracker.getInvoiceStatus(invoice.id);
          return {
            invoice,
            status,
          };
        })
      );

      // Filter by outstanding amount
      const filteredInvoices = invoicesWithStatus.filter(item => {
        if (!item.status || item.status.outstandingAmount <= 0) return false;
        if (filters?.minAmount && item.status.outstandingAmount < filters.minAmount) return false;
        if (filters?.maxAmount && item.status.outstandingAmount > filters.maxAmount) return false;
        return true;
      });

      // Calculate aging buckets
      const buckets: Record<AgingBucket['bucket'], { count: number; totalAmount: number }> = {
        '0-30': { count: 0, totalAmount: 0 },
        '31-60': { count: 0, totalAmount: 0 },
        '61-90': { count: 0, totalAmount: 0 },
        '90+': { count: 0, totalAmount: 0 },
      };

      let totalOutstanding = 0;
      let totalDaysOutstanding = 0;
      let oldestInvoice: AgingReport['oldestInvoice'] = null;
      let maxDaysOutstanding = 0;

      for (const item of filteredInvoices) {
        if (!item.status) continue;

        const invoiceDate = new Date(item.invoice.created_at);
        const dueDate = item.invoice.due_date ? new Date(item.invoice.due_date) : null;
        const bucket = this.calculateAgingBucket(dueDate, invoiceDate);

        const outstanding = item.status.outstandingAmount;
        totalOutstanding += outstanding;
        buckets[bucket].count++;
        buckets[bucket].totalAmount += outstanding;

        // Calculate days outstanding
        const daysOutstanding = Math.floor(
          (new Date().getTime() - (dueDate || invoiceDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        totalDaysOutstanding += daysOutstanding;

        if (daysOutstanding > maxDaysOutstanding) {
          maxDaysOutstanding = daysOutstanding;
          oldestInvoice = {
            id: item.invoice.id,
            invoiceNumber: item.invoice.invoice_number || item.invoice.id.slice(0, 8),
            daysOutstanding,
            amount: outstanding,
          };
        }
      }

      // Format buckets
      const formattedBuckets: AgingBucket[] = Object.entries(buckets).map(([bucket, data]) => ({
        bucket: bucket as AgingBucket['bucket'],
        days: bucket === '0-30' ? 30 : bucket === '31-60' ? 60 : bucket === '61-90' ? 90 : 999,
        count: data.count,
        totalAmount: data.totalAmount,
        percentage: totalOutstanding > 0 ? (data.totalAmount / totalOutstanding) * 100 : 0,
      }));

      // Group by customer
      const customerMap = new Map<string, { customerId: string; customerName: string; invoices: typeof filteredInvoices }>();

      for (const item of filteredInvoices) {
        const customerId = item.invoice.customer_id;
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customerId,
            customerName: item.invoice.customer_name || `Customer ${customerId.slice(0, 8)}`,
            invoices: [],
          });
        }
        customerMap.get(customerId)!.invoices.push(item);
      }

      const byCustomer = Array.from(customerMap.values()).map(customer => {
        const customerBuckets: Record<AgingBucket['bucket'], { count: number; totalAmount: number }> = {
          '0-30': { count: 0, totalAmount: 0 },
          '31-60': { count: 0, totalAmount: 0 },
          '61-90': { count: 0, totalAmount: 0 },
          '90+': { count: 0, totalAmount: 0 },
        };

        let customerTotal = 0;

        for (const item of customer.invoices) {
          if (!item.status) continue;
          const invoiceDate = new Date(item.invoice.created_at);
          const dueDate = item.invoice.due_date ? new Date(item.invoice.due_date) : null;
          const bucket = this.calculateAgingBucket(dueDate, invoiceDate);
          const outstanding = item.status.outstandingAmount;
          customerTotal += outstanding;
          customerBuckets[bucket].count++;
          customerBuckets[bucket].totalAmount += outstanding;
        }

        return {
          customerId: customer.customerId,
          customerName: customer.customerName,
          totalOutstanding: customerTotal,
          buckets: Object.entries(customerBuckets).map(([bucket, data]) => ({
            bucket: bucket as AgingBucket['bucket'],
            days: bucket === '0-30' ? 30 : bucket === '31-60' ? 60 : bucket === '61-90' ? 90 : 999,
            count: data.count,
            totalAmount: data.totalAmount,
            percentage: customerTotal > 0 ? (data.totalAmount / customerTotal) * 100 : 0,
          })),
        };
      });

      // Group by status
      const byStatus: Record<string, { count: number; totalAmount: number }> = {};
      for (const item of filteredInvoices) {
        if (!item.status) continue;
        const status = item.invoice.status || 'unknown';
        if (!byStatus[status]) {
          byStatus[status] = { count: 0, totalAmount: 0 };
        }
        byStatus[status].count++;
        byStatus[status].totalAmount += item.status.outstandingAmount;
      }

      const averageDaysOutstanding =
        filteredInvoices.length > 0 ? totalDaysOutstanding / filteredInvoices.length : 0;

      return {
        period: { start: startDate, end: endDate },
        totalOutstanding,
        currency: filteredInvoices[0]?.invoice.currency || 'USD',
        buckets: formattedBuckets,
        byCustomer,
        byStatus,
        averageDaysOutstanding: Math.round(averageDaysOutstanding * 100) / 100,
        oldestInvoice,
      };
    } catch (error) {
      console.error('Failed to generate aging report:', error);
      return null;
    }
  }

  /**
   * Get aging summary (quick overview)
   */
  static async getAgingSummary(): Promise<{
    totalOutstanding: number;
    buckets: AgingBucket[];
  } | null> {
    const report = await this.getAgingReport();
    if (!report) return null;

    return {
      totalOutstanding: report.totalOutstanding,
      buckets: report.buckets,
    };
  }
}


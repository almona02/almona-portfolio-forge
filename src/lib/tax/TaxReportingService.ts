/**
 * Tax Reporting Service
 * 
 * Gold-tier service for tax reporting and compliance.
 * 
 * Features:
 * - Tax summary reports
 * - Regional tax breakdown
 * - Tax exemption reports
 * - VAT/GST return preparation
 * - Tax audit trail
 * 
 * Usage:
 * ```typescript
 * const report = await TaxReportingService.getTaxSummary(dateRange, 'EG');
 * ```
 */

import { supabase } from '@/lib/supabase';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { TaxCalculationEngine, type TaxRegion } from './TaxCalculationEngine';

/** Supabase row types */
type PaymentRow = Record<string, unknown> & { amount?: string | number; invoice_id?: string };
type InvoiceRow = Record<string, unknown> & {
  id?: string;
  invoice_number?: string;
  customer_id?: string;
  subtotal?: string | number;
  tax_amount?: string | number;
  total_amount?: string | number;
  tax_rate?: number;
  currency?: string;
  exemption_certificate?: string;
  created_at?: string;
};
type ProfileRow = Record<string, unknown> & { id?: string; full_name?: string; company_name?: string };

function toNum(v: unknown): number {
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (v == null) return 0;
  const s = typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function toStr(v: unknown): string {
  if (v == null) return '';
  return typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : '');
}

/**
 * Date range for reports
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Tax summary data
 */
export interface TaxSummary {
  region: TaxRegion;
  currency: string;
  period: string;
  totalSales: number;
  totalTaxable: number;
  totalExempt: number;
  totalTax: number;
  taxBreakdown: Array<{
    rate: number;
    taxName: string;
    taxableAmount: number;
    taxAmount: number;
  }>;
  exemptionCount: number;
  exemptionAmount: number;
}

/**
 * Tax report entry
 */
export interface TaxReportEntry {
  date: Date;
  invoiceNumber: string;
  customerName: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  taxRate: number;
  taxName: string;
  exemptionCertificate?: string;
  region: TaxRegion;
  currency: string;
}

/**
 * Tax Reporting Service
 */
export class TaxReportingService {
  /**
   * Get tax summary for a period
   */
  static async getTaxSummary(
    dateRange: DateRange,
    region: TaxRegion
  ): Promise<TaxSummary> {
    try {
      // Get all invoices/payments in the period
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount, currency, completed_at, invoice_id')
        .eq('status', 'completed')
        .gte('completed_at', dateRange.start.toISOString())
        .lte('completed_at', dateRange.end.toISOString());

      if (error) {
        console.error('Failed to fetch payments for tax summary:', error);
        return this.createEmptySummary(region);
      }

      // Get invoices to match with payments
      const invoiceIds = [...new Set((payments || []).map((p: PaymentRow) => p.invoice_id).filter(Boolean))] as string[];
      let invoices: InvoiceRow[] = [];

      if (invoiceIds.length > 0) {
        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('id, invoice_number, customer_id, subtotal, tax_amount, total_amount, currency, exemption_certificate')
          .in('id', invoiceIds);

        invoices = (invoiceData || []) as InvoiceRow[];
      }

      // Get customer names
      const customerIds = [...new Set(invoices.map((i: InvoiceRow) => i.customer_id).filter(Boolean))] as string[];
      const customerMap = new Map<string, string>();

      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('profiles')
          .select('id, full_name, company_name')
          .in('id', customerIds);

        (customers || []).forEach((c: ProfileRow) => {
          const name = toStr(c.company_name) || toStr(c.full_name) || 'Unknown';
          const id = c.id;
          if (typeof id === 'string') customerMap.set(id, name);
        });
      }

      // Calculate tax summary
      let totalSales = 0;
      let totalTaxable = 0;
      let totalExempt = 0;
      let totalTax = 0;
      let exemptionCount = 0;
      const rateMap = new Map<number, { taxableAmount: number; taxAmount: number; taxName: string }>();

      const taxRule = TaxCalculationEngine.getTaxRule(region);
      const currency = region === 'EG' ? 'EGP' : region === 'TR' ? 'TRY' : 'USD';

      (payments || []).forEach((payment: PaymentRow) => {
        const amount = toNum(payment.amount);
        if (amount <= 0) return;

        totalSales += amount;

        const invoice = invoices.find((i: InvoiceRow) => i.id === payment.invoice_id);
        if (invoice && invoice.exemption_certificate) {
          totalExempt += amount;
          exemptionCount++;
        } else {
          const taxAmount = toNum(invoice?.tax_amount);
          const subtotal = toNum(invoice?.subtotal) || (amount - taxAmount);

          totalTaxable += subtotal;
          totalTax += taxAmount;

          // Group by tax rate
          const rate = (typeof invoice?.tax_rate === 'number' ? invoice.tax_rate : undefined) ?? taxRule.standardRate;
          const existing = rateMap.get(rate) || { taxableAmount: 0, taxAmount: 0, taxName: taxRule.taxName };
          existing.taxableAmount += subtotal;
          existing.taxAmount += taxAmount;
          rateMap.set(rate, existing);
        }
      });

      const taxBreakdown = Array.from(rateMap.entries()).map(([rate, data]) => ({
        rate,
        taxName: data.taxName,
        taxableAmount: Math.round(data.taxableAmount * 100) / 100,
        taxAmount: Math.round(data.taxAmount * 100) / 100,
      }));

      return {
        region,
        currency,
        period: `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`,
        totalSales: Math.round(totalSales * 100) / 100,
        totalTaxable: Math.round(totalTaxable * 100) / 100,
        totalExempt: Math.round(totalExempt * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        taxBreakdown,
        exemptionCount,
        exemptionAmount: Math.round(totalExempt * 100) / 100,
      };
    } catch (error) {
      console.error('Failed to get tax summary:', error);
      return this.createEmptySummary(region);
    }
  }

  /**
   * Get detailed tax report
   */
  static async getTaxReport(
    dateRange: DateRange,
    region: TaxRegion
  ): Promise<TaxReportEntry[]> {
    try {
      // Get invoices in the period
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, customer_id, subtotal, tax_amount, total_amount, tax_rate, currency, exemption_certificate, created_at')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      if (error || !invoices) {
        console.error('Failed to fetch invoices for tax report:', error);
        return [];
      }

      // Get customer names
      const customerIds = [...new Set(invoices.map((i: InvoiceRow) => i.customer_id).filter(Boolean))] as string[];
      const customerMap = new Map<string, string>();

      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('profiles')
          .select('id, full_name, company_name')
          .in('id', customerIds);

        (customers || []).forEach((c: ProfileRow) => {
          const name = toStr(c.company_name) || toStr(c.full_name) || 'Unknown';
          const id = c.id;
          if (typeof id === 'string') customerMap.set(id, name);
        });
      }

      const taxRule = TaxCalculationEngine.getTaxRule(region);

      return invoices.map((invoice: InvoiceRow) => {
        const createdAt = invoice.created_at;
        const invId = invoice.id;
        const custId = invoice.customer_id;
        return {
          date: new Date(typeof createdAt === 'string' ? createdAt : Date.now()),
          invoiceNumber: toStr(invoice.invoice_number) || (typeof invId === 'string' ? invId.slice(0, 8) : ''),
          customerName: (typeof custId === 'string' ? customerMap.get(custId) : undefined) || 'Unknown',
          subtotal: Math.round(toNum(invoice.subtotal) * 100) / 100,
          taxAmount: Math.round(toNum(invoice.tax_amount) * 100) / 100,
          total: Math.round(toNum(invoice.total_amount) * 100) / 100,
          taxRate: (typeof invoice.tax_rate === 'number' ? invoice.tax_rate : undefined) ?? taxRule.standardRate,
          taxName: taxRule.taxName,
          exemptionCertificate: invoice.exemption_certificate != null ? toStr(invoice.exemption_certificate) : undefined,
          region,
          currency: toStr(invoice.currency) || (region === 'EG' ? 'EGP' : region === 'TR' ? 'TRY' : 'USD'),
        };
      });
    } catch (error) {
      console.error('Failed to get tax report:', error);
      return [];
    }
  }

  /**
   * Get monthly tax summary
   */
  static async getMonthlyTaxSummary(
    year: number,
    month: number,
    region: TaxRegion
  ): Promise<TaxSummary> {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));

    return this.getTaxSummary({ start, end }, region);
  }

  /**
   * Get quarterly tax summary
   */
  static async getQuarterlyTaxSummary(
    year: number,
    quarter: 1 | 2 | 3 | 4,
    region: TaxRegion
  ): Promise<TaxSummary> {
    const startMonth = (quarter - 1) * 3;
    const start = startOfMonth(new Date(year, startMonth));
    const end = endOfMonth(new Date(year, startMonth + 2));

    return this.getTaxSummary({ start, end }, region);
  }

  /**
   * Export tax report to CSV
   */
  static exportTaxReportToCSV(entries: TaxReportEntry[], filename: string): void {
    if (entries.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = [
      'Date',
      'Invoice Number',
      'Customer Name',
      'Subtotal',
      'Tax Amount',
      'Total',
      'Tax Rate',
      'Tax Name',
      'Exemption Certificate',
      'Region',
      'Currency',
    ];

    const csvRows = [
      headers.join(','),
      ...entries.map(entry =>
        [
          format(entry.date, 'yyyy-MM-dd'),
          `"${entry.invoiceNumber}"`,
          `"${entry.customerName}"`,
          entry.subtotal.toFixed(2),
          entry.taxAmount.toFixed(2),
          entry.total.toFixed(2),
          (entry.taxRate * 100).toFixed(2) + '%',
          entry.taxName,
          entry.exemptionCertificate || '',
          entry.region,
          entry.currency,
        ].join(',')
      ),
    ];

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Create empty summary
   */
  private static createEmptySummary(region: TaxRegion): TaxSummary {
    const currency = region === 'EG' ? 'EGP' : region === 'TR' ? 'TRY' : 'USD';

    return {
      region,
      currency,
      period: '',
      totalSales: 0,
      totalTaxable: 0,
      totalExempt: 0,
      totalTax: 0,
      taxBreakdown: [],
      exemptionCount: 0,
      exemptionAmount: 0,
    };
  }
}


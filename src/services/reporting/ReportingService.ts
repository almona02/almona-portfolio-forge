/**
 * Reporting Service
 * 
 * Gold-tier reporting service for financial and commercial reports.
 * Provides data aggregation, calculation, and export functionality.
 * 
 * Features:
 * - Revenue by period (daily/weekly/monthly)
 * - Quote-to-invoice conversion rates
 * - Customer lifetime value (CLV)
 * - Aging receivables
 * - Profitability by project
 * - Sales pipeline analytics
 * 
 * Usage:
 * ```typescript
 * const revenue = await ReportingService.getRevenueByPeriod('monthly', startDate, endDate);
 * ```
 */

import { supabase } from '@/lib/supabase';

/** Supabase row types for report queries */
type PaymentRow = Record<string, unknown> & {
  amount?: string | number;
  currency?: string;
  completed_at?: string;
  created_at?: string;
  invoice_id?: string;
};

type QuoteRow = Record<string, unknown> & {
  id?: string;
  status?: string;
  total_amount?: string | number;
  accepted_at?: string;
  valid_until?: string;
  sent_at?: string;
};

type OrderRow = Record<string, unknown> & {
  id?: string;
  user_id?: string;
  total_amount?: string | number;
  currency?: string;
  created_at?: string;
  order_number?: string;
};

type ProfileRow = Record<string, unknown> & {
  id?: string;
  full_name?: string;
  company_name?: string;
  username?: string;
};

type ProjectRow = Record<string, unknown> & {
  id?: string;
  project_code?: string;
  client_name?: string;
  currency?: string;
  meta?: { estimatedCostPercentage?: string | number };
};

/** Safe number from unknown */
function toNum(v: unknown): number {
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (v == null) return 0;
  const s = typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Safe string from unknown */
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
 * Revenue data point
 */
export interface RevenueDataPoint {
  period: string;
  revenue: number;
  count: number;
  currency: string;
}

/**
 * Conversion metrics
 */
export interface ConversionMetrics {
  quotesCreated: number;
  quotesAccepted: number;
  quotesRejected: number;
  quotesExpired: number;
  conversionRate: number;
  averageQuoteValue: number;
  averageInvoiceValue: number;
}

/**
 * Customer lifetime value
 */
export interface CustomerLTV {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  orderCount: number; // Using orderCount instead of invoiceCount for clarity
  averageOrderValue: number;
  firstOrderDate: Date;
  lastOrderDate: Date;
  currency: string;
}

/**
 * Aging receivables
 */
export interface AgingReceivable {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  daysOld: number;
  agingBucket: '0-30' | '31-60' | '61-90' | '90+';
  dueDate: Date;
  currency: string;
}

/**
 * Profitability by project
 */
export interface ProjectProfitability {
  projectId: string;
  projectCode: string;
  customerName: string;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
  currency: string;
  orderCount?: number;
}

/**
 * Sales pipeline data
 */
export interface SalesPipelineData {
  stage: string;
  count: number;
  totalValue: number;
  averageValue: number;
  winProbability: number;
  weightedValue: number;
}

/**
 * Reporting Service
 */
export class ReportingService {
  /**
   * Get revenue by period
   */
  static async getRevenueByPeriod(
    period: 'daily' | 'weekly' | 'monthly',
    dateRange: DateRange
  ): Promise<RevenueDataPoint[]> {
    try {
      // Query payments table for completed payments
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount, currency, completed_at, created_at')
        .eq('status', 'completed')
        .gte('completed_at', dateRange.start.toISOString())
        .lte('completed_at', dateRange.end.toISOString())
        .order('completed_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch revenue data:', error);
        return [];
      }

      // Group by period
      const grouped = new Map<string, { revenue: number; count: number; currency: string }>();

      (payments || []).forEach((payment: PaymentRow) => {
        if (!payment) return;
        
        const completedAt = payment.completed_at ?? payment.created_at;
        if (!completedAt) return;
        
        const date = new Date(completedAt);
        if (isNaN(date.getTime())) return;
        
        let periodKey = '';

        switch (period) {
          case 'daily':
            periodKey = date.toISOString().split('T')[0];
            break;
          case 'weekly':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            periodKey = weekStart.toISOString().split('T')[0];
            break;
          case 'monthly':
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
        }

        if (!periodKey) return;

        const amount = toNum(payment.amount);
        if (amount <= 0) return;

        const existing = grouped.get(periodKey) || { revenue: 0, count: 0, currency: toStr(payment.currency) || 'USD' };
        existing.revenue += amount;
        existing.count += 1;
        grouped.set(periodKey, existing);
      });

      return Array.from(grouped.entries()).map(([period, data]) => ({
        period,
        revenue: data.revenue,
        count: data.count,
        currency: data.currency,
      }));
    } catch (error) {
      console.error('Failed to get revenue by period:', error);
      return [];
    }
  }

  /**
   * Get quote-to-invoice conversion metrics
   */
  static async getConversionMetrics(dateRange: DateRange): Promise<ConversionMetrics> {
    try {
      // Query quotes within date range
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, status, total_amount, created_at, accepted_at, valid_until')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (quotesError) {
        console.error('Failed to fetch quotes:', quotesError);
        return {
          quotesCreated: 0,
          quotesAccepted: 0,
          quotesRejected: 0,
          quotesExpired: 0,
          conversionRate: 0,
          averageQuoteValue: 0,
          averageInvoiceValue: 0,
        };
      }

      const now = new Date();
      let quotesCreated = 0;
      let quotesAccepted = 0;
      let quotesRejected = 0;
      let quotesExpired = 0;
      let totalQuoteValue = 0;
      let totalInvoiceValue = 0;
      let invoiceCount = 0;

      (quotes || []).forEach((quote: QuoteRow) => {
        if (!quote) return;
        
        quotesCreated++;
        const quoteAmount = toNum(quote.total_amount);
        if (!isNaN(quoteAmount) && quoteAmount > 0) {
          totalQuoteValue += quoteAmount;
        }

        // Check quote status
        const status = quote.status;
        const acceptedAt = quote.accepted_at;
        const validUntil = quote.valid_until;
        
        if (status === 'accepted' || acceptedAt) {
          quotesAccepted++;
        } else if (status === 'rejected' || status === 'cancelled') {
          quotesRejected++;
        } else if (validUntil) {
          try {
            const validUntilDate = new Date(validUntil);
            if (!isNaN(validUntilDate.getTime()) && validUntilDate < now) {
              quotesExpired++;
            }
          } catch {
            // Invalid date, skip
          }
        }

        // If quote was accepted, try to find related invoice/order
        if (status === 'accepted' || acceptedAt) {
          // Query orders that came from this quote
          // Note: This assumes orders table has quote_id
          // For now, we'll estimate invoice value from quote value
          if (!isNaN(quoteAmount) && quoteAmount > 0) {
            totalInvoiceValue += quoteAmount;
            invoiceCount++;
          }
        }
      });

      // Calculate conversion rate
      const conversionRate = quotesCreated > 0 
        ? (quotesAccepted / quotesCreated) * 100 
        : 0;

      // Calculate averages
      const averageQuoteValue = quotesCreated > 0 
        ? totalQuoteValue / quotesCreated 
        : 0;
      
      const averageInvoiceValue = invoiceCount > 0 
        ? totalInvoiceValue / invoiceCount 
        : 0;

      return {
        quotesCreated,
        quotesAccepted,
        quotesRejected,
        quotesExpired,
        conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimal places
        averageQuoteValue: Math.round(averageQuoteValue * 100) / 100,
        averageInvoiceValue: Math.round(averageInvoiceValue * 100) / 100,
      };
    } catch (error) {
      console.error('Failed to get conversion metrics:', error);
      return {
        quotesCreated: 0,
        quotesAccepted: 0,
        quotesRejected: 0,
        quotesExpired: 0,
        conversionRate: 0,
        averageQuoteValue: 0,
        averageInvoiceValue: 0,
      };
    }
  }

  /**
   * Get customer lifetime value
   */
  static async getCustomerLTV(dateRange?: DateRange): Promise<CustomerLTV[]> {
    try {
      // Build query for orders with date range filter
      let ordersQuery = supabase
        .from('orders')
        .select('id, user_id, total_amount, currency, created_at, status')
        .in('status', ['paid', 'delivered', 'confirmed'])
        .order('created_at', { ascending: true });

      if (dateRange) {
        ordersQuery = ordersQuery
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) {
        console.error('Failed to fetch orders for LTV:', ordersError);
        return [];
      }

      if (!orders || orders.length === 0) {
        return [];
      }

      // Also fetch completed payments to get more accurate revenue
      let paymentsQuery = supabase
        .from('payments')
        .select('amount, currency, invoice_id, completed_at')
        .eq('status', 'completed');

      if (dateRange) {
        paymentsQuery = paymentsQuery
          .gte('completed_at', dateRange.start.toISOString())
          .lte('completed_at', dateRange.end.toISOString());
      }

      const { data: payments, error: paymentsError } = await paymentsQuery;

      if (paymentsError) {
        console.warn('Could not fetch payments for LTV, using orders only:', paymentsError);
      }

      // Get customer profiles for names
      const userIds = [...new Set(orders.map((o: OrderRow) => o?.user_id).filter(Boolean))] as string[];
      let profileMap = new Map<string, ProfileRow>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, company_name, username')
          .in('id', userIds);

        profileMap = new Map<string, ProfileRow>(
          (profiles || []).map((p: ProfileRow) => [p?.id, p] as [string, ProfileRow]).filter(([id]) => id)
        );
      }

      // Group orders by customer (user_id)
      const customerMap = new Map<string, {
        customerId: string;
        customerName: string;
        totalRevenue: number;
        orderCount: number;
        firstOrderDate: Date | null;
        lastOrderDate: Date | null;
        averageOrderValue: number;
        currency: string;
      }>();

      orders.forEach((order: OrderRow) => {
        if (!order || !order.user_id) return;
        
        const customerId = order.user_id;
        const profile = profileMap.get(customerId);
        const customerName = (profile)?.company_name || 
                            (profile)?.full_name || 
                            (profile)?.username || 
                            `Customer ${customerId.slice(0, 8)}`;

        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customerId,
            customerName,
            totalRevenue: 0,
            orderCount: 0,
            firstOrderDate: null,
            lastOrderDate: null,
            averageOrderValue: 0,
            currency: toStr(order.currency) || 'EGP',
          });
        }

        const customer = customerMap.get(customerId)!;
        const orderAmount = toNum(order.total_amount);
        if (orderAmount > 0) {
          customer.totalRevenue += orderAmount;
          customer.orderCount += 1;

          const createdAt = order.created_at;
          if (createdAt) {
            try {
              const orderDate = new Date(createdAt);
              if (!isNaN(orderDate.getTime())) {
                if (!customer.firstOrderDate || orderDate < customer.firstOrderDate) {
                  customer.firstOrderDate = orderDate;
                }
                if (!customer.lastOrderDate || orderDate > customer.lastOrderDate) {
                  customer.lastOrderDate = orderDate;
                }
              }
            } catch {
              // Invalid date, skip
            }
          }
        }
      });

      // Add payments if available (more accurate revenue)
      if (payments && Array.isArray(payments)) {
        // Try to match payments to orders via invoice_id = order_id
        payments.forEach((payment: PaymentRow) => {
          if (!payment || !payment.invoice_id) return;
          
          const order = orders.find((o: OrderRow) => o && o.id === payment.invoice_id);
          if (order && order.user_id) {
            const customer = customerMap.get(order.user_id as string);
            if (customer) {
              // Payment already counted in order, or add if not
              // For now, we'll use order amounts as they're more reliable
            }
          }
        });
      }

      // Calculate averages and convert to result format
      const result: CustomerLTV[] = Array.from(customerMap.values()).map(customer => {
        customer.averageOrderValue = customer.orderCount > 0
          ? customer.totalRevenue / customer.orderCount
          : 0;

        return {
          customerId: customer.customerId,
          customerName: customer.customerName,
          totalRevenue: Math.round(customer.totalRevenue * 100) / 100,
          orderCount: customer.orderCount,
          averageOrderValue: Math.round(customer.averageOrderValue * 100) / 100,
          firstOrderDate: customer.firstOrderDate || new Date(),
          lastOrderDate: customer.lastOrderDate || new Date(),
          currency: customer.currency,
        };
      });

      // Sort by total revenue descending
      return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } catch (error) {
      console.error('Failed to get customer LTV:', error);
      return [];
    }
  }

  /**
   * Get aging receivables
   */
  static async getAgingReceivables(): Promise<AgingReceivable[]> {
    try {
      const now = new Date();

      // Get orders that are not fully paid
      // Orders with payment_status != 'paid' or status in pending/confirmed but not paid
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, user_id, total_amount, currency, created_at, payment_status, status')
        .in('status', ['pending', 'confirmed', 'processing'])
        .neq('payment_status', 'paid')
        .order('created_at', { ascending: true });

      if (ordersError) {
        console.error('Failed to fetch orders for aging receivables:', ordersError);
        return [];
      }

      if (!orders || orders.length === 0) {
        return [];
      }

      // Get customer profiles
      const userIds = [...new Set(orders.map((o: OrderRow) => o?.user_id).filter(Boolean))] as string[];
      let profileMap = new Map<string, ProfileRow>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, company_name, username')
          .in('id', userIds);

        profileMap = new Map<string, ProfileRow>(
          (profiles || []).map((p: ProfileRow) => [p?.id, p] as [string, ProfileRow]).filter(([id]) => id)
        );
      }

      // Get payments for each order to calculate outstanding amount
      const orderIds = orders.map((o: OrderRow) => o?.id).filter(Boolean) as string[];
      const paymentsByOrder = new Map<string, number>();
      
      if (orderIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select('invoice_id, amount, status')
          .in('invoice_id', orderIds)
          .eq('status', 'completed');

        (payments || []).forEach((payment: PaymentRow) => {
          if (!payment || !payment.invoice_id) return;
          
          const invoiceId = payment.invoice_id;
          const amount = toNum(payment.amount);
          if (!isNaN(amount) && amount > 0) {
            const current = paymentsByOrder.get(invoiceId) || 0;
            paymentsByOrder.set(invoiceId, current + amount);
          }
        });
      }

      // Calculate aging buckets
      const receivables: AgingReceivable[] = orders
        .map((order: OrderRow) => {
          if (!order || !order.id || !order.user_id) return null;
          
          const createdAt = order.created_at;
          if (!createdAt) return null;
          
          let orderDate: Date;
          try {
            orderDate = new Date(createdAt);
            if (isNaN(orderDate.getTime())) return null;
            } catch {
            return null;
          }
          
          const daysOld = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysOld < 0) return null; // Future dates are invalid
          
          const totalAmount = toNum(order.total_amount);
          if (isNaN(totalAmount) || totalAmount <= 0) return null;
          
          const orderId = order.id;
          const paidAmount = paymentsByOrder.get(orderId) || 0;
          const outstandingAmount = totalAmount - paidAmount;

          if (outstandingAmount <= 0) return null; // Skip fully paid orders

          const userId = order.user_id;
          const profile = profileMap.get(userId);
          const customerName = (profile)?.company_name || 
                              (profile)?.full_name || 
                              (profile)?.username || 
                              `Customer ${userId.slice(0, 8)}`;

          // Determine aging bucket
          let agingBucket: '0-30' | '31-60' | '61-90' | '90+';
          if (daysOld <= 30) {
            agingBucket = '0-30';
          } else if (daysOld <= 60) {
            agingBucket = '31-60';
          } else if (daysOld <= 90) {
            agingBucket = '61-90';
          } else {
            agingBucket = '90+';
          }

          return {
            invoiceId: orderId,
            invoiceNumber: (order.order_number || orderId.slice(0, 8)),
            customerId: userId,
            customerName,
            totalAmount,
            paidAmount: Math.round(paidAmount * 100) / 100,
            outstandingAmount: Math.round(outstandingAmount * 100) / 100,
            daysOld,
            agingBucket,
            dueDate: orderDate, // Using created_at as due date for now
            currency: toStr(order.currency) || 'EGP',
          };
        })
        .filter((r): r is AgingReceivable => r !== null); // Filter out nulls and type guard

      // Sort by days old descending (oldest first)
      return receivables.sort((a, b) => b.daysOld - a.daysOld);
    } catch (error) {
      console.error('Failed to get aging receivables:', error);
      return [];
    }
  }

  /**
   * Get profitability by project
   */
  static async getProjectProfitability(dateRange: DateRange): Promise<ProjectProfitability[]> {
    try {
      // Fetch fabricator projects within date range
      const { data: projects, error: projectsError } = await supabase
        .from('fabricator_projects')
        .select('id, project_code, project_name, client_name, currency, status, created_at, meta')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Failed to fetch projects for profitability:', projectsError);
        return [];
      }

      if (!projects || projects.length === 0) {
        return [];
      }

      // Fetch all orders to match with projects
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, user_id, total_amount, currency, created_at, status, billing_address, shipping_address')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (ordersError) {
        console.warn('Could not fetch orders for profitability:', ordersError);
      }

      // Get customer profiles for matching
      const userIds = orders ? [...new Set(orders.map((o: OrderRow) => o?.user_id).filter(Boolean))] as string[] : [];
      let profileMap = new Map<string, ProfileRow>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, company_name, username')
          .in('id', userIds);

        profileMap = new Map<string, ProfileRow>(
          (profiles || []).map((p: ProfileRow) => [p?.id, p] as [string, ProfileRow]).filter(([id]) => id)
        );
      }

      // Match projects to orders via client_name
      const projectProfitability: ProjectProfitability[] = projects
        .map((project: ProjectRow) => {
          if (!project || !project.id) return null;
          
          // Find orders that match this project's client
          const matchingOrders = (orders || []).filter((order: OrderRow) => {
            if (!order || !order.user_id) return false;
            
            const profile = profileMap.get(order.user_id);
            const customerName = (profile)?.company_name || 
                                (profile)?.full_name || 
                                (profile)?.username || '';
            
            // Match by client name (case-insensitive, partial match)
            const projectClient = (project.client_name || '').toLowerCase();
            const orderClient = customerName.toLowerCase();
            
            if (!projectClient || !orderClient) return false;
            
            return projectClient.includes(orderClient) || orderClient.includes(projectClient);
          });

          // Calculate revenue from matching orders
          const revenue = matchingOrders.reduce((sum: number, order: OrderRow) => {
            if (!order) return sum;
            return sum + toNum(order.total_amount);
          }, 0);

          if (revenue <= 0) return null; // Skip projects with no revenue

          // Estimate costs (30% of revenue as default, or from meta if available)
          // In a real system, costs would come from inventory, labor, overhead tracking
          const meta = project.meta as { estimatedCostPercentage?: string | number } | undefined;
          const costPercentage = (meta && typeof meta === 'object' && meta.estimatedCostPercentage != null) 
            ? toNum(meta.estimatedCostPercentage) 
            : 0.30;
          
          if (isNaN(costPercentage) || costPercentage < 0 || costPercentage > 1) {
            return null; // Invalid cost percentage
          }
          
          const costs = revenue * costPercentage;

          // Calculate profit and margin
          const profit = revenue - costs;
          const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

          return {
            projectId: project.id,
            projectCode: (project.project_code || project.id.slice(0, 8)),
            customerName: (project.client_name || 'Unknown'),
            revenue: Math.round(revenue * 100) / 100,
            costs: Math.round(costs * 100) / 100,
            profit: Math.round(profit * 100) / 100,
            profitMargin: Math.round(profitMargin * 100) / 100,
            currency: (project.currency || 'EGP'),
            orderCount: matchingOrders.length,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p): ProjectProfitability => ({
          ...p,
          orderCount: p.orderCount ?? 0, // Ensure orderCount is always defined
        })); // Filter out nulls and ensure orderCount

      // Sort by profit descending
      return projectProfitability.sort((a, b) => b.profit - a.profit);
    } catch (error) {
      console.error('Failed to get project profitability:', error);
      return [];
    }
  }

  /**
   * Get sales pipeline data
   * Maps quote statuses to pipeline stages with win probabilities
   */
  static async getSalesPipeline(): Promise<SalesPipelineData[]> {
    try {
      // Query all quotes to build pipeline
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, status, total_amount, currency, created_at, valid_until, accepted_at')
        .order('created_at', { ascending: false });

      if (quotesError) {
        console.error('Failed to fetch quotes for pipeline:', quotesError);
        return [];
      }

      if (!quotes || quotes.length === 0) {
        return [];
      }

      // Define pipeline stages with win probabilities
      const stageDefinitions: Record<string, { winProbability: number; statuses: string[] }> = {
        'Lead': { winProbability: 0.10, statuses: [] }, // New leads (not in quotes yet)
        'Qualified': { winProbability: 0.25, statuses: ['draft'] },
        'Quoted': { winProbability: 0.50, statuses: ['sent'] },
        'Negotiation': { winProbability: 0.70, statuses: ['sent'] }, // Sent quotes are in negotiation
        'Won': { winProbability: 1.00, statuses: ['accepted'] },
        'Lost': { winProbability: 0.00, statuses: ['rejected', 'cancelled', 'expired'] },
      };

      // Group quotes by stage
      const stageMap = new Map<string, {
        count: number;
        totalValue: number;
        quotes: QuoteRow[];
      }>();

      const now = new Date();
      quotes.forEach((quote: QuoteRow) => {
        if (!quote) return;

        let stage = 'Qualified'; // Default stage
        const status = quote.status;

        // Determine stage based on status and dates
        if (status === 'draft') {
          stage = 'Qualified';
        } else if (status === 'sent') {
          // Check if quote is expired
          if (quote.valid_until) {
            try {
              const validUntil = new Date(quote.valid_until);
              if (!isNaN(validUntil.getTime()) && validUntil < now) {
                stage = 'Lost';
              } else {
                // Check if sent recently (within 7 days = negotiation, else = quoted)
                const sentAt = quote.sent_at ? new Date(quote.sent_at) : null;
                if (sentAt && !isNaN(sentAt.getTime())) {
                  const daysSinceSent = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24));
                  stage = daysSinceSent <= 7 ? 'Negotiation' : 'Quoted';
                } else {
                  stage = 'Quoted';
                }
              }
            } catch {
              stage = 'Quoted';
            }
          } else {
            stage = 'Quoted';
          }
        } else if (status === 'accepted' || quote.accepted_at) {
          stage = 'Won';
        } else if (status === 'rejected' || status === 'cancelled') {
          stage = 'Lost';
        } else if (status === 'expired') {
          stage = 'Lost';
        }

        if (!stageMap.has(stage)) {
          stageMap.set(stage, {
            count: 0,
            totalValue: 0,
            quotes: [],
          });
        }

        const stageData = stageMap.get(stage)!;
        stageData.count += 1;
        const amount = toNum(quote.total_amount);
        if (!isNaN(amount) && amount > 0) {
          stageData.totalValue += amount;
        }
        stageData.quotes.push(quote);
      });

      // Convert to SalesPipelineData format
      const pipelineData: SalesPipelineData[] = Array.from(stageMap.entries()).map(([stage, data]) => {
        const stageDef = stageDefinitions[stage] || { winProbability: 0.5, statuses: [] };
        const averageValue = data.count > 0 ? data.totalValue / data.count : 0;
        const weightedValue = data.totalValue * stageDef.winProbability;

        return {
          stage,
          count: data.count,
          totalValue: Math.round(data.totalValue * 100) / 100,
          averageValue: Math.round(averageValue * 100) / 100,
          winProbability: stageDef.winProbability * 100, // Convert to percentage
          weightedValue: Math.round(weightedValue * 100) / 100,
        };
      });

      // Sort by typical pipeline order
      const stageOrder = ['Lead', 'Qualified', 'Quoted', 'Negotiation', 'Won', 'Lost'];
      return pipelineData.sort((a, b) => {
        const aIndex = stageOrder.indexOf(a.stage);
        const bIndex = stageOrder.indexOf(b.stage);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    } catch (error) {
      console.error('Failed to get sales pipeline:', error);
      return [];
    }
  }

  /**
   * Export report to CSV
   */
  static exportToCSV(data: Record<string, unknown>[], filename: string): void {
    if (data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          if (value instanceof Date) {
            return value.toISOString();
          }
          return JSON.stringify(value);
        }).join(',')
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
   * Export report to PDF using pdf-lib
   * 
   * @param data - Array of data objects to export
   * @param filename - Filename for the PDF (without extension)
   * @param title - Title for the PDF report
   */
  static async exportToPDF(data: Record<string, unknown>[], filename: string, title: string = 'Report'): Promise<void> {
    try {
      // Lazy load pdf-lib to reduce initial bundle size
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();
      
      // Embed fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Title with Prestige theme color (amber)
      page.drawText(title, {
        x: 50,
        y: height - 50,
        size: 24,
        font: boldFont,
        color: rgb(0.96, 0.62, 0.04), // Amber color (Prestige theme)
      });
      
      // Date
      const dateText = `Generated: ${new Date().toLocaleDateString()}`;
      page.drawText(dateText, {
        x: 50,
        y: height - 80,
        size: 10,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      if (data.length === 0) {
        page.drawText('No data available', {
          x: 50,
          y: height - 120,
          size: 12,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
      } else {
        // Table headers
        const headers = Object.keys(data[0]);
        const rowHeight = 20;
        const startY = height - 120;
        const colWidth = Math.min((width - 100) / headers.length, 120); // Max column width
        
        // Draw headers with amber color
        headers.forEach((header, index) => {
          const headerText = header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1');
          page.drawText(headerText, {
            x: 50 + (index * colWidth),
            y: startY,
            size: 10,
            font: boldFont,
            color: rgb(0.96, 0.62, 0.04), // Amber
          });
        });
        
        // Draw data rows (limit to 30 rows per page for performance)
        const maxRows = Math.min(data.length, 30);
        data.slice(0, maxRows).forEach((row, rowIndex) => {
          const y = startY - ((rowIndex + 1) * rowHeight);
          
          headers.forEach((header, colIndex) => {
            let value: string;
            const raw = row[header];
            if (raw instanceof Date) {
              value = raw.toLocaleDateString();
            } else if (typeof raw === 'object' && raw !== null) {
              value = JSON.stringify(raw);
            } else if (raw == null) {
              value = '';
            } else if (typeof raw === 'string') {
              value = raw;
            } else if (typeof raw === 'number' || typeof raw === 'boolean') {
              value = String(raw);
            } else {
              value = JSON.stringify(raw);
            }
            
            // Truncate long values
            const displayValue = value.length > 20 ? value.substring(0, 17) + '...' : value;
            
            page.drawText(displayValue, {
              x: 50 + (colIndex * colWidth),
              y: y,
              size: 9,
              font: font,
              color: rgb(0.2, 0.2, 0.2),
            });
          });
        });
        
        if (data.length > maxRows) {
          page.drawText(`... and ${data.length - maxRows} more rows`, {
            x: 50,
            y: startY - ((maxRows + 1) * rowHeight),
            size: 9,
            font: font,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
      }
      
      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();
      
      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Failed to export PDF:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`PDF export failed: ${msg}`);
    }
  }
}


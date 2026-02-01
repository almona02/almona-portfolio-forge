/**
 * Payment Types
 * 
 * Centralized type definitions for payment processing system.
 * Ensures type safety across all payment-related components.
 */

/**
 * Payment method types
 */
export type PaymentMethod = 'stripe' | 'paypal' | 'bank_transfer' | 'cash' | 'check';

/**
 * Payment status types
 */
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

/**
 * Payment record interface
 */
export interface Payment {
  id: string;
  invoiceId: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string | null;
  processorResponse?: any;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  refundedAt?: Date | null;
  notes?: string | null;
}

/**
 * Payment intent result
 */
export interface PaymentIntentResult {
  clientSecret: string;
  paymentId: string;
}

/**
 * Payment link configuration
 */
export interface PaymentLinkConfig {
  invoiceId?: string | null;
  amount: number;
  currency: string;
  description?: string;
  expiresAt?: Date;
  metadata?: Record<string, string>;
}

/**
 * Payment link result
 */
export interface PaymentLinkResult {
  linkId: string;
  url: string;
  expiresAt: Date | null;
}

/**
 * Reconciliation period
 */
export interface ReconciliationPeriod {
  startDate: Date;
  endDate: Date;
}

/**
 * Reconciliation summary
 */
export interface ReconciliationSummary {
  period: ReconciliationPeriod;
  totalPayments: number;
  totalAmount: number;
  currency: string;
  byMethod: Record<PaymentMethod, { count: number; amount: number }>;
  byStatus: Record<PaymentStatus, { count: number; amount: number }>;
  discrepancies: ReconciliationDiscrepancy[];
}

/**
 * Reconciliation discrepancy
 */
export interface ReconciliationDiscrepancy {
  id: string;
  type: 'missing_payment' | 'duplicate_payment' | 'amount_mismatch' | 'status_mismatch';
  paymentId?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Payment filter options
 */
export interface PaymentFilterOptions {
  invoiceId?: string;
  status?: PaymentStatus | 'all';
  method?: PaymentMethod | 'all';
  startDate?: Date;
  endDate?: Date;
  currency?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Payment export options
 */
export interface PaymentExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  includeDetails?: boolean;
  includeNotes?: boolean;
  dateRange?: ReconciliationPeriod;
}


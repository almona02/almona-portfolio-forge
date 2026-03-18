/**
 * Payment History Component
 * 
 * Gold-tier payment history display with filtering, search, and export.
 * Shows complete payment timeline for invoices with prestige theme styling.
 * 
 * Features:
 * - Payment history table with filters
 * - Status badges with prestige colors
 * - Export functionality
 * - Integration with ActivityTimeline
 * - Real-time payment status
 * 
 * Usage:
 * ```tsx
 * <PaymentHistory invoiceId={invoiceId} />
 * ```
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { PaymentService, type Payment } from '@/services/payments/PaymentService';
import { ActivityTimeline } from '@/core/activity/ActivityTimeline';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Input } from '@/shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/ui/table';
import {
  CreditCard,
  Download,
  Filter,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PaymentHistoryProps {
  /** Invoice ID to show payments for */
  invoiceId: string;
  /** Show activity timeline */
  showActivityTimeline?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get status badge variant and styling
 */
const getStatusBadge = (status: Payment['status']) => {
  const variants: Record<Payment['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; icon: React.ReactNode }> = {
    pending: {
      variant: 'outline',
      className: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
      icon: <Clock className="w-3 h-3" />
    },
    processing: {
      variant: 'outline',
      className: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      icon: <RefreshCw className="w-3 h-3 animate-spin" />
    },
    completed: {
      variant: 'default',
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    failed: {
      variant: 'destructive',
      className: 'bg-red-500/10 text-red-300 border-red-500/30',
      icon: <XCircle className="w-3 h-3" />
    },
    refunded: {
      variant: 'outline',
      className: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
      icon: <AlertCircle className="w-3 h-3" />
    },
    cancelled: {
      variant: 'outline',
      className: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
      icon: <XCircle className="w-3 h-3" />
    }
  };

  return variants[status] || variants.pending;
};

/**
 * Payment History Component
 */
export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  invoiceId,
  showActivityTimeline = true,
  className,
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Payment['status'] | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<Payment['method'] | 'all'>('all');

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await PaymentService.getPaymentHistory(invoiceId);
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payment history:', err);
      setError('Failed to load payment history');
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      // Status filter
      if (statusFilter !== 'all' && payment.status !== statusFilter) {
        return false;
      }

      // Method filter
      if (methodFilter !== 'all' && payment.method !== methodFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          payment.transactionId?.toLowerCase().includes(query) ||
          payment.amount.toString().includes(query) ||
          payment.currency.toLowerCase().includes(query) ||
          payment.method.toLowerCase().includes(query) ||
          payment.notes?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [payments, statusFilter, methodFilter, searchQuery]);

  // Calculate totals
  const totals = useMemo(() => {
    const completed = filteredPayments.filter(p => p.status === 'completed');
    const totalAmount = completed.reduce((sum, p) => sum + p.amount, 0);
    const totalCount = completed.length;
    
    return { totalAmount, totalCount };
  }, [filteredPayments]);

  // Loading state
  if (loading) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500/70 mb-4" />
            <p className="text-sm text-red-400/70 mb-2">{error}</p>
            <Button
              onClick={() => void loadPayments()}
              variant="outline"
              size="sm"
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Payment History Card */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-amber-200 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment History
              </CardTitle>
              <CardDescription className="text-sm text-amber-600/70 mt-1">
                {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
                {totals.totalCount > 0 && (
                  <span className="ml-2">
                    • {totals.totalAmount.toFixed(2)} {payments[0]?.currency || 'USD'} received
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => void loadPayments()}
                variant="outline"
                size="sm"
                className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                onClick={() => {
                  // Export functionality (to be implemented)
                  toast.info('Export functionality coming soon');
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600/50" />
              <Input
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 placeholder:text-amber-600/50"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as Payment['status'] | 'all')}>
              <SelectTrigger className="w-full sm:w-[180px] bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f0f0f] border-amber-600/30">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={(value) => setMethodFilter(value as Payment['method'] | 'all')}>
              <SelectTrigger className="w-full sm:w-[180px] bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f0f0f] border-amber-600/30">
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payments Table */}
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-amber-600/20 mx-auto mb-4" />
              <p className="text-sm font-medium text-amber-300/70 mb-1">No payments found</p>
              <p className="text-xs text-amber-600/50">
                {payments.length === 0 
                  ? 'No payments have been recorded for this invoice yet.'
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-600/20 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#0f0f0f]/60 border-amber-600/20 hover:bg-[#0f0f0f]/80">
                    <TableHead className="text-amber-300/70 text-xs font-medium">Date</TableHead>
                    <TableHead className="text-amber-300/70 text-xs font-medium">Amount</TableHead>
                    <TableHead className="text-amber-300/70 text-xs font-medium">Method</TableHead>
                    <TableHead className="text-amber-300/70 text-xs font-medium">Status</TableHead>
                    <TableHead className="text-amber-300/70 text-xs font-medium">Transaction ID</TableHead>
                    <TableHead className="text-amber-300/70 text-xs font-medium">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => {
                    const statusBadge = getStatusBadge(payment.status);
                    
                    return (
                      <TableRow
                        key={payment.id}
                        className="border-amber-600/10 hover:bg-[#0f0f0f]/40"
                      >
                        <TableCell className="text-xs text-amber-200/80">
                          <div className="flex flex-col">
                            <span>{format(payment.createdAt, 'MMM d, yyyy')}</span>
                            <span className="text-amber-600/50 text-[10px]">
                              {formatDistanceToNow(payment.createdAt, { addSuffix: true })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-amber-200">
                          {payment.currency} {payment.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-amber-500/5 text-amber-300/70 border-amber-600/20 text-[10px] capitalize"
                          >
                            {payment.method.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadge.variant}
                            className={cn('text-[10px] flex items-center gap-1 w-fit', statusBadge.className)}
                          >
                            {statusBadge.icon}
                            <span className="capitalize">{payment.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-amber-600/70 font-mono">
                          {payment.transactionId ? (
                            <span className="truncate max-w-[120px] block" title={payment.transactionId}>
                              {payment.transactionId.slice(0, 12)}...
                            </span>
                          ) : (
                            <span className="text-amber-600/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-amber-600/60 max-w-[200px] truncate">
                          {payment.notes || <span className="text-amber-600/30">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary */}
          {totals.totalCount > 0 && (
            <div className="mt-6 p-4 rounded-lg bg-amber-500/5 border border-amber-600/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-medium text-amber-300">Total Received</span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-amber-200">
                    {payments[0]?.currency || 'USD'} {totals.totalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-amber-600/60">
                    {totals.totalCount} payment{totals.totalCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      {showActivityTimeline && (
        <ActivityTimeline
          entityType="payment"
          entityId={invoiceId}
          limit={20}
          showHeader={true}
        />
      )}
    </div>
  );
};


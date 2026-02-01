/**
 * Client Payment Processor
 * 
 * Gold-tier component for clients to process payments for invoices.
 * 
 * Features:
 * - Payment method selection
 * - Payment link generation
 * - Payment history
 * - Prestige dark theme styling
 */

import { formatCurrency } from '@/lib/i18n/formatters';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { PaymentLinkGenerator } from '@/services/payments';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/ui/table';
import { format } from 'date-fns';
import {
    CheckCircle2,
    Clock,
    Copy,
    CreditCard,
    ExternalLink,
    XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ClientPaymentProcessorProps {
  customerId: string;
}

export const ClientPaymentProcessor: React.FC<ClientPaymentProcessorProps> = ({ customerId }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load unpaid invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customerId)
        .neq('status', 'paid')
        .order('created_at', { ascending: false });

      // Load payment history
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('completed_at', { ascending: false })
        .limit(20);

      setInvoices(invoicesData || []);
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Failed to load payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleGeneratePaymentLink = async (invoice: any) => {
    try {
      setSelectedInvoice(invoice);
      const link = await PaymentLinkGenerator.generateLink({
        invoiceId: invoice.id,
        amount: parseFloat(invoice.total_amount?.toString() || '0'),
        currency: invoice.currency || 'USD',
        description: `Payment for invoice ${invoice.invoice_number || invoice.id.slice(0, 8)}`,
      });
      setPaymentLink(link.url);
      toast.success('Payment link generated');
    } catch (error) {
      console.error('Failed to generate payment link:', error);
      toast.error('Failed to generate payment link');
    }
  };

  const handleCopyLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      toast.success('Payment link copied to clipboard');
    }
  };

  const getPaymentStatusBadge = (payment: any) => {
    if (payment.status === 'completed') {
      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-200 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    }
    if (payment.status === 'pending') {
      return (
        <Badge variant="outline" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-500/20 text-red-200 border-red-500/30">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardContent className="p-8">
          <div className="text-center text-amber-600/70">Loading payment data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Invoices */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Pending Payments</CardTitle>
          <CardDescription className="text-sm text-amber-600/70">
            Invoices awaiting payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-amber-600/70">No pending payments</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0f0f0f]/60 border-amber-600/20">
                  <TableHead className="text-amber-300/70">Invoice</TableHead>
                  <TableHead className="text-amber-300/70">Due Date</TableHead>
                  <TableHead className="text-amber-300/70">Amount</TableHead>
                  <TableHead className="text-amber-300/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="border-amber-600/10">
                    <TableCell className="text-amber-200 font-mono text-sm">
                      {invoice.invoice_number || invoice.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-amber-200">
                      {invoice.due_date ? (
                        <span className={cn(
                          new Date(invoice.due_date) < new Date() ? 'text-red-400' : ''
                        )}>
                          {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-amber-600/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-amber-200 font-medium">
                      {formatCurrency(parseFloat(invoice.total_amount?.toString() || '0'), 'en', invoice.currency || 'USD')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleGeneratePaymentLink(invoice)}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Payment History</CardTitle>
          <CardDescription className="text-sm text-amber-600/70">
            Your recent payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-amber-600/70">No payment history</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0f0f0f]/60 border-amber-600/20">
                  <TableHead className="text-amber-300/70">Date</TableHead>
                  <TableHead className="text-amber-300/70">Invoice</TableHead>
                  <TableHead className="text-amber-300/70">Amount</TableHead>
                  <TableHead className="text-amber-300/70">Method</TableHead>
                  <TableHead className="text-amber-300/70">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} className="border-amber-600/10">
                    <TableCell className="text-amber-200">
                      {payment.completed_at ? format(new Date(payment.completed_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-amber-200 font-mono text-sm">
                      {payment.invoice_id?.slice(0, 8) || '—'}
                    </TableCell>
                    <TableCell className="text-amber-200 font-medium">
                      {formatCurrency(parseFloat(payment.amount?.toString() || '0'), 'en', payment.currency || 'USD')}
                    </TableCell>
                    <TableCell className="text-amber-200">
                      {payment.method || '—'}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(payment)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Link Modal */}
      {selectedInvoice && paymentLink && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#0f0f0f]/95 border-amber-600/30 card-glass-dark max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-lg text-amber-200">Payment Link</CardTitle>
              <CardDescription className="text-sm text-amber-600/70">
                Share this link to complete payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-amber-600/70 mb-2">Invoice</p>
                <p className="text-amber-200 font-medium">
                  {selectedInvoice.invoice_number || selectedInvoice.id.slice(0, 8)}
                </p>
              </div>
              <div>
                <p className="text-sm text-amber-600/70 mb-2">Amount</p>
                <p className="text-amber-200 font-medium text-xl">
                  {formatCurrency(parseFloat(selectedInvoice.total_amount?.toString() || '0'), 'en', selectedInvoice.currency || 'USD')}
                </p>
              </div>
              <div>
                <p className="text-sm text-amber-600/70 mb-2">Payment Link</p>
                <div className="flex gap-2">
                  <Input
                    value={paymentLink}
                    readOnly
                    className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 font-mono text-sm"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => window.open(paymentLink, '_blank')}
                  className="bg-amber-600 hover:bg-amber-700 text-white flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setPaymentLink(null);
                  }}
                  className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};


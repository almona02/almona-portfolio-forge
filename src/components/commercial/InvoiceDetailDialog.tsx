/**
 * Invoice Detail Dialog
 * 
 * Gold-tier invoice detail dialog with payment history, state management,
 * and payment form integration.
 * 
 * Features:
 * - Invoice details display
 * - Payment history integration
 * - State machine integration
 * - Payment form integration
 * - Activity timeline
 * - Prestige theme styling
 * 
 * Usage:
 * ```tsx
 * <InvoiceDetailDialog
 *   invoice={invoice}
 *   isOpen={isOpen}
 *   onClose={onClose}
 * />
 * ```
 */

import { useAuth } from '@/context/AuthContext';
import { ActivityTimeline } from '@/core/activity/ActivityTimeline';
import { StateTransition } from '@/core/state/StateTransition';
import { COMMERCIAL_STATE_MACHINE, createStateMachine } from '@/core/state/stateMachines';
import { formatCurrency } from '@/lib/i18n/formatters';
import { cn } from '@/lib/utils';
import { CommercialPDFService } from '@/services/commercial/CommercialPDFService';
import { PaymentLinkGenerator } from '@/services/payments/PaymentLinkGenerator';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import type { DraftInvoice } from '@/types/fabricator';
import { format } from 'date-fns';
import {
    Copy,
    Download,
    FileText,
    Link,
    Send,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmailSendDialog } from './EmailSendDialog';
import { PaymentForm } from './PaymentForm';
import { PaymentHistory } from './PaymentHistory';

interface InvoiceDetailDialogProps {
  /** Invoice to display */
  invoice: DraftInvoice;
  /** Dialog open state */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Callback when invoice is updated */
  onUpdate?: (invoice: DraftInvoice) => void;
}

/**
 * Get status badge styling
 */
const getStatusBadge = (status: string) => {
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    draft: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-300',
      border: 'border-slate-500/30',
    },
    submitted: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-300',
      border: 'border-blue-500/30',
    },
    approved: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
    },
    locked: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
    },
    executed: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-300',
      border: 'border-cyan-500/30',
    },
    cancelled: {
      bg: 'bg-red-500/10',
      text: 'text-red-300',
      border: 'border-red-500/30',
    },
  };

  return statusColors[status] || statusColors.draft;
};

/**
 * Tax configuration - EGP: 14% VAT + 1% = 15% total
 */
const EGP_VAT_RATE = 0.15; // 15% (14% + 1%)

/**
 * Calculate tax breakdown with precision
 */
function calculateTaxBreakdown(totalAmount: number, vatRate: number = EGP_VAT_RATE): {
  subtotal: number;
  tax: number;
  total: number;
} {
  if (!totalAmount || totalAmount <= 0) {
    return { subtotal: 0, tax: 0, total: 0 };
  }

  // Calculate subtotal: totalAmount / (1 + vatRate)
  const subtotal = Math.round((totalAmount / (1 + vatRate)) * 100) / 100;
  
  // Calculate tax: totalAmount - subtotal (to ensure precision)
  const tax = Math.round((totalAmount - subtotal) * 100) / 100;
  
  // Ensure total matches (subtotal + tax)
  const total = Math.round((subtotal + tax) * 100) / 100;

  return { subtotal, tax, total };
}

/**
 * Invoice Detail Dialog Component
 * Memoized for performance optimization
 */
const InvoiceDetailDialogComponent: React.FC<InvoiceDetailDialogProps> = ({
  invoice,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const { user } = useAuth();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  
  // Create state machine instance
  const stateMachine = useMemo(() => {
    const machine = createStateMachine(COMMERCIAL_STATE_MACHINE as any, invoice.status || 'draft');
    return machine;
  }, [invoice.status]);

  const statusBadge = useMemo(() => {
    return getStatusBadge(invoice.status || 'draft');
  }, [invoice.status]);

  // Calculate tax breakdown with precision - memoized for performance
  const taxBreakdown = useMemo(() => {
    const invoiceCurrency = invoice.currency || 'EGP';
    const vatRate = invoiceCurrency === 'EGP' ? EGP_VAT_RATE : EGP_VAT_RATE; // 15% for all currencies
    return calculateTaxBreakdown(invoice.amount || 0, vatRate);
  }, [invoice.amount, invoice.currency]);

  const handleStateTransition = (from: string, to: string) => {
    // Update invoice status
    const updatedInvoice: DraftInvoice = {
      ...invoice,
      status: to as any,
    };
    onUpdate?.(updatedInvoice);
  };

  const handlePaymentSuccess = (paymentId: string) => {
    // Refresh payment history will happen automatically
    // Could also update invoice status if payment completes invoice
    console.log('Payment successful:', paymentId);
  };

  // Handle payment link generation
  const handleGeneratePaymentLink = useCallback(async () => {
    try {
      setGeneratingLink(true);
      const link = await PaymentLinkGenerator.generateLink({
        invoiceId: invoice.id,
        amount: invoice.amount || 0,
        currency: invoice.currency || 'USD',
        description: `Payment for Invoice ${invoice.invoiceNumber || invoice.id}`,
      });
      setPaymentLink(link.url);
      toast.success('Payment link generated successfully');
    } catch (error) {
      console.error('Failed to generate payment link:', error);
      toast.error('Failed to generate payment link');
    } finally {
      setGeneratingLink(false);
    }
  }, [invoice]);

  // Handle copy payment link
  const handleCopyPaymentLink = useCallback(() => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      toast.success('Payment link copied to clipboard');
    }
  }, [paymentLink]);

  // Handle PDF download
  const handleDownloadPDF = useCallback(async () => {
    try {
      setDownloadingPDF(true);
      const pdfBlob = await CommercialPDFService.generateInvoicePDF(invoice);
      const filename = `invoice_${invoice.invoiceNumber || invoice.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      CommercialPDFService.downloadPDF(pdfBlob, filename);
      toast.success('Invoice PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to generate invoice PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  }, [invoice]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f0f0f] border-amber-600/30 max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl text-amber-200 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Details
              </DialogTitle>
              <DialogDescription className="text-sm text-amber-600/70 mt-1">
                {invoice.invoiceNumber || 'Draft Invoice'}
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-xs capitalize',
                statusBadge.bg,
                statusBadge.text,
                statusBadge.border
              )}
            >
              {invoice.status || 'draft'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="bg-[#0f0f0f]/60 border-amber-600/20 mb-4">
              <TabsTrigger value="details" className="text-amber-300 data-[state=active]:text-amber-200">
                Details
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-amber-300 data-[state=active]:text-amber-200">
                Payments
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-amber-300 data-[state=active]:text-amber-200">
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              {/* Invoice Info Card */}
              <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
                <CardHeader>
                  <CardTitle className="text-base text-amber-200">Invoice Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-amber-600/70">Customer</Label>
                      <p className="text-sm text-amber-200 mt-1">{invoice.customerName || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-600/70">Invoice Number</Label>
                      <p className="text-sm text-amber-200 mt-1">{invoice.invoiceNumber || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-600/70">Subtotal</Label>
                      <p className="text-sm text-amber-300 mt-1">
                        {formatCurrency(taxBreakdown.subtotal, 'en', invoice.currency || 'EGP')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-600/70">Tax (VAT 15%)</Label>
                      <p className="text-sm text-amber-300 mt-1">
                        {formatCurrency(taxBreakdown.tax, 'en', invoice.currency || 'EGP')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-600/70">Total Amount</Label>
                      <p className="text-lg font-semibold text-amber-200 mt-1">
                        {formatCurrency(taxBreakdown.total, 'en', invoice.currency || 'EGP')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-600/70">Due Date</Label>
                      <p className="text-sm text-amber-200 mt-1">
                        {invoice.dueDate ? format(invoice.dueDate, 'MMM d, yyyy') : '—'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-600/70">Created</Label>
                      <p className="text-sm text-amber-200 mt-1">
                        {invoice.createdAt ? format(invoice.createdAt, 'MMM d, yyyy') : '—'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-600/70">Status</Label>
                      <Badge
                        variant="outline"
                        className={cn(
                          'mt-1 text-xs capitalize',
                          statusBadge.bg,
                          statusBadge.text,
                          statusBadge.border
                        )}
                      >
                        {invoice.status || 'draft'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* State Management Card */}
              <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
                <CardHeader>
                  <CardTitle className="text-base text-amber-200">Status Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <StateTransition
                    machine={stateMachine}
                    currentState={(invoice.status || 'draft') as any}
                    entityType="invoice"
                    entityId={invoice.id}
                    userId={user?.id}
                    onTransition={handleStateTransition}
                    showHistory={true}
                    compact={true}
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEmailDialogOpen(true)}
                  className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {downloadingPDF ? 'Generating...' : 'Download PDF'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGeneratePaymentLink}
                  disabled={generatingLink}
                  className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                >
                  <Link className="w-4 h-4 mr-2" />
                  {generatingLink ? 'Generating...' : 'Generate Payment Link'}
                </Button>
                {paymentLink && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0f0f0f]/60 border border-amber-600/30">
                    <Input
                      value={paymentLink}
                      readOnly
                      className="bg-transparent border-0 text-amber-200 text-xs flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPaymentLink}
                      className="text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-4">
              {/* Payment Form */}
              <PaymentForm
                invoiceId={invoice.id}
                amount={invoice.amount || 0}
                currency={invoice.currency || 'USD'}
                onSuccess={handlePaymentSuccess}
              />

              {/* Payment History */}
              <PaymentHistory
                invoiceId={invoice.id}
                showActivityTimeline={false}
              />
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <ActivityTimeline
                entityType="invoice"
                entityId={invoice.id}
                limit={50}
                showHeader={true}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      {/* Email Send Dialog */}
      <EmailSendDialog
        isOpen={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        type="invoice"
        templateData={{
          invoiceNumber: invoice.invoiceNumber || 'Draft',
          customerName: invoice.customerName || 'Customer',
          totalAmount: invoice.amount?.toFixed(2) || '0.00',
          currency: invoice.currency || 'USD',
          dueDate: invoice.dueDate ? format(invoice.dueDate, 'MMM d, yyyy') : 'N/A',
          invoiceLink: `${window.location.origin}/commercial/invoice/${invoice.id}`,
          paymentLink: `${window.location.origin}/commercial/invoice/${invoice.id}/pay`,
          customerEmail: (invoice as any).customerEmail,
        }}
        defaultTo={(invoice as any).customerEmail}
        onSent={() => {
          console.log('Invoice email sent successfully');
        }}
      />
    </Dialog>
  );
};

// Memoized export for performance
export const InvoiceDetailDialog = React.memo(InvoiceDetailDialogComponent, (prevProps, nextProps) => {
  // Custom comparison function for memoization
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.invoice.id === nextProps.invoice.id &&
    prevProps.invoice.status === nextProps.invoice.status &&
    prevProps.invoice.amount === nextProps.invoice.amount
  );
});

InvoiceDetailDialog.displayName = 'InvoiceDetailDialog';


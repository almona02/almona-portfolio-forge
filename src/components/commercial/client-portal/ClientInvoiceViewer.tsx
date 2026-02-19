/**
 * Client Invoice Viewer
 * 
 * Gold-tier component for clients to view and manage their invoices.
 * 
 * Features:
 * - Invoice list with filtering
 * - Invoice detail view
 * - Payment status tracking
 * - PDF download
 * - Prestige dark theme styling
 */

import { formatCurrency } from '@/lib/i18n/formatters';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { CommercialPDFService } from '@/services/commercial/CommercialPDFService';
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
    AlertCircle,
    Calendar,
    DollarSign,
    Download,
    Eye,
    Search,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ClientInvoiceViewerProps {
  customerId: string;
}

export const ClientInvoiceViewer: React.FC<ClientInvoiceViewerProps> = ({ customerId }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
  };

  const handleDownloadPDF = async (invoice: any) => {
    try {
      const pdfBlob = await CommercialPDFService.generateInvoicePDF(invoice);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoice_number || invoice.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      invoice.invoice_number?.toLowerCase().includes(search) ||
      invoice.id.toLowerCase().includes(search) ||
      invoice.status?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (invoice: any) => {
    const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== 'paid';
    
    if (isOverdue) {
      return (
        <Badge variant="outline" className="bg-red-500/20 text-red-200 border-red-500/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Overdue
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className={cn(
          'border-amber-600/30',
          invoice.status === 'paid' ? 'bg-green-500/20 text-green-200' :
          invoice.status === 'pending' || invoice.status === 'sent' ? 'bg-amber-500/20 text-amber-200' :
          'bg-gray-500/20 text-gray-200'
        )}
      >
        {invoice.status || 'pending'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardContent className="p-8">
          <div className="text-center text-amber-600/70">Loading invoices...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-600/50" />
              <Input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
              />
            </div>
            <Button
              onClick={loadInvoices}
              variant="outline"
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Your Invoices</CardTitle>
          <CardDescription className="text-sm text-amber-600/70">
            {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-amber-600/70">No invoices found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0f0f0f]/60 border-amber-600/20">
                  <TableHead className="text-amber-300/70">Invoice Number</TableHead>
                  <TableHead className="text-amber-300/70">Date</TableHead>
                  <TableHead className="text-amber-300/70">Due Date</TableHead>
                  <TableHead className="text-amber-300/70">Amount</TableHead>
                  <TableHead className="text-amber-300/70">Status</TableHead>
                  <TableHead className="text-amber-300/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="border-amber-600/10">
                    <TableCell className="text-amber-200 font-mono text-sm">
                      {invoice.invoice_number || invoice.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-amber-200">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-600/50" />
                        {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="text-amber-200">
                      {invoice.due_date ? (
                        <span className={cn(
                          new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' ? 'text-red-400' : ''
                        )}>
                          {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-amber-600/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-amber-200">
                      {formatCurrency(parseFloat(invoice.total_amount?.toString() || '0'), 'en', invoice.currency || 'USD')}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewInvoice(invoice)}
                          className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(invoice)}
                          className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {invoice.status !== 'paid' && (
                          <Button
                            size="sm"
                            onClick={() => {/* Navigate to payment */}}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#0f0f0f]/95 border-amber-600/30 card-glass-dark max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-amber-200">
                    Invoice {selectedInvoice.invoice_number || selectedInvoice.id.slice(0, 8)}
                  </CardTitle>
                  <CardDescription className="text-sm text-amber-600/70">
                    Created: {format(new Date(selectedInvoice.created_at), 'MMM d, yyyy')}
                    {selectedInvoice.due_date && (
                      <span className="ml-2">
                        | Due: {format(new Date(selectedInvoice.due_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedInvoice(null)}
                  className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-amber-600/70 mb-1">Status</p>
                  {getStatusBadge(selectedInvoice)}
                </div>
                <div>
                  <p className="text-sm text-amber-600/70 mb-1">Total Amount</p>
                  <p className="text-amber-200 font-medium text-xl">
                    {formatCurrency(parseFloat(selectedInvoice.total_amount?.toString() || '0'), 'en', selectedInvoice.currency || 'USD')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-amber-600/70 mb-1">Subtotal</p>
                  <p className="text-amber-200">
                    {formatCurrency(parseFloat(selectedInvoice.subtotal?.toString() || '0'), 'en', selectedInvoice.currency || 'USD')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-amber-600/70 mb-1">Tax</p>
                  <p className="text-amber-200">
                    {formatCurrency(parseFloat(selectedInvoice.tax_amount?.toString() || '0'), 'en', selectedInvoice.currency || 'USD')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                {selectedInvoice.status !== 'paid' && (
                  <Button
                    onClick={() => {/* Navigate to payment */}}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pay Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};


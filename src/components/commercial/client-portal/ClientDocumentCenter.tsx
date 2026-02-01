/**
 * Client Document Center
 * 
 * Gold-tier component for clients to download documents (quotes, invoices, etc.).
 * 
 * Features:
 * - Document list with filtering
 * - Document download
 * - Document preview
 * - Prestige dark theme styling
 */

import { supabase } from '@/lib/supabase';
import { CommercialPDFService } from '@/services/commercial/CommercialPDFService';
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
    Calendar,
    Download,
    FileText,
    Receipt,
    Search,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ClientDocumentCenterProps {
  customerId: string;
}

interface Document {
  id: string;
  type: 'quote' | 'invoice';
  reference: string;
  name: string;
  date: Date;
  amount?: number;
  currency?: string;
}

export const ClientDocumentCenter: React.FC<ClientDocumentCenterProps> = ({ customerId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Load quotes
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id, quote_number, created_at, total_amount, currency')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      // Load invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, created_at, total_amount, currency')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      const docs: Document[] = [
        ...(quotes || []).map((q: any) => ({
          id: q.id,
          type: 'quote' as const,
          reference: q.quote_number || q.id.slice(0, 8),
          name: `Quote ${q.quote_number || q.id.slice(0, 8)}`,
          date: new Date(q.created_at),
          amount: parseFloat(q.total_amount?.toString() || '0'),
          currency: q.currency || 'USD',
        })),
        ...(invoices || []).map((i: any) => ({
          id: i.id,
          type: 'invoice' as const,
          reference: i.invoice_number || i.id.slice(0, 8),
          name: `Invoice ${i.invoice_number || i.id.slice(0, 8)}`,
          date: new Date(i.created_at),
          amount: parseFloat(i.total_amount?.toString() || '0'),
          currency: i.currency || 'USD',
        })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime());

      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleDownload = async (doc: Document) => {
    try {
      if (doc.type === 'quote') {
        const { data: quote } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', doc.id)
          .single();

        if (quote) {
          const pdfBlob = await CommercialPDFService.generateQuotePDF(quote as any);
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `quote-${doc.reference}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Quote downloaded');
        }
      } else {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', doc.id)
          .single();

        if (invoice) {
          const pdfBlob = await CommercialPDFService.generateInvoicePDF(invoice as any);
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `invoice-${doc.reference}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Invoice downloaded');
        }
      }
    } catch (error) {
      console.error('Failed to download document:', error);
      toast.error('Failed to download document');
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      doc.reference.toLowerCase().includes(search) ||
      doc.name.toLowerCase().includes(search) ||
      doc.type.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardContent className="p-8">
          <div className="text-center text-amber-600/70">Loading documents...</div>
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
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
              />
            </div>
            <Button
              onClick={loadDocuments}
              variant="outline"
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Your Documents</CardTitle>
          <CardDescription className="text-sm text-amber-600/70">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-amber-600/70">No documents found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0f0f0f]/60 border-amber-600/20">
                  <TableHead className="text-amber-300/70">Type</TableHead>
                  <TableHead className="text-amber-300/70">Reference</TableHead>
                  <TableHead className="text-amber-300/70">Date</TableHead>
                  <TableHead className="text-amber-300/70">Amount</TableHead>
                  <TableHead className="text-amber-300/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={`${doc.type}-${doc.id}`} className="border-amber-600/10">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {doc.type === 'quote' ? (
                          <FileText className="w-4 h-4 text-amber-500/50" />
                        ) : (
                          <Receipt className="w-4 h-4 text-amber-500/50" />
                        )}
                        <span className="text-amber-200 capitalize">{doc.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-amber-200 font-mono text-sm">
                      {doc.reference}
                    </TableCell>
                    <TableCell className="text-amber-200">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-600/50" />
                        {format(doc.date, 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="text-amber-200">
                      {doc.amount !== undefined ? (
                        <span>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: doc.currency || 'USD',
                          }).format(doc.amount)}
                        </span>
                      ) : (
                        <span className="text-amber-600/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(doc)}
                        className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


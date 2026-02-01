/**
 * Client Quote Viewer
 * 
 * Gold-tier component for clients to view and manage their quotes.
 * 
 * Features:
 * - Quote list with filtering
 * - Quote detail view
 * - Quote acceptance
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
    Calendar,
    CheckCircle2,
    Download,
    Eye,
    Search,
    XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ClientQuoteViewerProps {
  customerId: string;
}

export const ClientQuoteViewer: React.FC<ClientQuoteViewerProps> = ({ customerId }) => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Failed to load quotes:', error);
      toast.error('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleViewQuote = (quote: any) => {
    setSelectedQuote(quote);
  };

  const handleDownloadPDF = async (quote: any) => {
    try {
      const pdfBlob = await CommercialPDFService.generateQuotePDF(quote as any);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quote-${quote.quote_number || quote.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Quote PDF downloaded');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      const { error } = await (supabase
        .from('quotes') as any)
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', quoteId);

      if (error) throw error;
      toast.success('Quote accepted');
      loadQuotes();
      setSelectedQuote(null);
    } catch (error) {
      console.error('Failed to accept quote:', error);
      toast.error('Failed to accept quote');
    }
  };

  const filteredQuotes = quotes.filter((quote) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      quote.quote_number?.toLowerCase().includes(search) ||
      quote.id.toLowerCase().includes(search) ||
      quote.status?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardContent className="p-8">
          <div className="text-center text-amber-600/70">Loading quotes...</div>
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
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
              />
            </div>
            <Button
              onClick={loadQuotes}
              variant="outline"
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Your Quotes</CardTitle>
          <CardDescription className="text-sm text-amber-600/70">
            {filteredQuotes.length} quote{filteredQuotes.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-8 text-amber-600/70">No quotes found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0f0f0f]/60 border-amber-600/20">
                  <TableHead className="text-amber-300/70">Quote Number</TableHead>
                  <TableHead className="text-amber-300/70">Date</TableHead>
                  <TableHead className="text-amber-300/70">Amount</TableHead>
                  <TableHead className="text-amber-300/70">Status</TableHead>
                  <TableHead className="text-amber-300/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow key={quote.id} className="border-amber-600/10">
                    <TableCell className="text-amber-200 font-mono text-sm">
                      {quote.quote_number || quote.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-amber-200">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-600/50" />
                        {format(new Date(quote.created_at), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="text-amber-200">
                      {formatCurrency(parseFloat(quote.total_amount?.toString() || '0'), 'en', quote.currency || 'USD')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-amber-600/30',
                          quote.status === 'accepted' ? 'bg-green-500/20 text-green-200' :
                          quote.status === 'pending' ? 'bg-amber-500/20 text-amber-200' :
                          quote.status === 'rejected' ? 'bg-red-500/20 text-red-200' :
                          'bg-gray-500/20 text-gray-200'
                        )}
                      >
                        {quote.status || 'draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewQuote(quote)}
                          className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(quote)}
                          className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {quote.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptQuote(quote.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle2 className="w-4 h-4" />
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

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#0f0f0f]/95 border-amber-600/30 card-glass-dark max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-amber-200">
                    Quote {selectedQuote.quote_number || selectedQuote.id.slice(0, 8)}
                  </CardTitle>
                  <CardDescription className="text-sm text-amber-600/70">
                    Created: {format(new Date(selectedQuote.created_at), 'MMM d, yyyy')}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedQuote(null)}
                  className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-amber-600/70 mb-1">Status</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      'border-amber-600/30',
                      selectedQuote.status === 'accepted' ? 'bg-green-500/20 text-green-200' :
                      selectedQuote.status === 'pending' ? 'bg-amber-500/20 text-amber-200' :
                      'bg-gray-500/20 text-gray-200'
                    )}
                  >
                    {selectedQuote.status || 'draft'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-amber-600/70 mb-1">Total Amount</p>
                  <p className="text-amber-200 font-medium">
                    {formatCurrency(parseFloat(selectedQuote.total_amount?.toString() || '0'), 'en', selectedQuote.currency || 'USD')}
                  </p>
                </div>
              </div>
              {selectedQuote.notes && (
                <div>
                  <p className="text-sm text-amber-600/70 mb-1">Notes</p>
                  <p className="text-amber-200">{selectedQuote.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleDownloadPDF(selectedQuote)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                {selectedQuote.status === 'pending' && (
                  <Button
                    onClick={() => handleAcceptQuote(selectedQuote.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accept Quote
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


/**
 * Client Portal Dashboard
 * 
 * Gold-tier client self-service portal dashboard with quotes, invoices,
 * payments, and document management.
 * 
 * Features:
 * - Quote and invoice overview
 * - Payment status tracking
 * - Document download center
 * - Communication center
 * - Prestige dark theme styling
 * 
 * Usage:
 * ```tsx
 * <ClientPortalDashboard />
 * ```
 */

import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n/formatters';
import { supabase } from '@/lib/supabase';
import { getClientPortalSummary, type ClientPortalSummary } from '@/lib/data/clientPortalClient';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { format } from 'date-fns';
import {
    Clock,
    DollarSign,
    Download,
    FileText,
    Filter,
    MessageSquare,
    Receipt,
    Search,
    TrendingUp,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ClientCommunicationCenter } from './ClientCommunicationCenter';
import { ClientDocumentCenter } from './ClientDocumentCenter';
import { ClientInvoiceViewer } from './ClientInvoiceViewer';
import { ClientPaymentProcessor } from './ClientPaymentProcessor';
import { ClientQuoteViewer } from './ClientQuoteViewer';

/**
 * Client Portal Dashboard Component
 */
export const ClientPortalDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'invoices' | 'payments' | 'documents' | 'messages'>('overview');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [summary, setSummary] = useState<ClientPortalSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setQuotes([]);
    setInvoices([]);
    setSummary(null);
    setLoadError(false);
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const userId = user.id;
    const loadData = async () => {
      setLoading(true);
      try {
        const [quotesResult, invoicesResult, accountSummary] = await Promise.all([
          supabase
            .from('quotes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('invoices')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10),
          getClientPortalSummary(),
        ]);
        // Supabase resolves database failures with an error field rather than throwing.
        if (quotesResult.error || invoicesResult.error) throw new Error('Portal data unavailable');
        if (!cancelled) {
          setQuotes(quotesResult.data || []);
          setInvoices(invoicesResult.data || []);
          setSummary(accountSummary);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadData();
    return () => { cancelled = true; };
  }, [user?.id, reloadKey]);

  if (!user?.id) {
    return <div role="status" className="p-6">Sign in to view your account.</div>;
  }

  if (loadError) {
    return (
      <div role="alert" className="min-h-screen bg-[#0a0a0a] p-6 text-amber-200">
        <h1 className="text-2xl font-bold mb-2">Account data unavailable</h1>
        <p className="mb-4">We could not load your quotes and invoices. Your account totals are unavailable. Please try again.</p>
        <Button onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>
      </div>
    );
  }

  if (loading || !summary) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-[#0f0f0f]/60 rounded w-64" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-[#0f0f0f]/60 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-200 mb-2">Client Portal</h1>
            <p className="text-amber-600/70">Manage your quotes, invoices, and payments</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-600/50" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#0f0f0f]/60 border border-amber-600/30 rounded text-amber-200 placeholder-amber-600/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <Button
              onClick={() => setReloadKey((key) => key + 1)}
              variant="outline"
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
            >
              <Filter className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600/70 mb-1">Total Quotes</p>
                  <p className="text-2xl font-bold text-amber-200">{summary.totalQuotes}</p>
                  <p className="text-xs text-amber-600/50 mt-1">
                    {summary.pendingQuotes} pending
                  </p>
                </div>
                <FileText className="w-8 h-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600/70 mb-1">Total Invoices</p>
                  <p className="text-2xl font-bold text-amber-200">{summary.totalInvoices}</p>
                  <p className="text-xs text-amber-600/50 mt-1">
                    {summary.pendingInvoices} pending
                  </p>
                </div>
                <Receipt className="w-8 h-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600/70 mb-1">Paid Invoice Total</p>
                  <p className="text-2xl font-bold text-amber-200">
                    {summary.currencies.length === 0 ? 'No paid invoices' : summary.currencies.map((item) => (
                      <span key={item.currency} className="block">{formatCurrency(item.totalRevenue, 'en', item.currency)}</span>
                    ))}
                  </p>
                  <p className="text-xs text-amber-600/50 mt-1">
                    {summary.paidInvoices} paid
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600/70 mb-1">Pending Amount</p>
                  <p className="text-2xl font-bold text-amber-200">
                    {summary.currencies.length === 0 ? 'No pending invoices' : summary.currencies.map((item) => (
                      <span key={item.currency} className="block">{formatCurrency(item.pendingAmount, 'en', item.currency)}</span>
                    ))}
                  </p>
                  {summary.overdueInvoices > 0 && (
                    <p className="text-xs text-red-400 mt-1">
                      {summary.overdueInvoices} overdue
                    </p>
                  )}
                </div>
                <Clock className="w-8 h-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-[#0f0f0f]/60 border-amber-600/20 mb-6">
            <TabsTrigger value="overview" className="text-amber-300 data-[state=active]:text-amber-200">
              Overview
            </TabsTrigger>
            <TabsTrigger value="quotes" className="text-amber-300 data-[state=active]:text-amber-200">
              <FileText className="w-4 h-4 mr-2" />
              Quotes
            </TabsTrigger>
            <TabsTrigger value="invoices" className="text-amber-300 data-[state=active]:text-amber-200">
              <Receipt className="w-4 h-4 mr-2" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-amber-300 data-[state=active]:text-amber-200">
              <DollarSign className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-amber-300 data-[state=active]:text-amber-200">
              <Download className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-amber-300 data-[state=active]:text-amber-200">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Recent Quotes */}
            <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
              <CardHeader>
                <CardTitle className="text-lg text-amber-200">Recent Quotes</CardTitle>
                <CardDescription className="text-sm text-amber-600/70">
                  Your latest quote requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {quotes.length === 0 ? (
                  <div className="text-center py-8 text-amber-600/70">No quotes found</div>
                ) : (
                  <div className="space-y-3">
                    {quotes.slice(0, 5).map((quote: any) => (
                      <div
                        key={quote.id}
                        className="flex items-center justify-between p-4 bg-[#0f0f0f]/60 border border-amber-600/20 rounded hover:bg-amber-500/5 transition-colors cursor-pointer"
                        onClick={() => setActiveTab('quotes')}
                      >
                        <div>
                          <p className="text-amber-200 font-medium">
                            {quote.quote_number || quote.id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-amber-600/70">
                            {format(new Date(quote.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-200 font-medium">
                            {formatCurrency(parseFloat(quote.total_amount?.toString() || '0'), 'en', quote.currency || 'USD')}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              'mt-1 border-amber-600/30',
                              quote.status === 'accepted' ? 'bg-green-500/20 text-green-200' :
                              quote.status === 'pending' ? 'bg-amber-500/20 text-amber-200' :
                              'bg-gray-500/20 text-gray-200'
                            )}
                          >
                            {quote.status || 'draft'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Invoices */}
            <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
              <CardHeader>
                <CardTitle className="text-lg text-amber-200">Recent Invoices</CardTitle>
                <CardDescription className="text-sm text-amber-600/70">
                  Your latest invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-amber-600/70">No invoices found</div>
                ) : (
                  <div className="space-y-3">
                    {invoices.slice(0, 5).map((invoice: any) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 bg-[#0f0f0f]/60 border border-amber-600/20 rounded hover:bg-amber-500/5 transition-colors cursor-pointer"
                        onClick={() => setActiveTab('invoices')}
                      >
                        <div>
                          <p className="text-amber-200 font-medium">
                            {invoice.invoice_number || invoice.id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-amber-600/70">
                            {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                            {invoice.due_date && (
                              <span className={cn(
                                'ml-2',
                                new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' ? 'text-red-400' : ''
                              )}>
                                Due: {format(new Date(invoice.due_date), 'MMM d')}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-200 font-medium">
                            {formatCurrency(parseFloat(invoice.total_amount?.toString() || '0'), 'en', invoice.currency || 'USD')}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              'mt-1 border-amber-600/30',
                              invoice.status === 'paid' ? 'bg-green-500/20 text-green-200' :
                              invoice.status === 'overdue' ? 'bg-red-500/20 text-red-200' :
                              'bg-amber-500/20 text-amber-200'
                            )}
                          >
                            {invoice.status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quotes Tab */}
          <TabsContent value="quotes">
            <ClientQuoteViewer customerId={user?.id || ''} />
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <ClientInvoiceViewer customerId={user?.id || ''} />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <ClientPaymentProcessor customerId={user?.id || ''} />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <ClientDocumentCenter customerId={user?.id || ''} />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <ClientCommunicationCenter customerId={user?.id || ''} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};


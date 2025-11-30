import React from 'react';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { FileText, Calculator, Plus, Download, Send, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { DraftQuote, DraftInvoice, WindowUnit, OptimizationResult } from '@/types/fabricator';
import { QuotingEngine } from '@/modules/commercial/QuotingEngine';
import { SYSTEM_PACKS } from '@/data/systemPacks';

const CommercialPage: React.FC = () => {
  const { state, dispatch } = useFabricatorWorkspace();
  const navigate = useNavigate();
  const { t } = useTranslation('fabricator');

  const handleCreateDraftQuote = () => {
    const project = state.currentProject as WindowUnit | null;
    let amount = 0;
    let currency: string = 'USD';
    let coreQuote: ReturnType<QuotingEngine['generateQuote']> | null = null;

    if (project && project.optimization) {
      const engine = new QuotingEngine();
      coreQuote = engine.generateQuote(project, project.optimization as OptimizationResult);
      amount = coreQuote.total;

      // Infer currency from system pack regions where possible
      if (project.systemPackId) {
        const pack = SYSTEM_PACKS.find((p) => p.meta.id === project.systemPackId);
        const regions = pack?.meta.regions || [];
        if (regions.includes('turkey')) currency = 'TRY';
        else if (regions.includes('egypt')) currency = 'EGP';
      }
    }

    const newQuote: DraftQuote = {
      id: `quote_${Date.now()}`,
      customerName: (state.currentCustomer as any)?.name || 'New Customer',
      projectTitle: project?.projectCode || project?.orderNumber || 'New Project',
      amount,
      currency,
      status: 'draft',
      items: coreQuote?.lineItems || [],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      payload: coreQuote ? { quoteCore: coreQuote } : {},
      createdAt: new Date(),
    };
    dispatch({ type: 'UPDATE_DRAFT_QUOTE', payload: newQuote });
  };

  const handleConvertToInvoice = (quoteId: string) => {
    const quote = state.draftQuotes.find((q) => q.id === quoteId);
    if (!quote) return;

    const invoice: DraftInvoice = {
      id: `inv_${Date.now()}`,
      customerName: quote.customerName,
      amount: quote.amount,
      currency: quote.currency,
      invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'draft',
      type: 'invoice',
      payload: quote.payload || {},
      createdAt: new Date(),
    };

    dispatch({ type: 'ADD_DRAFT_INVOICE', payload: invoice });
    dispatch({ type: 'REMOVE_DRAFT_QUOTE', payload: quoteId });
  };

  const handleDeleteDraft = (id: string, type: 'quote' | 'invoice') => {
    if (type === 'quote') {
      dispatch({ type: 'REMOVE_DRAFT_QUOTE', payload: id });
    } else {
      dispatch({ type: 'REMOVE_DRAFT_INVOICE', payload: id });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('commercial.title', 'Commercial Workspace')}</h1>
          <p className="text-slate-400 text-sm">
            {t('commercial.description', 'Manage quotes, invoices, and commercial documents anchored to your active projects.')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-slate-600 text-slate-200 hover:bg-slate-800 text-xs"
            onClick={() => navigate('/fabricator/pricing')}
          >
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            {t('commercial.pricing_settings', 'Pricing Settings')}
          </Button>
          <Button onClick={handleCreateDraftQuote} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            {t('commercial.new_quote', 'New Quote')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Draft Quotes */}
        <Card className="bg-slate-800/50 border-slate-700/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-amber-400" />
              {t('commercial.draft_quotes.title', 'Draft Quotes')}
              <Badge
                variant="outline"
                className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]"
              >
                {state.draftQuotes.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.draftQuotes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">{t('commercial.draft_quotes.no_quotes', 'No draft quotes')}</p>
                <p className="text-sm">
                  {t('commercial.draft_quotes.no_quotes_description', 'Create a quote from the active project or customer context to get started.')}
                </p>
              </div>
            ) : (
              state.draftQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="border border-slate-700/60 rounded-lg p-4 bg-slate-900/40"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-white">
                        {quote.customerName || t('commercial.draft_quotes.unnamed_customer', 'Unnamed Customer')}
                      </p>
                      <p className="text-sm text-slate-400">
                        {quote.projectTitle || t('commercial.draft_quotes.untitled_project', 'Untitled Project')}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-blue-500/20 text-blue-200 border-blue-500/40 text-[11px]"
                    >
                      {quote.amount != null ? `$${quote.amount}` : t('commercial.draft_quotes.draft', 'Draft')}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleConvertToInvoice(quote.id)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-xs"
                    >
                      {t('commercial.draft_quotes.convert_to_invoice', 'Convert to Invoice')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteDraft(quote.id, 'quote')}
                      className="border-red-500 text-red-300 hover:bg-red-500/20 text-xs"
                    >
                      {t('commercial.draft_quotes.delete', 'Delete')}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Draft Invoices */}
        <Card className="bg-slate-800/50 border-slate-700/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calculator className="h-5 w-5 text-blue-400" />
              {t('commercial.draft_invoices.title', 'Draft Invoices')}
              <Badge
                variant="outline"
                className="bg-blue-500/20 text-blue-200 border-blue-500/40 text-[10px]"
              >
                {state.draftInvoices.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.draftInvoices.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">{t('commercial.draft_invoices.no_invoices', 'No draft invoices')}</p>
                <p className="text-sm">{t('commercial.draft_invoices.no_invoices_description', 'Convert quotes to invoices to prepare billing.')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {state.draftInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border border-slate-700/60 rounded-lg p-4 bg-slate-900/40"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-white">
                          {invoice.customerName || t('commercial.draft_quotes.unnamed_customer', 'Unnamed Customer')}
                        </p>
                        <p className="text-sm text-slate-400">
                          {invoice.invoiceNumber || t('commercial.draft_invoices.draft_invoice', 'Draft invoice')}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-purple-500/20 text-purple-200 border-purple-500/40 text-[11px]"
                      >
                        {invoice.amount != null ? `$${invoice.amount}` : t('commercial.draft_quotes.draft', 'Draft')}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600 text-xs">
                        <Send className="h-3 w-3 mr-1" />
                        {t('commercial.draft_invoices.send', 'Send')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {t('commercial.draft_invoices.pdf', 'PDF')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteDraft(invoice.id, 'invoice')}
                        className="border-red-500 text-red-300 hover:bg-red-500/20 text-xs"
                      >
                        {t('commercial.draft_invoices.delete', 'Delete')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommercialPage;



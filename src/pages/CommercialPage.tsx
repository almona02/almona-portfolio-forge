import { InvoiceDetailDialog } from '@/components/commercial/InvoiceDetailDialog';
import { InvoiceManagementDashboard } from '@/components/commercial/InvoiceManagementDashboard';
import { PaymentReconciliation } from '@/components/commercial/PaymentReconciliation';
import { QuoteInvoiceTemplateLibrary } from '@/components/commercial/QuoteInvoiceTemplateLibrary';
import { ReportingDashboard } from '@/components/commercial/ReportingDashboard';
import { TaxReportDashboard } from '@/components/commercial/TaxReportDashboard';
import { TaxSettingsPanel } from '@/components/commercial/TaxSettingsPanel';
import { FabricatorWorkspaceLayout } from '@/components/fabricator/layout/FabricatorWorkspaceLayout';
import { ReportGenerator } from '@/components/ui/ReportGenerator';
import { ReportTemplateEditor } from '@/components/ui/ReportTemplateEditor';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { FabricatorSectionProvider } from '@/contexts/FabricatorSectionContext';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { CURRENCY_INFO, getExchangeRate, type ExchangeRate } from '@/lib/currencyExchange';
import { formatCurrency } from '@/lib/i18n/formatters';
import { QuotingEngine } from '@/modules/commercial/QuotingEngine';
import { CommercialExportService } from '@/services/commercial/CommercialExportService';
import { CommercialPDFService } from '@/services/commercial/CommercialPDFService';
import { BulkEmailService } from '@/services/email/BulkEmailService';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shared/ui/ui/alert-dialog';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/shared/ui/ui/dropdown-menu';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import type { DraftInvoice, DraftQuote, OptimizationResult, WindowUnit } from '@/types/fabricator';
import { BarChart3, Calculator, Calendar, Download, Eye, FileDown, FileText, Filter, Receipt, Search, Send, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Commercial Page Component
 * Gold-tier commercial workspace with bulk operations, quotes, and invoices management
 */
const CommercialPageComponent: React.FC = () => {
  const { state, dispatch } = useFabricatorWorkspace();
  const _navigate = useNavigate();
  const { t } = useTranslation('fabricator');
  const [selectedInvoice, setSelectedInvoice] = useState<DraftInvoice | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'workspace' | 'reports' | 'reconciliation' | 'tax' | 'invoices' | 'templates'>('workspace');
  
  // Bulk operations state
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<{
    type: 'delete_quotes' | 'delete_invoices' | 'export_quotes' | 'export_invoices' | 'send_quotes' | 'send_invoices' | 'update_quote_status' | 'update_invoice_status';
    count: number;
    status?: string;
  } | null>(null);

  // Search and filter state
  const [quoteSearch, setQuoteSearch] = useState<string>('');
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<string>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [quoteDateFrom, setQuoteDateFrom] = useState<string>('');
  const [quoteDateTo, setQuoteDateTo] = useState<string>('');
  const [invoiceDateFrom, setInvoiceDateFrom] = useState<string>('');
  const [invoiceDateTo, setInvoiceDateTo] = useState<string>('');
  const [invoiceDueDateFrom, setInvoiceDueDateFrom] = useState<string>('');
  const [invoiceDueDateTo, setInvoiceDueDateTo] = useState<string>('');
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  

  // Currency display state - Default to EGP
  const [displayCurrency, _setDisplayCurrency] = useState<string>('EGP');
  const [exchangeRates, setExchangeRates] = useState<Map<string, ExchangeRate>>(new Map());
  const [_loadingRates, setLoadingRates] = useState<boolean>(false);

  // PDF download state
  const [downloadingPDF, setDownloadingPDF] = useState<{ type: 'quote' | 'invoice'; id: string } | null>(null);

  const _handleCreateDraftQuote = () => {
    const project = state.currentProject as WindowUnit | null;
    let amount = 0;
    let currency: string = 'EGP'; // Default to EGP
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

  const handleViewInvoice = (invoice: DraftInvoice) => {
    setSelectedInvoice(invoice);
    setInvoiceDialogOpen(true);
  };

  const handleInvoiceUpdate = (updatedInvoice: DraftInvoice) => {
    dispatch({ type: 'UPDATE_DRAFT_INVOICE', payload: updatedInvoice });
    setSelectedInvoice(updatedInvoice);
  };

  // Bulk operations handlers
  const handleQuoteSelect = useCallback((quoteId: string, checked: boolean) => {
    setSelectedQuotes(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(quoteId);
      } else {
        next.delete(quoteId);
      }
      return next;
    });
  }, []);

  const handleInvoiceSelect = useCallback((invoiceId: string, checked: boolean) => {
    setSelectedInvoices(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(invoiceId);
      } else {
        next.delete(invoiceId);
      }
      return next;
    });
  }, []);

  const handleSelectAllQuotes = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedQuotes(new Set(state.draftQuotes.map(q => q.id)));
    } else {
      setSelectedQuotes(new Set());
    }
  }, [state.draftQuotes]);

  const handleSelectAllInvoices = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedInvoices(new Set(state.draftInvoices.map(i => i.id)));
    } else {
      setSelectedInvoices(new Set());
    }
  }, [state.draftInvoices]);

  const handleBulkDelete = useCallback((type: 'quotes' | 'invoices') => {
    if (type === 'quotes' && selectedQuotes.size > 0) {
      setPendingBulkAction({ type: 'delete_quotes', count: selectedQuotes.size });
      setConfirmDialogOpen(true);
    } else if (type === 'invoices' && selectedInvoices.size > 0) {
      setPendingBulkAction({ type: 'delete_invoices', count: selectedInvoices.size });
      setConfirmDialogOpen(true);
    }
  }, [selectedQuotes, selectedInvoices]);

  const handleBulkExport = useCallback(async (type: 'quotes' | 'invoices', format: 'csv' | 'excel' = 'excel') => {
    try {
      if (type === 'quotes' && selectedQuotes.size > 0) {
        const quotes = state.draftQuotes.filter(q => selectedQuotes.has(q.id));
        if (quotes.length === 0) {
          toast.error('No quotes selected for export');
          return;
        }
        if (format === 'excel') {
          await CommercialExportService.exportQuotesToExcel(quotes, `quotes_${Date.now()}`);
        } else {
          CommercialExportService.exportQuotesToCSV(quotes, `quotes_${Date.now()}`);
        }
        toast.success(`Exported ${quotes.length} quote(s) to ${format.toUpperCase()}`);
        setSelectedQuotes(new Set());
      } else if (type === 'invoices' && selectedInvoices.size > 0) {
        const invoices = state.draftInvoices.filter(i => selectedInvoices.has(i.id));
        if (invoices.length === 0) {
          toast.error('No invoices selected for export');
          return;
        }
        if (format === 'excel') {
          await CommercialExportService.exportInvoicesToExcel(invoices, `invoices_${Date.now()}`);
        } else {
          CommercialExportService.exportInvoicesToCSV(invoices, `invoices_${Date.now()}`);
        }
        toast.success(`Exported ${invoices.length} invoice(s) to ${format.toUpperCase()}`);
        setSelectedInvoices(new Set());
      } else {
        toast.warning(`No ${type} selected for export`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to export';
      toast.error(errorMessage);
    }
  }, [selectedQuotes, selectedInvoices, state.draftQuotes, state.draftInvoices]);

  const handleBulkSend = useCallback((type: 'quotes' | 'invoices') => {
    if (type === 'quotes' && selectedQuotes.size > 0) {
      setPendingBulkAction({ type: 'send_quotes', count: selectedQuotes.size });
      setConfirmDialogOpen(true);
    } else if (type === 'invoices' && selectedInvoices.size > 0) {
      setPendingBulkAction({ type: 'send_invoices', count: selectedInvoices.size });
      setConfirmDialogOpen(true);
    }
  }, [selectedQuotes, selectedInvoices]);

  const handleBulkUpdateStatus = useCallback((type: 'quotes' | 'invoices', status: string) => {
    if (type === 'quotes' && selectedQuotes.size > 0) {
      setPendingBulkAction({ type: 'update_quote_status', count: selectedQuotes.size, status });
      setConfirmDialogOpen(true);
    } else if (type === 'invoices' && selectedInvoices.size > 0) {
      setPendingBulkAction({ type: 'update_invoice_status', count: selectedInvoices.size, status });
      setConfirmDialogOpen(true);
    }
  }, [selectedQuotes, selectedInvoices]);

  const confirmBulkAction = useCallback(async () => {
    if (!pendingBulkAction) return;

    try {
      if (pendingBulkAction.type === 'delete_quotes') {
        selectedQuotes.forEach(id => {
          dispatch({ type: 'REMOVE_DRAFT_QUOTE', payload: id });
        });
        toast.success(`Deleted ${selectedQuotes.size} quote(s)`);
        setSelectedQuotes(new Set());
      } else if (pendingBulkAction.type === 'delete_invoices') {
        selectedInvoices.forEach(id => {
          dispatch({ type: 'REMOVE_DRAFT_INVOICE', payload: id });
        });
        toast.success(`Deleted ${selectedInvoices.size} invoice(s)`);
        setSelectedInvoices(new Set());
      } else if (pendingBulkAction.type === 'send_quotes') {
        // Bulk email sending for quotes
        const quotesToSend = state.draftQuotes.filter(q => selectedQuotes.has(q.id));
        const quotesWithEmail = quotesToSend
          .filter(q => {
            const email = (q as any).customerEmail || (q.payload as any)?.contact_info?.email;
            if (!email) {
              toast.warning(`Quote ${(q.payload as any)?.quoteNumber || q.id} has no customer email`);
              return false;
            }
            return true;
          })
          .map(q => ({
            id: q.id,
            email: (q as any).customerEmail || (q.payload as any)?.contact_info?.email,
            data: {
              quoteNumber: (q.payload as any)?.quoteNumber || q.id,
              customerName: q.customerName || 'Valued Customer',
              totalAmount: (q.amount || 0).toFixed(2),
              currency: q.currency || 'USD',
              validUntil: q.validUntil ? q.validUntil.toLocaleDateString() : 'N/A',
              quoteLink: `${window.location.origin}/commercial/quote/${q.id}`,
            },
          }));

        if (quotesWithEmail.length > 0) {
          const result = await BulkEmailService.sendBulkQuotes(quotesWithEmail, {
            onProgress: (progress) => {
              if (progress.current === progress.total) {
                toast.success(`Sent ${progress.sent}/${progress.total} quote(s) successfully`);
                if (progress.failed > 0) {
                  toast.error(`${progress.failed} quote(s) failed to send`);
                }
              }
            },
          });

          if (result.success) {
            toast.success(`Successfully sent ${result.sent} quote(s) via email`);
          } else {
            toast.warning(`Sent ${result.sent}/${result.total} quote(s). ${result.failed} failed.`);
          }
        }
        setSelectedQuotes(new Set());
      } else if (pendingBulkAction.type === 'send_invoices') {
        // Bulk email sending for invoices
        const invoicesToSend = state.draftInvoices.filter(i => selectedInvoices.has(i.id));
        const invoicesWithEmail = invoicesToSend
          .filter(i => {
            const email = (i as any).customerEmail || (i.payload as any)?.contact_info?.email;
            if (!email) {
              toast.warning(`Invoice ${i.invoiceNumber || i.id} has no customer email`);
              return false;
            }
            return true;
          })
          .map(i => ({
            id: i.id,
            email: (i as any).customerEmail || (i.payload as any)?.contact_info?.email,
            data: {
              invoiceNumber: i.invoiceNumber || i.id,
              customerName: i.customerName || 'Valued Customer',
              totalAmount: (i.amount || 0).toFixed(2),
              currency: i.currency || 'USD',
              dueDate: i.dueDate ? i.dueDate.toLocaleDateString() : 'N/A',
              invoiceLink: `${window.location.origin}/commercial/invoice/${i.id}`,
              paymentLink: `${window.location.origin}/commercial/invoice/${i.id}/pay`,
            },
          }));

        if (invoicesWithEmail.length > 0) {
          const result = await BulkEmailService.sendBulkInvoices(invoicesWithEmail, {
            onProgress: (progress) => {
              if (progress.current === progress.total) {
                toast.success(`Sent ${progress.sent}/${progress.total} invoice(s) successfully`);
                if (progress.failed > 0) {
                  toast.error(`${progress.failed} invoice(s) failed to send`);
                }
              }
            },
          });

          if (result.success) {
            toast.success(`Successfully sent ${result.sent} invoice(s) via email`);
          } else {
            toast.warning(`Sent ${result.sent}/${result.total} invoice(s). ${result.failed} failed.`);
          }
        }
        setSelectedInvoices(new Set());
      } else if (pendingBulkAction.type === 'update_quote_status' && pendingBulkAction.status) {
        // Bulk status update for quotes
        selectedQuotes.forEach(id => {
          const quote = state.draftQuotes.find(q => q.id === id);
          if (quote) {
            dispatch({
              type: 'UPDATE_DRAFT_QUOTE',
              payload: { ...quote, status: pendingBulkAction.status as any },
            });
          }
        });
        toast.success(`Updated ${selectedQuotes.size} quote(s) status to ${pendingBulkAction.status}`);
        setSelectedQuotes(new Set());
      } else if (pendingBulkAction.type === 'update_invoice_status' && pendingBulkAction.status) {
        // Bulk status update for invoices
        selectedInvoices.forEach(id => {
          const invoice = state.draftInvoices.find(i => i.id === id);
          if (invoice) {
            dispatch({
              type: 'UPDATE_DRAFT_INVOICE',
              payload: { ...invoice, status: pendingBulkAction.status as any },
            });
          }
        });
        toast.success(`Updated ${selectedInvoices.size} invoice(s) status to ${pendingBulkAction.status}`);
        setSelectedInvoices(new Set());
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      toast.error('Operation failed');
    } finally {
      setConfirmDialogOpen(false);
      setPendingBulkAction(null);
    }
  }, [pendingBulkAction, selectedQuotes, selectedInvoices, state.draftQuotes, state.draftInvoices, dispatch]);

  // Memoized selection states
  const hasSelectedQuotes = useMemo(() => selectedQuotes.size > 0, [selectedQuotes]);
  const hasSelectedInvoices = useMemo(() => selectedInvoices.size > 0, [selectedInvoices]);
  const allQuotesSelected = useMemo(() => 
    state.draftQuotes.length > 0 && selectedQuotes.size === state.draftQuotes.length,
    [state.draftQuotes.length, selectedQuotes.size]
  );
  const allInvoicesSelected = useMemo(() => 
    state.draftInvoices.length > 0 && selectedInvoices.size === state.draftInvoices.length,
    [state.draftInvoices.length, selectedInvoices.size]
  );

  // Filtered quotes - memoized for performance
  const filteredQuotes = useMemo(() => {
    let quotes = state.draftQuotes;

    // Apply search filter
    if (quoteSearch.trim()) {
      const searchLower = quoteSearch.toLowerCase();
      quotes = quotes.filter(q => 
        (q.customerName || '').toLowerCase().includes(searchLower) ||
        (q.projectTitle || '').toLowerCase().includes(searchLower) ||
        (q.id || '').toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (quoteStatusFilter !== 'all') {
      quotes = quotes.filter(q => (q.status || 'draft') === quoteStatusFilter);
    }

    // Apply currency filter
    if (currencyFilter !== 'all') {
      quotes = quotes.filter(q => (q.currency || 'USD') === currencyFilter);
    }

    // Apply customer filter
    if (customerFilter !== 'all') {
      quotes = quotes.filter(q => (q.customerName || '') === customerFilter);
    }

    // Apply date range filter (created date)
    if (quoteDateFrom) {
      const fromDate = new Date(quoteDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      quotes = quotes.filter(q => {
        if (!q.createdAt) return false;
        const quoteDate = new Date(q.createdAt);
        quoteDate.setHours(0, 0, 0, 0);
        return quoteDate >= fromDate;
      });
    }
    if (quoteDateTo) {
      const toDate = new Date(quoteDateTo);
      toDate.setHours(23, 59, 59, 999);
      quotes = quotes.filter(q => {
        if (!q.createdAt) return false;
        const quoteDate = new Date(q.createdAt);
        return quoteDate <= toDate;
      });
    }

    // Apply amount range filter
    if (amountMin) {
      const minAmount = parseFloat(amountMin);
      if (!isNaN(minAmount)) {
        quotes = quotes.filter(q => (q.amount || 0) >= minAmount);
      }
    }
    if (amountMax) {
      const maxAmount = parseFloat(amountMax);
      if (!isNaN(maxAmount)) {
        quotes = quotes.filter(q => (q.amount || 0) <= maxAmount);
      }
    }

    return quotes;
  }, [state.draftQuotes, quoteSearch, quoteStatusFilter, currencyFilter, customerFilter, quoteDateFrom, quoteDateTo, amountMin, amountMax]);

  // Filtered invoices - memoized for performance
  const filteredInvoices = useMemo(() => {
    let invoices = state.draftInvoices;

    // Apply search filter
    if (invoiceSearch.trim()) {
      const searchLower = invoiceSearch.toLowerCase();
      invoices = invoices.filter(i => 
        (i.customerName || '').toLowerCase().includes(searchLower) ||
        (i.invoiceNumber || '').toLowerCase().includes(searchLower) ||
        (i.id || '').toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (invoiceStatusFilter !== 'all') {
      invoices = invoices.filter(i => (i.status || 'draft') === invoiceStatusFilter);
    }

    // Apply currency filter
    if (currencyFilter !== 'all') {
      invoices = invoices.filter(i => (i.currency || 'EGP') === currencyFilter);
    }

    // Apply customer filter
    if (customerFilter !== 'all') {
      invoices = invoices.filter(i => (i.customerName || '') === customerFilter);
    }

    // Apply date range filter (created date)
    if (invoiceDateFrom) {
      const fromDate = new Date(invoiceDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      invoices = invoices.filter(i => {
        if (!i.createdAt) return false;
        const invoiceDate = new Date(i.createdAt);
        invoiceDate.setHours(0, 0, 0, 0);
        return invoiceDate >= fromDate;
      });
    }
    if (invoiceDateTo) {
      const toDate = new Date(invoiceDateTo);
      toDate.setHours(23, 59, 59, 999);
      invoices = invoices.filter(i => {
        if (!i.createdAt) return false;
        const invoiceDate = new Date(i.createdAt);
        return invoiceDate <= toDate;
      });
    }

    // Apply due date range filter (for invoices)
    if (invoiceDueDateFrom) {
      const fromDate = new Date(invoiceDueDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      invoices = invoices.filter(i => {
        if (!i.dueDate) return false;
        const dueDate = new Date(i.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= fromDate;
      });
    }
    if (invoiceDueDateTo) {
      const toDate = new Date(invoiceDueDateTo);
      toDate.setHours(23, 59, 59, 999);
      invoices = invoices.filter(i => {
        if (!i.dueDate) return false;
        const dueDate = new Date(i.dueDate);
        return dueDate <= toDate;
      });
    }

    // Apply amount range filter
    if (amountMin) {
      const minAmount = parseFloat(amountMin);
      if (!isNaN(minAmount)) {
        invoices = invoices.filter(i => (i.amount || 0) >= minAmount);
      }
    }
    if (amountMax) {
      const maxAmount = parseFloat(amountMax);
      if (!isNaN(maxAmount)) {
        invoices = invoices.filter(i => (i.amount || 0) <= maxAmount);
      }
    }

    return invoices;
  }, [state.draftInvoices, invoiceSearch, invoiceStatusFilter, currencyFilter, customerFilter, invoiceDateFrom, invoiceDateTo, invoiceDueDateFrom, invoiceDueDateTo, amountMin, amountMax]);

  // Get unique currencies from quotes and invoices
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    state.draftQuotes.forEach(q => {
      if (q.currency) currencies.add(q.currency);
    });
    state.draftInvoices.forEach(i => {
      if (i.currency) currencies.add(i.currency);
    });
    return Array.from(currencies).sort();
  }, [state.draftQuotes, state.draftInvoices]);

  // Get unique customer names from quotes and invoices (for filtering)
  const uniqueCustomerNames = useMemo(() => {
    const names = new Set<string>();
    state.draftQuotes.forEach(q => {
      if (q.customerName) names.add(q.customerName);
    });
    state.draftInvoices.forEach(i => {
      if (i.customerName) names.add(i.customerName);
    });
    return Array.from(names).sort();
  }, [state.draftQuotes, state.draftInvoices]);

  // Clear filters handler
  const handleClearFilters = useCallback(() => {
    setQuoteSearch('');
    setInvoiceSearch('');
    setQuoteStatusFilter('all');
    setInvoiceStatusFilter('all');
    setCurrencyFilter('all');
    setCustomerFilter('all');
    setQuoteDateFrom('');
    setQuoteDateTo('');
    setInvoiceDateFrom('');
    setInvoiceDateTo('');
    setInvoiceDueDateFrom('');
    setInvoiceDueDateTo('');
    setAmountMin('');
    setAmountMax('');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return quoteSearch.trim() !== '' || 
           invoiceSearch.trim() !== '' || 
           quoteStatusFilter !== 'all' || 
           invoiceStatusFilter !== 'all' || 
           currencyFilter !== 'all' ||
           customerFilter !== 'all' ||
           quoteDateFrom !== '' ||
           quoteDateTo !== '' ||
           invoiceDateFrom !== '' ||
           invoiceDateTo !== '' ||
           invoiceDueDateFrom !== '' ||
           invoiceDueDateTo !== '' ||
           amountMin !== '' ||
           amountMax !== '';
  }, [quoteSearch, invoiceSearch, quoteStatusFilter, invoiceStatusFilter, currencyFilter, customerFilter, quoteDateFrom, quoteDateTo, invoiceDateFrom, invoiceDateTo, invoiceDueDateFrom, invoiceDueDateTo, amountMin, amountMax]);


  // Load exchange rates for currency conversion
  useEffect(() => {
    const loadExchangeRates = async () => {
      if (displayCurrency === 'EGP' || availableCurrencies.length === 0) {
        return; // No conversion needed if display currency is EGP or no currencies available
      }

      setLoadingRates(true);
      try {
        const rates = new Map<string, ExchangeRate>();
        const currenciesToLoad = availableCurrencies.filter(c => c !== displayCurrency);

        await Promise.all(
          currenciesToLoad.map(async (currency) => {
            try {
              const rate = await getExchangeRate(currency, displayCurrency);
              rates.set(currency, rate);
            } catch (error) {
              console.warn(`Failed to load exchange rate for ${currency}:`, error);
            }
          })
        );

        setExchangeRates(rates);
      } catch (error) {
        console.error('Failed to load exchange rates:', error);
      } finally {
        setLoadingRates(false);
      }
    };

    loadExchangeRates();
  }, [displayCurrency, availableCurrencies]);

  // Convert amount to display currency
  const convertToDisplayCurrency = useCallback((amount: number, fromCurrency: string): number => {
    if (fromCurrency === displayCurrency || !amount) {
      return amount;
    }

    const rate = exchangeRates.get(fromCurrency);
    if (!rate || !rate.rate) {
      return amount; // Return original if rate not available
    }

    return amount * rate.rate;
  }, [displayCurrency, exchangeRates]);

  // Get currency info for display
  const _getCurrencyInfo = useCallback((currency: string) => {
    return CURRENCY_INFO[currency] || {
      code: currency,
      name: currency,
      symbol: currency,
      flag: '',
      region: 'DEFAULT' as any,
    };
  }, []);

  // Handle PDF download for quotes
  const handleDownloadQuotePDF = useCallback(async (quote: DraftQuote) => {
    try {
      setDownloadingPDF({ type: 'quote', id: quote.id });
      const pdfBlob = await CommercialPDFService.generateQuotePDF(quote);
      const filename = `quote_${quote.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      CommercialPDFService.downloadPDF(pdfBlob, filename);
      toast.success('Quote PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to generate quote PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingPDF(null);
    }
  }, []);

  // Handle PDF download for invoices
  const handleDownloadInvoicePDF = useCallback(async (invoice: DraftInvoice) => {
    try {
      setDownloadingPDF({ type: 'invoice', id: invoice.id });
      const pdfBlob = await CommercialPDFService.generateInvoicePDF(invoice);
      const filename = `invoice_${invoice.invoiceNumber || invoice.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      CommercialPDFService.downloadPDF(pdfBlob, filename);
      toast.success('Invoice PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to generate invoice PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingPDF(null);
    }
  }, []);

  // Calculate total commercial value for cost calculator
  const totalCommercialValue = useMemo(() => {
    const quoteTotal = filteredQuotes.reduce((sum, q) => sum + (q.amount || 0), 0);
    const invoiceTotal = filteredInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
    return quoteTotal + invoiceTotal;
  }, [filteredQuotes, filteredInvoices]);

  // Breadcrumbs for UniversalHeader
  const breadcrumbs = useMemo(() => [
    { label: 'Home', href: '/' },
    { label: 'Fabricator', href: '/fabricator' },
    { label: t('commercial.title', 'Commercial Workspace'), href: '#' },
  ], [t]);

  return (
    <FabricatorSectionProvider sectionId="commercial">
      <FabricatorWorkspaceLayout
        sectionId="commercial"
        title={t('commercial.title', 'Commercial Workspace')}
        breadcrumbs={breadcrumbs}
        status="normal"
        showCostCalculator={totalCommercialValue > 0}
        cost={totalCommercialValue}
        currency={displayCurrency}
        showLeftPanel={false}
        mainContent={
    <div className="container mx-auto px-4 py-8 space-y-6">

      {/* Tabs for Workspace and Reports */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'workspace' | 'reports' | 'reconciliation' | 'tax' | 'invoices' | 'templates')} className="w-full">
        <TabsList className="bg-[#0f0f0f]/60 border-amber-600/20 mb-6 grid grid-cols-6">
          <TabsTrigger value="workspace" className="text-amber-300 data-[state=active]:text-amber-200">
            <FileText className="w-4 h-4 mr-2" />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-amber-300 data-[state=active]:text-amber-200">
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="text-amber-300 data-[state=active]:text-amber-200">
            <Calculator className="w-4 h-4 mr-2" />
            Reconciliation
          </TabsTrigger>
          <TabsTrigger value="tax" className="text-amber-300 data-[state=active]:text-amber-200">
            <Receipt className="w-4 h-4 mr-2" />
            Tax Management
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-amber-300 data-[state=active]:text-amber-200">
            <FileText className="w-4 h-4 mr-2" />
            Invoice Management
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-amber-300 data-[state=active]:text-amber-200">
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Workspace Tab */}
        <TabsContent value="workspace" className="space-y-6">
          {/* Search and Filters Bar */}
          <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Inputs */}
                <div className="flex-1 flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-600/50" />
                    <Input
                      type="text"
                      placeholder="Search quotes..."
                      value={quoteSearch}
                      onChange={(e) => setQuoteSearch(e.target.value)}
                      className="pl-9 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 placeholder:text-amber-600/50"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-600/50" />
                    <Input
                      type="text"
                      placeholder="Search invoices..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="pl-9 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 placeholder:text-amber-600/50"
                    />
                  </div>
                </div>

                {/* Filter Toggle */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <Badge className="ml-2 bg-amber-500 text-amber-950 text-[10px] px-1.5 py-0">
                        {[quoteStatusFilter !== 'all' ? 1 : 0, invoiceStatusFilter !== 'all' ? 1 : 0, currencyFilter !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
                      </Badge>
                    )}
                  </Button>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-amber-600/20 space-y-6">
                  {/* Basic Filters Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-amber-600/70 mb-2 block">Quote Status</Label>
                      <Select value={quoteStatusFilter} onValueChange={setQuoteStatusFilter}>
                        <SelectTrigger className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0f0f0f] border-amber-600/30">
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-600/70 mb-2 block">Invoice Status</Label>
                      <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                        <SelectTrigger className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0f0f0f] border-amber-600/30">
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="booked">Booked</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-600/70 mb-2 block">Currency</Label>
                      <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                        <SelectTrigger className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0f0f0f] border-amber-600/30">
                          <SelectItem value="all">All Currencies</SelectItem>
                          {availableCurrencies.map(currency => (
                            <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Customer Filter */}
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div>
                      <Label className="text-xs text-amber-600/70 mb-2 block">Customer</Label>
                      <Select value={customerFilter} onValueChange={setCustomerFilter}>
                        <SelectTrigger className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200">
                          <SelectValue placeholder="All Customers" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0f0f0f] border-amber-600/30">
                          <SelectItem value="all">All Customers</SelectItem>
                          {uniqueCustomerNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Date Range Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-amber-600/70 mb-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Quote Created Date Range
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Input
                            type="date"
                            value={quoteDateFrom}
                            onChange={(e) => setQuoteDateFrom(e.target.value)}
                            className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 text-xs h-8"
                            placeholder="From"
                          />
                        </div>
                        <div>
                          <Input
                            type="date"
                            value={quoteDateTo}
                            onChange={(e) => setQuoteDateTo(e.target.value)}
                            className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 text-xs h-8"
                            placeholder="To"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-600/70 mb-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Invoice Created Date Range
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Input
                            type="date"
                            value={invoiceDateFrom}
                            onChange={(e) => setInvoiceDateFrom(e.target.value)}
                            className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 text-xs h-8"
                            placeholder="From"
                          />
                        </div>
                        <div>
                          <Input
                            type="date"
                            value={invoiceDateTo}
                            onChange={(e) => setInvoiceDateTo(e.target.value)}
                            className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 text-xs h-8"
                            placeholder="To"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Due Date Range */}
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div>
                      <Label className="text-xs text-amber-600/70 mb-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Invoice Due Date Range
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Input
                            type="date"
                            value={invoiceDueDateFrom}
                            onChange={(e) => setInvoiceDueDateFrom(e.target.value)}
                            className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 text-xs h-8"
                            placeholder="From"
                          />
                        </div>
                        <div>
                          <Input
                            type="date"
                            value={invoiceDueDateTo}
                            onChange={(e) => setInvoiceDueDateTo(e.target.value)}
                            className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 text-xs h-8"
                            placeholder="To"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amount Range Filter */}
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div>
                      <Label className="text-xs text-amber-600/70 mb-2 block">Amount Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Input
                            type="number"
                            value={amountMin}
                            onChange={(e) => setAmountMin(e.target.value)}
                            placeholder="Min amount"
                            className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 text-xs h-8"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            value={amountMax}
                            onChange={(e) => setAmountMax(e.target.value)}
                            placeholder="Max amount"
                            className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 text-xs h-8"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {quoteStatusFilter !== 'all' && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/30 text-xs">
                      Quote: {quoteStatusFilter}
                      <button
                        onClick={() => setQuoteStatusFilter('all')}
                        className="ml-2 hover:text-amber-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {invoiceStatusFilter !== 'all' && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/30 text-xs">
                      Invoice: {invoiceStatusFilter}
                      <button
                        onClick={() => setInvoiceStatusFilter('all')}
                        className="ml-2 hover:text-amber-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {currencyFilter !== 'all' && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/30 text-xs">
                      Currency: {currencyFilter}
                      <button
                        onClick={() => setCurrencyFilter('all')}
                        className="ml-2 hover:text-amber-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {customerFilter !== 'all' && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/30 text-xs">
                      Customer: {customerFilter}
                      <button
                        onClick={() => setCustomerFilter('all')}
                        className="ml-2 hover:text-amber-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {(quoteDateFrom || quoteDateTo) && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/30 text-xs">
                      Quote Date: {quoteDateFrom || '...'} - {quoteDateTo || '...'}
                      <button
                        onClick={() => { setQuoteDateFrom(''); setQuoteDateTo(''); }}
                        className="ml-2 hover:text-amber-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {(invoiceDateFrom || invoiceDateTo) && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/30 text-xs">
                      Invoice Date: {invoiceDateFrom || '...'} - {invoiceDateTo || '...'}
                      <button
                        onClick={() => { setInvoiceDateFrom(''); setInvoiceDateTo(''); }}
                        className="ml-2 hover:text-amber-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {(invoiceDueDateFrom || invoiceDueDateTo) && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/30 text-xs">
                      Due Date: {invoiceDueDateFrom || '...'} - {invoiceDueDateTo || '...'}
                      <button
                        onClick={() => { setInvoiceDueDateFrom(''); setInvoiceDueDateTo(''); }}
                        className="ml-2 hover:text-amber-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {(amountMin || amountMax) && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/30 text-xs">
                      Amount: {amountMin || '0'} - {amountMax || '∞'}
                      <button
                        onClick={() => { setAmountMin(''); setAmountMax(''); }}
                        className="ml-2 hover:text-amber-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Draft Quotes */}
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-amber-200">
                <FileText className="h-5 w-5 text-amber-400" />
                {t('commercial.draft_quotes.title', 'Draft Quotes')}
                <Badge
                  variant="outline"
                  className="bg-amber-500/20 text-amber-200 border-amber-500/40"
                >
                  {filteredQuotes.length}
                  {filteredQuotes.length !== state.draftQuotes.length && (
                    <span className="ml-1 text-amber-600/50">/ {state.draftQuotes.length}</span>
                  )}
                </Badge>
              </CardTitle>
              {filteredQuotes.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allQuotesSelected && filteredQuotes.length === state.draftQuotes.length}
                    onCheckedChange={handleSelectAllQuotes}
                    className="border-amber-600/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <span className="text-xs text-amber-600/70">Select All</span>
                </div>
              )}
            </div>
            {hasSelectedQuotes && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-600/20">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/30">
                  {selectedQuotes.size} selected
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkDelete('quotes')}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 text-xs"
                    >
                      Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0f0f0f] border-amber-600/30">
                    <DropdownMenuItem
                      onClick={() => handleBulkUpdateStatus('quotes', 'draft')}
                      className="text-amber-200 hover:bg-amber-500/10"
                    >
                      Set to Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBulkUpdateStatus('quotes', 'sent')}
                      className="text-amber-200 hover:bg-amber-500/10"
                    >
                      Set to Sent
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBulkUpdateStatus('quotes', 'accepted')}
                      className="text-amber-200 hover:bg-amber-500/10"
                    >
                      Set to Accepted
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBulkUpdateStatus('quotes', 'rejected')}
                      className="text-amber-200 hover:bg-amber-500/10"
                    >
                      Set to Rejected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
                    >
                      <FileDown className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0f0f0f] border-amber-600/30">
                    <DropdownMenuItem
                      onClick={() => handleBulkExport('quotes', 'excel')}
                      className="text-amber-200 hover:bg-amber-500/10 cursor-pointer"
                    >
                      Export to Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBulkExport('quotes', 'csv')}
                      className="text-amber-200 hover:bg-amber-500/10 cursor-pointer"
                    >
                      Export to CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkSend('quotes')}
                  className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Send
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredQuotes.length === 0 ? (
              <div className="text-center py-8 text-amber-600/50">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium text-amber-300/70">
                  {state.draftQuotes.length === 0
                    ? t('commercial.draft_quotes.no_quotes', 'No draft quotes')
                    : 'No quotes match your filters'}
                </p>
                <p className="text-sm text-amber-600/50">
                  {state.draftQuotes.length === 0
                    ? t('commercial.draft_quotes.no_quotes_description', 'Create a quote from the active project or customer context to get started.')
                    : 'Try adjusting your search or filter criteria.'}
                </p>
              </div>
            ) : (
              filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedQuotes.has(quote.id)
                      ? 'border-amber-500/50 bg-amber-900/20'
                      : 'border-amber-600/30 bg-[#0f0f0f]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedQuotes.has(quote.id)}
                      onCheckedChange={(checked) => handleQuoteSelect(quote.id, checked as boolean)}
                      className="mt-1 border-amber-600/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-amber-200">
                            {quote.customerName || t('commercial.draft_quotes.unnamed_customer', 'Unnamed Customer')}
                          </p>
                          <p className="text-sm text-amber-600/70">
                            {quote.projectTitle || t('commercial.draft_quotes.untitled_project', 'Untitled Project')}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant="outline"
                            className="bg-blue-500/20 text-blue-200 border-blue-500/40 text-[11px]"
                          >
                            {quote.amount != null 
                              ? formatCurrency(quote.amount, 'en', quote.currency || 'EGP')
                              : t('commercial.draft_quotes.draft', 'Draft')}
                          </Badge>
                          {quote.amount != null && quote.currency !== displayCurrency && (
                            <span className="text-[10px] text-amber-600/60">
                              ≈ {formatCurrency(
                                convertToDisplayCurrency(quote.amount, quote.currency || 'EGP'),
                                'en',
                                displayCurrency,
                                { notation: 'compact' }
                              )}
                            </span>
                          )}
                        </div>
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
                          onClick={() => handleDownloadQuotePDF(quote)}
                          disabled={downloadingPDF?.type === 'quote' && downloadingPDF?.id === quote.id}
                          className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          {downloadingPDF?.type === 'quote' && downloadingPDF?.id === quote.id ? 'Generating...' : 'PDF'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteDraft(quote.id, 'quote')}
                          className="border-red-500/30 text-red-300 hover:bg-red-500/20 text-xs"
                        >
                          {t('commercial.draft_quotes.delete', 'Delete')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Draft Invoices */}
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-amber-200">
                <Calculator className="h-5 w-5 text-amber-400" />
                {t('commercial.draft_invoices.title', 'Draft Invoices')}
                <Badge
                  variant="outline"
                  className="bg-blue-500/20 text-blue-200 border-blue-500/40"
                >
                  {filteredInvoices.length}
                  {filteredInvoices.length !== state.draftInvoices.length && (
                    <span className="ml-1 text-amber-600/50">/ {state.draftInvoices.length}</span>
                  )}
                </Badge>
              </CardTitle>
              {filteredInvoices.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allInvoicesSelected && filteredInvoices.length === state.draftInvoices.length}
                    onCheckedChange={handleSelectAllInvoices}
                    className="border-amber-600/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <span className="text-xs text-amber-600/70">Select All</span>
                </div>
              )}
            </div>
            {hasSelectedInvoices && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-600/20">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/30">
                  {selectedInvoices.size} selected
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkDelete('invoices')}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
                    >
                      <FileDown className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0f0f0f] border-amber-600/30">
                    <DropdownMenuItem
                      onClick={() => handleBulkExport('invoices', 'excel')}
                      className="text-amber-200 hover:bg-amber-500/10 cursor-pointer"
                    >
                      Export to Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBulkExport('invoices', 'csv')}
                      className="text-amber-200 hover:bg-amber-500/10 cursor-pointer"
                    >
                      Export to CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 text-xs"
                    >
                      Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0f0f0f] border-amber-600/30">
                    <DropdownMenuItem
                      onClick={() => handleBulkUpdateStatus('invoices', 'draft')}
                      className="text-amber-200 hover:bg-amber-500/10"
                    >
                      Set to Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBulkUpdateStatus('invoices', 'booked')}
                      className="text-amber-200 hover:bg-amber-500/10"
                    >
                      Set to Booked
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBulkUpdateStatus('invoices', 'cancelled')}
                      className="text-amber-200 hover:bg-amber-500/10"
                    >
                      Set to Cancelled
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkSend('invoices')}
                  className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Send
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8 text-amber-600/50">
                <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium text-amber-300/70">
                  {state.draftInvoices.length === 0
                    ? t('commercial.draft_invoices.no_invoices', 'No draft invoices')
                    : 'No invoices match your filters'}
                </p>
                <p className="text-sm text-amber-600/50">
                  {state.draftInvoices.length === 0
                    ? t('commercial.draft_invoices.no_invoices_description', 'Convert quotes to invoices to prepare billing.')
                    : 'Try adjusting your search or filter criteria.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selectedInvoices.has(invoice.id)
                        ? 'border-amber-500/50 bg-amber-900/20'
                        : 'border-amber-600/30 bg-[#0f0f0f]/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedInvoices.has(invoice.id)}
                        onCheckedChange={(checked) => handleInvoiceSelect(invoice.id, checked as boolean)}
                        className="mt-1 border-amber-600/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium text-amber-200">
                              {invoice.customerName || t('commercial.draft_quotes.unnamed_customer', 'Unnamed Customer')}
                            </p>
                            <p className="text-sm text-amber-600/70">
                              {invoice.invoiceNumber || t('commercial.draft_invoices.draft_invoice', 'Draft invoice')}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="outline"
                              className="bg-amber-500/20 text-amber-200 border-amber-500/40 text-[11px]"
                            >
                              {invoice.amount != null 
                                ? formatCurrency(invoice.amount, 'en', invoice.currency || 'EGP')
                                : t('commercial.draft_quotes.draft', 'Draft')}
                            </Badge>
                            {invoice.amount != null && invoice.currency !== displayCurrency && (
                              <span className="text-[10px] text-amber-600/60">
                                ≈ {formatCurrency(
                                  convertToDisplayCurrency(invoice.amount, invoice.currency || 'EGP'),
                                  'en',
                                  displayCurrency,
                                  { notation: 'compact' }
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewInvoice(invoice)}
                            className="flex-1 border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {t('commercial.draft_invoices.view', 'View Details')}
                          </Button>
                          <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-xs">
                            <Send className="h-3 w-3 mr-1" />
                            {t('commercial.draft_invoices.send', 'Send')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadInvoicePDF(invoice)}
                            disabled={downloadingPDF?.type === 'invoice' && downloadingPDF?.id === invoice.id}
                            className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            {downloadingPDF?.type === 'invoice' && downloadingPDF?.id === invoice.id ? 'Generating...' : t('commercial.draft_invoices.pdf', 'PDF')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteDraft(invoice.id, 'invoice')}
                            className="border-red-500/30 text-red-300 hover:bg-red-500/20 text-xs"
                          >
                            {t('commercial.draft_invoices.delete', 'Delete')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Tabs defaultValue="charts" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="charts">Charts</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="generate">Generate</TabsTrigger>
            </TabsList>
            <TabsContent value="charts" className="mt-6">
              <ReportingDashboard wrapped={true} />
            </TabsContent>
            <TabsContent value="templates" className="mt-6">
              <ReportTemplateEditor />
            </TabsContent>
            <TabsContent value="generate" className="mt-6">
              <ReportGenerator />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation">
          <PaymentReconciliation />
        </TabsContent>

        {/* Tax Management Tab */}
        <TabsContent value="tax" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <TaxSettingsPanel region="EG" />
            </div>
            <div>
              <TaxReportDashboard region="EG" />
            </div>
          </div>
        </TabsContent>

        {/* Invoice Management Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <InvoiceManagementDashboard />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Tabs defaultValue="quotes" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="quotes">Quote Templates</TabsTrigger>
              <TabsTrigger value="invoices">Invoice Templates</TabsTrigger>
            </TabsList>
            <TabsContent value="quotes" className="mt-6">
              <QuoteInvoiceTemplateLibrary
                type="quote"
                onTemplateSelect={(template) => {
                  toast.info(`Selected template: ${template.name}`);
                }}
              />
            </TabsContent>
            <TabsContent value="invoices" className="mt-6">
              <QuoteInvoiceTemplateLibrary
                type="invoice"
                onTemplateSelect={(template) => {
                  toast.info(`Selected template: ${template.name}`);
                }}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Dialog */}
      {selectedInvoice && (
        <InvoiceDetailDialog
          invoice={selectedInvoice}
          isOpen={invoiceDialogOpen}
          onClose={() => {
            setInvoiceDialogOpen(false);
            setSelectedInvoice(null);
          }}
          onUpdate={handleInvoiceUpdate}
        />
      )}

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="bg-[#0f0f0f] border-amber-600/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-200">
              Confirm Bulk Action
            </AlertDialogTitle>
            <AlertDialogDescription className="text-amber-600/70">
              {pendingBulkAction?.type === 'delete_quotes' && (
                `Are you sure you want to delete ${pendingBulkAction.count} quote(s)? This action cannot be undone.`
              )}
              {pendingBulkAction?.type === 'delete_invoices' && (
                `Are you sure you want to delete ${pendingBulkAction.count} invoice(s)? This action cannot be undone.`
              )}
              {pendingBulkAction?.type === 'send_quotes' && (
                `Send ${pendingBulkAction.count} quote(s) via email?`
              )}
              {pendingBulkAction?.type === 'send_invoices' && (
                `Send ${pendingBulkAction.count} invoice(s) via email?`
              )}
              {pendingBulkAction?.type === 'update_quote_status' && (
                `Update ${pendingBulkAction.count} quote(s) status to "${pendingBulkAction.status}"?`
              )}
              {pendingBulkAction?.type === 'update_invoice_status' && (
                `Update ${pendingBulkAction.count} invoice(s) status to "${pendingBulkAction.status}"?`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkAction}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
        }
      />
    </FabricatorSectionProvider>
  );
};

// Memoized export for performance
const CommercialPage = React.memo(CommercialPageComponent);
CommercialPage.displayName = 'CommercialPage';

export default CommercialPage;



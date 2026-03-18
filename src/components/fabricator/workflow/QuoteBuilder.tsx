/**
 * QuoteBuilder - Fabricator workflow quote generation
 *
 * Displays BOM + optimization costs, applies markup, generates quote,
 * and stores in workflowStore. Used in pose-centric Commercial step.
 *
 * @since Phase 1.3: Core Pipeline
 */

import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { validateStepTransition } from '@/lib/fabricator/validation/WorkflowValidator';
import { generateFabricatorQuote } from '@/lib/fabricator/commercial/FabricatorQuoteService';
import { useWorkflowStore } from '@/store/workflowStore';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { formatCurrency } from '@/lib/i18n/formatters';
import { lazyExportQuotationPDF } from '@/lib/exports/lazyExportHandlers';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import {
  ArrowRight,
  Download,
  FileText,
  Loader2,
  Percent,
  Receipt,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

export const QuoteBuilder: React.FC = () => {
  const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
  const navigate = useNavigate();
  const { branding } = useCompanyBranding();
  const {
    measurementData,
    currentProject,
    optimizationResult,
    bom,
    setQuote,
  } = useWorkflowStore();

  const [markupPercent, setMarkupPercent] = useState(35);
  const [taxRate, setTaxRate] = useState(14);
  const [isExporting, setIsExporting] = useState(false);

  const quote = useMemo(() => {
    if (!currentProject) return null;
    return generateFabricatorQuote(
      currentProject,
      optimizationResult,
      bom,
      { markupPercent, taxRate, currency: 'EGP' }
    );
  }, [currentProject, optimizationResult, bom, markupPercent, taxRate]);

  const handleSaveQuote = useCallback(() => {
    if (quote) {
      setQuote(quote);
      toast.success('Quote saved');
    }
  }, [quote, setQuote]);

  const handleExportPDF = useCallback(async () => {
    if (!currentProject || !quote) return;
    setIsExporting(true);
    try {
      // Build full Quote for PDF (QuotingEngine shape when we have optimization)
      let quoteForPDF: Parameters<typeof lazyExportQuotationPDF>[1];
      if (optimizationResult) {
        const { QuotingEngine } = await import('@/modules/commercial/QuotingEngine');
        const engine = new QuotingEngine({
          materialMarkup: markupPercent,
          laborMarkup: markupPercent,
          hardwareMarkup: markupPercent,
          glazingMarkup: markupPercent,
          defaultTaxRate: taxRate,
        });
        quoteForPDF = engine.generateQuote(currentProject, optimizationResult);
      } else {
        quoteForPDF = {
          id: `quote_${Date.now()}`,
          quoteNumber: `QT-${Date.now().toString().slice(-8)}`,
          projectId: currentProject.id,
          createdAt: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'draft' as const,
          lineItems: (quote.lineItems ?? []).map((item, i) => ({
            id: `item_${i}`,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.total,
            category: 'material' as const,
            cost: item.total / (1 + markupPercent / 100),
            margin: markupPercent,
          })),
          subtotal: quote.subtotal,
          taxRate,
          taxAmount: quote.tax,
          discount: 0,
          total: quote.total,
          profitMargin: markupPercent,
          estimatedProductionTime: 0,
        };
      }
      const blob = await lazyExportQuotationPDF(
        currentProject,
        quoteForPDF,
        { branding }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quote-${currentProject.orderNumber || currentProject.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported');
    } catch (err) {
      console.error('[QuoteBuilder] PDF export failed:', err);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  }, [currentProject, quote, optimizationResult, markupPercent, taxRate, branding]);

  const handleContinueToProduction = useCallback(() => {
    const validation = validateStepTransition(
      { measurementData, currentProject, bom, optimizationResult },
      'production'
    );
    if (!validation.valid) {
      toast.error(validation.errors[0]?.message ?? 'Cannot proceed to production');
      return;
    }
    if (quote) setQuote(quote);
    const projId = projectId ?? currentProject?.id;
    const posId = poseId ?? projId;
    if (projId && posId) {
      navigate(fabricatorRoutes.poseProduction(projId, posId));
    }
  }, [measurementData, currentProject, bom, optimizationResult, quote, setQuote, projectId, poseId, navigate]);

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
        <FileText className="h-16 w-16 mb-4 opacity-50" />
        <p>No project data. Complete design and optimization first.</p>
      </div>
    );
  }

  const hasCostData = optimizationResult || bom?.cost;
  if (!hasCostData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
        <Receipt className="h-16 w-16 mb-4 opacity-50" />
        <p>No cost data yet. Complete optimization to generate quote.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-amber-600/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-200">
            <Receipt className="h-5 w-5" />
            Quotation
          </CardTitle>
          <p className="text-slate-400 text-sm">
            {currentProject.orderNumber || currentProject.id} · {currentProject.type}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Markup & Tax */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-400">Markup %</Label>
              <div className="flex items-center gap-2 mt-1">
                <Percent className="h-4 w-4 text-amber-500" />
                <Input
                  type="number"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(Number(e.target.value) || 0)}
                  className="bg-slate-800 border-amber-600/30 text-amber-100"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-400">VAT %</Label>
              <div className="flex items-center gap-2 mt-1">
                <Percent className="h-4 w-4 text-amber-500" />
                <Input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                  className="bg-slate-800 border-amber-600/30 text-amber-100"
                />
              </div>
            </div>
          </div>

          {/* Line items */}
          {quote?.lineItems && quote.lineItems.length > 0 && (
            <div className="border border-amber-600/20 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-900/20 text-amber-300">
                    <th className="text-left p-3">Description</th>
                    <th className="text-right p-3">Qty</th>
                    <th className="text-right p-3">Unit</th>
                    <th className="text-right p-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lineItems.map((item, i) => (
                    <tr key={i} className="border-t border-amber-600/10 text-slate-300">
                      <td className="p-3">{item.description}</td>
                      <td className="text-right p-3">{item.quantity}</td>
                      <td className="text-right p-3">{formatCurrency(item.unitPrice, 'EGP')}</td>
                      <td className="text-right p-3 font-medium">{formatCurrency(item.total, 'EGP')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          {quote && (
            <div className="flex flex-col items-end gap-1 text-right">
              <div className="flex justify-between w-48">
                <span className="text-slate-400">Subtotal</span>
                <span>{formatCurrency(quote.subtotal, quote.currency)}</span>
              </div>
              <div className="flex justify-between w-48">
                <span className="text-slate-400">VAT</span>
                <span>{formatCurrency(quote.tax, quote.currency)}</span>
              </div>
              <div className="flex justify-between w-48 font-bold text-amber-200 text-lg pt-2 border-t border-amber-600/30">
                <span>Total</span>
                <span>{formatCurrency(quote.total, quote.currency)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleSaveQuote}
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
            >
              Save Quote
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export PDF
            </Button>
            <Button
              onClick={handleContinueToProduction}
              className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold"
            >
              Continue to Production
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

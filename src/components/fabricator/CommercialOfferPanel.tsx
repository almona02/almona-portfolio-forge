import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Textarea } from '@/shared/ui/ui/textarea';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import {
  FileText,
  ShoppingCart,
  DollarSign,
  Calendar,
  Shield,
  Scale,
  Loader2,
} from 'lucide-react';
import { WindowUnit, OptimizationResult } from '@/types/fabricator';
import { QuotingEngine, type Quote } from '@/modules/commercial/QuotingEngine';
import { loadQuoteForProject, saveQuoteForProject } from '@/modules/commercial/FabricatorQuoteStore';
import { PDFExportService } from '@/modules/reporting';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { toast } from 'sonner';

interface CommercialOfferPanelProps {
  project: WindowUnit | null;
  optimization: OptimizationResult | null;
}

/**
 * CommercialOfferPanel
 * Rich offer / contract cockpit for the current project:
 * - Generates a Quote from cost data
 * - Lets the user refine payment terms, warranty, and legal text
 * - Exports a prestige PDF offer with logo & company profile
 */
export const CommercialOfferPanel: React.FC<CommercialOfferPanelProps> = ({
  project,
  optimization,
}) => {
  const { branding } = useCompanyBranding();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing quote or generate a base one when project/optimization change
  useEffect(() => {
    if (!project || !optimization) {
      setQuote(null);
      return;
    }

    setLoadingQuote(true);
    try {
      const stored = loadQuoteForProject(project.id);
      if (stored) {
        setQuote(stored);
        setError(null);
      } else {
        const engine = new QuotingEngine();
        const baseQuote = engine.generateQuote(
          project,
          optimization,
          undefined,
          project.customer,
        );
        setQuote(baseQuote);
        saveQuoteForProject(project.id, baseQuote);
        setError(null);
      }
    } catch (e) {
      console.error('Failed to initialize quote:', e);
      setError('Failed to initialize quote from cost data');
    } finally {
      setLoadingQuote(false);
    }
  }, [project, optimization]);

  const handleRegenerateQuote = () => {
    if (!project || !optimization) return;
    const engine = new QuotingEngine();
    try {
      setLoadingQuote(true);
      const newQuote = engine.generateQuote(project, optimization, undefined, project.customer);
      setQuote(newQuote);
      saveQuoteForProject(project.id, newQuote);
      setError(null);
      toast.success('Quote refreshed from latest cost data');
    } catch (e) {
      console.error('Failed to regenerate quote:', e);
      setError('Failed to regenerate quote from cost data');
      toast.error('Failed to regenerate quote');
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleGenerateOfferPdf = async () => {
    if (!project || !quote) return;
    try {
      setExportingPdf(true);
      const pdfService = new PDFExportService(branding);

      const blob = await pdfService.generateQuotationPDF(project, quote, {
        branding,
        includeCuttingList: false,
        includeAccessories: false,
        includeGlazing: false,
        includeAssemblyGuide: false,
        include3DPreview: false,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.orderNumber}_offer_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Prestige offer PDF generated');
      if (project) {
        saveQuoteForProject(project.id, quote);
      }
    } catch (e) {
      console.error('Failed to generate offer PDF:', e);
      toast.error('Failed to generate offer PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  if (!project) {
    return null;
  }

  const payment = quote?.paymentTerms;
  const warranty = quote?.warranty;
  const general = quote?.generalTerms;

  const updateQuote = (updater: (prev: Quote) => Quote) => {
    setQuote((prev) => {
      if (!prev || !project) return prev;
      const next = updater(prev);
      saveQuoteForProject(project.id, next);
      return next;
    });
  };

  return (
    <Card className="bg-gray-900/60 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-orange-400" />
          Commercial Offer
          {branding.companyName && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              {branding.companyName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!optimization && (
          <Alert className="bg-gray-800 border-gray-700">
            <AlertDescription className="text-xs text-gray-300">
              Generate a cutting optimization first to enable cost-based quoting.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="bg-red-900/30 border-red-500/70">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* Header: Client & basic info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">Client</div>
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <ShoppingCart className="h-3 w-3" />
              {project.customer || 'Unspecified'}
            </div>
          </div>
          <Input
            placeholder="Client / Project Name"
            value={quote?.customerName || project.customer || ''}
            onChange={(e) =>
              updateQuote((prev) => ({
                ...prev,
                customerName: e.target.value,
                parties: {
                  ...(prev.parties || { seller: { companyName: branding.companyName } }),
                  buyer: {
                    companyName: e.target.value,
                  },
                },
              }))
            }
            className="h-8 text-xs bg-gray-800 border-gray-700"
          />
        </div>

        {/* Payment & currency */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-green-400" />
              Currency
            </Label>
            <Input
              value={payment?.currency || 'USD'}
              onChange={(e) =>
                updateQuote((prev) => ({
                  ...prev,
                  paymentTerms: {
                    ...(prev.paymentTerms || { currency: 'USD' }),
                    currency: e.target.value.toUpperCase(),
                  },
                }))
              }
              className="h-8 text-xs bg-gray-800 border-gray-700"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1">
              <Calendar className="h-3 w-3 text-blue-400" />
              Validity (days)
            </Label>
            <Input
              type="number"
              value={payment?.validityDays ?? general?.validityDays ?? 30}
              onChange={(e) => {
                const days = Number(e.target.value) || 0;
                updateQuote((prev) => ({
                  ...prev,
                  paymentTerms: {
                    ...(prev.paymentTerms || { currency: payment?.currency || 'USD' }),
                    validityDays: days,
                  },
                  generalTerms: {
                    ...(prev.generalTerms || {}),
                    validityDays: days,
                  },
                }));
              }}
              className="h-8 text-xs bg-gray-800 border-gray-700"
            />
          </div>
        </div>

        {/* Payment milestones */}
        <div className="space-y-1">
          <Label className="text-[11px] flex items-center gap-1">
            <Scale className="h-3 w-3 text-yellow-400" />
            Payment Milestones (%)
          </Label>
          <div className="grid grid-cols-3 gap-1 text-[11px]">
            {['On order', 'Before delivery', 'After installation'].map((label, idx) => {
              const milestone = payment?.milestones?.[idx];
              return (
                <Input
                  key={label}
                  type="number"
                  placeholder={label}
                  value={milestone?.percentage ?? (idx === 0 ? payment?.depositPercentage ?? 30 : '')}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 0;
                    updateQuote((prev) => {
                      const current = prev.paymentTerms || {
                        currency: payment?.currency || 'USD',
                        milestones: [],
                      };
                      const milestones = [...(current.milestones || [])];
                      milestones[idx] = {
                        label,
                        percentage: value,
                      };
                      return {
                        ...prev,
                        paymentTerms: {
                          ...current,
                          depositPercentage: idx === 0 ? value : current.depositPercentage,
                          milestones,
                        },
                      };
                    });
                  }}
                  className="h-8 text-[11px] bg-gray-800 border-gray-700"
                />
              );
            })}
          </div>
        </div>

        {/* Warranty summary */}
        <div className="space-y-1">
          <Label className="text-[11px] flex items-center gap-1">
            <Shield className="h-3 w-3 text-teal-400" />
            Warranty (years)
          </Label>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <Input
              type="number"
              placeholder="Profiles"
              value={warranty?.profilesYears ?? ''}
              onChange={(e) =>
                updateQuote((prev) => ({
                  ...prev,
                  warranty: {
                    ...(prev.warranty || {}),
                    profilesYears: Number(e.target.value) || 0,
                  },
                }))
              }
              className="h-8 text-[11px] bg-gray-800 border-gray-700"
            />
            <Input
              type="number"
              placeholder="Hardware"
              value={warranty?.hardwareYears ?? ''}
              onChange={(e) =>
                updateQuote((prev) => ({
                  ...prev,
                  warranty: {
                    ...(prev.warranty || {}),
                    hardwareYears: Number(e.target.value) || 0,
                  },
                }))
              }
              className="h-8 text-[11px] bg-gray-800 border-gray-700"
            />
            <Input
              type="number"
              placeholder="Glazing"
              value={warranty?.glazingYears ?? ''}
              onChange={(e) =>
                updateQuote((prev) => ({
                  ...prev,
                  warranty: {
                    ...(prev.warranty || {}),
                    glazingYears: Number(e.target.value) || 0,
                  },
                }))
              }
              className="h-8 text-[11px] bg-gray-800 border-gray-700"
            />
            <Input
              type="number"
              placeholder="Workmanship"
              value={warranty?.workmanshipYears ?? ''}
              onChange={(e) =>
                updateQuote((prev) => ({
                  ...prev,
                  warranty: {
                    ...(prev.warranty || {}),
                    workmanshipYears: Number(e.target.value) || 0,
                  },
                }))
              }
              className="h-8 text-[11px] bg-gray-800 border-gray-700"
            />
          </div>
        </div>

        {/* Legal text snippets */}
        <div className="space-y-1">
          <Label className="text-[11px]">Cancellation & Price Adjustment</Label>
          <Textarea
            rows={2}
            value={general?.cancellationPolicy || ''}
            onChange={(e) =>
              updateQuote((prev) => ({
                ...prev,
                generalTerms: {
                  ...(prev.generalTerms || {}),
                  cancellationPolicy: e.target.value,
                },
              }))
            }
            placeholder="e.g., Orders cancelled after fabrication start may incur restocking or fabrication charges..."
            className="text-[11px] bg-gray-800 border-gray-700 resize-none"
          />
          <Textarea
            rows={2}
            value={general?.priceAdjustmentClause || ''}
            onChange={(e) =>
              updateQuote((prev) => ({
                ...prev,
                generalTerms: {
                  ...(prev.generalTerms || {}),
                  priceAdjustmentClause: e.target.value,
                },
              }))
            }
            placeholder="e.g., Prices are based on current aluminium and glass costs and may be adjusted in case of significant market fluctuations..."
            className="text-[11px] bg-gray-800 border-gray-700 resize-none mt-1"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px]">Force Majeure & Jurisdiction</Label>
          <Textarea
            rows={2}
            value={general?.forceMajeureClause || ''}
            onChange={(e) =>
              updateQuote((prev) => ({
                ...prev,
                generalTerms: {
                  ...(prev.generalTerms || {}),
                  forceMajeureClause: e.target.value,
                },
              }))
            }
            placeholder="e.g., Delays caused by events beyond the control of the supplier (force majeure) extend the delivery timeline without penalty..."
            className="text-[11px] bg-gray-800 border-gray-700 resize-none"
          />
          <Input
            placeholder="Jurisdiction / Courts"
            value={general?.jurisdiction || ''}
            onChange={(e) =>
              updateQuote((prev) => ({
                ...prev,
                generalTerms: {
                  ...(prev.generalTerms || {}),
                  jurisdiction: e.target.value,
                },
              }))
            }
            className="h-8 text-[11px] bg-gray-800 border-gray-700 mt-1"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center text-xs"
            onClick={handleRegenerateQuote}
            disabled={!optimization || loadingQuote}
          >
            {loadingQuote ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing from costs...
              </>
            ) : (
              <>
                <Scale className="h-4 w-4 mr-2" />
                Refresh Quote from Cost Data
              </>
            )}
          </Button>
          <Button
            size="sm"
            className="w-full justify-center text-xs bg-orange-500 hover:bg-orange-600"
            onClick={handleGenerateOfferPdf}
            disabled={!quote || exportingPdf}
          >
            {exportingPdf ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Offer PDF...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Prestige Offer PDF
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommercialOfferPanel;



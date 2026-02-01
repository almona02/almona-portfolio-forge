import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/context/AuthContext';
import { trackError } from '@/lib/performance-monitoring';
import { systemPricingService } from '@/lib/pricing';
import { loadQuoteForProject, saveQuoteForProject } from '@/modules/commercial/FabricatorQuoteStore';
import { QuotingEngine, type Quote } from '@/modules/commercial/QuotingEngine';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Textarea } from '@/shared/ui/ui/textarea';
import type { Profile } from '@/types/fabricator';
import { OptimizationResult, WindowUnit } from '@/types/fabricator';
import {
    Calendar,
    DollarSign,
    FileText,
    Loader2,
    Scale,
    Settings,
    Shield,
    ShoppingCart,
} from 'lucide-react';
import React, { memo, useEffect, useRef, useState } from 'react';
// PHASE 4: PDFExportService is now lazy-loaded - see handleExportPDF
import { lazyExportQuotationPDF } from '@/lib/exports/lazyExportHandlers';
import { supabase } from '@/lib/supabase';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { toast } from 'sonner';
import { PricingTuningStudio } from './PricingTuningStudio';
import { LayoutIconGenerator, type LayoutIconHandle } from './assets/LayoutIconGenerator';

interface CommercialOfferPanelProps {
  project: WindowUnit | null;
  optimization: OptimizationResult | null;
  profiles?: Profile[]; // Optional: profiles list for pricing source detection
}

// PHASE 1 PRECISION UPGRADE: Import Money Core

/**
 * CommercialOfferPanel (Gold Tier Edition)
 * Rich offer / contract cockpit for the current project:
 * - Generates a Quote from PRECISE Integer-Math cost data
 * - Lets the user refine payment terms, warranty, and legal text
 * - Exports a prestige PDF offer with logo & company profile
 */
const CommercialOfferPanelComponent: React.FC<CommercialOfferPanelProps> = ({
  project,
  optimization,
  profiles: externalProfiles,
}) => {
  const { branding } = useCompanyBranding();
  const { user } = useAuth();
  const userId = user?.id;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [thumbnailGenerating, setThumbnailGenerating] = useState(false);
  const [layoutThumbnailUrl, setLayoutThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const layoutIconRef = useRef<LayoutIconHandle>(null);
  const [showPricingStudio, setShowPricingStudio] = useState(false);
  const [pricingStudioSystemPackId, setPricingStudioSystemPackId] = useState<string | undefined>(undefined);
  const [pricingStudioProfileId, setPricingStudioProfileId] = useState<string | undefined>(undefined);
  const [pricingSource, setPricingSource] = useState<'system_pricing' | 'constants' | 'checking'>('checking');
  const [profiles, setProfiles] = useState<Profile[]>(externalProfiles || []);

  // Load profiles if not provided
  useEffect(() => {
    if (externalProfiles) {
      setProfiles(externalProfiles);
      return;
    }

    if (!userId) return;

    const loadProfiles = async () => {
      try {
        const db = supabase as any;
        const { data, error } = await db
          .from('fabricator_profiles')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const loadedProfiles = (data || []).map((p: any) => ({
          ...p,
          stockQuantity: p.stock_quantity ? parseFloat(p.stock_quantity) : 0,
          minStockLevel: p.min_stock_level ? parseFloat(p.min_stock_level) : 0,
        })) as Profile[];

        setProfiles(loadedProfiles);
      } catch (error) {
        console.warn('Error loading profiles in CommercialOfferPanel:', error);
      }
    };

    void loadProfiles();
  }, [externalProfiles, userId]);

  // Detect pricing source (system_pricing vs constants)
  useEffect(() => {
    const detectPricingSource = async () => {
      if (!project?.systemPackId || !userId || !profiles.length) {
        setPricingSource('constants');
        return;
      }

      try {
        // Check if any profile in the system pack has system_pricing configured
        const systemPackProfiles = profiles.filter((profile) => {
          const specs = profile.specifications as any;
          const systemName = specs?.window_system || profile.systemBrand || specs?.systemPackId;
          return systemName === project.systemPackId;
        });

        if (systemPackProfiles.length === 0) {
          setPricingSource('constants');
          return;
        }

        // Check first profile for system_pricing
        const firstProfile = systemPackProfiles[0];
        const pricing = await systemPricingService.getSystemPricing(
          firstProfile.id,
          project.systemPackId
        );

        setPricingSource(pricing && pricing.initialized ? 'system_pricing' : 'constants');
      } catch (error) {
        console.warn('Error detecting pricing source:', error);
        setPricingSource('constants');
      }
    };

    void detectPricingSource();
  }, [project?.systemPackId, userId, profiles]);

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
      const err = e instanceof Error ? e : new Error(String(e));
      trackError('CommercialOfferPanel', 'initialize_quote', err.message);
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
      const err = e instanceof Error ? e : new Error(String(e));
      trackError('CommercialOfferPanel', 'regenerate_quote', err.message);
      setError('Failed to regenerate quote from cost data');
      toast.error('Failed to regenerate quote');
    } finally {
      setLoadingQuote(false);
    }
  };

  const captureAndUploadLayoutThumbnail = async (): Promise<string | null> => {
    if (!project) return null;
    try {
      setThumbnailGenerating(true);
      const dataUrl = await layoutIconRef.current?.capture();
      if (!dataUrl) return null;
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const fileName = `${project.id}/layout-${Date.now()}.png`;
      const { error } = await supabase
        .storage
        .from('layout-thumbnails')
        .upload(fileName, blob, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('layout-thumbnails').getPublicUrl(fileName);
      const url = data.publicUrl;
      setLayoutThumbnailUrl(url);
      return url;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      trackError('CommercialOfferPanel', 'capture_thumbnail', err.message);
      return null;
    } finally {
      setThumbnailGenerating(false);
    }
  };

  const handleGenerateOfferPdf = async () => {
    if (!project || !quote) return;
    try {
      setExportingPdf(true);
      const thumbUrl = layoutThumbnailUrl || (await captureAndUploadLayoutThumbnail());
      
      // PHASE 4: Lazy load PDF export library only when user clicks export
      const blob = await lazyExportQuotationPDF(project, quote, {
        branding,
        includeCuttingList: false,
        includeAccessories: false,
        includeGlazing: false,
        includeAssemblyGuide: false,
        include3DPreview: false,
        layoutThumbnailUrl: thumbUrl || undefined,
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
      const err = e instanceof Error ? e : new Error(String(e));
      trackError('CommercialOfferPanel', 'generate_pdf', err.message);
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
    <>
    <Card className="bg-gray-900/60 border-gray-700 card-dark">
      <CardHeader className="pb-3 border-b border-amber-500/10 bg-gradient-to-r from-gray-900 via-gray-900 to-amber-900/5">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
            <FileText className="h-4 w-4 text-amber-400" />
          </div>
          <span className="font-medium tracking-tight bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
            Commercial Offer
          </span>
          <div className="ml-auto flex items-center gap-2">
            {/* Dealer Mode Toggle (Future) */}
            <div className="hidden group-hover:flex items-center gap-1 mx-2">
               <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Dealer Mode</span>
               <Badge variant="outline" className="border-dashed border-gray-600 text-gray-400 text-[9px] px-1 py-0 h-4">OFF</Badge>
            </div>
            
            {pricingSource !== 'checking' && (
              <Badge
                variant="outline"
                className={
                  pricingSource === 'system_pricing'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px]'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400 text-[10px]'
                }
              >
                {pricingSource === 'system_pricing' ? 'Custom Pricing' : 'Default Pricing'}
              </Badge>
            )}
            {project?.systemPackId && userId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const systemPackProfile = profiles.find((p) => {
                    const specs = p.specifications as any;
                    const systemName = specs?.window_system || p.systemBrand || specs?.systemPackId;
                    return systemName === project.systemPackId;
                  });
                  setPricingStudioSystemPackId(project.systemPackId);
                  setPricingStudioProfileId(systemPackProfile?.id);
                  setShowPricingStudio(true);
                }}
                className="h-6 px-2 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                title="Configure Pricing"
              >
                <Settings className="h-3 w-3 mr-1" />
                Pricing
              </Button>
            )}
            {branding.companyName && (
              <Badge variant="outline" className="text-[10px]">
                {branding.companyName}
              </Badge>
            )}
          </div>
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
            <Label className="typography-label text-[11px] flex items-center gap-1">
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
            <Label className="typography-label text-[11px] flex items-center gap-1">
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
          <Label className="typography-label text-[11px] flex items-center gap-1">
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
          <Label className="typography-label text-[11px] flex items-center gap-1">
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
          <Label className="typography-label text-[11px]">Cancellation & Price Adjustment</Label>
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
          <Label className="typography-label text-[11px]">Force Majeure & Jurisdiction</Label>
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

        {/* Hidden layout icon generator for thumbnail capture */}
        <div className="hidden">
          <LayoutIconGenerator
            ref={layoutIconRef}
            windowUnit={project}
            width={1024}
            height={1024}
            widthMm={project.overallWidth || 1200}
            heightMm={project.overallHeight || 1200}
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
            className="btn-primary"
            onClick={handleGenerateOfferPdf}
            disabled={!quote || exportingPdf || thumbnailGenerating}
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

    {/* Pricing Tuning Studio */}
    {userId && showPricingStudio && (
      <PricingTuningStudio
        systemPackId={pricingStudioSystemPackId}
        profileId={pricingStudioProfileId}
        userId={userId}
        profiles={profiles}
        onClose={(saved) => {
          setShowPricingStudio(false);
          setPricingStudioSystemPackId(undefined);
          setPricingStudioProfileId(undefined);
          if (saved) {
            toast.success('Pricing configuration updated');
            // Trigger pricing source re-detection
            setPricingSource('checking');
          }
        }}
        onPricingUpdated={(systemPackId) => {
          // Trigger pricing source re-detection
          setPricingSource('checking');
          console.log('Pricing updated for system pack:', systemPackId);
        }}
      />
    )}
    </>
  );
};

CommercialOfferPanelComponent.displayName = 'CommercialOfferPanel';

// ✅ HARDENING: Memoize component for performance
const CommercialOfferPanelMemo = memo(CommercialOfferPanelComponent);

// ✅ HARDENING: Export with error boundary for production
export const CommercialOfferPanel: React.FC<CommercialOfferPanelProps> = (props) => (
  <ErrorBoundary level="component">
    <CommercialOfferPanelMemo {...props} />
  </ErrorBoundary>
);

CommercialOfferPanel.displayName = 'CommercialOfferPanel';

export default CommercialOfferPanel;



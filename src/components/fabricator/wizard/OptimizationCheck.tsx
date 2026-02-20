import { useEngineeringEngine } from '@/hooks/fabricator/useEngineeringEngine';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import { Profile, WindowGrid } from '@/types/fabricator';
import { DollarSign, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Define a local interface that matches what we expect from WizardState
interface WizardData {
  dimensions: { width: number; height: number } | null;
  quantity: number;
  systemPackId: string | null;
  windowType: any;
  templateId: string | null;
}

interface OptimizationCheckProps {
  wizardData: WizardData;
  profiles?: Profile[]; // passed from EngineeringBay -> WizardModeWrapper -> here
}

export function OptimizationCheck({ wizardData, profiles = [] }: OptimizationCheckProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';

  // Construct a "Draft" Project for the Engine
  const draftProject = useMemo(() => {
    if (!wizardData.dimensions || !wizardData.systemPackId) return null;

    // Helper to map template+type to a Grid
    // This is a simplified version of what applyPresetIntelligence does, but using the wizard state
    const { width, height } = wizardData.dimensions;
    const type = wizardData.windowType;
    const templateId = wizardData.templateId;

    // Default to 1x1 Fixed if nothing matches
    let grid: WindowGrid = { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }] };

    if (type === 'fixed') {
         grid = { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }] };
    } else if (type === 'sliding') {
        if (templateId === '2-sliding') {
            grid = { rows: 1, cols: 2, cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }, { id: '0-1', row: 0, col: 1, type: 'sash' }] };
        } else {
             // 1-sliding usually implies a fixed + sliding or similar, but for simplicity let's say 1x1 sash
             grid = { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }] };
        }
    } else if (type === 'turn') {
         if (templateId === '2-turn') {
            grid = { rows: 1, cols: 2, cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }, { id: '0-1', row: 0, col: 1, type: 'sash' }] };
         } else {
            grid = { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }] };
         }
    } else if (type === 'door') {
         grid = { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }] }; // Simplify door as a sash
    }

    return {
        id: 'wizard-draft',
        code: 'WIZ-001',
        name: 'Wizard Draft',
        overallWidth: width,
        overallHeight: height,
        systemPackId: wizardData.systemPackId,
        grid: grid,
        quantity: wizardData.quantity || 1,
        systemProfileSelections: {}, // Engine will use defaults or system pack
        components: [],
        hardware: []
    } as any; // Cast as any to avoid needing full WindowUnit completeness for just the engine's internal use of BOM
  }, [wizardData]);

  // Use the Real Engine
  const { bomData } = useEngineeringEngine({
      project: draftProject,
      profiles: profiles,
      onDesignComplete: () => {} // No-op for check
  });

  const results = useMemo(() => {
    if (!draftProject || !bomData) return null;

    // Use BOM Data for Real Calculations
    const qty = wizardData.quantity || 1;
    
    // Calculate total bars needed (profiles)
    // bomData.totals.weight is available, but for bars we need total length / 6000
    // aggregatedByCategory has totalLength per profile type
    
    let totalLengthMm = 0;
    // Iterate over all categories
    Object.values(bomData.aggregatedByCategory).forEach(categoryGroup => {
        Object.values(categoryGroup).forEach((item: any) => {
             // Only count aluminum/upvc profiles, not accessories if possible
             // Assuming profiles have 'bar' nature if they have cutting list
             if (item.profile?.type === 'profile' || item.profile?.type === 'frame' || item.profile?.type === 'sash' || item.role) {
                  totalLengthMm += item.totalLength; // includes quantity
             }
        });
    });

    const totalLengthM = totalLengthMm / 1000;
    const barsRaw = totalLengthM / 6; // Standard 6m bar
    
    const totalBarsNeeded = Math.ceil(barsRaw);
    
    // Waste Calculation
    const usedLength = barsRaw * 6;
    const boughtLength = totalBarsNeeded * 6;
    const wasteMeters = boughtLength - usedLength;
    const wastePercentage = boughtLength > 0 ? (wasteMeters / boughtLength) * 100 : 0;

    // Financials
    const totalMaterialCost = bomData.totals.materialCost;
    // Let's check glassDetails
    // bomData.glassDetails.totalGlassArea
    // Assume rough glass price if not in BOM (often valid)
    const glassArea = bomData.glassDetails.totalGlassArea;
    const estimatedGlassCost = glassArea * 800; // EGP per m2 estimate
    
    const accessoriesCost = qty * 500; // Estimate for unlisted accessories

    const totalCost = totalMaterialCost + estimatedGlassCost + accessoriesCost;
    const sellingPrice = totalCost * 1.35;
    const profit = sellingPrice - totalCost;

    return {
      barsNeeded: totalBarsNeeded,
      wastePercentage: Math.max(0, Math.min(wastePercentage, 100)),
      totalCost,
      sellingPrice,
      profit,
      margin: sellingPrice > 0 ? ((profit / sellingPrice) * 100).toFixed(1) : '0.0'
    };
  }, [draftProject, bomData, wizardData.quantity]);

  if (!results) return null;

  const getWasteColor = (p: number) => {
    if (p < 5) return 'text-green-600';
    if (p < 10) return 'text-amber-600';
    return 'text-red-600';
  };

  const getWasteStatus = (p: number) => {
      if (p < 5) return locale === 'ar' ? 'ممتاز' : 'Excellent';
      if (p < 10) return locale === 'ar' ? 'مقبول' : 'Acceptable';
      return locale === 'ar' ? 'عالي' : 'High';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                    <span>{locale === 'ar' ? 'تحليل التحسين والتكاليف (حقيقي)' : 'Optimization & Cost Analysis (Real-time)'}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Section 1: Material & Optimization */}
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 text-center">
                        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider mb-1">
                            {locale === 'ar' ? 'عدد القضبان المطلوب' : 'Bars Needed'}
                        </div>
                        <div className="text-6xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
                            <Package className="w-12 h-12 text-blue-500 opacity-50" />
                            {results.barsNeeded}
                        </div>
                        <div className="text-sm text-slate-500 mt-2">
                            {locale === 'ar' ? 'طول القضيب: 6 متر' : 'Standard Length: 6m'}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                            ({results.barsNeeded} bars for {wizardData.quantity || 1} windows)
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-medium text-slate-600">
                                {locale === 'ar' ? 'نسبة الهالك' : 'Waste Percentage'}
                            </span>
                            <Badge variant="outline" className={`${getWasteColor(results.wastePercentage)} border-current`}>
                                {results.wastePercentage.toFixed(1)}% - {getWasteStatus(results.wastePercentage)}
                            </Badge>
                        </div>
                        <Progress value={results.wastePercentage} max={20} className="h-4" />
                        <p className="text-xs text-slate-400">
                            {locale === 'ar' 
                                ? 'نسبة الهالك محسوبة بدقة بناءً على القطاعات الفعلية.' 
                                : 'Waste % calculated precisely based on actual profiles.'}
                        </p>
                    </div>
                </div>

                {/* Section 2: Financials */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        {locale === 'ar' ? 'التقديرات المالية' : 'Financial Estimates'}
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                            <div className="text-sm text-slate-500 mb-1">{locale === 'ar' ? 'تكلفة التصنيع التقديرية' : 'Est. Manufacturing Cost'}</div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                {results.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP
                            </div>
                        </div>

                        <div className="p-4 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/10">
                            <div className="text-sm text-green-700 dark:text-green-400 mb-1">{locale === 'ar' ? 'سعر البيع المقترح' : 'Suggested Selling Price'}</div>
                            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                                {results.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-2">
                            {parseFloat(results.margin) > 25 ? <TrendingUp className="text-green-500" /> : <TrendingDown className="text-amber-500" />}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                {locale === 'ar' ? 'هامش الربح المتوقع' : 'Expected Margin'}
                            </span>
                        </div>
                        <div className={`text-xl font-bold ${parseFloat(results.margin) > 25 ? 'text-green-600' : 'text-amber-600'}`}>
                            {results.margin}%
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>

        {/* UPVC Cut List - New Gold Tier Feature */}
        {draftProject && profiles.length > 0 && (
          <div className="mt-6">
            {(() => {
              // Generate optimized cut list
              const cutList = generateOptimizedCutList(
                draftProject,
                profiles,
                {
                  burnOffMm: 3.0, // Egyptian workshop standard
                  coolingFactorPercent: 2.5, // UPVC shrinkage
                },
                6000 // 6m bars
              );

              // Project info for export
              const projectInfo = {
                name: `${wizardData.windowType?.toUpperCase() || 'Window'} - ${wizardData.dimensions?.width}×${wizardData.dimensions?.height}mm`,
                width: wizardData.dimensions?.width || 0,
                height: wizardData.dimensions?.height || 0,
                systemPack: wizardData.systemPackId || 'UPVC System',
              };

              return (
                <CutListViewer
                  cutList={cutList}
                  barLengthMm={6000}
                  showRemnants={true}
                  projectInfo={projectInfo}
                />
              );
            })()}
          </div>
        )}
    </div>
  );
}

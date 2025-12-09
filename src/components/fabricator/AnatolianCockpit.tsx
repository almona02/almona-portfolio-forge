import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/ui/collapsible';
import { Factory, Flame, MapPin, Award, TrendingUp, ChevronDown } from 'lucide-react';
import type { Profile, WindowUnit, OptimizationResult } from '@/types/fabricator';
import type { ProjectHeaderMeta } from './NewProjectWizard';
import { useTranslation } from 'react-i18next';

interface AnatolianCockpitProps {
  inventory: Profile[];
  currentProject: WindowUnit | null;
  optimization: OptimizationResult | null;
  completedSteps: number;
  totalSteps: number;
  projectMeta: ProjectHeaderMeta | null;
  performanceInsights?: {
    optimizationSpeed?: string;
    wasteReduction?: string;
    mlAccuracy?: string;
    remnantUtilization?: string;
  };
}

type SupplierRegionKey = 'istanbul' | 'bursa' | 'ankara' | 'gaziantep';

const SUPPLIER_REGIONS: Record<
  SupplierRegionKey,
  {
    name: string;
    role: string;
    highlightBrands: string[];
    description: string;
  }
> = {
  istanbul: {
    name: 'Istanbul',
    role: 'Major extruders & system houses',
    highlightBrands: ['Yılmaz', 'Kale', 'Almin'],
    description:
      'Gateway hub for high-volume extruders, coating lines and hardware importers serving all of Turkey.',
  },
  bursa: {
    name: 'Bursa',
    role: 'Sliding & balcony systems',
    highlightBrands: ['Guillotine', 'SlideMaster'],
    description:
      'High density of sliding, guillotine and balcony enclosure fabricators with strong demand for slim profiles.',
  },
  ankara: {
    name: 'Ankara',
    role: 'Government & institutional projects',
    highlightBrands: ['Thermo 75', 'CurtainWall'],
    description:
      'Specification-heavy public projects with a bias towards thermal-break systems and curtain wall solutions.',
  },
  gaziantep: {
    name: 'Gaziantep',
    role: 'Industrial & logistics hubs',
    highlightBrands: ['Industrial 100', 'Sectional'],
    description:
      'Industrial doors, logistics hubs and warehouses driving demand for robust, high-span systems.',
  },
};

const BRANDS_BY_REGION: Record<ProjectHeaderMeta['region'], string> = {
  egypt: 'Almin',
  turkey: 'Yılmaz',
  mena: 'Kale',
  gulf: 'Kale',
  global: 'Yılmaz',
};

export const AnatolianCockpit: React.FC<AnatolianCockpitProps> = ({
  inventory,
  currentProject,
  optimization,
  completedSteps,
  totalSteps,
  projectMeta,
}) => {
  const { t } = useTranslation(['fabricator', 'translation']);
  const defaultBrand =
    (projectMeta && BRANDS_BY_REGION[projectMeta.region]) || BRANDS_BY_REGION.turkey;

  const [activeBrand, setActiveBrand] = useState<string>(defaultBrand);
  const [activeRegion, setActiveRegion] = useState<SupplierRegionKey>('istanbul');

  const progressRatio = totalSteps > 0 ? completedSteps / totalSteps : 0;

  const brandCandidates = useMemo(
    () => ['Yılmaz', 'Kale', 'Almin'],
    [],
  );

  const topProfilesForBrand = useMemo(() => {
    if (!inventory.length) return [];

    const brandLower = activeBrand.toLowerCase();
    const filtered = inventory.filter((p) =>
      (p.systemBrand || '').toLowerCase().includes(brandLower),
    );

    const working = filtered.length ? filtered : inventory;

    const scored = working
      .map((p) => {
        const stock = typeof p.stockQuantity === 'number' ? p.stockQuantity : 0;
        const max = typeof p.maxStockLevel === 'number' ? p.maxStockLevel : stock || 1;
        const utilizationHint = max > 0 ? 1 - stock / max : 0.5;

        return {
          id: p.id,
          name: p.name,
          systemBrand: p.systemBrand || 'Unlabelled System',
          utilizationHint,
        };
      })
      .sort((a, b) => b.utilizationHint - a.utilizationHint)
      .slice(0, 3);

    return scored;
  }, [inventory, activeBrand]);

  const anatolianEfficiencyUnlocked =
    !!optimization && optimization.nestingEfficiency >= 90 && optimization.wastePercentage <= 10;

  const bursaPrecisionUnlocked =
    !!optimization &&
    optimization.wastePercentage <= 3 &&
    !!currentProject &&
    currentProject.status === 'production';

  const anatolianEfficiencyProgress = optimization
    ? Math.min(100, (optimization.nestingEfficiency / 90) * 100)
    : progressRatio * 100;

  const bursaPrecisionProgress = optimization
    ? Math.min(100, Math.max(0, ((10 - optimization.wastePercentage) / 10) * 100))
    : 0;

  const activeRegionMeta = SUPPLIER_REGIONS[activeRegion];
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-8">
      <CollapsibleTrigger asChild>
        <div className="cursor-pointer hover:bg-slate-900/50 transition-colors rounded-lg p-3 border border-slate-700/50 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-100">
                {t('fabricator:navbar.local_system_intelligence', 'Local System Intelligence')}
              </span>
            </div>
            <ChevronDown 
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
          <p className="text-xs text-slate-300/80 mt-1">
            {t(
              'fabricator:navbar.local_system_intelligence_desc',
              'Dynamic preference suggestions for Turkish & Egyptian system houses – tuned to your active region.',
            )}
          </p>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Market intelligence & system preference */}
      <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-slate-700/80 shadow-lg shadow-orange-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-orange-100">
            <Factory className="h-4 w-4 text-orange-400" />
            {t('fabricator:navbar.local_system_intelligence', 'Local System Intelligence')}
          </CardTitle>
          <CardDescription className="text-xs text-slate-300/80">
            {t(
              'fabricator:navbar.local_system_intelligence_desc',
              'Dynamic preference suggestions for Turkish & Egyptian system houses – tuned to your active region.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex flex-wrap gap-2">
            {brandCandidates.map((brand) => {
              const isActive = brand === activeBrand;
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setActiveBrand(brand)}
                  className={`px-3 py-1.5 rounded-full border text-[11px] transition-all ${
                    isActive
                      ? 'border-orange-400 bg-orange-500/15 text-orange-100 shadow-sm shadow-orange-500/40'
                      : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-orange-400/60 hover:text-orange-100'
                  }`}
                >
                  {brand}
                  {projectMeta && BRANDS_BY_REGION[projectMeta.region] === brand && (
                    <span className="ml-1 text-[9px] uppercase tracking-wide text-orange-300">
                      · suggested
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Most Fabricated in Istanbul (sample from current inventory)
            </p>
            {!topProfilesForBrand.length ? (
              <p className="text-[11px] text-slate-400">
                Add profiles in the Inventory tab to unlock live market-style suggestions.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {topProfilesForBrand.map((p, index) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md bg-slate-900/70 border border-slate-800 px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="h-5 w-5 justify-center rounded-full border-orange-500/60 bg-orange-500/15 text-[10px] font-semibold text-orange-100"
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="text-xs font-medium text-slate-100 truncate max-w-[12rem]">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-slate-400">{p.systemBrand}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-300">
                      <TrendingUp className="h-3 w-3" />
                      <span>{Math.round(p.utilizationHint * 100)}% demand signal</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Badges – Forged in Quality */}
      <Card className="bg-slate-950/95 border-slate-700/80 shadow-inner shadow-black/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Award className="h-4 w-4 text-amber-400" />
              Forged in Quality
            </CardTitle>
            {currentProject && (
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-200"
              >
                {currentProject.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="space-y-1.5 rounded-lg border border-slate-700/80 bg-gradient-to-r from-emerald-900/40 to-slate-900/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-emerald-300" />
                <div>
                  <p className="text-xs font-semibold text-emerald-100">Anatolian Efficiency</p>
                  <p className="text-[10px] text-emerald-200/80">
                    Awarded for \u226590% nesting efficiency and \u226410% waste.
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  anatolianEfficiencyUnlocked
                    ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100'
                    : 'border-slate-600 bg-slate-900 text-slate-300'
                }`}
              >
                {anatolianEfficiencyUnlocked ? 'Unlocked' : 'In Progress'}
              </Badge>
            </div>
            <Progress
              value={anatolianEfficiencyProgress}
              className="h-1.5 bg-slate-800"
            />
            <p className="text-[10px] text-slate-400">
              {optimization
                ? `Current: ${optimization.nestingEfficiency.toFixed(
                    1,
                  )}% efficiency · Waste ${optimization.wastePercentage.toFixed(1)}%`
                : 'Run cutting optimization to begin earning this badge.'}
            </p>
          </div>

          <div className="space-y-1.5 rounded-lg border border-slate-700/80 bg-gradient-to-r from-sky-900/40 to-slate-900/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-sky-300" />
                <div>
                  <p className="text-xs font-semibold text-sky-100">Bursa Precision</p>
                  <p className="text-[10px] text-sky-200/80">
                    Complete a job with production-ready status and ultra-low waste.
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  bursaPrecisionUnlocked
                    ? 'border-sky-400/70 bg-sky-500/15 text-sky-100'
                    : 'border-slate-600 bg-slate-900 text-slate-300'
                }`}
              >
                {bursaPrecisionUnlocked ? 'Unlocked' : 'Locked'}
              </Badge>
            </div>
            <Progress
              value={Math.max(0, Math.min(100, bursaPrecisionProgress))}
              className="h-1.5 bg-slate-800"
            />
            <p className="text-[10px] text-slate-400">
              {optimization
                ? `Closer as waste drops towards 0% and job moves into production.`
                : 'Finish design & optimization, then start production to qualify.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Regional supplier network */}
      <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-slate-700/80 shadow-lg shadow-sky-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <MapPin className="h-4 w-4 text-sky-400" />
            Regional Supplier Network
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-300/80">
            A clickable mini-map of key Turkish fabrication hubs – tuned for sliding, casement and
            industrial work.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SUPPLIER_REGIONS) as SupplierRegionKey[]).map((key) => {
              const region = SUPPLIER_REGIONS[key];
              const isActive = key === activeRegion;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveRegion(key)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] border transition-all ${
                    isActive
                      ? 'border-sky-400 bg-sky-500/10 text-sky-100 shadow-sm shadow-sky-500/40'
                      : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-sky-400/60 hover:text-sky-100'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  {region.name}
                </button>
              );
            })}
          </div>

          <div className="rounded-lg border border-slate-700/80 bg-slate-950/80 p-3">
            <p className="text-[11px] text-slate-400 uppercase tracking-[0.18em] mb-1">
              {activeRegionMeta.name} · {activeRegionMeta.role}
            </p>
            <p className="text-xs text-slate-200 mb-2">{activeRegionMeta.description}</p>
            <p className="text-[11px] text-slate-400 mb-1">Typical systems & suppliers:</p>
            <div className="flex flex-wrap gap-1.5">
              {activeRegionMeta.highlightBrands.map((b) => (
                <span
                  key={b}
                  className="rounded-full bg-slate-900/80 px-2 py-1 text-[10px] text-slate-200 border border-slate-700/70"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AnatolianCockpit;



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
        <div className="cursor-pointer hover:bg-background/50 transition-colors rounded-lg p-3 border border-border/50 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-warning" />
              <span className="text-sm font-semibold text-warning">
                {t('fabricator:navbar.local_system_intelligence', 'Local System Intelligence')}
              </span>
            </div>
            <ChevronDown 
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
          <p className="text-xs text-foreground/80 mt-1">
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
      <Card className="bg-gradient-to-br from-background via-background to-background border-border/80 shadow-lg shadow-amber-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-warning">
            <Factory className="h-4 w-4 text-warning" />
            {t('fabricator:navbar.local_system_intelligence', 'Local System Intelligence')}
          </CardTitle>
          <CardDescription className="text-xs text-foreground/80">
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
                      ? 'border-amber-400 bg-amber-500/15 text-warning shadow-sm shadow-amber-500/40'
                      : 'border-border bg-background/60 text-foreground hover:border-amber-400/60 hover:text-warning'
                  }`}
                >
                  {brand}
                  {projectMeta && BRANDS_BY_REGION[projectMeta.region] === brand && (
                    <span className="ml-1 text-[9px] uppercase tracking-wide text-warning">
                      · suggested
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Most Fabricated in Istanbul (sample from current inventory)
            </p>
            {!topProfilesForBrand.length ? (
              <p className="text-[11px] text-muted-foreground">
                Add profiles in the Inventory tab to unlock live market-style suggestions.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {topProfilesForBrand.map((p, index) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md bg-background/70 border border-border px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="btn-primary"
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="text-xs font-medium text-foreground truncate max-w-[12rem]">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{p.systemBrand}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-success">
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
      <Card className="bg-background/95 border-border/80 shadow-inner shadow-black/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Award className="h-4 w-4 text-warning" />
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
          <div className="space-y-1.5 rounded-lg border border-border/80 bg-gradient-to-r from-emerald-900/40 to-background/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-success" />
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
                    : 'border-border bg-background text-foreground'
                }`}
              >
                {anatolianEfficiencyUnlocked ? 'Unlocked' : 'In Progress'}
              </Badge>
            </div>
            <Progress
              value={anatolianEfficiencyProgress}
              className="h-1.5 bg-card"
            />
            <p className="text-[10px] text-muted-foreground">
              {optimization
                ? `Current: ${optimization.nestingEfficiency.toFixed(
                    1,
                  )}% efficiency · Waste ${optimization.wastePercentage.toFixed(1)}%`
                : 'Run cutting optimization to begin earning this badge.'}
            </p>
          </div>

          <div className="space-y-1.5 rounded-lg border border-border/80 bg-gradient-to-r from-sky-900/40 to-background/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-info" />
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
                    : 'border-border bg-background text-foreground'
                }`}
              >
                {bursaPrecisionUnlocked ? 'Unlocked' : 'Locked'}
              </Badge>
            </div>
            <Progress
              value={Math.max(0, Math.min(100, bursaPrecisionProgress))}
              className="h-1.5 bg-card"
            />
            <p className="text-[10px] text-muted-foreground">
              {optimization
                ? `Closer as waste drops towards 0% and job moves into production.`
                : 'Finish design & optimization, then start production to qualify.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Regional supplier network */}
      <Card className="bg-gradient-to-br from-background via-background to-background border-border/80 shadow-lg shadow-sky-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-info" />
            Regional Supplier Network
          </CardTitle>
          <CardDescription className="text-[11px] text-foreground/80">
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
                      : 'border-border bg-background/70 text-foreground hover:border-sky-400/60 hover:text-sky-100'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  {region.name}
                </button>
              );
            })}
          </div>

          <div className="rounded-lg border border-border/80 bg-background/80 p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.18em] mb-1">
              {activeRegionMeta.name} · {activeRegionMeta.role}
            </p>
            <p className="text-xs text-foreground mb-2">{activeRegionMeta.description}</p>
            <p className="text-[11px] text-muted-foreground mb-1">Typical systems & suppliers:</p>
            <div className="flex flex-wrap gap-1.5">
              {activeRegionMeta.highlightBrands.map((b) => (
                <span
                  key={b}
                  className="rounded-full bg-background/80 px-2 py-1 text-[10px] text-foreground border border-border/70"
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



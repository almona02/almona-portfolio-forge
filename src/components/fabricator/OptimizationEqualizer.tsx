/**
 * Optimization Equalizer Component
 * Pre-optimization adjustment panel for fine-tuning optimization strategy
 * Gives users control over the "how" of production optimization
 */

import ErrorBoundary from '@/components/ErrorBoundary';
import { OptimizationPresets, type OptimizationStrategy } from '@/lib/optimization/OptimizationPresets';
import { trackError } from '@/lib/performance-monitoring';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Slider } from '@/shared/ui/ui/slider';
import type { Profile } from '@/types/fabricator';
import { ArrowRight, Clock, Info, Package, Save, Settings, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_OPTIMIZATION_PARAMS,
  INPUT_CONSTRAINTS,
  QUERY_LIMITS,
  SLIDER_CONFIG,
  UI_DIMENSIONS,
} from './optimizationEqualizerConstants';

export interface OptimizationEqualizerCompletePayload {
  strategy: OptimizationStrategy;
  minRemnantLength: number;
  maxRemnantAge: number;
}

interface OptimizationEqualizerProps {
  userId: string;
  profiles?: Profile[];
  onStrategyChange?: (strategy: OptimizationStrategy) => void;
  initialStrategy?: OptimizationStrategy;
  onComplete?: (result: OptimizationEqualizerCompletePayload) => void; // Runs the solver
  /**
   * Tier-3 manufacturing path (AICS-001): the deterministic solver does not consume
   * the weight sliders or remnant constraints, so they are shown disabled with a
   * label and the slider-derived "estimated impact" is not presented as a result.
   */
  tier3ManufacturingPath?: boolean;
  /** Label for the run button when the parent decides production vs simulation. */
  runLabel?: string;
  runDisabled?: boolean;
}

interface ProfileOverride {
  profileId: string;
  kFactorOverride?: number;
  minRemnantLength?: number;
  algorithm?: 'greedy' | 'genetic' | 'hybrid';
}

interface OptimizationPreferenceRow {
  id: string;
  user_id: string;
  strategy_name: string;
  waste_reduction_weight: number;
  remnant_usage_weight: number;
  cut_complexity_weight: number;
  production_speed_weight: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const OptimizationEqualizerComponent: React.FC<OptimizationEqualizerProps> = ({
  userId,
  profiles: _profiles = [],
  onStrategyChange,
  initialStrategy,
  onComplete,
  tier3ManufacturingPath = false,
  runLabel,
  runDisabled = false,
}) => {
  const { t } = useTranslation('fabricator');
  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [strategy, setStrategy] = useState<OptimizationStrategy>(
    initialStrategy || OptimizationPresets.getPreset('balanced')
  );
  const [_profileOverrides, _setProfileOverrides] = useState<Map<string, ProfileOverride>>(new Map());
  const [minRemnantLength, setMinRemnantLength] = useState<number>(DEFAULT_OPTIMIZATION_PARAMS.DEFAULT_MIN_REMNANT_LENGTH_MM);
  const [maxRemnantAge, setMaxRemnantAge] = useState<number>(DEFAULT_OPTIMIZATION_PARAMS.DEFAULT_MAX_REMNANT_AGE_DAYS);
  const [_customStockLengths, _setCustomStockLengths] = useState<Map<string, number>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [_savedStrategies, _setSavedStrategies] = useState<OptimizationStrategy[]>([]);

  const loadSavedPreferences = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('optimization_equalizer_preferences')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(QUERY_LIMITS.MAX_SAVED_PREFERENCES)
        .returns<OptimizationPreferenceRow[]>();

      if (error) throw error;

      if (data && data.length > 0) {
        const defaultPref = data.find((p) => p.is_default) || data[0];
        if (defaultPref) {
          setStrategy({
            name: defaultPref.strategy_name,
            description: '',
            wasteReductionWeight: defaultPref.waste_reduction_weight,
            remnantUsageWeight: defaultPref.remnant_usage_weight,
            cutComplexityWeight: defaultPref.cut_complexity_weight,
            productionSpeedWeight: defaultPref.production_speed_weight,
          });
          setSelectedPreset(defaultPref.strategy_name);
        }
        _setSavedStrategies(
          data.map((p) => ({
            name: p.strategy_name,
            description: '',
            wasteReductionWeight: p.waste_reduction_weight,
            remnantUsageWeight: p.remnant_usage_weight,
            cutComplexityWeight: p.cut_complexity_weight,
            productionSpeedWeight: p.production_speed_weight,
          }))
        );
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('OptimizationEqualizer', 'load_preferences', err.message);
    }
  }, [userId]);

  // Load saved preferences on mount
  useEffect(() => {
    void loadSavedPreferences();
  }, [loadSavedPreferences]);

  // ✅ HARDENING: Memoize handlers to prevent unnecessary re-renders
  const handlePresetChange = useCallback((presetName: string) => {
    setSelectedPreset(presetName);
    const preset = OptimizationPresets.getPreset(presetName);
    setStrategy(preset);
    onStrategyChange?.(preset);
  }, [onStrategyChange]);

  // ✅ HARDENING: Memoize weight change handler
  const handleWeightChange = useCallback((field: keyof OptimizationStrategy, value: number[]) => {
    setStrategy(prevStrategy => {
      const newStrategy = {
        ...prevStrategy,
        [field]: value[0],
      };
      // Notify parent with the new strategy immediately
      onStrategyChange?.(newStrategy);
      return newStrategy;
    });
    // Switch to custom preset when manually adjusted
    setSelectedPreset('custom');
  }, [onStrategyChange]);

  // Calculate estimated impact
  const estimatedImpact = useMemo(() => {
    return OptimizationPresets.estimateImpact(strategy);
  }, [strategy]);

  // ✅ HARDENING: Memoize save strategy handler
  const handleSaveStrategy = useCallback(async () => {
    setIsSaving(true);
    try {
      // ✅ HARDENING: Type assertion needed for Supabase strict typing
      const { error } = await supabase
        .from('optimization_equalizer_preferences')
        .insert({
          user_id: userId,
          strategy_name: strategy.name || 'custom',
          waste_reduction_weight: strategy.wasteReductionWeight,
          remnant_usage_weight: strategy.remnantUsageWeight,
          cut_complexity_weight: strategy.cutComplexityWeight,
          production_speed_weight: strategy.productionSpeedWeight,
          is_default: false,
        } as never);

      if (error) throw error;

      await loadSavedPreferences();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('OptimizationEqualizer', 'save_strategy', err.message);
    } finally {
      setIsSaving(false);
    }
  }, [userId, strategy, loadSavedPreferences]);

  // ✅ HARDENING: Memoize set as default handler
  const handleSetAsDefault = useCallback(async () => {
    setIsSaving(true);
    try {
      // ✅ HARDENING: Remove default flag from all existing preferences
      await supabase
        .from('optimization_equalizer_preferences')
        .update({ is_default: false } as never)
        .eq('user_id', userId);

      // ✅ HARDENING: Set this as default with proper typing
      const { error } = await supabase
        .from('optimization_equalizer_preferences')
        .insert({
          user_id: userId,
          strategy_name: strategy.name || 'custom',
          waste_reduction_weight: strategy.wasteReductionWeight,
          remnant_usage_weight: strategy.remnantUsageWeight,
          cut_complexity_weight: strategy.cutComplexityWeight,
          production_speed_weight: strategy.productionSpeedWeight,
          is_default: true,
        } as never);

      if (error) throw error;

      await loadSavedPreferences();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('OptimizationEqualizer', 'set_default', err.message);
    } finally {
      setIsSaving(false);
    }
  }, [userId, strategy, loadSavedPreferences]);

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className={`${UI_DIMENSIONS.ICON_LARGE} text-warning`} /> {t('optimization_equalizer.title', 'Optimization Strategy Equalizer')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('optimization_equalizer.description', 'Fine-tune optimization parameters to match your production needs')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strategy Preset Selector */}
        <div>
          <Label htmlFor="strategy-preset" className="typography-label text-foreground mb-2 block">
            {t('optimization_equalizer.optimization_strategy', 'Optimization Strategy')}
          </Label>
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger id="strategy-preset" className="bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {OptimizationPresets.getPresetNames().map((name) => {
                const preset = OptimizationPresets.getPreset(name);
                return (
                  <SelectItem key={name} value={name}>
                    <div>
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs text-muted-foreground">{preset.description}</div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {tier3ManufacturingPath && (
          <Alert className="bg-background border-amber-700/40" data-testid="advisory-controls-note">
            <Info className="h-4 w-4 text-warning" />
            <AlertDescription className="text-xs text-warning">
              {t('optimization_equalizer.advisory_note', 'Strategy weights and remnant constraints are advisory and are not applied by the deterministic Tier-3 cut solver. Supported inputs (run mode, algorithm, approved stock length) are in the Solver inputs panel; actual bars and waste are shown in the cockpit after the run.')}
            </AlertDescription>
          </Alert>
        )}

        {/* Weight Sliders */}
        <div className="space-y-4" aria-disabled={tier3ManufacturingPath}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="typography-label text-foreground flex items-center gap-2">
                <TrendingUp className={`${UI_DIMENSIONS.ICON_MEDIUM} text-success`} />
                {t('optimization_equalizer.waste_reduction', 'Waste Reduction')}
              </Label>
              <Badge variant="outline" className="text-success border-green-500/30">
                {strategy.wasteReductionWeight}%
              </Badge>
            </div>
            <Slider
              value={[strategy.wasteReductionWeight]}
              onValueChange={(value) => handleWeightChange('wasteReductionWeight', value)}
              disabled={tier3ManufacturingPath}
              min={SLIDER_CONFIG.MIN_VALUE}
              max={SLIDER_CONFIG.MAX_VALUE}
              step={SLIDER_CONFIG.STEP}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('optimization_equalizer.waste_reduction_desc', 'Prioritize minimizing material waste. Higher values reduce waste but may increase cut complexity.')}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="typography-label text-foreground flex items-center gap-2">
                <Package className={`${UI_DIMENSIONS.ICON_MEDIUM} text-info`} />
                {t('optimization_equalizer.remnant_usage', 'Remnant Usage')}
              </Label>
              <Badge variant="outline" className="text-info border-blue-500/30">
                {strategy.remnantUsageWeight}%
              </Badge>
            </div>
            <Slider
              value={[strategy.remnantUsageWeight]}
              onValueChange={(value) => handleWeightChange('remnantUsageWeight', value)}
              disabled={tier3ManufacturingPath}
              min={SLIDER_CONFIG.MIN_VALUE}
              max={SLIDER_CONFIG.MAX_VALUE}
              step={SLIDER_CONFIG.STEP}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('optimization_equalizer.remnant_usage_desc', 'Prioritize using existing remnants from previous jobs. Higher values increase remnant reuse.')}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="typography-label text-foreground flex items-center gap-2">
                <Settings className={`${UI_DIMENSIONS.ICON_MEDIUM} text-warning`} />
                {t('optimization_equalizer.cut_complexity', 'Cut Complexity')}
              </Label>
              <Badge variant="outline" className="text-warning border-amber-500/30">
                {strategy.cutComplexityWeight}%
              </Badge>
            </div>
            <Slider
              value={[strategy.cutComplexityWeight]}
              onValueChange={(value) => handleWeightChange('cutComplexityWeight', value)}
              disabled={tier3ManufacturingPath}
              min={SLIDER_CONFIG.MIN_VALUE}
              max={SLIDER_CONFIG.MAX_VALUE}
              step={SLIDER_CONFIG.STEP}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('optimization_equalizer.cut_complexity_desc', 'Balance between simple cuts (faster) and complex optimization (more efficient).')}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="typography-label text-foreground flex items-center gap-2">
                <Clock className={`${UI_DIMENSIONS.ICON_MEDIUM} text-warning`} />
                {t('optimization_equalizer.production_speed', 'Production Speed')}
              </Label>
              <Badge variant="outline" className="text-warning border-amber-500/30">
                {strategy.productionSpeedWeight}%
              </Badge>
            </div>
            <Slider
              value={[strategy.productionSpeedWeight]}
              onValueChange={(value) => handleWeightChange('productionSpeedWeight', value)}
              disabled={tier3ManufacturingPath}
              min={SLIDER_CONFIG.MIN_VALUE}
              max={SLIDER_CONFIG.MAX_VALUE}
              step={SLIDER_CONFIG.STEP}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('optimization_equalizer.production_speed_desc', 'Prioritize faster optimization and fewer cuts. Higher values reduce optimization time.')}
            </p>
          </div>
        </div>

        {/* Real-Time Impact Preview — slider model only, never the cut-plan result */}
        {!tier3ManufacturingPath && <Alert className="bg-background border-border">
          <Info className="h-4 w-4 text-info" />
          <AlertDescription>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-xs text-muted-foreground">{t('optimization_equalizer.estimated_waste', 'Estimated Waste')}</p>
                <p className="text-lg font-semibold text-warning">
                  {estimatedImpact.estimatedWastePercentage.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('optimization_equalizer.est_bars_used', 'Est. Bars Used')}</p>
                <p className="text-lg font-semibold text-info">
                  ~{estimatedImpact.estimatedBarsUsed}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('optimization_equalizer.est_opt_time', 'Est. Opt. Time')}</p>
                <p className="text-lg font-semibold text-success">
                  ~{estimatedImpact.estimatedOptimizationTime.toFixed(1)}s
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>}

        {/* Material Constraints */}
        <div className="p-4 bg-background rounded-lg border border-border">
          <h4 className="typography-h4 text-sm text-foreground mb-3">{t('optimization_equalizer.material_constraints', 'Material Constraints')}</h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="min-remnant" className="typography-label text-foreground text-sm">
                {t('optimization_equalizer.min_remnant_length', 'Minimum Remnant Length (mm)')}
              </Label>
              <input
                id="min-remnant"
                type="number"
                disabled={tier3ManufacturingPath}
                value={minRemnantLength}
                onChange={(e) => setMinRemnantLength(parseInt(e.target.value) || DEFAULT_OPTIMIZATION_PARAMS.DEFAULT_MIN_REMNANT_LENGTH_MM)}
                className="mt-1 w-full px-3 py-2 bg-card border border-border rounded text-foreground text-sm"
                min={INPUT_CONSTRAINTS.MIN_REMNANT_LENGTH_MM}
                max={INPUT_CONSTRAINTS.MAX_REMNANT_LENGTH_MM}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('optimization_equalizer.min_remnant_desc', 'Remnants shorter than this will not be considered for reuse')}
              </p>
            </div>
            <div>
              <Label htmlFor="max-remnant-age" className="typography-label text-foreground text-sm">
                {t('optimization_equalizer.max_remnant_age', 'Maximum Remnant Age (days)')}
              </Label>
              <input
                id="max-remnant-age"
                type="number"
                disabled={tier3ManufacturingPath}
                value={maxRemnantAge}
                onChange={(e) => setMaxRemnantAge(parseInt(e.target.value) || DEFAULT_OPTIMIZATION_PARAMS.DEFAULT_MAX_REMNANT_AGE_DAYS)}
                className="mt-1 w-full px-3 py-2 bg-card border border-border rounded text-foreground text-sm"
                min={INPUT_CONSTRAINTS.MIN_REMNANT_AGE_DAYS}
                max={INPUT_CONSTRAINTS.MAX_REMNANT_AGE_DAYS}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('optimization_equalizer.max_remnant_desc', 'Remnants older than this will be excluded from optimization')}
              </p>
            </div>
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            onClick={() => void handleSaveStrategy()}
            disabled={isSaving}
            variant="outline"
            className="flex-1 border-blue-500/30 text-info hover:bg-blue-500/10"
          >
            <Save className={`${UI_DIMENSIONS.ICON_MEDIUM} mr-2`} />
            {t('optimization_equalizer.save_strategy', 'Save Strategy')}
          </Button>
          <Button
            onClick={() => void handleSetAsDefault()}
            disabled={isSaving}
            variant="outline"
            className="flex-1 border-green-500/30 text-success hover:bg-green-500/10"
          >
            {t('optimization_equalizer.set_as_default', 'Set as Default')}
          </Button>
        </div>

        {/* Continue to Production - P0: Unblock workflow */}
        {onComplete && (
          <div className="pt-4 border-t border-border">
            <Button
              onClick={() => onComplete({ strategy, minRemnantLength, maxRemnantAge })}
              disabled={runDisabled}
              className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold"
            >
              {runLabel ?? t('optimization_equalizer.continue_to_production', 'Continue to Production')}
              <ArrowRight className={`${UI_DIMENSIONS.ICON_MEDIUM} ml-2`} />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

OptimizationEqualizerComponent.displayName = 'OptimizationEqualizer';

// ✅ HARDENING: Memoize and wrap with error boundary
const OptimizationEqualizerMemo = React.memo(OptimizationEqualizerComponent);

// ✅ HARDENING: Export with error boundary for production
export const OptimizationEqualizer: React.FC<OptimizationEqualizerProps> = (props) => (
  <ErrorBoundary level="component">
    <OptimizationEqualizerMemo {...props} />
  </ErrorBoundary>
);

OptimizationEqualizer.displayName = 'OptimizationEqualizer';


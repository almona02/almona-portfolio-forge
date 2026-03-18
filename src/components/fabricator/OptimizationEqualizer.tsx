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

interface OptimizationEqualizerProps {
  userId: string;
  profiles?: Profile[];
  onStrategyChange?: (strategy: OptimizationStrategy) => void;
  initialStrategy?: OptimizationStrategy;
  onComplete?: (result?: any) => void; // Navigation callback when optimization is finalized
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
    loadSavedPreferences();
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
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className={`${UI_DIMENSIONS.ICON_LARGE} text-amber-400`} /> {t('optimization_equalizer.title', 'Optimization Strategy Equalizer')}
        </CardTitle>
        <CardDescription className="text-gray-400">
          {t('optimization_equalizer.description', 'Fine-tune optimization parameters to match your production needs')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strategy Preset Selector */}
        <div>
          <Label htmlFor="strategy-preset" className="typography-label text-gray-300 mb-2 block">
            {t('optimization_equalizer.optimization_strategy', 'Optimization Strategy')}
          </Label>
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger id="strategy-preset" className="bg-gray-900 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {OptimizationPresets.getPresetNames().map((name) => {
                const preset = OptimizationPresets.getPreset(name);
                return (
                  <SelectItem key={name} value={name}>
                    <div>
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs text-gray-400">{preset.description}</div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Weight Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="typography-label text-gray-300 flex items-center gap-2">
                <TrendingUp className={`${UI_DIMENSIONS.ICON_MEDIUM} text-green-400`} />
                {t('optimization_equalizer.waste_reduction', 'Waste Reduction')}
              </Label>
              <Badge variant="outline" className="text-green-400 border-green-500/30">
                {strategy.wasteReductionWeight}%
              </Badge>
            </div>
            <Slider
              value={[strategy.wasteReductionWeight]}
              onValueChange={(value) => handleWeightChange('wasteReductionWeight', value)}
              min={SLIDER_CONFIG.MIN_VALUE}
              max={SLIDER_CONFIG.MAX_VALUE}
              step={SLIDER_CONFIG.STEP}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('optimization_equalizer.waste_reduction_desc', 'Prioritize minimizing material waste. Higher values reduce waste but may increase cut complexity.')}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="typography-label text-gray-300 flex items-center gap-2">
                <Package className={`${UI_DIMENSIONS.ICON_MEDIUM} text-blue-400`} />
                {t('optimization_equalizer.remnant_usage', 'Remnant Usage')}
              </Label>
              <Badge variant="outline" className="text-blue-400 border-blue-500/30">
                {strategy.remnantUsageWeight}%
              </Badge>
            </div>
            <Slider
              value={[strategy.remnantUsageWeight]}
              onValueChange={(value) => handleWeightChange('remnantUsageWeight', value)}
              min={SLIDER_CONFIG.MIN_VALUE}
              max={SLIDER_CONFIG.MAX_VALUE}
              step={SLIDER_CONFIG.STEP}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('optimization_equalizer.remnant_usage_desc', 'Prioritize using existing remnants from previous jobs. Higher values increase remnant reuse.')}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="typography-label text-gray-300 flex items-center gap-2">
                <Settings className={`${UI_DIMENSIONS.ICON_MEDIUM} text-amber-400`} />
                {t('optimization_equalizer.cut_complexity', 'Cut Complexity')}
              </Label>
              <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                {strategy.cutComplexityWeight}%
              </Badge>
            </div>
            <Slider
              value={[strategy.cutComplexityWeight]}
              onValueChange={(value) => handleWeightChange('cutComplexityWeight', value)}
              min={SLIDER_CONFIG.MIN_VALUE}
              max={SLIDER_CONFIG.MAX_VALUE}
              step={SLIDER_CONFIG.STEP}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('optimization_equalizer.cut_complexity_desc', 'Balance between simple cuts (faster) and complex optimization (more efficient).')}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="typography-label text-gray-300 flex items-center gap-2">
                <Clock className={`${UI_DIMENSIONS.ICON_MEDIUM} text-amber-400`} />
                {t('optimization_equalizer.production_speed', 'Production Speed')}
              </Label>
              <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                {strategy.productionSpeedWeight}%
              </Badge>
            </div>
            <Slider
              value={[strategy.productionSpeedWeight]}
              onValueChange={(value) => handleWeightChange('productionSpeedWeight', value)}
              min={SLIDER_CONFIG.MIN_VALUE}
              max={SLIDER_CONFIG.MAX_VALUE}
              step={SLIDER_CONFIG.STEP}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('optimization_equalizer.production_speed_desc', 'Prioritize faster optimization and fewer cuts. Higher values reduce optimization time.')}
            </p>
          </div>
        </div>

        {/* Real-Time Impact Preview */}
        <Alert className="bg-gray-900 border-gray-700">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-xs text-gray-400">{t('optimization_equalizer.estimated_waste', 'Estimated Waste')}</p>
                <p className="text-lg font-semibold text-yellow-400">
                  {estimatedImpact.estimatedWastePercentage.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('optimization_equalizer.est_bars_used', 'Est. Bars Used')}</p>
                <p className="text-lg font-semibold text-blue-400">
                  ~{estimatedImpact.estimatedBarsUsed}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('optimization_equalizer.est_opt_time', 'Est. Opt. Time')}</p>
                <p className="text-lg font-semibold text-green-400">
                  ~{estimatedImpact.estimatedOptimizationTime.toFixed(1)}s
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Material Constraints */}
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="typography-h4 text-sm text-gray-300 mb-3">{t('optimization_equalizer.material_constraints', 'Material Constraints')}</h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="min-remnant" className="typography-label text-gray-300 text-sm">
                {t('optimization_equalizer.min_remnant_length', 'Minimum Remnant Length (mm)')}
              </Label>
              <input
                id="min-remnant"
                type="number"
                value={minRemnantLength}
                onChange={(e) => setMinRemnantLength(parseInt(e.target.value) || DEFAULT_OPTIMIZATION_PARAMS.DEFAULT_MIN_REMNANT_LENGTH_MM)}
                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                min={INPUT_CONSTRAINTS.MIN_REMNANT_LENGTH_MM}
                max={INPUT_CONSTRAINTS.MAX_REMNANT_LENGTH_MM}
              />
              <p className="text-xs text-gray-400 mt-1">
                {t('optimization_equalizer.min_remnant_desc', 'Remnants shorter than this will not be considered for reuse')}
              </p>
            </div>
            <div>
              <Label htmlFor="max-remnant-age" className="typography-label text-gray-300 text-sm">
                {t('optimization_equalizer.max_remnant_age', 'Maximum Remnant Age (days)')}
              </Label>
              <input
                id="max-remnant-age"
                type="number"
                value={maxRemnantAge}
                onChange={(e) => setMaxRemnantAge(parseInt(e.target.value) || DEFAULT_OPTIMIZATION_PARAMS.DEFAULT_MAX_REMNANT_AGE_DAYS)}
                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                min={INPUT_CONSTRAINTS.MIN_REMNANT_AGE_DAYS}
                max={INPUT_CONSTRAINTS.MAX_REMNANT_AGE_DAYS}
              />
              <p className="text-xs text-gray-400 mt-1">
                {t('optimization_equalizer.max_remnant_desc', 'Remnants older than this will be excluded from optimization')}
              </p>
            </div>
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
          <Button
            onClick={handleSaveStrategy}
            disabled={isSaving}
            variant="outline"
            className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          >
            <Save className={`${UI_DIMENSIONS.ICON_MEDIUM} mr-2`} />
            {t('optimization_equalizer.save_strategy', 'Save Strategy')}
          </Button>
          <Button
            onClick={handleSetAsDefault}
            disabled={isSaving}
            variant="outline"
            className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
          >
            {t('optimization_equalizer.set_as_default', 'Set as Default')}
          </Button>
        </div>

        {/* Continue to Production - P0: Unblock workflow */}
        {onComplete && (
          <div className="pt-4 border-t border-gray-700">
            <Button
              onClick={() => onComplete({ strategy, minRemnantLength, maxRemnantAge })}
              className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold"
            >
              {t('optimization_equalizer.continue_to_production', 'Continue to Production')}
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


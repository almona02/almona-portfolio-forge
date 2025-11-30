/**
 * Optimization Equalizer Component
 * Pre-optimization adjustment panel for fine-tuning optimization strategy
 * Gives users control over the "how" of production optimization
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Slider } from '@/shared/ui/ui/slider';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Settings, TrendingUp, Package, Clock, Info, Save } from 'lucide-react';
import { OptimizationPresets, type OptimizationStrategy } from '@/lib/optimization/OptimizationPresets';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/fabricator';

interface OptimizationEqualizerProps {
  userId: string;
  profiles?: Profile[];
  onStrategyChange?: (strategy: OptimizationStrategy) => void;
  initialStrategy?: OptimizationStrategy;
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

export const OptimizationEqualizer: React.FC<OptimizationEqualizerProps> = React.memo(({
  userId,
  profiles: _profiles = [],
  onStrategyChange,
  initialStrategy,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [strategy, setStrategy] = useState<OptimizationStrategy>(
    initialStrategy || OptimizationPresets.getPreset('balanced')
  );
  const [_profileOverrides, _setProfileOverrides] = useState<Map<string, ProfileOverride>>(new Map());
  const [minRemnantLength, setMinRemnantLength] = useState<number>(200);
  const [maxRemnantAge, setMaxRemnantAge] = useState<number>(90); // days
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
        .limit(10)
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
      console.error('Error loading preferences:', error);
    }
  }, [userId]);

  // Load saved preferences on mount
  useEffect(() => {
    loadSavedPreferences();
  }, [loadSavedPreferences]);

  // Handle preset selection
  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = OptimizationPresets.getPreset(presetName);
    setStrategy(preset);
    onStrategyChange?.(preset);
  };

  // Handle weight slider changes
  const handleWeightChange = (field: keyof OptimizationStrategy, value: number[]) => {
    const newStrategy = {
      ...strategy,
      [field]: value[0],
    };
    setStrategy(newStrategy);
    setSelectedPreset('custom'); // Switch to custom when manually adjusted
    onStrategyChange?.(newStrategy);
  };

  // Calculate estimated impact
  const estimatedImpact = useMemo(() => {
    return OptimizationPresets.estimateImpact(strategy);
  }, [strategy]);

  // Save strategy as preference
  const handleSaveStrategy = async () => {
    setIsSaving(true);
    try {
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
        } as any);

      if (error) throw error;

      await loadSavedPreferences();
    } catch (error) {
      console.error('Error saving strategy:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Set as default strategy
  const handleSetAsDefault = async () => {
    setIsSaving(true);
    try {
      // Remove default flag from all existing preferences
      const updateQuery = (supabase
        .from('optimization_equalizer_preferences') as any);
      await updateQuery
        .update({ is_default: false })
        .eq('user_id', userId);

      // Set this as default
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
      } as any);

      if (error) throw error;

      await loadSavedPreferences();
    } catch (error) {
      console.error('Error setting default:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5 text-purple-400" /> Optimization Strategy Equalizer
        </CardTitle>
        <CardDescription className="text-gray-400">
          Fine-tune optimization parameters to match your production needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strategy Preset Selector */}
        <div>
          <Label htmlFor="strategy-preset" className="text-gray-300 mb-2 block">
            Optimization Strategy
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
              <Label className="text-gray-300 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Waste Reduction
              </Label>
              <Badge variant="outline" className="text-green-400 border-green-500/30">
                {strategy.wasteReductionWeight}%
              </Badge>
            </div>
            <Slider
              value={[strategy.wasteReductionWeight]}
              onValueChange={(value) => handleWeightChange('wasteReductionWeight', value)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              Prioritize minimizing material waste. Higher values reduce waste but may increase cut complexity.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-400" />
                Remnant Usage
              </Label>
              <Badge variant="outline" className="text-blue-400 border-blue-500/30">
                {strategy.remnantUsageWeight}%
              </Badge>
            </div>
            <Slider
              value={[strategy.remnantUsageWeight]}
              onValueChange={(value) => handleWeightChange('remnantUsageWeight', value)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              Prioritize using existing remnants from previous jobs. Higher values increase remnant reuse.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Settings className="h-4 w-4 text-orange-400" />
                Cut Complexity
              </Label>
              <Badge variant="outline" className="text-orange-400 border-orange-500/30">
                {strategy.cutComplexityWeight}%
              </Badge>
            </div>
            <Slider
              value={[strategy.cutComplexityWeight]}
              onValueChange={(value) => handleWeightChange('cutComplexityWeight', value)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              Balance between simple cuts (faster) and complex optimization (more efficient).
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-400" />
                Production Speed
              </Label>
              <Badge variant="outline" className="text-purple-400 border-purple-500/30">
                {strategy.productionSpeedWeight}%
              </Badge>
            </div>
            <Slider
              value={[strategy.productionSpeedWeight]}
              onValueChange={(value) => handleWeightChange('productionSpeedWeight', value)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              Prioritize faster optimization and fewer cuts. Higher values reduce optimization time.
            </p>
          </div>
        </div>

        {/* Real-Time Impact Preview */}
        <Alert className="bg-gray-900 border-gray-700">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-xs text-gray-400">Estimated Waste</p>
                <p className="text-lg font-semibold text-yellow-400">
                  {estimatedImpact.estimatedWastePercentage.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Est. Bars Used</p>
                <p className="text-lg font-semibold text-blue-400">
                  ~{estimatedImpact.estimatedBarsUsed}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Est. Opt. Time</p>
                <p className="text-lg font-semibold text-green-400">
                  ~{estimatedImpact.estimatedOptimizationTime.toFixed(1)}s
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Material Constraints */}
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Material Constraints</h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="min-remnant" className="text-gray-300 text-sm">
                Minimum Remnant Length (mm)
              </Label>
              <input
                id="min-remnant"
                type="number"
                value={minRemnantLength}
                onChange={(e) => setMinRemnantLength(parseInt(e.target.value) || 200)}
                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                min={0}
                max={1000}
              />
              <p className="text-xs text-gray-400 mt-1">
                Remnants shorter than this will not be considered for reuse
              </p>
            </div>
            <div>
              <Label htmlFor="max-remnant-age" className="text-gray-300 text-sm">
                Maximum Remnant Age (days)
              </Label>
              <input
                id="max-remnant-age"
                type="number"
                value={maxRemnantAge}
                onChange={(e) => setMaxRemnantAge(parseInt(e.target.value) || 90)}
                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                min={1}
                max={365}
              />
              <p className="text-xs text-gray-400 mt-1">
                Remnants older than this will be excluded from optimization
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
            <Save className="h-4 w-4 mr-2" />
            Save Strategy
          </Button>
          <Button
            onClick={handleSetAsDefault}
            disabled={isSaving}
            variant="outline"
            className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
          >
            Set as Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

OptimizationEqualizer.displayName = 'OptimizationEqualizer';


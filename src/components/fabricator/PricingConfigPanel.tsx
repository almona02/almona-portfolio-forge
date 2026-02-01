/**
 * Pricing Configuration Panel
 * 
 * In-app pricing settings for EngineeringBay
 * Simplified UI for quick pricing adjustments
 * 
 * Constitutional: Deterministic pricing, no ML/AI
 * Tier: 3 Protected Determinism
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Button } from '@/shared/ui/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/ui/collapsible';
import { Settings, ChevronDown, ChevronUp, Save, RefreshCw } from 'lucide-react';
import { PricingConfig } from '@/lib/fabricator/CostCalculator';
import { toast } from 'sonner';

export interface EnhancedPricingConfig extends Partial<PricingConfig> {
  // Material-specific markups
  aluminumMarkup?: number;
  upvcMarkup?: number;
  woodMarkup?: number;
  
  // Category-specific markups
  hardwareMarkup?: number;
  glazingMarkup?: number;
  installationMarkup?: number;
  
  // Advanced settings
  minProfitMargin?: number;
  maxDiscount?: number;
  roundingMethod?: 'standard' | 'up' | 'down' | 'nearest';
  roundingPrecision?: number;
  
  // Regional settings
  region?: 'turkey' | 'egypt' | 'global';
}

interface PricingConfigPanelProps {
  pricingConfig: EnhancedPricingConfig;
  onConfigChange: (config: EnhancedPricingConfig) => void;
  onSave?: (config: EnhancedPricingConfig) => Promise<void>;
  className?: string;
  showAdvanced?: boolean;
}

export const PricingConfigPanel: React.FC<PricingConfigPanelProps> = ({
  pricingConfig,
  onConfigChange,
  onSave,
  className = '',
  showAdvanced = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<EnhancedPricingConfig>(pricingConfig);
  const [saving, setSaving] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(showAdvanced);

  const handleFieldChange = (field: keyof EnhancedPricingConfig, value: string | number) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleSave = async () => {
    if (onSave) {
      setSaving(true);
      try {
        await onSave(localConfig);
        toast.success('Pricing configuration saved');
      } catch (error) {
        toast.error('Failed to save pricing configuration');
        console.error('Save error:', error);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleReset = () => {
    const defaultConfig: EnhancedPricingConfig = {
      glassPrice: 50,
      laborHourlyRate: 100,
      markupPercentage: 30,
      taxPercentage: 14,
      currency: 'EGP',
      region: 'egypt',
      hardwareMarkup: 40,
      glazingMarkup: 30,
      installationMarkup: 45,
      aluminumMarkup: 35,
      upvcMarkup: 35,
      woodMarkup: 35,
      minProfitMargin: 25,
      maxDiscount: 15,
      roundingMethod: 'standard',
      roundingPrecision: 2
    };
    setLocalConfig(defaultConfig);
    onConfigChange(defaultConfig);
    toast.info('Reset to default pricing');
  };

  return (
    <Card className={`bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 border border-slate-700/50 backdrop-blur-sm ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-amber-200 text-sm font-semibold">
                <Settings className="h-4 w-4 text-amber-400" />
                Pricing Configuration
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-amber-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-amber-400" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-4">
            {/* Currency Selection */}
            <div>
              <Label className="text-amber-200 text-xs mb-2 block">Currency</Label>
              <Select
                value={localConfig.currency || 'EGP'}
                onValueChange={(value) => handleFieldChange('currency', value)}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-amber-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="TRY">TRY - Turkish Lira</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Glass Price */}
            <div>
              <Label className="text-amber-200 text-xs mb-2 block">
                Glass Price ({localConfig.currency || 'EGP'} per m²)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={localConfig.glassPrice || 50}
                onChange={(e) => handleFieldChange('glassPrice', parseFloat(e.target.value) || 0)}
                className="bg-slate-800/50 border-slate-700/50 text-amber-200 focus:border-amber-500/50"
              />
            </div>

            {/* Labor Hourly Rate */}
            <div>
              <Label className="text-amber-200 text-xs mb-2 block">
                Labor Rate ({localConfig.currency || 'EGP'} per hour)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={localConfig.laborHourlyRate || 100}
                onChange={(e) => handleFieldChange('laborHourlyRate', parseFloat(e.target.value) || 0)}
                className="bg-slate-800/50 border-slate-700/50 text-amber-200 focus:border-amber-500/50"
              />
            </div>

            {/* Markup Percentage */}
            <div>
              <Label className="text-amber-200 text-xs mb-2 block">Markup Percentage (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={localConfig.markupPercentage || 30}
                onChange={(e) => handleFieldChange('markupPercentage', parseFloat(e.target.value) || 0)}
                className="bg-slate-800/50 border-slate-700/50 text-amber-200 focus:border-amber-500/50"
              />
              <p className="text-xs text-slate-400 mt-1">Applied to material costs</p>
            </div>

            {/* Tax Percentage */}
            <div>
              <Label className="text-amber-200 text-xs mb-2 block">Tax/VAT Percentage (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={localConfig.taxPercentage || 14}
                onChange={(e) => handleFieldChange('taxPercentage', parseFloat(e.target.value) || 0)}
                className="bg-slate-800/50 border-slate-700/50 text-amber-200 focus:border-amber-500/50"
              />
              <p className="text-xs text-slate-400 mt-1">Applied after markup</p>
            </div>

            {/* Advanced Options Toggle */}
            <div className="pt-2 border-t border-slate-700/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="w-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              >
                {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Settings
                {showAdvancedOptions ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
            </div>

            {/* Advanced Options */}
            {showAdvancedOptions && (
              <div className="space-y-4 pt-2 border-t border-slate-700/50">
                {/* Region */}
                <div>
                  <Label className="text-amber-200 text-xs mb-2 block">Region</Label>
                  <Select
                    value={localConfig.region || 'egypt'}
                    onValueChange={(value) => handleFieldChange('region', value)}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-amber-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="egypt">Egypt</SelectItem>
                      <SelectItem value="turkey">Turkey</SelectItem>
                      <SelectItem value="global">Global</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category-Specific Markups */}
                <div>
                  <Label className="text-amber-200 text-xs mb-2 block">Category Markups (%)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-slate-400 text-[10px] mb-1 block">Hardware</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={localConfig.hardwareMarkup || localConfig.markupPercentage || 40}
                        onChange={(e) => handleFieldChange('hardwareMarkup', parseFloat(e.target.value) || 0)}
                        className="bg-slate-800/50 border-slate-700/50 text-amber-200 text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-[10px] mb-1 block">Glazing</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={localConfig.glazingMarkup || localConfig.markupPercentage || 30}
                        onChange={(e) => handleFieldChange('glazingMarkup', parseFloat(e.target.value) || 0)}
                        className="bg-slate-800/50 border-slate-700/50 text-amber-200 text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-[10px] mb-1 block">Installation</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={localConfig.installationMarkup || localConfig.markupPercentage || 45}
                        onChange={(e) => handleFieldChange('installationMarkup', parseFloat(e.target.value) || 0)}
                        className="bg-slate-800/50 border-slate-700/50 text-amber-200 text-xs h-8"
                      />
                    </div>
                  </div>
                </div>

                {/* Material-Specific Markups */}
                <div>
                  <Label className="text-amber-200 text-xs mb-2 block">Material Markups (%)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-slate-400 text-[10px] mb-1 block">Aluminum</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={localConfig.aluminumMarkup || localConfig.markupPercentage || 35}
                        onChange={(e) => handleFieldChange('aluminumMarkup', parseFloat(e.target.value) || 0)}
                        className="bg-slate-800/50 border-slate-700/50 text-amber-200 text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-[10px] mb-1 block">UPVC</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={localConfig.upvcMarkup || localConfig.markupPercentage || 35}
                        onChange={(e) => handleFieldChange('upvcMarkup', parseFloat(e.target.value) || 0)}
                        className="bg-slate-800/50 border-slate-700/50 text-amber-200 text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-[10px] mb-1 block">Wood</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={localConfig.woodMarkup || localConfig.markupPercentage || 35}
                        onChange={(e) => handleFieldChange('woodMarkup', parseFloat(e.target.value) || 0)}
                        className="bg-slate-800/50 border-slate-700/50 text-amber-200 text-xs h-8"
                      />
                    </div>
                  </div>
                </div>

                {/* Profit & Discount Controls */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-amber-200 text-xs mb-2 block">Min Profit Margin (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={localConfig.minProfitMargin || 25}
                      onChange={(e) => handleFieldChange('minProfitMargin', parseFloat(e.target.value) || 0)}
                      className="bg-slate-800/50 border-slate-700/50 text-amber-200 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-amber-200 text-xs mb-2 block">Max Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={localConfig.maxDiscount || 15}
                      onChange={(e) => handleFieldChange('maxDiscount', parseFloat(e.target.value) || 0)}
                      className="bg-slate-800/50 border-slate-700/50 text-amber-200 text-xs h-8"
                    />
                  </div>
                </div>

                {/* Rounding Settings */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-amber-200 text-xs mb-2 block">Rounding Method</Label>
                    <Select
                      value={localConfig.roundingMethod || 'standard'}
                      onValueChange={(value) => handleFieldChange('roundingMethod', value)}
                    >
                      <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-amber-200 text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="up">Round Up</SelectItem>
                        <SelectItem value="down">Round Down</SelectItem>
                        <SelectItem value="nearest">Nearest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-amber-200 text-xs mb-2 block">Precision (decimals)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="4"
                      value={localConfig.roundingPrecision || 2}
                      onChange={(e) => handleFieldChange('roundingPrecision', parseInt(e.target.value) || 2)}
                      className="bg-slate-800/50 border-slate-700/50 text-amber-200 text-xs h-8"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-700/50">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="flex-1 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset
              </Button>
              {onSave && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white"
                >
                  {saving ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 mr-1" />
                  )}
                  Save
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};


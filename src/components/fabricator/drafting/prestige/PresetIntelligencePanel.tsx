// src/components/fabricator/drafting/prestige/PresetIntelligencePanel.tsx
/**
 * Prestige Preset Intelligence Selection
 * 
 * Constitutional: Rule-based recommendations, full audit trail
 * Language: "Apply Intelligence" not "Select Template"
 */

import React from 'react';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Sparkles, TrendingUp, CheckCircle2, Lightbulb } from 'lucide-react';
import { logDraftingAction } from '../utils/constitutionalAudit';
import { cn } from '@/lib/utils';

export interface PresetIntelligence {
  id: string;
  title: string;
  description: string;
  image?: React.ReactNode;
  applications: string[];
  systemRecommendation: string;
  materialRecommendation: string;
  optimization: string;
  selectCount?: string;
  ruleBasedReason?: string; // Deterministic recommendation rationale
}

interface PresetIntelligencePanelProps {
  presets: PresetIntelligence[];
  selectedPreset?: string;
  onSelect: (presetId: string) => void;
  currentSystem?: string;
  currentMaterial?: string;
}

export const PresetIntelligencePanel: React.FC<PresetIntelligencePanelProps> = ({
  presets,
  selectedPreset,
  onSelect,
  currentSystem,
  currentMaterial
}) => {
  const handleSelect = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    
    // Constitutional audit logging
    logDraftingAction(
      'preset_intelligence_applied',
      {
        presetId,
        presetTitle: preset?.title,
        currentSystem,
        currentMaterial,
        ruleBasedReason: preset?.ruleBasedReason
      },
      { presetId },
      `CHECKPOINT-PRESET-INTELLIGENCE-${Date.now()}`
    );

    onSelect(presetId);
  };

  // Rule-based matching (deterministic, no ML)
  const getMatchingPresets = () => {
    return presets.filter(preset => {
      // Match by system
      if (currentSystem && preset.systemRecommendation.toLowerCase().includes(currentSystem.toLowerCase())) {
        return true;
      }
      // Match by material
      if (currentMaterial && preset.materialRecommendation.toLowerCase().includes(currentMaterial.toLowerCase())) {
        return true;
      }
      return false;
    });
  };

  const matchingPresets = getMatchingPresets();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="w-6 h-6 text-amber-500" />
        <h2 className="text-2xl font-bold text-gray-900">Apply Project Intelligence</h2>
      </div>

      {/* Matching Recommendations */}
      {matchingPresets.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-900">
              Recommended Based on Your Selection
            </span>
          </div>
          <p className="text-xs text-amber-700">
            {matchingPresets.length} preset{matchingPresets.length !== 1 ? 's' : ''} match your current system/material configuration
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {presets.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          const isRecommended = matchingPresets.some(p => p.id === preset.id);
          
          return (
            <Card
              key={preset.id}
              className={cn(
                "relative overflow-hidden transition-all duration-300 group",
                "hover:shadow-xl hover:-translate-y-1",
                isSelected
                  ? "border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-white shadow-xl"
                  : "border border-gray-200 hover:border-amber-300"
              )}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-amber-500 rounded-full p-1.5 shadow-lg">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}

              {/* Recommendation Badge */}
              {isRecommended && !isSelected && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-green-500 text-white shadow-md">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Matches
                  </Badge>
                </div>
              )}

              <CardContent className="p-6">
                {/* Image/Visual */}
                {preset.image && (
                  <div className="mb-4 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                    {preset.image}
                  </div>
                )}

                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {preset.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                {/* Applications */}
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Applications</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {preset.applications.map((app, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="text-xs bg-gray-100 text-gray-700"
                      >
                        {app}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">System:</span>
                    <span className="font-semibold text-gray-900">{preset.systemRecommendation}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Material:</span>
                    <span className="font-semibold text-gray-900">{preset.materialRecommendation}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-gray-600">{preset.optimization}</span>
                    </div>
                  </div>
                </div>

                {/* Select Count */}
                {preset.selectCount && (
                  <div className="mb-4 p-2 bg-gray-50 rounded text-xs text-gray-600">
                    {preset.selectCount}
                  </div>
                )}

                {/* Rule-Based Reason */}
                {preset.ruleBasedReason && isRecommended && (
                  <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                    <strong>Why recommended:</strong> {preset.ruleBasedReason}
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={() => handleSelect(preset.id)}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "w-full transition-all duration-300",
                    isSelected && "bg-amber-500 hover:bg-amber-600 text-white"
                  )}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Intelligence Applied
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Apply Intelligence
                    </>
                  )}
                </Button>
              </CardContent>

              {/* Hover Overlay */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                "pointer-events-none"
              )} />
            </Card>
          );
        })}
      </div>
    </div>
  );
};


// src/components/fabricator/drafting/prestige/ArchitecturalPresetSelector.tsx
/**
 * Architectural Preset Selector - Simple with Details Toggle
 * 
 * Constitutional: Rule-based, full audit trail
 * Philosophy: Speed by default, story on demand
 * 
 * Default: Simple view (workshop-friendly)
 * Toggle: Detailed view (architectural narrative)
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
  Award,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Home,
  Info,
  Sparkles
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { logDraftingAction } from '../utils/constitutionalAudit';

export interface ArchitecturalPreset {
  id: string;
  
  // Always shown (simple)
  title: string;
  description: string;
  icon: string;
  complexity: 'Basic' | 'Moderate' | 'Advanced' | 'Expert' | 'Bespoke';
  
  // Intelligence (always available, shown based on detail level)
  intelligence: {
    gridPattern: string;
    systemRecommendation: string;
    materialRecommendation: string;
    optimization?: string;
  };
  
  // Applications (simple list)
  applications: string[];
  
  // Pricing tier
  pricingTier: 'Local' | 'Standard' | 'Premium' | 'Enterprise' | 'Bespoke';
  
  // Only shown when showDetails = true
  architecturalDetails?: {
    narrative?: string;
    architecturalStyle?: string;
    principles?: string[];
    testimonials?: string[];
    certifications?: string[];
    bestFor?: string;
  };
}

interface ArchitecturalPresetSelectorProps {
  presets: ArchitecturalPreset[];
  selectedPreset?: string;
  onSelect: (presetId: string) => void;
  currentSystem?: string;
  currentMaterial?: string;
  defaultShowDetails?: boolean; // Can be set from user preferences
}

export const ArchitecturalPresetSelector: React.FC<ArchitecturalPresetSelectorProps> = ({
  presets,
  selectedPreset,
  onSelect,
  currentSystem,
  currentMaterial,
  defaultShowDetails = false // Default to simple view
}) => {
  const [activeCategory, setActiveCategory] = useState<'residential' | 'commercial' | 'heritage'>('residential');
  
  // Smart default based on user type (if available)
  const [showDetails, setShowDetails] = useState(() => {
    // Check if user preference is saved
    const saved = localStorage.getItem('almona-show-details');
    if (saved !== null) return saved === 'true';
    
    // Use provided default
    return defaultShowDetails;
  });
  
  const [hasSeenHint, setHasSeenHint] = useState(() => {
    return localStorage.getItem('almona-details-hint-seen') === 'true';
  });

  const handleToggleDetails = useCallback((value: boolean) => {
    setShowDetails(value);
    
    // Save preference
    localStorage.setItem('almona-show-details', value.toString());
    
    // Constitutional audit logging
    logDraftingAction(
      'template_selected',
      {
        from: showDetails,
        to: value,
        timestamp: new Date().toISOString()
      },
      { showDetails: value },
      `CHECKPOINT-DETAIL-TOGGLE-${Date.now()}`
    );
    
    // Dismiss hint if shown
    if (value && !hasSeenHint) {
      setHasSeenHint(true);
      localStorage.setItem('almona-details-hint-seen', 'true');
    }
  }, [showDetails, hasSeenHint]);

  // Keyboard shortcut: Ctrl+D to toggle details
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        handleToggleDetails(!showDetails);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetails, handleToggleDetails]);

  const handleSelect = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    
    // Constitutional audit logging
    logDraftingAction(
      'preset_intelligence_applied',
      {
        presetId,
        presetTitle: preset?.title,
        showDetails,
        currentSystem,
        currentMaterial,
        pricingTier: preset?.pricingTier
      },
      { presetId },
      `CHECKPOINT-ARCHITECTURAL-PRESET-${Date.now()}`
    );

    onSelect(presetId);
  };

  // Filter presets by category
  const getFilteredPresets = () => {
    return presets.filter(preset => {
      if (activeCategory === 'residential' && !preset.id.includes('residential') && !preset.id.includes('villa') && !preset.id.includes('apartment')) {
        return false;
      }
      if (activeCategory === 'commercial' && !preset.id.includes('commercial') && !preset.id.includes('curtain') && !preset.id.includes('shop')) {
        return false;
      }
      if (activeCategory === 'heritage' && !preset.id.includes('heritage') && !preset.id.includes('islamic') && !preset.id.includes('geometric')) {
        return false;
      }
      return true;
    });
  };

  const filteredPresets = getFilteredPresets();

  return (
    <div className="space-y-6">
      {/* Header with Detail Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-amber-500" />
          <h2 className="typography-h2 text-gray-900">
            Choose Window Design Pattern
          </h2>
        </div>
        
        {/* Detail Toggle */}
        <div className="flex items-center gap-2">
          {!hasSeenHint && !showDetails && (
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
              <Info className="w-3 h-3 mr-1" />
              Tip: Toggle for architectural details
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleDetails(!showDetails)}
            className="flex items-center gap-2"
            title={showDetails ? "Switch to simple view (Ctrl+D)" : "Show architectural details (Ctrl+D)"}
          >
            <Info className="w-4 h-4" />
            {showDetails ? (
              <>
                <span>Simple View</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Show Details</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)}>
        <TabsList>
          <TabsTrigger value="residential" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Residential
          </TabsTrigger>
          <TabsTrigger value="commercial" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Commercial
          </TabsTrigger>
          <TabsTrigger value="heritage" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Heritage
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPresets.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              const details = preset.architecturalDetails;
              
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
                      <div className="btn-primary">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Pricing Tier Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <Badge 
                      className={cn(
                        "shadow-md",
                        preset.pricingTier === 'Local' && "bg-blue-500 text-white",
                        preset.pricingTier === 'Standard' && "bg-green-500 text-white",
                        preset.pricingTier === 'Premium' && "bg-amber-500 text-white",
                        preset.pricingTier === 'Enterprise' && "bg-purple-500 text-white",
                        preset.pricingTier === 'Bespoke' && "bg-gray-900 text-white"
                      )}
                    >
                      {preset.pricingTier}
                    </Badge>
                  </div>

                  <CardContent className="p-6 pt-16">
                    {/* Icon */}
                    <div className="text-4xl mb-4">{preset.icon}</div>

                    {/* Title & Description */}
                    <div className="mb-4">
                      <h3 className="typography-h3 text-lg text-gray-900 mb-2">
                        {preset.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    {/* Architectural Details (only when showDetails = true) */}
                    {showDetails && details && (
                      <div className={cn(
                        "mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2",
                        "transition-all duration-300 ease-in-out",
                        "opacity-100"
                      )}>
                        {details.narrative && (
                          <div>
                            <h4 className="typography-h4 text-xs text-amber-900 mb-1">Design Narrative</h4>
                            <p className="text-xs text-amber-800">{details.narrative}</p>
                          </div>
                        )}
                        {details.architecturalStyle && (
                          <div className="text-xs">
                            <span className="text-amber-700 font-semibold">Style: </span>
                            <span className="text-amber-800">{details.architecturalStyle}</span>
                          </div>
                        )}
                        {details.bestFor && (
                          <div className="text-xs">
                            <span className="text-amber-700 font-semibold">Best For: </span>
                            <span className="text-amber-800">{details.bestFor}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Applications */}
                    <div className="mb-4">
                      <h4 className="typography-h4 text-xs text-gray-700 mb-2">Applications</h4>
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

                    {/* Intelligence Summary */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">System:</span>
                          <span className="font-semibold text-gray-900">{preset.intelligence.systemRecommendation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Material:</span>
                          <span className="font-semibold text-gray-900">{preset.intelligence.materialRecommendation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Complexity:</span>
                          <span className="font-semibold text-gray-900">{preset.complexity}</span>
                        </div>
                        {showDetails && preset.intelligence.optimization && (
                          <div className="pt-2 border-t border-gray-200 mt-2">
                            <span className="text-gray-600 font-semibold">Optimization: </span>
                            <span className="text-gray-700">{preset.intelligence.optimization}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Architectural Principles (only when showDetails = true) */}
                    {showDetails && details?.principles && details.principles.length > 0 && (
                      <div className="mb-4">
                        <h4 className="typography-h4 text-xs text-gray-700 mb-2">Design Principles</h4>
                        <ul className="space-y-1">
                          {details.principles.map((principle, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                              <div className="btn-primary" />
                              <span>{principle}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Testimonials (only when showDetails = true) */}
                    {showDetails && details?.testimonials && details.testimonials.length > 0 && (
                      <div className="mb-4">
                        <h4 className="typography-h4 text-xs text-gray-700 mb-2">Authority Proof</h4>
                        <ul className="space-y-1">
                          {details.testimonials.map((testimonial, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                              <div className="btn-primary" />
                              <span>{testimonial}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Certifications (only when showDetails = true) */}
                    {showDetails && details?.certifications && details.certifications.length > 0 && (
                      <div className="mb-4">
                        <h4 className="typography-h4 text-xs text-gray-700 mb-2">Certifications</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {details.certifications.map((cert, i) => (
                            <Badge 
                              key={i} 
                              variant="outline" 
                              className="text-xs border-green-300 text-green-700 bg-green-50"
                            >
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={() => handleSelect(preset.id)}
                      className={cn(
                        "w-full transition-all duration-300",
                        isSelected 
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-gray-900 hover:bg-gray-800 text-white"
                      )}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Pattern Selected
                        </>
                      ) : (
                        <>
                          <Home className="w-4 h-4 mr-2" />
                          Use This Pattern
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
        </TabsContent>
      </Tabs>
    </div>
  );
};


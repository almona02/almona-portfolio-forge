// src/components/fabricator/drafting/prestige/ArchitecturalIntelligencePresets.tsx
/**
 * Architectural Intelligence Presets - Dual Market System
 * 
 * Constitutional: Rule-based, full audit trail
 * Market: Works for both local workshops AND enterprise clients
 * 
 * Same intelligence, different presentation:
 * - Local: "Standard Residential Window" (practical, affordable)
 * - Enterprise: "Luxury Villa Facade Authority" (prestige, architectural)
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
  Crown,
  Home,
  Sparkles,
  Users
} from 'lucide-react';
import React, { useState } from 'react';
import { logDraftingAction } from '../utils/constitutionalAudit';

export interface ArchitecturalIntelligence {
  id: string;
  
  // Dual-market presentation
  title: {
    local: string;      // "Standard Residential Window"
    enterprise: string; // "Luxury Villa Facade Authority"
  };
  
  description: {
    local: string;      // Practical, affordable
    enterprise: string;  // Architectural, prestige
  };
  
  // Core intelligence (same for both)
  intelligence: {
    gridPattern: string;
    optimization: string;
    systemRecommendation: string;
    materialRecommendation: string;
    complexity: 'Basic' | 'Moderate' | 'Advanced' | 'Expert' | 'Bespoke';
  };
  
  // Market-specific
  applications: {
    local: string[];     // "Standard apartments", "Budget renovations"
    enterprise: string[]; // "Luxury villas", "Commercial facades"
  };
  
  // Pricing tier
  pricingTier: 'Local' | 'Standard' | 'Premium' | 'Enterprise' | 'Bespoke';
  
  // Visuals
  icon: string;
  visual?: React.ReactNode;
  
  // Authority proof
  testimonials?: string[];
  certifications?: string[];
  
  // Market fit
  bestFor: {
    local: string;      // "2-3 person workshops, standard projects"
    enterprise: string; // "Architectural firms, luxury developers"
  };
}

interface ArchitecturalIntelligencePresetsProps {
  presets: ArchitecturalIntelligence[];
  selectedPreset?: string;
  onSelect: (presetId: string) => void;
  marketTier?: 'local' | 'enterprise'; // Auto-detect or manual
  currentSystem?: string;
  currentMaterial?: string;
}

export const ArchitecturalIntelligencePresets: React.FC<ArchitecturalIntelligencePresetsProps> = ({
  presets,
  selectedPreset,
  onSelect,
  marketTier = 'local', // Default to local for accessibility
  currentSystem,
  currentMaterial
}) => {
  const [activeCategory, setActiveCategory] = useState<'residential' | 'commercial' | 'heritage'>('residential');

  const handleSelect = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    
    // Constitutional audit logging
    logDraftingAction(
      'preset_intelligence_applied',
      {
        presetId,
        presetTitle: preset?.title[marketTier],
        marketTier,
        currentSystem,
        currentMaterial,
        pricingTier: preset?.pricingTier
      },
      { presetId, marketTier },
      `CHECKPOINT-ARCHITECTURAL-INTELLIGENCE-${Date.now()}`
    );

    onSelect(presetId);
  };

  // Filter presets by category and market tier
  const getFilteredPresets = () => {
    return presets.filter(preset => {
      // Category filtering (simplified - you can enhance this)
      if (activeCategory === 'residential' && !preset.id.includes('villa') && !preset.id.includes('residential')) {
        return false;
      }
      if (activeCategory === 'commercial' && !preset.id.includes('commercial') && !preset.id.includes('curtain')) {
        return false;
      }
      if (activeCategory === 'heritage' && !preset.id.includes('heritage') && !preset.id.includes('islamic')) {
        return false;
      }
      return true;
    });
  };

  const filteredPresets = getFilteredPresets();

  return (
    <div className="space-y-6">
      {/* Market Tier Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-amber-500" />
          <h2 className="typography-h2 text-gray-900">
            {marketTier === 'enterprise' 
              ? 'Commission Architectural Intelligence' 
              : 'Choose Window Design Pattern'}
          </h2>
        </div>
        
        <Badge 
          variant={marketTier === 'enterprise' ? 'default' : 'secondary'}
          className={cn(
            marketTier === 'enterprise' && "bg-amber-500 text-white",
            marketTier === 'local' && "bg-gray-200 text-gray-700"
          )}
        >
          {marketTier === 'enterprise' ? (
            <>
              <Crown className="w-3 h-3 mr-1" />
              Enterprise Mode
            </>
          ) : (
            <>
              <Users className="w-3 h-3 mr-1" />
              Local Workshop
            </>
          )}
        </Badge>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as typeof activeCategory)}>
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
              const isLocal = marketTier === 'local';
              
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
                        preset.pricingTier === 'Enterprise' && "bg-amber-500 text-white",
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
                      <h3 className={cn(
                        "typography-h3 text-lg font-bold mb-2",
                        isLocal ? "text-gray-900" : "text-gray-900"
                      )}>
                        {isLocal ? preset.title.local : preset.title.enterprise}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {isLocal ? preset.description.local : preset.description.enterprise}
                      </p>
                    </div>

                    {/* Applications */}
                    <div className="mb-4">
                      <h4 className="typography-h4 text-xs text-gray-700 mb-2">Best For</h4>
                      <p className="text-xs text-gray-600 mb-2">
                        {isLocal ? preset.bestFor.local : preset.bestFor.enterprise}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(isLocal ? preset.applications.local : preset.applications.enterprise).map((app, i) => (
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

                    {/* Intelligence Summary (Simplified for local, detailed for enterprise) */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      {isLocal ? (
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">System:</span>
                            <span className="font-semibold">{preset.intelligence.systemRecommendation}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Material:</span>
                            <span className="font-semibold">{preset.intelligence.materialRecommendation}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Complexity:</span>
                            <span className="font-semibold">{preset.intelligence.complexity}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-gray-600 font-semibold">Optimization:</span>
                            <p className="text-gray-700 mt-1">{preset.intelligence.optimization}</p>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">System Authority:</span>
                            <span className="font-semibold">{preset.intelligence.systemRecommendation}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Material Authority:</span>
                            <span className="font-semibold">{preset.intelligence.materialRecommendation}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Testimonials (Enterprise only) */}
                    {!isLocal && preset.testimonials && preset.testimonials.length > 0 && (
                      <div className="mb-4">
                        <h4 className="typography-h4 text-xs text-gray-700 mb-2">Authority Proof</h4>
                        <ul className="space-y-1">
                          {preset.testimonials.slice(0, 2).map((testimonial, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                              <div className="btn-primary" />
                              <span>{testimonial}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={() => handleSelect(preset.id)}
                      className={cn(
                        "w-full transition-all duration-300",
                        isSelected 
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : isLocal
                          ? "bg-gray-900 hover:bg-gray-800 text-white"
                          : "bg-amber-500 hover:bg-amber-600 text-white"
                      )}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {isLocal ? 'Pattern Applied' : 'Intelligence Commissioned'}
                        </>
                      ) : (
                        <>
                          {isLocal ? (
                            <>
                              <Home className="w-4 h-4 mr-2" />
                              Use This Pattern
                            </>
                          ) : (
                            <>
                              <Crown className="w-4 h-4 mr-2" />
                              Commission Intelligence
                            </>
                          )}
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


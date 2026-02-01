// src/components/fabricator/drafting/prestige/MaterialGallery.tsx
/**
 * Prestige Material Selection Gallery
 * 
 * Constitutional: All selections logged with audit trail
 * No ML: Rule-based recommendations only
 */

import React from 'react';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { logDraftingAction } from '../utils/constitutionalAudit';
import { cn } from '@/lib/utils';

export interface MaterialOption {
  id: string;
  name: string;
  title: string;
  description: string;
  features: string[];
  applications: string[];
  priceTier: 'Premium' | 'Value' | 'Industrial';
  badge?: string;
  visual?: React.ReactNode;
}

interface MaterialGalleryProps {
  materials: MaterialOption[];
  selectedMaterial?: string;
  onSelect: (materialId: string) => void;
  recommendedFor?: string; // Rule-based recommendation context
}

export const MaterialGallery: React.FC<MaterialGalleryProps> = ({
  materials,
  selectedMaterial,
  onSelect,
  recommendedFor
}) => {
  const handleSelect = (materialId: string) => {
    // Constitutional audit logging
    logDraftingAction(
      'material_selected',
      { 
        previousMaterial: selectedMaterial,
        newMaterial: materialId,
        recommendationContext: recommendedFor
      },
      { materialId },
      `CHECKPOINT-MATERIAL-SELECT-${Date.now()}`
    );

    onSelect(materialId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-6 h-6 text-amber-500" />
        <h2 className="typography-h2 text-gray-900">Choose Your Foundation</h2>
        {recommendedFor && (
          <Badge variant="outline" className="ml-auto">
            Recommended for: {recommendedFor}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {materials.map((material) => {
          const isSelected = selectedMaterial === material.id;
          
          return (
            <Card
              key={material.id}
              className={cn(
                "relative overflow-hidden transition-all duration-300 cursor-pointer group",
                "hover:shadow-2xl hover:-translate-y-2",
                isSelected 
                  ? "border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-white shadow-xl"
                  : "border border-gray-200 hover:border-amber-300"
              )}
              onClick={() => handleSelect(material.id)}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="btn-primary">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}

              {/* Badge */}
              {material.badge && (
                <div className="absolute top-4 left-4 z-10">
                  <Badge 
                    className={cn(
                      "shadow-md",
                      material.priceTier === 'Premium' && "bg-amber-500 text-white",
                      material.priceTier === 'Value' && "bg-blue-500 text-white",
                      material.priceTier === 'Industrial' && "bg-gray-800 text-white"
                    )}
                  >
                    {material.badge}
                  </Badge>
                </div>
              )}

              <CardContent className="p-6">
                {/* Header */}
                <div className="mb-4">
                  <h3 className="typography-h3 text-gray-900 mb-2">
                    {material.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {material.description}
                  </p>
                </div>

                {/* Visual Placeholder */}
                {material.visual && (
                  <div className="mb-4 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                    {material.visual}
                  </div>
                )}

                {/* Features */}
                <div className="mb-4">
                  <h4 className="typography-h4 text-sm text-gray-700 mb-2">Key Features</h4>
                  <ul className="space-y-1">
                    {material.features.map((feature, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="btn-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Applications */}
                <div>
                  <h4 className="typography-h4 text-sm text-gray-700 mb-2">Ideal For</h4>
                  <div className="flex flex-wrap gap-2">
                    {material.applications.map((app, i) => (
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

                {/* Price Tier Indicator */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Price Tier</span>
                    <Badge 
                      variant="outline"
                      className={cn(
                        material.priceTier === 'Premium' && "border-amber-500 text-amber-700",
                        material.priceTier === 'Value' && "border-blue-500 text-blue-700",
                        material.priceTier === 'Industrial' && "border-gray-500 text-gray-700"
                      )}
                    >
                      {material.priceTier}
                    </Badge>
                  </div>
                </div>
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


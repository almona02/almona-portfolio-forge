// src/components/fabricator/drafting/prestige/SystemAuthorityCard.tsx
/**
 * Prestige System Authority Selection
 * 
 * Constitutional: All selections logged, rule-based recommendations
 * Language: "Establish Authority" not "Select System"
 */

import React from 'react';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { CheckCircle2, Award, TrendingUp, Shield } from 'lucide-react';
import { logDraftingAction } from '../utils/constitutionalAudit';
import { cn } from '@/lib/utils';

export interface SystemAuthority {
  id: string;
  name: string;
  title: string;
  description: string;
  badge: string;
  capabilities: Array<{
    label: string;
    value: string;
  }>;
  recommendedFor: string[];
  visual?: React.ReactNode;
  testimonials?: string[];
  certifications?: string[];
  selectLabel?: string;
}

interface SystemAuthorityCardProps {
  system: SystemAuthority;
  selected?: boolean;
  onSelect: (systemId: string) => void;
  recommendationReason?: string; // Rule-based rationale
}

export const SystemAuthorityCard: React.FC<SystemAuthorityCardProps> = ({
  system,
  selected = false,
  onSelect,
  recommendationReason
}) => {
  const handleSelect = () => {
    // Constitutional audit logging
    logDraftingAction(
      'system_authority_established',
      {
        systemId: system.id,
        systemName: system.name,
        recommendationReason
      },
      { systemId: system.id },
      `CHECKPOINT-SYSTEM-AUTHORITY-${Date.now()}`
    );

    onSelect(system.id);
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 group",
        "hover:shadow-2xl hover:-translate-y-1",
        selected
          ? "border-2 border-amber-500 bg-gradient-to-br from-amber-50 via-white to-white shadow-xl"
          : "border border-gray-200 hover:border-amber-300"
      )}
    >
      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-amber-500 rounded-full p-1.5 shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      {/* Badge */}
      <div className="absolute top-4 left-4 z-10">
        <Badge className="bg-amber-500 text-white shadow-md">
          <Award className="w-3 h-3 mr-1" />
          {system.badge}
        </Badge>
      </div>

      {/* Recommendation Badge */}
      {recommendationReason && (
        <div className="absolute top-4 left-32 z-10">
          <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
            <TrendingUp className="w-3 h-3 mr-1" />
            Recommended
          </Badge>
        </div>
      )}

      <CardContent className="p-6 pt-16">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {system.title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {system.description}
          </p>
        </div>

        {/* Visual Placeholder */}
        {system.visual && (
          <div className="mb-6 h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
            {system.visual}
          </div>
        )}

        {/* Capabilities */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            System Capabilities
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {system.capabilities.map((cap, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{cap.label}</div>
                <div className="text-sm font-semibold text-gray-900">{cap.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended For */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Recommended For</h4>
          <div className="flex flex-wrap gap-2">
            {system.recommendedFor.map((app, i) => (
              <Badge 
                key={i} 
                variant="secondary" 
                className="text-xs bg-amber-50 text-amber-700 border-amber-200"
              >
                {app}
              </Badge>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        {system.testimonials && system.testimonials.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Authority Proof</h4>
            <ul className="space-y-2">
              {system.testimonials.map((testimonial, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <span>{testimonial}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Certifications */}
        {system.certifications && system.certifications.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Certifications</h4>
            <div className="flex flex-wrap gap-2">
              {system.certifications.map((cert, i) => (
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
          onClick={handleSelect}
          className={cn(
            "w-full transition-all duration-300",
            selected
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "bg-gray-900 hover:bg-gray-800 text-white"
          )}
        >
          {selected ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Authority Established
            </>
          ) : (
            <>
              <Award className="w-4 h-4 mr-2" />
              {system.selectLabel || 'Establish Authority'}
            </>
          )}
        </Button>

        {/* Recommendation Reason */}
        {recommendationReason && !selected && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">
              <strong>Why this system:</strong> {recommendationReason}
            </p>
          </div>
        )}
      </CardContent>

      {/* Hover Overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        "pointer-events-none"
      )} />
    </Card>
  );
};


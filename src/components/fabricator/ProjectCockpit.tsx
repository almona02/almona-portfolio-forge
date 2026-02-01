/**
 * Project Cockpit - Step 1 of Adaptive Design Workflow
 * Visual dashboard for selecting project type to pre-load relevant settings
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Building2, Home, Wrench, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProjectType = 'residential_villa' | 'commercial_building' | 'standard_apartment' | 'repair_maintenance';

export interface ProjectTypeConfig {
  id: ProjectType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  suggestedSystems: string[];
  defaultSettings: {
    prioritizeRemnants?: boolean;
    markupPercentage?: number;
    wasteTarget?: number;
  };
}

const PROJECT_TYPES: ProjectTypeConfig[] = [
  {
    id: 'residential_villa',
    name: 'Residential Villa',
    description: 'Sliding doors, decorative elements, premium systems',
    icon: Home,
    suggestedSystems: ['JUMBO100', 'KALE_70_SLIDING', 'ASAS_CW100'],
    defaultSettings: {
      markupPercentage: 40,
      wasteTarget: 8,
    },
  },
  {
    id: 'commercial_building',
    name: 'Commercial Building',
    description: 'Curtain walls, large spans, structural systems',
    icon: Building2,
    suggestedSystems: ['ASAS_COMMERCIAL', 'KALE_COMMERCIAL', 'ROCK60'],
    defaultSettings: {
      markupPercentage: 35,
      wasteTarget: 10,
    },
  },
  {
    id: 'standard_apartment',
    name: 'Standard Apartment',
    description: 'Common PS or Jumbo systems, cost-optimized',
    icon: Building,
    suggestedSystems: ['CALUMINIUM_PS', 'JUMBO100', 'ROCK60'],
    defaultSettings: {
      markupPercentage: 30,
      wasteTarget: 12,
    },
  },
  {
    id: 'repair_maintenance',
    name: 'Repair/Maintenance Job',
    description: 'Prioritizes using remnants, minimal new material',
    icon: Wrench,
    suggestedSystems: [],
    defaultSettings: {
      prioritizeRemnants: true,
      markupPercentage: 25,
      wasteTarget: 5,
    },
  },
];

interface ProjectCockpitProps {
  selectedType?: ProjectType;
  onSelectType: (type: ProjectType) => void;
  className?: string;
}

export const ProjectCockpit: React.FC<ProjectCockpitProps> = ({
  selectedType,
  onSelectType,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-center space-y-2">
        <h2 className="typography-h2 text-white">What Are We Building?</h2>
        <p className="text-sm text-gray-400">
          Select your project type to pre-load relevant settings and system packs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROJECT_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;

          return (
            <Card
              key={type.id}
              className={cn(
                'cursor-pointer transition-all hover:border-amber-500/50',
                isSelected
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
              )}
              onClick={() => onSelectType(type.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isSelected ? 'bg-amber-500/20' : 'bg-gray-700/50'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-6 w-6',
                        isSelected ? 'text-amber-400' : 'text-gray-400'
                      )}
                    />
                  </div>
                  <CardTitle className="text-lg">{type.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-gray-300 mb-3">
                  {type.description}
                </CardDescription>
                {type.suggestedSystems.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-medium">Suggested Systems:</p>
                    <div className="flex flex-wrap gap-1">
                      {type.suggestedSystems.map((system) => (
                        <span
                          key={system}
                          className="text-xs px-2 py-0.5 bg-gray-700/50 rounded text-gray-300"
                        >
                          {system}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export const getProjectTypeConfig = (type: ProjectType): ProjectTypeConfig | undefined => {
  return PROJECT_TYPES.find((t) => t.id === type);
};


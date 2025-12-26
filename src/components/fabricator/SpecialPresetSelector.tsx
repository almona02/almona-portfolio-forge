/**
 * SpecialPresetSelector - Main Selector for Special Presets
 * 
 * Provides a unified interface for selecting and configuring special presets:
 * - Fly Screens (magnetic, fixed, sliding)
 * - Custom Mullions (structural validation)
 * - Tall Windows (segmented)
 * - Bent Profiles (domes, arches)
 * - Egyptian Specials (sand/dust protection, thermal breaks)
 * 
 * @since Phase 1: Special Presets Engine (Week 1-2)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { 
  Grid3x3, 
  MoveVertical, 
  Circle, 
  Plus,
  Shield,
  Thermometer,
  ArrowRight
} from 'lucide-react';
import type { WindowUnit } from '@/types/fabricator';
import { FlyScreenDesigner } from './special/FlyScreenDesigner';
import { CustomMullionDesigner } from './special/CustomMullionDesigner';
import { TallWindowDesigner } from './special/TallWindowDesigner';
import { EgyptianSpecialsDesigner } from './special/EgyptianSpecialsDesigner';

export type SpecialPresetType = 
  | 'fly_screen' 
  | 'tall_window' 
  | 'bent_profile' 
  | 'custom_mullion'
  | 'egyptian_specials';

interface SpecialPresetSelectorProps {
  windowUnit: WindowUnit;
  onPresetSelected?: (presetType: SpecialPresetType) => void;
  onCancel?: () => void;
}

interface PresetTypeOption {
  id: SpecialPresetType;
  name: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  available: boolean;
}

const PRESET_OPTIONS: PresetTypeOption[] = [
  {
    id: 'fly_screen',
    name: 'Fly Screen Assembly',
    description: 'Magnetic, fixed, or sliding screens with Egyptian mesh suppliers',
    icon: <Grid3x3 className="h-6 w-6" />,
    badge: '99.5% Accuracy',
    available: true
  },
  {
    id: 'tall_window',
    name: 'Tall Segmented Window',
    description: 'Automatic segmentation for windows > 2.4m with inter-segment connections',
    icon: <MoveVertical className="h-6 w-6" />,
    badge: '99.7% Accuracy',
    available: true // Available in Week 5-6
  },
  {
    id: 'bent_profile',
    name: 'Bent Profiles / Domes',
    description: 'Curved profiles for arches and domes with bend radius validation',
    icon: <Circle className="h-6 w-6" />,
    badge: '98.5% Accuracy',
    available: false // Will be available in Phase 4
  },
  {
    id: 'custom_mullion',
    name: 'Custom Mullion Placement',
    description: 'Structural validation and thermal bridging analysis for custom mullions',
    icon: <Plus className="h-6 w-6" />,
    badge: '99.2% Accuracy',
    available: true // Available in Week 3-4
  },
  {
    id: 'egyptian_specials',
    name: 'Egyptian Special Presets',
    description: 'Sand/dust protection and thermal break optimization for Egyptian climate',
    icon: <Shield className="h-6 w-6" />,
    badge: 'Available',
    available: true // Available in Week 7-8
  }
];

export const SpecialPresetSelector: React.FC<SpecialPresetSelectorProps> = ({
  windowUnit,
  onPresetSelected,
  onCancel
}) => {
  const [selectedPreset, setSelectedPreset] = useState<SpecialPresetType | null>(null);

  const handlePresetSelect = (presetType: SpecialPresetType) => {
    const option = PRESET_OPTIONS.find(opt => opt.id === presetType);
    if (!option || !option.available) {
      return; // Don't allow selection of unavailable presets
    }

    setSelectedPreset(presetType);
    if (onPresetSelected) {
      onPresetSelected(presetType);
    }
  };

  const handleBack = () => {
    setSelectedPreset(null);
  };

  // If a preset is selected, render the specific designer
  if (selectedPreset === 'fly_screen') {
    return (
      <FlyScreenDesigner
        windowUnit={windowUnit}
        onCancel={handleBack}
      />
    );
  }

  if (selectedPreset === 'custom_mullion') {
    return (
      <CustomMullionDesigner
        windowUnit={windowUnit}
        onCancel={handleBack}
      />
    );
  }

  if (selectedPreset === 'tall_window') {
    return (
      <TallWindowDesigner
        windowUnit={windowUnit}
        onCancel={handleBack}
      />
    );
  }

  if (selectedPreset === 'egyptian_specials') {
    return (
      <EgyptianSpecialsDesigner
        windowUnit={windowUnit}
        onCancel={handleBack}
      />
    );
  }

  // Default: Show preset selection interface
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="h-8 w-8 text-orange-500" />
              Special Preset Designer
            </h1>
            <p className="text-gray-400 mt-2">
              Design complex window assemblies with preset-aware accuracy
            </p>
          </div>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {/* Preset Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_OPTIONS.map((option) => (
            <Card
              key={option.id}
              className={`bg-gray-900/50 border-gray-800 cursor-pointer transition-all hover:border-orange-500/50 ${
                !option.available ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => handlePresetSelect(option.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="text-orange-500">{option.icon}</div>
                  {option.badge && (
                    <Badge 
                      variant="outline" 
                      className={`${
                        option.available 
                          ? 'bg-green-900/30 text-green-400 border-green-800' 
                          : 'bg-gray-800 text-gray-500 border-gray-700'
                      }`}
                    >
                      {option.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-white mt-4">{option.name}</CardTitle>
                <CardDescription className="text-gray-400">
                  {option.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!option.available}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePresetSelect(option.id);
                  }}
                >
                  {option.available ? (
                    <>
                      Select <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    'Coming Soon'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-orange-500" />
              About Special Presets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-300">
            <p>
              Special presets provide intelligent, preset-aware design for complex window assemblies
              that require specialized engineering knowledge.
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>Fly Screens:</strong> Complete BOM with Egyptian mesh suppliers, 
                magnetic/fixed/sliding mounting systems, and assembly sequences.
              </li>
              <li>
                <strong>Tall Windows:</strong> Automatic segmentation with inter-segment 
                connections and hardware synchronization.
              </li>
              <li>
                <strong>Bent Profiles:</strong> Curve calculations with bend radius validation 
                and springback compensation.
              </li>
              <li>
                <strong>Custom Mullions:</strong> Structural validation with Egyptian Code 2020 
                compliance and thermal bridging analysis.
              </li>
              <li>
                <strong>Egyptian Specials:</strong> Climate-specific solutions for sand/dust 
                protection and thermal break optimization.
              </li>
            </ul>
            <p className="text-xs text-gray-500 mt-4">
              All special presets integrate with the existing 99.8% accurate DualOutputGenerator 
              for production-ready BOMs and cut lists.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


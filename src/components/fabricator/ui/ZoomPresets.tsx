/**
 * ZoomPresets Component
 * 
 * Button group component for zoom preset selection (Fit, 100%, 200%, Custom).
 * Part of Phase 2: Dark/Light Theme & Zoom Presets implementation.
 * 
 * Features:
 * - Preset buttons: Fit, 100%, 200%, Custom
 * - Zustand store integration (per workspace type)
 * - Visual indicator of current preset
 * - Callback prop for zoom change coordination
 * - Accessible keyboard navigation
 */

import React from 'react';
import { ZoomIn, Maximize2, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFabricatorUIStore, type ZoomPreset } from '@/stores/fabricatorUIStore';
import { Button } from '@/shared/ui/ui/button';

export interface ZoomPresetsProps {
  workspaceType?: string;
  onZoomChange?: (preset: ZoomPreset) => void;
  className?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'ghost' | 'outline';
}

const PRESET_OPTIONS: Array<{ value: ZoomPreset; label: string; icon: React.ReactNode }> = [
  { value: 'fit', label: 'Fit', icon: <Maximize2 className="h-4 w-4" /> },
  { value: '1:1', label: '100%', icon: <Minus className="h-4 w-4" /> },
  { value: '200%', label: '200%', icon: <Plus className="h-4 w-4" /> },
  { value: 'custom', label: 'Custom', icon: <ZoomIn className="h-4 w-4" /> },
];

export const ZoomPresets: React.FC<ZoomPresetsProps> = ({
  workspaceType = 'default',
  onZoomChange,
  className = '',
  size = 'sm',
  variant = 'outline',
}) => {
  const zoomPresets = useFabricatorUIStore((state) => state.zoomPresets);
  const setZoomPreset = useFabricatorUIStore((state) => state.setZoomPreset);

  const currentPreset = zoomPresets[workspaceType] || 'fit';

  const handlePresetSelect = (preset: ZoomPreset) => {
    setZoomPreset(workspaceType, preset);
    onZoomChange?.(preset);
  };

  // Map 'md' to 'default' since Button component doesn't support 'md'
  const buttonSize: 'sm' | 'default' | 'lg' | 'icon' = size === 'md' ? 'default' : size;

  return (
    <div className={cn('flex items-center gap-1', className)} role="group" aria-label="Zoom presets">
      {PRESET_OPTIONS.map((option) => {
        const isActive = currentPreset === option.value;
        return (
          <Button
            key={option.value}
            variant={variant}
            size={buttonSize}
            onClick={() => handlePresetSelect(option.value)}
            className={cn(
              'transition-all duration-150',
              'hover:scale-105 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-amber-500/50',
              isActive && 'bg-amber-900/30 border-amber-500/50 text-amber-200'
            )}
            aria-label={`Zoom to ${option.label}`}
            aria-pressed={isActive}
            title={`Zoom to ${option.label}`}
          >
            {option.icon}
            <span className="ml-1.5 text-xs">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

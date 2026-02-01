/**
 * Zoom Controls Component
 * 
 * Gold-tier zoom control toolbar with zoom in, zoom out, zoom to fit,
 * zoom to selection, and zoom level indicator.
 * 
 * @since UI/UX Gold-Tier Implementation
 */

import React from 'react';
import { Button } from '@/shared/ui/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Focus, RotateCcw } from 'lucide-react';
import { formatZoomLevel, type Viewport } from '../utils/viewportUtils';
import { EnhancedTooltip } from './EnhancedTooltip';
import { safeEventHandler } from '../utils/componentHardening';

interface ZoomControlsProps {
  viewport: Viewport;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
  onZoomToSelection: () => void;
  onReset: () => void;
  className?: string;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  viewport,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onZoomToSelection,
  onReset,
  className
}) => {
  // Validate viewport
  if (!viewport || typeof viewport !== 'object') {
    console.error('ZoomControls: Invalid viewport prop');
    return null;
  }
  
  // Safe event handlers
  const handleZoomIn = safeEventHandler(() => {
    onZoomIn();
  }, 'ZoomControls', 'zoomIn');
  
  const handleZoomOut = safeEventHandler(() => {
    onZoomOut();
  }, 'ZoomControls', 'zoomOut');
  
  const handleZoomToFit = safeEventHandler(() => {
    onZoomToFit();
  }, 'ZoomControls', 'zoomToFit');
  
  const handleZoomToSelection = safeEventHandler(() => {
    onZoomToSelection();
  }, 'ZoomControls', 'zoomToSelection');
  
  const handleReset = safeEventHandler(() => {
    onReset();
  }, 'ZoomControls', 'reset');
  
  return (
    <div className={`flex items-center gap-2 bg-slate-900/95 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-amber-600/20 ${className || ''}`}>
      <EnhancedTooltip toolKey="zoom-out" placement="bottom" delay={300}>
        <Button
          onClick={handleZoomOut}
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-slate-700/50 bg-slate-800/50 text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-600/50"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
      </EnhancedTooltip>
      
      <div className="px-3 py-1 bg-slate-800/50 rounded text-xs font-mono min-w-[60px] text-center text-amber-300 border border-amber-600/20">
        {formatZoomLevel(viewport)}
      </div>
      
      <EnhancedTooltip toolKey="zoom-in" placement="bottom" delay={300}>
        <Button
          onClick={handleZoomIn}
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-slate-700/50 bg-slate-800/50 text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-600/50"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </EnhancedTooltip>
      
      <div className="w-px h-6 bg-amber-600/20 mx-1" />
      
      <EnhancedTooltip toolKey="zoom-to-fit" placement="bottom" delay={300}>
        <Button
          onClick={handleZoomToFit}
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs border-slate-700/50 bg-slate-800/50 text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-600/50"
          aria-label="Zoom to Fit"
        >
          <Maximize2 className="w-3 h-3 mr-1" />
          Fit
        </Button>
      </EnhancedTooltip>
      
      <EnhancedTooltip toolKey="zoom-to-selection" placement="bottom" delay={300}>
        <Button
          onClick={handleZoomToSelection}
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs border-slate-700/50 bg-slate-800/50 text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-600/50"
          aria-label="Zoom to Selection"
          disabled={!viewport}
        >
          <Focus className="w-3 h-3 mr-1" />
          Selection
        </Button>
      </EnhancedTooltip>
      
      <div className="w-px h-6 bg-amber-600/20 mx-1" />
      
      <EnhancedTooltip toolKey="reset-viewport" placement="bottom" delay={300}>
        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-slate-700/50 bg-slate-800/50 text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-600/50"
          aria-label="Reset Viewport"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </EnhancedTooltip>
    </div>
  );
};


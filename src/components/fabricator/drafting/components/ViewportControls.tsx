/**
 * Viewport Controls Component
 * 
 * Gold-tier viewport presets, navigation, and synchronization controls.
 * Provides professional viewport management with presets and navigation.
 * 
 * @since UI/UX Gold-Tier Implementation
 */

import { Button } from '@/shared/ui/ui/button';
import {
    ChevronDown,
    ChevronLeft, ChevronRight, ChevronUp,
    Eye, EyeOff,
    Focus,
    Layers,
    Maximize2,
    Navigation,
    RotateCcw
} from 'lucide-react';
import React, { useState } from 'react';
import type { Geometry2D } from '../types/drafting';
import { safeEventHandler } from '../utils/componentHardening';
import { formatZoomLevel, type Viewport } from '../utils/viewportUtils';

export type ViewportPreset = 
  | 'fit' 
  | '1:1' 
  | 'custom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

export interface ViewportHistory {
  viewport: Viewport;
  timestamp: Date;
  name?: string;
}

interface ViewportControlsProps {
  viewport: Viewport;
  geometry: Geometry2D;
  canvasWidth: number;
  canvasHeight: number;
  onViewportChange: (viewport: Viewport) => void;
  onPresetSelect: (preset: ViewportPreset) => void;
  onNavigate: (direction: 'left' | 'right' | 'up' | 'down', amount: number) => void;
  className?: string;
}

export const ViewportControls: React.FC<ViewportControlsProps> = ({
  viewport,
  geometry,
  canvasWidth: _canvasWidth,
  canvasHeight: _canvasHeight,
  onViewportChange,
  onPresetSelect,
  onNavigate: _onNavigate,
  className
}) => {
  const [viewportHistory, setViewportHistory] = useState<ViewportHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Navigation amounts (as percentage of viewport)
  const navigationAmounts = [10, 25, 50, 100]; // Percentage of viewport size
  const [navAmount, setNavAmount] = useState(25);
  
  // Handle preset selection
  const handlePresetSelect = safeEventHandler((preset: ViewportPreset) => {
    // Save current viewport to history
    setViewportHistory(prev => [
      { viewport, timestamp: new Date() },
      ...prev.slice(0, 9) // Keep last 10
    ]);
    
    onPresetSelect(preset);
  }, 'ViewportControls', 'presetSelect');
  
  // Handle navigation (with error handling)
  const handleNavigate = safeEventHandler((direction: 'left' | 'right' | 'up' | 'down') => {
    const bounds = {
      minX: viewport.centerX - (viewport.width / (2 * viewport.zoom)),
      minY: viewport.centerY - (viewport.height / (2 * viewport.zoom)),
      maxX: viewport.centerX + (viewport.width / (2 * viewport.zoom)),
      maxY: viewport.centerY + (viewport.height / (2 * viewport.zoom))
    };
    
    const viewportWidth = bounds.maxX - bounds.minX;
    const viewportHeight = bounds.maxY - bounds.minY;
    const moveAmount = (navAmount / 100) * (direction === 'left' || direction === 'right' ? viewportWidth : viewportHeight);
    
    let newCenterX = viewport.centerX;
    let newCenterY = viewport.centerY;
    
    switch (direction) {
      case 'left':
        newCenterX -= moveAmount;
        break;
      case 'right':
        newCenterX += moveAmount;
        break;
      case 'up':
        newCenterY -= moveAmount;
        break;
      case 'down':
        newCenterY += moveAmount;
        break;
    }
    
    onViewportChange({
      ...viewport,
      centerX: newCenterX,
      centerY: newCenterY
    });
  }, 'ViewportControls', 'navigate');
  
  // Restore from history (with error handling)
  const handleRestoreFromHistory = safeEventHandler((historyItem: ViewportHistory) => {
    onViewportChange(historyItem.viewport);
  }, 'ViewportControls', 'restoreFromHistory');
  
  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* Viewport Presets */}
      <div className="bg-slate-950/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Navigation className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-100">Viewport Presets</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handlePresetSelect('fit')}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            title="Zoom to Fit All Geometry"
          >
            <Maximize2 className="w-3 h-3 mr-1" />
            Fit All
          </Button>
          
          <Button
            onClick={() => handlePresetSelect('1:1')}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            title="1:1 Scale (100% zoom)"
          >
            <Focus className="w-3 h-3 mr-1" />
            1:1 Scale
          </Button>
          
          <Button
            onClick={() => handlePresetSelect('center')}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            title="Center Viewport"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Center
          </Button>
          
          <Button
            onClick={() => handlePresetSelect('custom')}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            title="Custom Viewport"
          >
            <Layers className="w-3 h-3 mr-1" />
            Custom
          </Button>
        </div>
      </div>
      
      {/* Navigation Controls */}
      <div className="bg-slate-950/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-100">Navigate</h3>
          </div>
          <select
            value={navAmount}
            onChange={(e) => setNavAmount(Number(e.target.value))}
            className="h-6 w-16 text-xs border border-slate-700/50 rounded px-1 bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            title="Navigation Amount"
          >
            {navigationAmounts.map(amount => (
              <option key={amount} value={amount}>
                {amount}%
              </option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-3 gap-1">
          <div /> {/* Empty cell */}
          <Button
            onClick={() => handleNavigate('up')}
            variant="outline"
            size="sm"
            className="h-8 w-full"
            title={`Pan Up ${navAmount}%`}
            aria-label="Pan Up"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <div /> {/* Empty cell */}
          
          <Button
            onClick={() => handleNavigate('left')}
            variant="outline"
            size="sm"
            className="h-8 w-full"
            title={`Pan Left ${navAmount}%`}
            aria-label="Pan Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={() => handlePresetSelect('center')}
            variant="outline"
            size="sm"
            className="h-8 w-full"
            title="Center Viewport"
            aria-label="Center"
          >
            <Focus className="w-3 h-3" />
          </Button>
          
          <Button
            onClick={() => handleNavigate('right')}
            variant="outline"
            size="sm"
            className="h-8 w-full"
            title={`Pan Right ${navAmount}%`}
            aria-label="Pan Right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <div /> {/* Empty cell */}
          <Button
            onClick={() => handleNavigate('down')}
            variant="outline"
            size="sm"
            className="h-8 w-full"
            title={`Pan Down ${navAmount}%`}
            aria-label="Pan Down"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <div /> {/* Empty cell */}
        </div>
      </div>
      
      {/* Viewport History */}
      {viewportHistory.length > 0 && (
        <div className="bg-slate-950/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-100">History</h3>
            </div>
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title={showHistory ? "Hide History" : "Show History"}
            >
              {showHistory ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </div>
          
          {showHistory && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {viewportHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleRestoreFromHistory(item)}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-slate-800/50 rounded flex items-center justify-between transition-colors"
                  title={`Restore viewport from ${item.timestamp.toLocaleTimeString()}`}
                >
                  <span className="text-slate-300">
                    {item.name || `Viewport ${index + 1}`}
                  </span>
                  <span className="text-slate-400 text-xs font-mono">
                    {formatZoomLevel(item.viewport)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Current Viewport Info */}
      <div className="bg-slate-950/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-100">Viewport Info</h3>
        </div>
        
        <div className="space-y-1 text-xs text-slate-300">
          <div className="flex justify-between">
            <span>Zoom:</span>
            <span className="font-mono font-medium text-amber-300">{formatZoomLevel(viewport)}</span>
          </div>
          <div className="flex justify-between">
            <span>Center X:</span>
            <span className="font-mono text-amber-300">{Math.round(viewport.centerX)}mm</span>
          </div>
          <div className="flex justify-between">
            <span>Center Y:</span>
            <span className="font-mono text-amber-300">{Math.round(viewport.centerY)}mm</span>
          </div>
          <div className="flex justify-between">
            <span>Elements:</span>
            <span className="font-mono text-amber-300">
              {geometry.rectangles.length + geometry.circles.length + 
               geometry.lines.length + geometry.arcs.length + geometry.polygons.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


/**
 * Cut Simulation Viewer Component
 * HIGHEST UI/UX PRIORITY - Visual feedback loop is critical
 * Displays 2D/3D visualization of cuts with K-factor application
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { ZoomIn, ZoomOut, RotateCw, Info, AlertTriangle } from 'lucide-react';
import { cutSimulator, type FrameSimulation, type CutSimulation } from '@/lib/simulation/CutSimulator';
import type { WindowComponent, Profile, OptimizationResult } from '@/types/fabricator';

interface CutSimulationViewerProps {
  components: WindowComponent[];
  profiles: Profile[];
  optimizationResult?: OptimizationResult;
  onCutClick?: (cut: CutSimulation) => void;
  selectedCutId?: string;
}

export const CutSimulationViewer: React.FC<CutSimulationViewerProps> = ({
  components,
  profiles,
  optimizationResult,
  onCutClick,
  selectedCutId,
}) => {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [selectedCorner, setSelectedCorner] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Generate simulation
  const simulation = useMemo(() => {
    return cutSimulator.generateFrameSimulation(components, profiles, optimizationResult);
  }, [components, profiles, optimizationResult]);

  // Validate simulation
  const validation = useMemo(() => {
    return cutSimulator.validateSimulation(simulation);
  }, [simulation]);

  // Calculate viewport dimensions
  const viewportWidth = 800;
  const viewportHeight = 600;
  const scale = Math.min(viewportWidth / simulation.width, viewportHeight / simulation.height) * zoom * 0.8;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setSelectedCorner(null);
  };

  const handleCornerClick = (cornerIndex: number) => {
    setSelectedCorner(cornerIndex === selectedCorner ? null : cornerIndex);
  };

  const selectedCornerData = selectedCorner !== null ? simulation.corners[selectedCorner] : null;

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Info className="h-5 w-5 text-green-400" /> Cut Simulation Preview
        </CardTitle>
        <CardDescription className="text-gray-400">
          Visual representation of cuts with K-factors applied
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Warnings/Errors */}
        {validation.warnings.length > 0 && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-400 mb-1">Warnings</p>
                <ul className="text-xs text-yellow-300 space-y-1">
                  {validation.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {validation.errors.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-400 mb-1">Errors</p>
                <ul className="text-xs text-red-300 space-y-1">
                  {validation.errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              <RotateCw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <span className="text-xs text-gray-400 ml-2">
              Zoom: {(zoom * 100).toFixed(0)}%
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-300 border-gray-600 hover:bg-gray-700"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>

        {/* Simulation Canvas */}
        <div
          className="relative bg-gray-900 border border-gray-700 rounded overflow-hidden"
          style={{ width: viewportWidth, height: viewportHeight }}
        >
          <svg
            width={viewportWidth}
            height={viewportHeight}
            viewBox={`${panX} ${panY} ${viewportWidth / scale} ${viewportHeight / scale}`}
            className="absolute inset-0"
          >
            {/* Frame outline */}
            <rect
              x={0}
              y={0}
              width={simulation.width}
              height={simulation.height}
              fill="none"
              stroke="#4a5568"
              strokeWidth={2}
              strokeDasharray="5,5"
            />

            {/* Cuts visualization */}
            {simulation.cuts.map((cut, idx) => {
              const isSelected = selectedCutId === cut.componentId;
              const strokeColor = isSelected ? '#3b82f6' : cut.cutAngle === 45 ? '#10b981' : '#6366f1';
              const strokeWidth = isSelected ? 3 : 2;

              // Draw cut line (simplified - would need actual geometry)
              const startX = idx % 2 === 0 ? 0 : simulation.width;
              const startY = idx < 2 ? 0 : simulation.height;
              const endX = idx % 2 === 0 ? simulation.width : 0;
              const endY = idx < 2 ? simulation.height : 0;

              return (
                <line
                  key={idx}
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  opacity={0.7}
                  onClick={() => onCutClick?.(cut)}
                  className="cursor-pointer"
                />
              );
            })}

            {/* Corner markers */}
            {simulation.corners.map((corner, idx) => {
              const isSelected = selectedCorner === idx;
              return (
                <circle
                  key={idx}
                  cx={corner.x}
                  cy={corner.y}
                  r={isSelected ? 15 : 10}
                  fill={isSelected ? '#3b82f6' : '#10b981'}
                  stroke="#fff"
                  strokeWidth={2}
                  opacity={0.8}
                  onClick={() => handleCornerClick(idx)}
                  className="cursor-pointer"
                />
              );
            })}
          </svg>

          {/* Overlay info */}
          {showDetails && (
            <div className="absolute top-2 right-2 bg-gray-900/90 border border-gray-700 rounded p-2 text-xs text-gray-300 max-w-xs">
              <p className="font-semibold mb-1">Frame Dimensions:</p>
              <p>Width: {simulation.width}mm</p>
              <p>Height: {simulation.height}mm</p>
              <p className="font-semibold mt-2 mb-1">Total Cuts: {simulation.cuts.length}</p>
            </div>
          )}
        </div>

        {/* Selected Cut Details */}
        {selectedCornerData && (
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Corner Details</h4>
            <div className="space-y-2">
              {selectedCornerData.cuts.map((cut, idx) => (
                <div key={idx} className="p-2 bg-gray-800 rounded text-xs">
                  <p className="text-gray-300 font-medium">{cut.componentName}</p>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-gray-400">
                    <div>
                      <span className="text-gray-500">Final:</span> {cut.originalDimension}mm
                    </div>
                    <div>
                      <span className="text-gray-500">Cut:</span>{' '}
                      <span className="text-green-400 font-semibold">{cut.cutLength.toFixed(2)}mm</span>
                    </div>
                    <div>
                      <span className="text-gray-500">K-Factor:</span> {cut.kFactor.toFixed(2)}mm
                    </div>
                    <div>
                      <span className="text-gray-500">Angle:</span> {cut.cutAngle}°
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cut List Summary */}
        <div className="p-3 bg-gray-900 rounded border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Cut Summary</h4>
          <div className="space-y-1 text-xs">
            {simulation.cuts.slice(0, 5).map((cut, idx) => (
              <div key={idx} className="flex justify-between text-gray-400">
                <span>{cut.componentName}</span>
                <span className="text-green-400">
                  {cut.originalDimension}mm → {cut.cutLength.toFixed(2)}mm
                </span>
              </div>
            ))}
            {simulation.cuts.length > 5 && (
              <p className="text-gray-500 mt-1">... and {simulation.cuts.length - 5} more cuts</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


/**
 * Memoized Rectangle Component
 * 
 * Performance-optimized rectangle rendering component with React.memo
 * to prevent unnecessary re-renders in large drawings.
 * 
 * Features:
 * - Template-based grid rendering (mullions/transoms)
 * - Layer-aware styling
 * - Selection and hover states
 */

import React from 'react';
import { useDraftingContext } from '../DraftingContext';
import type { Rectangle } from '../types/drafting';

interface GeometryRectangleProps {
  rect: Rectangle;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  isLocked: boolean;
  layerColor: string;
  layerLineWeight: number;
  layerStrokeDasharray: string;
  selectedTool: string;
  viewportZoom: number;
  onMouseDown: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const GeometryRectangle = React.memo<GeometryRectangleProps>(({
  rect,
  index,
  isSelected,
  isHovered,
  isLocked,
  layerColor,
  layerLineWeight,
  layerStrokeDasharray,
  selectedTool,
  viewportZoom,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onKeyDown
}) => {
  const drafting = useDraftingContext();
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const rotationAngle = rect.rotation || 0;
  const rotationRad = (rotationAngle * Math.PI) / 180;
  
  // Get active template for grid rendering
  const activeTemplate = drafting.getActiveTemplate();
  const availableTemplates = drafting.getAvailableTemplates();
  const template = availableTemplates.find(t => t.id === activeTemplate);
  
  // Calculate grid lines based on template
  const gridLines: React.ReactNode[] = [];
  if (template && template.rows > 0 && template.cols > 0) {
    const cellWidth = rect.width / template.cols;
    const cellHeight = rect.height / template.rows;
    
    // Draw vertical mullions (between columns)
    for (let col = 1; col < template.cols; col++) {
      const x = rect.x + col * cellWidth;
      gridLines.push(
        <line
          key={`mullion-${col}`}
          x1={x}
          y1={rect.y}
          x2={x}
          y2={rect.y + rect.height}
          stroke="#64748b"
          strokeWidth={2}
          opacity={0.6}
          className="pointer-events-none"
        />
      );
    }
    
    // Draw horizontal transoms (between rows)
    for (let row = 1; row < template.rows; row++) {
      const y = rect.y + row * cellHeight;
      gridLines.push(
        <line
          key={`transom-${row}`}
          x1={rect.x}
          y1={y}
          x2={rect.x + rect.width}
          y2={y}
          stroke="#64748b"
          strokeWidth={2}
          opacity={0.6}
          className="pointer-events-none"
        />
      );
    }
  }
  
  return (
    <g key={rect.id || index}>
      {/* Hover overlay - Enhanced with amber theme */}
      {isHovered && !isLocked && (
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill="rgba(251, 191, 36, 0.08)"
          stroke="rgba(251, 191, 36, 0.6)"
          strokeWidth={2}
          strokeDasharray="4,4"
          className="pointer-events-none transition-all duration-150"
        />
      )}
      
      {/* Selection overlay - Enhanced with amber theme and glow */}
      {isSelected && (
        <>
          {/* Outer glow */}
          <rect
            x={rect.x - 6}
            y={rect.y - 6}
            width={rect.width + 12}
            height={rect.height + 12}
            fill="none"
            stroke="rgba(251, 191, 36, 0.3)"
            strokeWidth={5}
            strokeDasharray="8,4"
            className="pointer-events-none"
            opacity={0.5}
          />
          {/* Main selection border */}
          <rect
            x={rect.x - 4}
            y={rect.y - 4}
            width={rect.width + 8}
            height={rect.height + 8}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={3}
            strokeDasharray="8,4"
            className="pointer-events-none"
          />
          {/* Inner highlight */}
          <rect
            x={rect.x - 2}
            y={rect.y - 2}
            width={rect.width + 4}
            height={rect.height + 4}
            fill="none"
            stroke="rgba(251, 191, 36, 0.4)"
            strokeWidth={1}
            className="pointer-events-none"
          />
        </>
      )}
      
      {/* Main rectangle - Layer-aware rendering with rotation */}
      <g transform={`translate(${centerX}, ${centerY}) rotate(${rotationAngle}) translate(${-centerX}, ${-centerY})`}>
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill="white"
          stroke={isSelected ? "#fbbf24" : isHovered ? "#fcd34d" : layerColor}
          strokeWidth={isSelected ? 2.5 : isHovered ? 2 : layerLineWeight}
          strokeDasharray={layerStrokeDasharray}
          opacity={isLocked ? 0.6 : 1}
          className={isLocked || selectedTool !== 'select' ? "cursor-not-allowed" : "cursor-move"}
          role="button"
          aria-label={`Rectangle ${index + 1}, ${Math.round(rect.width)}mm by ${Math.round(rect.height)}mm`}
          aria-pressed={isSelected}
          tabIndex={selectedTool === 'select' ? 0 : -1}
          onMouseDown={onMouseDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onKeyDown={onKeyDown}
        />
        
        {/* Template grid lines (mullions/transoms) */}
        {gridLines}
      </g>
      
      {/* Selection handles (only when selected and not locked) */}
      {isSelected && !isLocked && (
        <>
          {/* Corner handles */}
          {[
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x, y: rect.y + rect.height },
          ].map((handle, handleIndex) => (
            <circle
              key={`handle-${handleIndex}`}
              cx={handle.x}
              cy={handle.y}
              r={6 / viewportZoom}
              fill="#fbbf24"
              stroke="white"
              strokeWidth={2 / viewportZoom}
              className="cursor-nwse-resize transition-all duration-150 hover:scale-110"
            />
          ))}
          
          {/* Rotation handle and arc indicator */}
          {rotationAngle !== 0 && (() => {
            const handleRadius = 25;
            const handleX = centerX + handleRadius * Math.cos(rotationRad - Math.PI / 2);
            const handleY = centerY + handleRadius * Math.sin(rotationRad - Math.PI / 2);
            
            return (
              <g>
                {/* Rotation arc indicator */}
                <path
                  d={`M ${centerX} ${centerY - handleRadius} A ${handleRadius} ${handleRadius} 0 0 1 ${handleX} ${handleY}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2 / viewportZoom}
                  strokeDasharray="4,4"
                  opacity={0.6}
                />
                {/* Line from center to handle */}
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={handleX}
                  y2={handleY}
                  stroke="#3b82f6"
                  strokeWidth={1.5 / viewportZoom}
                  strokeDasharray="2,2"
                  opacity={0.5}
                />
                {/* Rotation handle */}
                <circle
                  cx={handleX}
                  cy={handleY}
                  r={6 / viewportZoom}
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth={2 / viewportZoom}
                  className="cursor-grab active:cursor-grabbing"
                  data-handle-type="rotation"
                  style={{ cursor: 'grab' }}
                />
              </g>
            );
          })()}
        </>
      )}
      
      {/* Cell type indicator */}
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-xs fill-gray-500 select-none pointer-events-none"
        fontSize="14"
        transform={`rotate(${rotationAngle}, ${centerX}, ${centerY})`}
      >
        {rect.type || 'Fixed'}
      </text>
    </g>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.rect.id === nextProps.rect.id &&
    prevProps.rect.x === nextProps.rect.x &&
    prevProps.rect.y === nextProps.rect.y &&
    prevProps.rect.width === nextProps.rect.width &&
    prevProps.rect.height === nextProps.rect.height &&
    prevProps.rect.rotation === nextProps.rect.rotation &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isLocked === nextProps.isLocked &&
    prevProps.layerColor === nextProps.layerColor &&
    prevProps.layerLineWeight === nextProps.layerLineWeight &&
    prevProps.layerStrokeDasharray === nextProps.layerStrokeDasharray &&
    prevProps.selectedTool === nextProps.selectedTool &&
    prevProps.viewportZoom === nextProps.viewportZoom
  );
});

GeometryRectangle.displayName = 'GeometryRectangle';


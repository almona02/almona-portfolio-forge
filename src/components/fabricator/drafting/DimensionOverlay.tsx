// src/components/fabricator/drafting/DimensionOverlay.tsx
import React from 'react';
import { useDraftingContext } from './DraftingContext';
import type { Dimension } from './types/drafting';

export const DimensionOverlay: React.FC = () => {
  const drafting = useDraftingContext();
  const dimensions = drafting.getDimensions();
  
  const renderDimension = (dim: Dimension, index: number) => {
    const midX = (dim.start.x + dim.end.x) / 2;
    const midY = (dim.start.y + dim.end.y) / 2;
    const angle = Math.atan2(dim.end.y - dim.start.y, dim.end.x - dim.start.x);
    // TODO: Use angleDeg when angle display is needed
    // const angleDeg = (angle * 180) / Math.PI;
    
    // Determine stroke color based on mode
    const strokeColor = dim.mode === 'angle' 
      ? '#10b981' // Green for angle
      : dim.mode === 'area' 
      ? '#f59e0b' // Orange for area
      : dim.mode === 'perimeter'
      ? '#f59e0b' // Amber for perimeter
      : dim.mode === 'radius'
      ? '#ef4444' // Red for radius
      : '#3b82f6'; // Blue for distance
    
    // Format display text
    const displayText = dim.formatted || `${dim.value.toFixed(dim.precision || 0)} ${dim.unit}`;
    const labelText = dim.mode && dim.mode !== 'distance' ? `${dim.label}: ${displayText}` : displayText;
    
    // Calculate text offset to avoid overlapping with line
    const offset = 15;
    const textX = midX + Math.cos(angle + Math.PI / 2) * offset;
    const textY = midY + Math.sin(angle + Math.PI / 2) * offset;
    
    return (
      <g key={dim.id || index}>
        {/* Dimension line */}
        <line
          x1={dim.start.x}
          y1={dim.start.y}
          x2={dim.end.x}
          y2={dim.end.y}
          stroke={strokeColor}
          strokeWidth="2"
          strokeDasharray={dim.mode === 'area' ? "4,4" : "2,2"}
          opacity="0.7"
        />
        
        {/* Extension lines for better visibility */}
        {dim.mode === 'distance' && (
          <>
            <line
              x1={dim.start.x}
              y1={dim.start.y}
              x2={dim.start.x + Math.cos(angle + Math.PI / 2) * 5}
              y2={dim.start.y + Math.sin(angle + Math.PI / 2) * 5}
              stroke={strokeColor}
              strokeWidth="1"
            />
            <line
              x1={dim.end.x}
              y1={dim.end.y}
              x2={dim.end.x + Math.cos(angle + Math.PI / 2) * 5}
              y2={dim.end.y + Math.sin(angle + Math.PI / 2) * 5}
              stroke={strokeColor}
              strokeWidth="1"
            />
          </>
        )}
        
        {/* Dimension text with background for readability */}
        <rect
          x={textX - 30}
          y={textY - 8}
          width={60}
          height={16}
          fill="white"
          fillOpacity="0.9"
          stroke={strokeColor}
          strokeWidth="1"
          rx="2"
        />
        <text
          x={textX}
          y={textY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={strokeColor}
          fontSize="11"
          fontWeight="600"
        >
          {labelText}
        </text>
        
        {/* Mode indicator dot */}
        <circle
          cx={dim.start.x}
          cy={dim.start.y}
          r="3"
          fill={strokeColor}
        />
        <circle
          cx={dim.end.x}
          cy={dim.end.y}
          r="3"
          fill={strokeColor}
        />
      </g>
    );
  };
  
  return (
    <g>
      {dimensions.map((dim, i) => renderDimension(dim, i))}
    </g>
  );
};


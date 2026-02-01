// src/components/fabricator/drafting/components/StructuralLine.tsx

/**
 * Structural Line Component
 * Renders structural elements (mullions, transoms, reinforcement) on the canvas
 */

import React from 'react';
import type { StructuralElement } from '../types/materialAware';

interface StructuralLineProps {
  element: StructuralElement;
  canvasWidth: number;
  canvasHeight: number;
}

export const StructuralLine: React.FC<StructuralLineProps> = ({ 
  element, 
  canvasWidth, 
  canvasHeight 
}) => {
  const { type, position, dimensions: _dimensions, structuralType, material } = element;

  // Determine color based on type and material
  const getColor = () => {
    if (structuralType === 'structural' || element.reinforcement) {
      return '#ef4444'; // Red for structural/reinforced
    }
    if (structuralType === 'thermal_break') {
      return '#3b82f6'; // Blue for thermal break
    }
    return material === 'aluminum' ? '#6b7280' : '#10b981'; // Gray for aluminum, green for UPVC
  };

  // Determine stroke width based on type
  const getStrokeWidth = () => {
    if (structuralType === 'structural' || element.reinforcement) {
      return 3;
    }
    return 2;
  };

  // Determine dash pattern
  const getDashArray = () => {
    if (element.reinforcement) {
      return '4 2'; // Dashed for reinforcement
    }
    return 'none'; // Solid for standard
  };

  if (type === 'mullion') {
    // Vertical line (mullion)
    return (
      <g>
        <line
          x1={position}
          y1={0}
          x2={position}
          y2={canvasHeight}
          stroke={getColor()}
          strokeWidth={getStrokeWidth()}
          strokeDasharray={getDashArray()}
          opacity={0.8}
        />
        {/* Label */}
        <text
          x={position + 5}
          y={20}
          fontSize="10"
          fill={getColor()}
          fontWeight="bold"
        >
          {structuralType === 'structural' ? 'M*' : 'M'}
        </text>
        {/* Reinforcement indicator */}
        {element.reinforcement && (
          <circle
            cx={position}
            cy={30}
            r={4}
            fill="#ef4444"
            opacity={0.8}
          />
        )}
      </g>
    );
  } else if (type === 'transom') {
    // Horizontal line (transom)
    return (
      <g>
        <line
          x1={0}
          y1={position}
          x2={canvasWidth}
          y2={position}
          stroke={getColor()}
          strokeWidth={getStrokeWidth()}
          strokeDasharray={getDashArray()}
          opacity={0.8}
        />
        {/* Label */}
        <text
          x={5}
          y={position - 5}
          fontSize="10"
          fill={getColor()}
          fontWeight="bold"
        >
          {structuralType === 'structural' ? 'T*' : 'T'}
        </text>
        {/* Reinforcement indicator */}
        {element.reinforcement && (
          <circle
            cx={30}
            cy={position}
            r={4}
            fill="#ef4444"
            opacity={0.8}
          />
        )}
      </g>
    );
  }

  return null;
};


// src/components/fabricator/drafting/SnapGrid.tsx
import React from 'react';

interface SnapGridProps {
  spacing?: number;
  width?: number;
  height?: number;
  color?: string;
}

export const SnapGrid: React.FC<SnapGridProps> = ({ 
  spacing = 50, 
  width = 10000, 
  height = 10000,
  color = '#e5e7eb'
}) => {
  const lines = [];
  
  // Vertical lines
  for (let x = 0; x <= width; x += spacing) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.5}
      />
    );
  }
  
  // Horizontal lines
  for (let y = 0; y <= height; y += spacing) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.5}
      />
    );
  }
  
  return <g>{lines}</g>;
};


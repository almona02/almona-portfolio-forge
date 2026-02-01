// src/components/fabricator/drafting/SnapGrid.tsx
import React from 'react';

interface SnapGridProps {
  spacing?: number;
  width?: number;
  height?: number;
  color?: string;
  offsetX?: number;
  offsetY?: number;
}

export const SnapGrid: React.FC<SnapGridProps> = ({ 
  spacing = 50, 
  width = 10000, 
  height = 10000,
  color = '#404040', // Blender-inspired dark theme grid color
  offsetX = 0,
  offsetY = 0
}) => {
  const lines = [];
  
  // Calculate grid bounds aligned to spacing
  const startX = Math.floor(offsetX / spacing) * spacing;
  const startY = Math.floor(offsetY / spacing) * spacing;
  const endX = offsetX + width;
  const endY = offsetY + height;
  
  // Vertical lines
  for (let x = startX; x <= endX; x += spacing) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={offsetY}
        x2={x}
        y2={offsetY + height}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.4}
      />
    );
  }
  
  // Horizontal lines
  for (let y = startY; y <= endY; y += spacing) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={offsetX}
        y1={y}
        x2={offsetX + width}
        y2={y}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.4}
      />
    );
  }
  
  return <g>{lines}</g>;
};


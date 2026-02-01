// src/components/fabricator/drafting/components/GeometryLine.tsx

/**
 * Memoized Line Component
 * 
 * Performance-optimized line rendering component with React.memo
 * to prevent unnecessary re-renders in large drawings.
 */

import React from 'react';
import type { Line } from '../types/drafting';

interface GeometryLineProps {
  line: Line;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  isLocked: boolean;
  layerColor: string;
  layerLineWeight: number;
  layerStrokeDasharray: string;
  selectedTool: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const GeometryLine = React.memo<GeometryLineProps>(({
  line,
  index,
  isSelected,
  isHovered,
  isLocked,
  layerColor,
  layerLineWeight,
  layerStrokeDasharray,
  selectedTool,
  onMouseDown,
  onMouseEnter,
  onMouseLeave
}) => {
  return (
    <line
      key={line.id || index}
      x1={line.start.x}
      y1={line.start.y}
      x2={line.end.x}
      y2={line.end.y}
      stroke={isSelected ? "#fbbf24" : isHovered ? "#fcd34d" : layerColor}
      strokeWidth={isSelected ? 2.5 : isHovered ? 2 : layerLineWeight}
      strokeDasharray={layerStrokeDasharray}
      opacity={isLocked ? 0.6 : 1}
      className={isLocked || selectedTool !== 'select' ? "cursor-not-allowed" : "cursor-move"}
      pointerEvents={isLocked ? "none" : "auto"}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo - only re-render if relevant props change
  return (
    prevProps.line.id === nextProps.line.id &&
    prevProps.line.start.x === nextProps.line.start.x &&
    prevProps.line.start.y === nextProps.line.start.y &&
    prevProps.line.end.x === nextProps.line.end.x &&
    prevProps.line.end.y === nextProps.line.end.y &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isLocked === nextProps.isLocked &&
    prevProps.layerColor === nextProps.layerColor &&
    prevProps.layerLineWeight === nextProps.layerLineWeight &&
    prevProps.layerStrokeDasharray === nextProps.layerStrokeDasharray &&
    prevProps.selectedTool === nextProps.selectedTool
  );
});

GeometryLine.displayName = 'GeometryLine';

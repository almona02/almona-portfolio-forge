// src/components/fabricator/drafting/components/GeometryCircle.tsx

/**
 * Memoized Circle Component
 * 
 * Performance-optimized circle rendering component with React.memo
 * to prevent unnecessary re-renders in large drawings.
 */

import React from 'react';
import type { Circle } from '../types/drafting';

interface GeometryCircleProps {
  circle: Circle;
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

export const GeometryCircle = React.memo<GeometryCircleProps>(({
  circle,
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
    <circle
      key={circle.id || index}
      cx={circle.cx}
      cy={circle.cy}
      r={circle.r}
      fill="none"
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
    prevProps.circle.id === nextProps.circle.id &&
    prevProps.circle.cx === nextProps.circle.cx &&
    prevProps.circle.cy === nextProps.circle.cy &&
    prevProps.circle.r === nextProps.circle.r &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isLocked === nextProps.isLocked &&
    prevProps.layerColor === nextProps.layerColor &&
    prevProps.layerLineWeight === nextProps.layerLineWeight &&
    prevProps.layerStrokeDasharray === nextProps.layerStrokeDasharray &&
    prevProps.selectedTool === nextProps.selectedTool
  );
});

GeometryCircle.displayName = 'GeometryCircle';

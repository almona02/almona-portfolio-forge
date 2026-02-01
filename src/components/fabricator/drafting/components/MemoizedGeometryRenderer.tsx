// src/components/fabricator/drafting/components/MemoizedGeometryRenderer.tsx

import React, { memo } from 'react';
import type { Rectangle, Circle, Line } from '../types/drafting';

interface MemoizedRectangleProps {
  rect: Rectangle;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  selectedTool: string;
}

export const MemoizedRectangle = memo<MemoizedRectangleProps>(({
  rect,
  isSelected,
  isHovered,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  selectedTool
}) => {
  return (
    <g>
      {/* Hover overlay */}
      {isHovered && (
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="rgba(59, 130, 246, 0.5)"
          strokeWidth={2}
          strokeDasharray="4,4"
          className="pointer-events-none"
        />
      )}
      
      {/* Selection overlay */}
      {isSelected && (
        <rect
          x={rect.x - 4}
          y={rect.y - 4}
          width={rect.width + 8}
          height={rect.height + 8}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={3}
          strokeDasharray="8,4"
          className="pointer-events-none"
        />
      )}
      
      {/* Main rectangle */}
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill="white"
        stroke={isSelected ? "#3b82f6" : isHovered ? "#60a5fa" : "#d1d5db"}
        strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
        className={selectedTool === 'select' ? "cursor-move" : "cursor-default"}
        onMouseDown={onSelect}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
      
      {/* Selection handles (only when selected) */}
      {isSelected && (
        <>
          {/* Corner handles */}
          {[
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x, y: rect.y + rect.height }
          ].map((handle, idx) => (
            <circle
              key={idx}
              cx={handle.x}
              cy={handle.y}
              r={5}
              fill="#3b82f6"
              stroke="white"
              strokeWidth={2}
              className="cursor-nwse-resize"
            />
          ))}
        </>
      )}
    </g>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.rect.x === nextProps.rect.x &&
    prevProps.rect.y === nextProps.rect.y &&
    prevProps.rect.width === nextProps.rect.width &&
    prevProps.rect.height === nextProps.rect.height &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.selectedTool === nextProps.selectedTool
  );
});

MemoizedRectangle.displayName = 'MemoizedRectangle';

interface MemoizedCircleProps {
  circle: Circle;
  isSelected: boolean;
  isHovered: boolean;
}

export const MemoizedCircle = memo<MemoizedCircleProps>(({
  circle,
  isSelected,
  isHovered
}) => {
  return (
    <circle
      cx={circle.cx}
      cy={circle.cy}
      r={circle.r}
      fill="none"
      stroke={isSelected ? "#3b82f6" : isHovered ? "#60a5fa" : "#374151"}
      strokeWidth={isSelected ? 3 : isHovered ? 2 : 2}
      className="cursor-move"
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.circle.cx === nextProps.circle.cx &&
    prevProps.circle.cy === nextProps.circle.cy &&
    prevProps.circle.r === nextProps.circle.r &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered
  );
});

MemoizedCircle.displayName = 'MemoizedCircle';

interface MemoizedLineProps {
  line: Line;
  isSelected: boolean;
  isHovered: boolean;
}

export const MemoizedLine = memo<MemoizedLineProps>(({
  line,
  isSelected,
  isHovered
}) => {
  return (
    <line
      x1={line.start.x}
      y1={line.start.y}
      x2={line.end.x}
      y2={line.end.y}
      stroke={isSelected ? "#3b82f6" : isHovered ? "#60a5fa" : "#374151"}
      strokeWidth={isSelected ? 3 : isHovered ? 2 : 2}
      strokeDasharray={line.type === 'dashed' ? '8,4' : line.type === 'dotted' ? '2,2' : 'none'}
      className="cursor-move"
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.line.start.x === nextProps.line.start.x &&
    prevProps.line.start.y === nextProps.line.start.y &&
    prevProps.line.end.x === nextProps.line.end.x &&
    prevProps.line.end.y === nextProps.line.end.y &&
    prevProps.line.type === nextProps.line.type &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered
  );
});

MemoizedLine.displayName = 'MemoizedLine';


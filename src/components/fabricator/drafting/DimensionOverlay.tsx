// src/components/fabricator/drafting/DimensionOverlay.tsx
import React from 'react';
import { useDraftingContext } from './DraftingContext';

export const DimensionOverlay: React.FC = () => {
  const drafting = useDraftingContext();
  const dimensions = drafting.getDimensions();
  
  return (
    <g>
      {dimensions.map((dim, i) => (
        <g key={i}>
          {/* Dimension line */}
          <line
            x1={dim.start.x}
            y1={dim.start.y}
            x2={dim.end.x}
            y2={dim.end.y}
            stroke="#3b82f6"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          {/* Dimension text */}
          <text
            x={(dim.start.x + dim.end.x) / 2}
            y={(dim.start.y + dim.end.y) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#3b82f6"
            fontSize="12"
            fontWeight="500"
          >
            {dim.value}{dim.unit}
          </text>
        </g>
      ))}
    </g>
  );
};


// src/components/fabricator/drafting/EgyptianTemplateLibrary.tsx
import React, { useMemo } from 'react';
import { useDraftingContext } from './DraftingContext';

export const EgyptianTemplateLibrary: React.FC = () => {
  const drafting = useDraftingContext();
  const template = drafting.state.activeTemplate;
  const geometry = drafting.getGeometry();
  
  const bounds = useMemo(() => {
    if (geometry.rectangles.length === 0) return null;
    const minX = Math.min(...geometry.rectangles.map(rect => rect.x));
    const minY = Math.min(...geometry.rectangles.map(rect => rect.y));
    const maxX = Math.max(...geometry.rectangles.map(rect => rect.x + rect.width));
    const maxY = Math.max(...geometry.rectangles.map(rect => rect.y + rect.height));
    const width = maxX - minX;
    const height = maxY - minY;

    if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    return { minX, minY, width, height };
  }, [geometry.rectangles]);

  if (!template || !bounds) {
    return null;
  }

  const colRatios = normalizeRatios(template.colWidthRatios, template.cols);
  const rowRatios = normalizeRatios(template.rowHeightRatios, template.rows);
  const colLines = buildGridLines(bounds.minX, bounds.width, colRatios);
  const rowLines = buildGridLines(bounds.minY, bounds.height, rowRatios);
  
  // Render template overlay as guide
  return (
    <g opacity={0.2} pointerEvents="none">
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={1}
        strokeDasharray="4 6"
      />
      {colLines.map((x, index) => (
        <line
          key={`col-${index}`}
          x1={x}
          y1={bounds.minY}
          x2={x}
          y2={bounds.minY + bounds.height}
          stroke="#f59e0b"
          strokeWidth={0.75}
          strokeDasharray="3 6"
        />
      ))}
      {rowLines.map((y, index) => (
        <line
          key={`row-${index}`}
          x1={bounds.minX}
          y1={y}
          x2={bounds.minX + bounds.width}
          y2={y}
          stroke="#f59e0b"
          strokeWidth={0.75}
          strokeDasharray="3 6"
        />
      ))}
    </g>
  );
};

function normalizeRatios(ratios: number[] | undefined, count: number): number[] {
  if (!ratios || ratios.length !== count) {
    return Array(count).fill(1 / Math.max(count, 1));
  }

  const normalized = ratios.map(value => (typeof value === 'number' && isFinite(value) && value > 0 ? value : 0));
  const sum = normalized.reduce((total, value) => total + value, 0);

  if (sum <= 0) {
    return Array(count).fill(1 / Math.max(count, 1));
  }

  return normalized.map(value => value / sum);
}

function buildGridLines(origin: number, total: number, ratios: number[]): number[] {
  const lines: number[] = [];
  let offset = origin;
  for (let i = 0; i < ratios.length - 1; i += 1) {
    offset += total * ratios[i];
    lines.push(offset);
  }
  return lines;
}


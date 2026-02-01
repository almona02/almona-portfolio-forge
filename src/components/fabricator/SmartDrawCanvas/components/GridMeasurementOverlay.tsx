/**
 * Grid Measurement Overlay Component
 * 
 * Displays measurement values on grid cells with visual feedback.
 * Shows cell dimensions, connects to measurements, and provides
 * visual link between measurements and grid layout.
 * 
 * Part of Journey 1 Polish: Measurement → Design → BOM
 */

import type { WindowGrid } from '@/types/fabricator';
import React, { useMemo } from 'react';

export interface GridMeasurementOverlayProps {
  /** Current grid state */
  grid: WindowGrid;
  /** Total width in mm */
  width: number;
  /** Total height in mm */
  height: number;
  /** SVG viewBox width */
  svgWidth: number;
  /** SVG viewBox height */
  svgHeight: number;
  /** Column start positions in pixels */
  colStarts: number[];
  /** Row start positions in pixels */
  rowStarts: number[];
  /** Column widths in pixels */
  colWidthsPx: number[];
  /** Row heights in pixels */
  rowHeightsPx: number[];
  /** Optional: Highlight specific cell IDs */
  highlightedCellIds?: Set<string>;
  /** Optional: Show dimensions */
  showDimensions?: boolean;
}

/**
 * Grid Measurement Overlay Component
 * 
 * Renders measurement overlays on grid cells showing dimensions
 * and providing visual connection to measurements.
 */
export const GridMeasurementOverlay: React.FC<GridMeasurementOverlayProps> = ({
  grid,
  width,
  height,
  svgWidth,
  svgHeight,
  colStarts,
  rowStarts,
  colWidthsPx,
  rowHeightsPx,
  highlightedCellIds = new Set(),
  showDimensions = true,
}) => {
  /**
   * Calculate cell dimensions and positions
   */
  const cellOverlays = useMemo(() => {
    if (!grid.cells || !Array.isArray(grid.cells)) {
      return [];
    }
    return grid.cells.map((cell) => {
      const colStart = colStarts[cell.col] || 0;
      const rowStart = rowStarts[cell.row] || 0;
      const cellWidth = colWidthsPx[cell.col] || 0;
      const cellHeight = rowHeightsPx[cell.row] || 0;

      // Calculate actual dimensions in mm
      const cellWidthMm = (cellWidth / svgWidth) * width;
      const cellHeightMm = (cellHeight / svgHeight) * height;

      const isHighlighted = highlightedCellIds.has(cell.id);

      return {
        cell,
        colStart,
        rowStart,
        cellWidth,
        cellHeight,
        cellWidthMm,
        cellHeightMm,
        isHighlighted,
      };
    });
  }, [grid.cells, colStarts, rowStarts, colWidthsPx, rowHeightsPx, svgWidth, svgHeight, width, height, highlightedCellIds]);

  if (!showDimensions) {
    return null;
  }

  return (
    <g className="grid-measurement-overlay">
      {cellOverlays.map(({ cell, colStart, rowStart, cellWidth, cellHeight, cellWidthMm, cellHeightMm, isHighlighted }) => {
        // Only show dimensions for cells larger than 100px (to avoid clutter)
        if (cellWidth < 100 || cellHeight < 100) {
          return null;
        }

        const centerX = colStart + cellWidth / 2;
        const centerY = rowStart + cellHeight / 2;

        return (
          <g key={`overlay-${cell.id}`}>
            {/* Highlight overlay for selected/highlighted cells */}
            {isHighlighted && (
              <rect
                x={colStart}
                y={rowStart}
                width={cellWidth}
                height={cellHeight}
                fill="rgba(245, 158, 11, 0.1)"
                stroke="rgba(245, 158, 11, 0.5)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            )}

            {/* Dimension text overlay */}
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-amber-400 text-[10px] font-mono font-semibold pointer-events-none select-none"
              style={{
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
              }}
            >
              {Math.round(cellWidthMm)}×{Math.round(cellHeightMm)}mm
            </text>

            {/* Cell type indicator (small badge) */}
            <rect
              x={colStart + 4}
              y={rowStart + 4}
              width={24}
              height={16}
              fill="rgba(0, 0, 0, 0.6)"
              rx="2"
              className="pointer-events-none"
            />
            <text
              x={colStart + 16}
              y={rowStart + 15}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-amber-300 text-[9px] font-bold pointer-events-none select-none uppercase"
            >
              {cell.type.charAt(0)}
            </text>
          </g>
        );
      })}
    </g>
  );
};

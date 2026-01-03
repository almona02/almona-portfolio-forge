// src/components/fabricator/drafting/utils/draftingToWindowGrid.ts
import type { WindowGrid, GridCell } from '@/types/fabricator';
import type { Geometry2D, EgyptianTemplate } from '../types/drafting';

/**
 * Convert drafting geometry to ALMONA WindowGrid format
 * Constitutional: Deterministic conversion, no ML
 */
export function convertDraftingToWindowGrid(
  geometry: Geometry2D,
  template: EgyptianTemplate
): WindowGrid {
  const cells: GridCell[] = [];
  
  // Sort rectangles by position (top-to-bottom, left-to-right)
  const sortedRects = [...geometry.rectangles].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 10) {
      return a.x - b.x; // Same row, sort by x
    }
    return a.y - b.y; // Sort by y
  });
  
  // Map rectangles to grid cells
  sortedRects.forEach((rect, index) => {
    const row = Math.floor(index / template.cols);
    const col = index % template.cols;
    
    if (row < template.rows && col < template.cols) {
      const cellType = mapDraftingTypeToGridType(rect.type);
      
      cells.push({
        id: `${row}-${col}`,
        row,
        col,
        type: cellType,
        componentId: rect.id
      });
    }
  });
  
  // Calculate column widths and row heights from geometry
  const colWidths: number[] = [];
  const rowHeights: number[] = [];
  
  // Group rectangles by column
  for (let col = 0; col < template.cols; col++) {
    const colRects = sortedRects.filter((_, i) => i % template.cols === col);
    if (colRects.length > 0) {
      const avgWidth = colRects.reduce((sum, r) => sum + r.width, 0) / colRects.length;
      colWidths.push(avgWidth);
    } else {
      colWidths.push(1); // Default
    }
  }
  
  // Group rectangles by row
  for (let row = 0; row < template.rows; row++) {
    const rowRects = sortedRects.filter((_, i) => Math.floor(i / template.cols) === row);
    if (rowRects.length > 0) {
      const avgHeight = rowRects.reduce((sum, r) => sum + r.height, 0) / rowRects.length;
      rowHeights.push(avgHeight);
    } else {
      rowHeights.push(1); // Default
    }
  }
  
  return {
    rows: template.rows,
    cols: template.cols,
    cells,
    colWidths: colWidths.length === template.cols ? colWidths : undefined,
    rowHeights: rowHeights.length === template.rows ? rowHeights : undefined
  };
}

/**
 * Map drafting cell type to WindowGrid cell type
 */
function mapDraftingTypeToGridType(
  draftingType?: string
): 'fixed' | 'sash' | 'panel' | 'empty' | 'sliding' {
  switch (draftingType) {
    case 'casement':
    case 'tilt-turn':
    case 'pivot':
      return 'sash';
    case 'sliding':
      return 'sliding';
    case 'panel':
      return 'panel';
    case 'fixed':
    default:
      return 'fixed';
  }
}


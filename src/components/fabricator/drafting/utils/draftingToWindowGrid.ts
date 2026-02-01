// src/components/fabricator/drafting/utils/draftingToWindowGrid.ts
import type { GridCell, WindowGrid } from '@/types/fabricator';
import type { EgyptianTemplate, Geometry2D } from '../types/drafting';

/**
 * Convert drafting geometry to ALMONA WindowGrid format
 * Constitutional: Deterministic conversion, no ML
 */
export function convertDraftingToWindowGrid(
  geometry: Geometry2D,
  template: EgyptianTemplate
): WindowGrid {
  const cells: GridCell[] = [];
  const templateCellCount = template.rows * template.cols;
  const colRatios = normalizeRatios(template.colWidthRatios, template.cols);
  const rowRatios = normalizeRatios(template.rowHeightRatios, template.rows);

  // If a single rectangle represents the overall window, expand to template grid
  if (geometry.rectangles.length === 1 && templateCellCount > 1) {
    const rect = geometry.rectangles[0];
    const colWidths = colRatios.map(ratio => rect.width * ratio);
    const rowHeights = rowRatios.map(ratio => rect.height * ratio);

    for (let row = 0; row < template.rows; row++) {
      for (let col = 0; col < template.cols; col++) {
        const templateCellType = template.cellTypes?.[row]?.[col];
        cells.push({
          id: `${row}-${col}`,
          row,
          col,
          type: mapDraftingTypeToGridType(templateCellType),
        });
      }
    }

    return {
      rows: template.rows,
      cols: template.cols,
      cells,
      colWidths,
      rowHeights,
    };
  }
  
  // Sort rectangles by position (top-to-bottom, left-to-right)
  // Robust Row Clustering (Tier 1 Stabilization)
  // 1. Sort primarily by Y to establish vertical order
  // 2. Cluster into semantic rows using a threshold (20px to handle jitter)
  // 3. Sort within rows by X
  
  const rawRects = [...geometry.rectangles].sort((a, b) => a.y - b.y);
  
  const rows: typeof rawRects[] = [];
  if (rawRects.length > 0) {
    let currentRow: typeof rawRects = [rawRects[0]];
    let currentRowY = rawRects[0].y;
    
    for (let i = 1; i < rawRects.length; i++) {
        const rect = rawRects[i];
        // If within 25px vertical variance, consider same row
        if (Math.abs(rect.y - currentRowY) < 25) {
            currentRow.push(rect);
        } else {
            // New row detected
            rows.push(currentRow);
            currentRow = [rect];
            currentRowY = rect.y;
        }
    }
    rows.push(currentRow);
  }

  // Flatten rows after internal X-sorting
  const sortedRects = rows.flatMap(rowRects => 
      rowRects.sort((a, b) => a.x - b.x)
  );
  
  // Map rectangles to grid cells
  sortedRects.forEach((rect, index) => {
    const row = Math.floor(index / template.cols);
    const col = index % template.cols;
    
    if (row < template.rows && col < template.cols) {
      const templateCellType = template.cellTypes?.[row]?.[col];
      const cellType = mapDraftingTypeToGridType(rect.type ?? templateCellType);
      
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


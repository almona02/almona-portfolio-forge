/**
 * DesignStateBridge - Bidirectional State Synchronization
 * 
 * Bridges state between SmartDraw (WindowGrid) and Drafting (Geometry2D)
 * Provides real-time synchronization with debouncing
 */

import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { GridCell, WindowGrid } from '@/types/fabricator';
import { useEffect, useRef } from 'react';
import type { Geometry2D, Rectangle } from '../drafting/types/drafting';
import type { DesignMode } from '../panels/DesignModeSelector';

interface DesignStateBridgeProps {
  /** Current design mode */
  mode: DesignMode;
  /** SmartDraw grid state */
  smartDrawGrid?: WindowGrid | null;
  /** Drafting geometry state */
  draftingGeometry?: Geometry2D | null;
  /** Callback when SmartDraw grid changes */
  onSmartDrawGridChange?: (grid: WindowGrid) => void;
  /** Callback when Drafting geometry changes */
  onDraftingGeometryChange?: (geometry: Geometry2D) => void;
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
}

/**
 * Convert SmartDraw WindowGrid to Drafting Geometry2D
 * Each grid cell becomes a rectangle in the drafting space
 */
const convertGridToDrafting = (grid: WindowGrid, _overallWidth: number, _overallHeight: number): Geometry2D => {
  const rectangles: Rectangle[] = [];

  if (!grid.cells || grid.cells.length === 0) {
    return { rectangles: [], points: [], lines: [], circles: [], arcs: [], polygons: [], splines: [] };
  }

  // Calculate column and row positions
  const colWidths = grid.colWidths || [];
  const rowHeights = grid.rowHeights || [];

  grid.cells.forEach((cell: GridCell, index: number) => {
    const colIndex = index % (grid.cols || 1);
    const rowIndex = Math.floor(index / (grid.cols || 1));

    // Calculate cell position
    const cellX = colWidths.slice(0, colIndex).reduce((sum, w) => sum + w, 0);
    const cellY = rowHeights.slice(0, rowIndex).reduce((sum, h) => sum + h, 0);

    // Get cell dimensions
    const cellWidth = colWidths[colIndex] || 0;
    const cellHeight = rowHeights[rowIndex] || 0;

    // Convert to rectangle
    // Map 'empty' to 'fixed' for drafting (as it represents a physical space)
    const rectType = cell.type === 'empty' ? 'fixed' : cell.type;

    rectangles.push({
      x: cellX,
      y: cellY,
      width: cellWidth,
      height: cellHeight,
      type: (rectType as any) || 'fixed',
      id: cell.id || `cell-${index}`,
      layerId: 'default'
    });
  });

  return {
    rectangles,
    points: [],
    lines: [],
    circles: [],
    arcs: [],
    polygons: [],
    splines: []
  };
};

/**
 * Convert Drafting Geometry2D to SmartDraw WindowGrid
 * Only rectangles are converted (other geometry types are ignored)
 */
const convertDraftingToGrid = (
  geometry: Geometry2D,
  overallWidth: number,
  overallHeight: number
): WindowGrid | null => {
  if (!geometry.rectangles || geometry.rectangles.length === 0) {
    return null;
  }

  // Group rectangles by rows and columns
  // This is a simplified conversion - assumes aligned rectangles
  const sortedRects = [...geometry.rectangles].sort((a, b) => {
    // Sort by Y first (rows), then by X (columns)
    if (Math.abs(a.y - b.y) > 10) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  // Detect rows and columns
  const rows: number[] = [];
  const cols: number[] = [];
  const cells: GridCell[] = [];

  let currentRow = 0;
  let currentCol = 0;
  let lastY = -1;
  let lastX = -1;

  sortedRects.forEach((rect, index) => {
    // Detect new row
    if (lastY === -1 || Math.abs(rect.y - lastY) > 10) {
      if (lastY !== -1) {
        currentRow++;
        currentCol = 0;
      }
      rows.push(rect.y);
      lastY = rect.y;
    }

    // Detect new column
    if (lastX === -1 || Math.abs(rect.x - lastX) > 10) {
      if (lastX !== -1 && currentCol === 0) {
        // New row, reset column
      } else {
        currentCol++;
      }
      if (!cols.includes(rect.x)) {
        cols.push(rect.x);
      }
      lastX = rect.x;
    }

    // Create grid cell
    cells.push({
      id: rect.id || `rect-${index}`,
      row: currentRow,
      col: currentCol,
      // Map specialized sash types back to 'sash' for grid
      type: (['fixed', 'sash', 'panel', 'empty', 'sliding'].includes(rect.type || '')
        ? rect.type
        : (['casement', 'tilt-turn', 'pivot'].includes(rect.type || '') ? 'sash' : 'fixed')) as any
    });
  });

  // Calculate column widths and row heights
  const colWidths = cols.map((x, i) => {
    const nextX = cols[i + 1] || overallWidth;
    return nextX - x;
  });

  const rowHeights = rows.map((y, i) => {
    const nextY = rows[i + 1] || overallHeight;
    return nextY - y;
  });

  return {
    cols: cols.length,
    rows: rows.length,
    colWidths,
    rowHeights,
    cells,
    manualMullions: []
  };
};

export const DesignStateBridge: React.FC<DesignStateBridgeProps> = ({
  mode,
  smartDrawGrid,
  draftingGeometry,
  onSmartDrawGridChange,
  onDraftingGeometryChange,
  debounceMs = 500
}) => {
  const { state, dispatch } = useFabricatorWorkspace();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedModeRef = useRef<DesignMode | null>(null);

  // Get project dimensions
  const overallWidth = state.currentProject?.overallWidth || 2000;
  const overallHeight = state.currentProject?.overallHeight || 1500;

  useEffect(() => {
    // Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Only sync if mode has changed or state has changed
    if (lastSyncedModeRef.current === mode && !smartDrawGrid && !draftingGeometry) {
      return;
    }

    syncTimeoutRef.current = setTimeout(() => {
      try {
        if (mode === 'smartdraw' && smartDrawGrid) {
          // Convert SmartDraw grid to Drafting geometry
          const convertedGeometry = convertGridToDrafting(
            smartDrawGrid,
            overallWidth,
            overallHeight
          );

          // Update drafting state (if callback provided)
          onDraftingGeometryChange?.(convertedGeometry);

          // Update global project state
          dispatch({
            type: 'UPDATE_PROJECT_GRID',
            payload: smartDrawGrid
          });
        } else if (mode === 'drafting' && draftingGeometry) {
          // Convert Drafting geometry to SmartDraw grid
          const convertedGrid = convertDraftingToGrid(
            draftingGeometry,
            overallWidth,
            overallHeight
          );

          if (convertedGrid) {
            // Update SmartDraw state (if callback provided)
            onSmartDrawGridChange?.(convertedGrid);

            // Update global project state
            dispatch({
              type: 'UPDATE_PROJECT_GRID',
              payload: convertedGrid
            });
          }
        }

        lastSyncedModeRef.current = mode;
      } catch (error) {
        console.error('DesignStateBridge sync error:', error);
      }
    }, debounceMs);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [
    mode,
    smartDrawGrid,
    draftingGeometry,
    overallWidth,
    overallHeight,
    onSmartDrawGridChange,
    onDraftingGeometryChange,
    dispatch,
    debounceMs
  ]);

  // This component doesn't render anything - it's a bridge
  return null;
};


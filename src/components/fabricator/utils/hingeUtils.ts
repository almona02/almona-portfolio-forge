/**
 * Hinge Utilities
 * 
 * Helper functions for finding and matching hinges in window sashes.
 * Constitutional: Pure geometric calculations, no ML/AI.
 */

export interface HardwarePlaceholder {
  type: string;
  position: { x: number; y: number; z: number };
  [key: string]: any;
}

export interface CellBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Find sash hinges that match the opening direction
 * 
 * @param hardwarePlaceholders - Array of hardware placeholders
 * @param cellBounds - Cell bounds in meters
 * @param openingDirection - 'left' or 'right'
 * @param toleranceMm - Tolerance in millimeters (default: 50mm = 5cm)
 * @returns Array of matching hinge placeholders
 */
export function findSashHinges(
  hardwarePlaceholders: HardwarePlaceholder[],
  cellBounds: CellBounds,
  openingDirection: 'left' | 'right',
  toleranceMm: number = 50
): HardwarePlaceholder[] {
  const leftEdgeX = cellBounds.x - cellBounds.width / 2;
  const rightEdgeX = cellBounds.x + cellBounds.width / 2;
  const targetEdgeX = openingDirection === 'right' ? rightEdgeX : leftEdgeX;
  const toleranceM = toleranceMm / 1000; // Convert to meters
  
  return hardwarePlaceholders.filter(hw => {
    if (hw.type !== 'hinge') return false;
    
    // Check if hinge is on target edge (with tolerance)
    const isOnTargetEdge = Math.abs(hw.position.x - targetEdgeX) < toleranceM;
    
    // Check if hinge is within cell height (with tolerance)
    const isInCellHeight = Math.abs(hw.position.y - cellBounds.y) < (cellBounds.height / 2 + toleranceM);
    
    return isOnTargetEdge && isInCellHeight;
  });
}


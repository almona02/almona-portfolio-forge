/**
 * Hardware Placeholder System
 * 
 * Provides simple box geometries for hardware components (handles, hinges, locks)
 * positioned using absolute coordinates from Egyptian manufacturing standards.
 * 
 * This is a pragmatic MVP approach - hardware is represented as simple boxes
 * with correct positioning rather than detailed 3D models.
 */

import { BoxGeometry, BufferGeometry, Vector3 } from 'three';
import { WindowUnit } from '@/types/fabricator';

export interface HardwarePlaceholder {
  geometry: BufferGeometry;
  position: Vector3;
  type: 'handle' | 'hinge' | 'lock' | 'roller';
  label: string;
}

export interface HardwarePosition {
  x?: number | string; // Absolute position or expression like 'sash_right_edge-0.03'
  y?: number | string; // Absolute position or expression like 'sash_height/2'
  z?: number | string;
}

/**
 * Standard hardware dimensions (in meters)
 */
export const HARDWARE_DIMENSIONS = {
  handle: {
    width: 0.02,   // 20mm
    height: 0.12,  // 120mm
    depth: 0.015  // 15mm
  },
  hinge: {
    width: 0.01,   // 10mm
    height: 0.08,  // 80mm
    depth: 0.02    // 20mm
  },
  lock: {
    width: 0.015,  // 15mm
    height: 0.03,  // 30mm
    depth: 0.01    // 10mm
  },
  roller: {
    width: 0.025,  // 25mm
    height: 0.025, // 25mm
    depth: 0.02    // 20mm
  }
};

/**
 * Standard hardware colors (dark metallic)
 */
export const HARDWARE_COLORS = {
  handle: 0x2d2d2d,  // Dark gray
  hinge: 0x555555,   // Medium gray
  lock: 0x3a3a3a,    // Dark gray
  roller: 0x444444   // Medium-dark gray
};

/**
 * Calculate absolute position from expression
 * 
 * @param expr Expression like 'sash_right_edge-0.03' or 'sash_height/2'
 * @param context Context object with values like sashWidth, sashHeight, etc.
 */
function evaluatePosition(expr: string | number, context: Record<string, number>): number {
  if (typeof expr === 'number') return expr;
  
  // Replace context variables
  let result = expr;
  for (const [key, value] of Object.entries(context)) {
    result = result.replace(new RegExp(key, 'g'), value.toString());
  }
  
  // Evaluate simple arithmetic (safe eval)
  try {
    // Only allow basic arithmetic operations
    if (/^[0-9+\-*/().\s]+$/.test(result)) {
      return Function(`"use strict"; return (${result})`)();
    }
  } catch (e) {
    console.warn(`Failed to evaluate position expression: ${expr}`, e);
  }
  
  return 0;
}

/**
 * Generate hardware placeholders for a window unit
 * 
 * @param windowUnit The window unit to generate hardware for
 * @returns Array of hardware placeholder objects
 */
export function generateHardwarePlaceholders(windowUnit: WindowUnit): HardwarePlaceholder[] {
  const placeholders: HardwarePlaceholder[] = [];
  
  if (!windowUnit.grid || !windowUnit.grid.cells) {
    return placeholders;
  }
  
  const width = windowUnit.overallWidth / 1000; // Convert mm to meters
  const height = windowUnit.overallHeight / 1000;
  
  // Process each cell
  windowUnit.grid.cells.forEach((cell, index) => {
    if (cell.type === 'empty') return;
    
    const isSash = cell.type === 'sash' || (cell as any).type === 'sliding';
    const isSliding = cell.type === 'sliding' || (cell as any).type === 'sliding';
    const isCasement = cell.type === 'sash' && !isSliding;
    
    // Calculate cell dimensions (simplified - assumes equal cell sizes for now)
    const cols = windowUnit.grid.cols || 1;
    const rows = windowUnit.grid.rows || 1;
    const cellW = width / cols;
    const cellH = height / rows;
    
    // Calculate cell position
    const col = cell.col || 0;
    const row = cell.row || 0;
    const cellX = -width / 2 + cellW * (col + 0.5);
    const cellY = height / 2 - cellH * (row + 0.5);
    
    if (isSliding) {
      // Sliding windows: rollers at bottom, handle on right side
      const rollerGeom = new BoxGeometry(
        HARDWARE_DIMENSIONS.roller.width,
        HARDWARE_DIMENSIONS.roller.height,
        HARDWARE_DIMENSIONS.roller.depth
      );
      // Two rollers per sash (left and right)
      const rollerX1 = cellX - cellW / 4;
      const rollerX2 = cellX + cellW / 4;
      const rollerY = cellY - cellH / 2 + HARDWARE_DIMENSIONS.roller.height / 2;
      const rollerZ = 0.01; // Slightly above frame
      
      placeholders.push({
        geometry: rollerGeom,
        position: new Vector3(rollerX1, rollerY, rollerZ),
        type: 'roller',
        label: 'Roller'
      });
      
      placeholders.push({
        geometry: rollerGeom.clone(),
        position: new Vector3(rollerX2, rollerY, rollerZ),
        type: 'roller',
        label: 'Roller'
      });
      
      // Handle on right side, middle height
      const handleGeom = new BoxGeometry(
        HARDWARE_DIMENSIONS.handle.width,
        HARDWARE_DIMENSIONS.handle.height,
        HARDWARE_DIMENSIONS.handle.depth
      );
      const handleX = cellX + cellW / 2 - HARDWARE_DIMENSIONS.handle.depth / 2;
      const handleY = cellY;
      const handleZ = 0.01;
      
      placeholders.push({
        geometry: handleGeom,
        position: new Vector3(handleX, handleY, handleZ),
        type: 'handle',
        label: 'Handle'
      });
      
    } else if (isCasement) {
      // Casement windows: hinges position depends on opening direction
      // Opening right = hinges on RIGHT side (attached to right frame)
      // Opening left = hinges on LEFT side (attached to left frame)
      // Standard: 2 hinges per sash (top and bottom) - these are the pivot reference
      const hingeGeom = new BoxGeometry(
        HARDWARE_DIMENSIONS.hinge.width,
        HARDWARE_DIMENSIONS.hinge.height,
        HARDWARE_DIMENSIONS.hinge.depth
      );
      
      // Get opening direction from cell (each sash has its own opening direction)
      const openingDirection = (cell as any)?.openingDirection || 'right';
      
      // Hinge positions: top and bottom (150mm from edges, standard Egyptian)
      const hingeZ = 0.01;
      
      // CRITICAL: Hinges on the side where sash is attached (this is the pivot reference)
      // Opening right → hinges on RIGHT side (sash attached to right frame/transom)
      // Opening left → hinges on LEFT side (sash attached to left frame/transom)
      let hingeX: number;
      if (openingDirection === 'right') {
        // Opening right: hinges on RIGHT edge (sash attached to right frame/transom)
        hingeX = cellX + cellW / 2 - HARDWARE_DIMENSIONS.hinge.depth / 2;
      } else {
        // Opening left: hinges on LEFT edge (sash attached to left frame/transom)
        hingeX = cellX - cellW / 2 + HARDWARE_DIMENSIONS.hinge.depth / 2;
      }
      
      // Top hinge (150mm from top)
      placeholders.push({
        geometry: hingeGeom,
        position: new Vector3(hingeX, cellY + cellH / 2 - 0.15, hingeZ),
        type: 'hinge',
        label: `Hinge (Top) - ${openingDirection} opening`,
        userData: { cellId: cell.id, openingDirection } // Store for animation reference
      });
      
      // Bottom hinge (150mm from bottom)
      placeholders.push({
        geometry: hingeGeom.clone(),
        position: new Vector3(hingeX, cellY - cellH / 2 + 0.15, hingeZ),
        type: 'hinge',
        label: `Hinge (Bottom) - ${openingDirection} opening`,
        userData: { cellId: cell.id, openingDirection } // Store for animation reference
      });
      
      // Handle on opposite side from hinges (where you grab to open)
      const handleGeom = new BoxGeometry(
        HARDWARE_DIMENSIONS.handle.width,
        HARDWARE_DIMENSIONS.handle.height,
        HARDWARE_DIMENSIONS.handle.depth
      );
      let handleX: number;
      if (openingDirection === 'right') {
        // Opening right: handle on LEFT side (opposite from hinges)
        handleX = cellX - cellW / 2 + HARDWARE_DIMENSIONS.handle.depth / 2;
      } else {
        // Opening left: handle on RIGHT side (opposite from hinges)
        handleX = cellX + cellW / 2 - HARDWARE_DIMENSIONS.handle.depth / 2;
      }
      const handleY = cellY;
      const handleZ = 0.01;
      
      placeholders.push({
        geometry: handleGeom,
        position: new Vector3(handleX, handleY, handleZ),
        type: 'handle',
        label: 'Handle'
      });
      
      // Lock at center bottom
      const lockGeom = new BoxGeometry(
        HARDWARE_DIMENSIONS.lock.width,
        HARDWARE_DIMENSIONS.lock.height,
        HARDWARE_DIMENSIONS.lock.depth
      );
      const lockX = cellX;
      const lockY = cellY - cellH / 2 + 0.05; // 50mm from bottom
      const lockZ = 0.01;
      
      placeholders.push({
        geometry: lockGeom,
        position: new Vector3(lockX, lockY, lockZ),
        type: 'lock',
        label: 'Lock'
      });
    }
  });
  
  return placeholders;
}

/**
 * Get material color for hardware type
 */
export function getHardwareColor(type: HardwarePlaceholder['type']): number {
  return HARDWARE_COLORS[type] || 0x444444;
}


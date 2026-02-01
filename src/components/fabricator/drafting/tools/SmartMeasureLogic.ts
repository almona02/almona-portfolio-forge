
import { ProfileRegistry } from '../services/ProfileRegistry';
import type { Rectangle } from '../types/drafting';

export type MeasureMode = 'outer' | 'inner' | 'glass';

export class SmartMeasureLogic {
  
  /**
   * Calculates snap points based on the active mode + profile specs
   */
  public static getSnapPoints(
    rect: Rectangle, 
    mode: MeasureMode, 
    systemId: string
  ): { x: number, y: number }[] {
    const specs = ProfileRegistry.getInstance().getSpecs(systemId);
    
    // Default fallback if no specs (simplified Box)
    const frameDepth = specs?.profileDepth || 45;
    // const glassGap = specs?.glazingPocket.depth || 15;
    
    const points: { x: number, y: number }[] = [];

    // Base coordinates (Outer / Masonry)
    const left = rect.x;
    const top = rect.y;
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;

    switch (mode) {
      case 'outer':
        // Corners of the bounding box
        points.push({ x: left, y: top });
        points.push({ x: right, y: top });
        points.push({ x: right, y: bottom });
        points.push({ x: left, y: bottom });
        
        // Midpoints
        points.push({ x: (left + right) / 2, y: top });
        points.push({ x: right, y: (top + bottom) / 2 });
        points.push({ x: (left + right) / 2, y: bottom });
        points.push({ x: left, y: (top + bottom) / 2 });
        break;

      case 'inner':
        // Inner Frame Edge (Daylight Opening)
        const inLeft = left + frameDepth;
        const inTop = top + frameDepth;
        const inRight = right - frameDepth;
        const inBottom = bottom - frameDepth;
        
        points.push({ x: inLeft, y: inTop });
        points.push({ x: inRight, y: inTop });
        points.push({ x: inRight, y: inBottom });
        points.push({ x: inLeft, y: inBottom });
        break;

      case 'glass':
        // Glazing Pocket (Glass Size)
        // Usually: Frame dimensions minus (Frame Face - Glazing Pocket Depth)
        // Or: Inner Frame + Glazing Pocket Depth (if adding to daylight)
        // Let's assume standard calculation: Daylight + Glass Gap (glass sits inside the frame)
        // Wait, glass sits INSIDE the pocket.
        // Glass Width = Daylight Width + (Glazing Pocket Depth * 2) - Clearance
        
        const pocketDepth = specs?.glazingPocket.depth || 15;
        const clearance = specs?.glazingPocket.clearance || 5;
        const glassOverlap = pocketDepth - clearance; // The amount glass goes into the frame
        
        // So from Daylight Opening, we expand OUTWARDS by `glassOverlap`
        // Daylight X = left + frameDepth
        // Glass Edge X = (left + frameDepth) - glassOverlap
        
        const gLeft = (left + frameDepth) - glassOverlap;
        const gTop = (top + frameDepth) - glassOverlap;
        const gRight = (right - frameDepth) + glassOverlap;
        const gBottom = (bottom - frameDepth) + glassOverlap;

        points.push({ x: gLeft, y: gTop });
        points.push({ x: gRight, y: gTop });
        points.push({ x: gRight, y: gBottom });
        points.push({ x: gLeft, y: gBottom });
        break;
    }

    return points;
  }

  /**
   * Egyptian Standard Dimension Snapper (Debounced)
   * Snaps values to common construction sizes if within tolerance.
   */
  public static snapToStandardDimension(value: number, tolerance: number = 10): number | null {
      // Common Egyptian Heights/Widths (mm)
      const standards = [
          // Heights
          2100, 2150, 2200, // Doors
          1100, 1200, 1000, // Windows
          // Widths
          800, 900, 1000, 1200, 1500, 1800, 2000, 2400
      ];

      for (const std of standards) {
          if (Math.abs(value - std) <= tolerance) {
              return std;
          }
      }
      
      return null;
  }
}

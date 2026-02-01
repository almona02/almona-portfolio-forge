import { FacadeGridSpec, FacadeMember, FacadeModel, FacadePanel, FacadeSystemType } from '@/types/fabricator';

// Re-export for backward compatibility if needed, or just use the imported ones.
export type { FacadeGridSpec, FacadeMember, FacadeModel, FacadePanel, FacadeSystemType };

/**
 * ALMONA FACADE ENGINE
 * Core logic for generating curtain wall structures.
 * Deterministic generation ensuring manufacturing accuracy.
 */
export class CurtainWallEngine {
  
  /**
   * Generates a complete facade model from a grid specification.
   * Uses "Stick System" logic: Vertical Mullions run through, Transoms are cut between.
   */
  static generateStickSystem(spec: FacadeGridSpec): FacadeModel {
    const members: FacadeMember[] = [];
    const panels: FacadePanel[] = [];
    
    // 1. Calculate grid coordinates
    const xCoords = this.calculateCumulativeCoords(spec.width, spec.cols, spec.colWidths);
    const yCoords = this.calculateCumulativeCoords(spec.height, spec.rows, spec.rowHeights);
    
    // 2. Generate Vertical Mullions (Full Height for Stick System)
    // Actually, in stick systems, mullions usually span floor-to-floor, but for simple logic we'll do full height lines
    // adjusted for manufacturing limits later.
    for (let c = 0; c <= spec.cols; c++) {
      const x = xCoords[c];
      members.push({
        id: `mullion-${c}`,
        type: 'mullion',
        length: spec.height,
        profileId: spec.mullionProfileId,
        position: { x, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        cutAngles: { start: 90, end: 90 }
      });
    }

    // 3. Generate Horizontal Transoms (Cut between Mullions)
    for (let r = 0; r <= spec.rows; r++) {
      const y = yCoords[r];
      // const isTopOrBottom = r === 0 || r === spec.rows;
      
      for (let c = 0; c < spec.cols; c++) {
        const xStart = xCoords[c];
        const xEnd = xCoords[c + 1];
        const length = xEnd - xStart; // Needs profile width deduction in real world!
        
        // Simplified: Center-line logic. 
        // Real-world: Transom Length = (Center-to-Center) - (Mullion Width)
        
        members.push({
          id: `transom-${r}-${c}`,
          type: 'transom',
          length: length,
          profileId: spec.transomProfileId,
          position: { x: xStart, y, z: 0 }, // Position needs offset based on connection detail
          rotation: { x: 0, y: 0, z: 90 }, // Horizontal
          cutAngles: { start: 90, end: 90 }
        });
      }
    }

    // 4. Generate Panels
    for (let r = 0; r < spec.rows; r++) {
      for (let c = 0; c < spec.cols; c++) {
        const width = xCoords[c+1] - xCoords[c];
        const height = yCoords[r+1] - yCoords[r];
        const centerX = xCoords[c] + (width / 2);
        const centerY = yCoords[r] + (height / 2);

        panels.push({
          id: `panel-${r}-${c}`,
          row: r,
          col: c,
          width,
          height,
          // NEW: Position for 3D rendering
          position: { x: centerX, y: centerY, z: 0 },
          type: 'fixed', // Default
          glassId: spec.glassType
        });
      }
    }

    return {
      id: `facade-${Date.now()}`,
      systemType: 'stick',
      spec,
      members,
      panels,
      totalArea: spec.width * spec.height,
      totalPerimeter: (spec.width + spec.height) * 2
    };
  }

  private static calculateCumulativeCoords(totalSize: number, count: number, definedSizes: number[]): number[] {
    const coords = [0];
    let current = 0;
    
    // If defined sizes provided, use them. Else even split.
    const standardSize = definedSizes.length === count 
      ? 0 
      : totalSize / count;

    for (let i = 0; i < count; i++) {
        const size = definedSizes[i] || standardSize;
        current += size;
        coords.push(current);
    }
    
    // Ensure exact final dimension (correct floating point drift if any)
    coords[coords.length - 1] = totalSize; 
    
    return coords;
  }
}

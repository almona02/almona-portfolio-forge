import { CuttingPlan, WindowGrid } from '@/types/fabricator';

export type EgyptianPatternType = 
  | 'casement_2x2_transom' // Single transom over 2 sashes
  | 'fixed_mullion_4x3'    // 3 rows, 4 cols fixed grid (typical large fixed)
  | 'casement_single_transom' // Single transom over 1 sash
  | 'sliding_2_panel'      // Standard 2-panel sliding
  | 'sliding_4_panel';     // 4-panel sliding (OxxO)

export interface BOMInputs {
  grid?: WindowGrid;
  dimensions: { width: number; height: number };
  systemPackId?: string;
}

export interface OptimizedBOMResult {
  patternId: string;
  cuttingPlan?: CuttingPlan;
  isPrecomputed: boolean;
}

/**
 * leverages known Egyptian building patterns for optimization
 * 
 * Egyptian market uses standard configurations repeatedly:
 * - Casement windows with transom (very common)
 * - Fixed windows with mullion grids
 * - Standard sliding door configurations
 */
export class EgyptianPatternOptimizer {
  
  /**
   * Detect if input matches a known Egyptian pattern
   */
  static detectEgyptianPattern(inputs: BOMInputs): EgyptianPatternType | null {
    const { grid } = inputs;
    
    if (!grid) return null;

    // 1. Check for Casement with Transom (Single or Double)
    if (this.isCasementWithTransom(grid)) {
      const sashCols = this.getSashCols(grid);
      if (sashCols === 1) return 'casement_single_transom';
      if (sashCols === 2) return 'casement_2x2_transom';
    }

    // 2. Check for Sliding Patterns
    // (Assuming sliding is designated by cell type 'sliding' or specific grid structure)
    // For now, let's look for simple 1x2 or 1x4 grids with all 'sliding' or 'sash' types
    if (this.isSlidingPattern(grid)) {
        if (grid.cols === 2) return 'sliding_2_panel';
        if (grid.cols === 4) return 'sliding_4_panel';
    }

    // 3. Fixed Mullion Grid (e.g. 4x3)
    // Often used in commercial facades or large stairwell windows in Egypt
    if (this.isFixedMullionGrid(grid)) {
        if (grid.cols === 4 && grid.rows === 3) return 'fixed_mullion_4x3';
    }

    return null;
  }

  private static isCasementWithTransom(grid: WindowGrid): boolean {
    if (!grid.cells || !Array.isArray(grid.cells)) return false;

    // Specifically: Top row is fixed (transom), Bottom row involves sashes
    // Case A: 2 rows (1 transom, 1 sash row)
    if (grid.rows !== 2) return false;

    const row0Cells = grid.cells.filter(c => c.row === 0);
    const row1Cells = grid.cells.filter(c => c.row === 1);

    // Row 0 should be 'fixed' or 'empty' (if glass only)
    const topIsFixed = row0Cells.every(c => c.type === 'fixed' || c.type === 'empty');
    
    // Row 1 should have at least one sash
    const bottomHasSash = row1Cells.some(c => c.type === 'sash' || c.type === 'casement' as any); // cast for safety if type mismatch

    return topIsFixed && bottomHasSash;
  }

  private static getSashCols(grid: WindowGrid): number {
    if (!grid.cells) return 0;
    // Count columns in the sash row (usually row 1 if transom exists)
    // Simplified: max col index + 1 in row 1
    const row1Cells = grid.cells.filter(c => c.row === 1);
    return row1Cells.length; // Assuming full grid fill
  }

  private static isSlidingPattern(grid: WindowGrid): boolean {
    if (!grid.cells || !Array.isArray(grid.cells)) return false;
    // Usually 1 row, multiple cols
    if (grid.rows !== 1) return false;
    // Cells are sliding sashes
    return grid.cells.every(c => c.type === 'sliding' || c.type === 'sash_sliding' as any);
  }

  private static isFixedMullionGrid(grid: WindowGrid): boolean {
      if (!grid.cells || !Array.isArray(grid.cells)) return false;
      // All cells are fixed
      return grid.cells.every(c => c.type === 'fixed' || c.type === 'empty');
  }

  /**
   * Placeholder for retrieving a pre-computed plan
   * In a real implementation, this would load from a JSON or cache
   */
  static async getPrecomputedPlan(patternId: EgyptianPatternType, _inputs: BOMInputs): Promise<OptimizedBOMResult | null> {
      // Stub implementation
      return {
          patternId,
          isPrecomputed: true,
          // cuttingPlan: ... load from asset
      };
  }
}

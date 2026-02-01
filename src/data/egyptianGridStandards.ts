/**
 * Egyptian Grid Standards
 * 
 * Defines the standard dimensional constraints and layout rules for 
 * the Egyptian fenestration market. Used for predictive grid generation.
 * 
 * @since Phase 3: SmartDraw & Measuring Optimization
 */

export const EGYPTIAN_GRID_STANDARDS = {
  /**
   * Sliding System Standards
   */
  SLIDING: {
    /** Maximum recommended sash width (mm) before suggesting next panel count */
    MAX_SASH_WIDTH_MM: 1200, // Standard aluminum sheet width constraint
    /** Minimum practical sash width (mm) */
    MIN_SASH_WIDTH_MM: 500,
    /** Standard overlap between sashes (mm) */
    STANDARD_OVERLAP_MM: 80, 
    
    /** Width thresholds for predictve logic */
    THRESHOLDS: {
      /** Up to 2000mm -> 2 Panels */
      TWO_PANEL_LIMIT: 2200, 
      /** Up to 3200mm -> 3 Panels or 2 Panel Jumbo */
      THREE_PANEL_LIMIT: 3200, 
      /** Beyond 3200mm -> 4 Panels */
    },
    
    /** Default column width ratios */
    RATIOS: {
      /** Standard 3-Panel: Quarter - Half - Quarter (1:2:1) */
      THREE_PANEL_SYMMETRIC: [1, 2, 1],
      /** Standard Equal: 1:1:1... */
      EQUAL: [1] 
    }
  },

  /**
   * Casement System Standards
   */
  CASEMENT: {
    /** Maximum recommended sash width (mm) for standard hinge */
    MAX_SASH_WIDTH_MM: 700, 
    /** Maximum sash width for heavy duty hinge */
    MAX_HEAVY_SASH_WIDTH_MM: 900,
    
    /** Width thresholds for predictive logic */
    THRESHOLDS: {
      /** Up to 900mm -> 1 Sash (Single) */
      SINGLE_SASH_LIMIT: 900,
      /** Up to 1800mm -> 2 Sash (French/Double) */
      DOUBLE_SASH_LIMIT: 1800
    }
  }
} as const;

export type GridPrediction = {
  rows: number;
  cols: number;
  type: 'sliding' | 'casement' | 'fixed';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
};

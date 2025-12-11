/**
 * Simplified Optimization Engine - Phase 1: Foundational Precision
 * 
 * This is the ENGINE that saves the business.
 * No complex algorithms, no AI, just math that works.
 * 
 * Focus: Achieve 99.8% accuracy through micron-level precision.
 */

import { micronEngine } from './MicronEngine';

/**
 * Cut definition
 */
export interface Cut {
  id: string;
  label: string;
  plannedLength: number; // mm - Original design length
  role: 'frame' | 'sash' | 'mullion' | 'transom' | 'bead' | 'screen_sash';
  profileId: string;
  quantity: number;
}

/**
 * Bar definition
 */
export interface Bar {
  id: string;
  nominalLength: number; // mm
  usableLength: number; // mm (after trim and clamp safety)
  usedLength: number; // mm
  remainingLength: number; // mm
  cuts: Array<{
    id: string;
    label: string;
    length: number; // mm
    position: number; // mm from start of bar
    kerf: number; // mm (0 for last cut)
  }>;
}

/**
 * Optimized result
 */
export interface OptimizedResult {
  bars: Bar[];
  utilization: number; // Percentage (0-100)
  waste: number; // mm
  micronCorrections: {
    appliedKerf: number;
    appliedTrim: number;
    transomMillingApplied: number;
  };
}

/**
 * Simplified Optimization Engine
 * 
 * Uses First-Fit Decreasing algorithm with micron-level corrections.
 * Simple, fast, accurate.
 */
export class SimplifiedOptimizationEngine {
  private micronEngine = micronEngine;

  /**
   * Optimize cuts into bars
   * 
   * Algorithm: First-Fit Decreasing (FFD)
   * 1. Apply micron corrections (transom milling, etc.)
   * 2. Sort by length (descending)
   * 3. Pack into bars with kerf accounting
   */
  optimize(cuts: Cut[], systemPackId?: string): OptimizedResult {
    // Step 1: Apply micron corrections
    const correctedCuts = cuts.map(cut => {
      let correctedLength = cut.plannedLength;

      // Apply transom milling if needed
      if (cut.role === 'transom' && systemPackId) {
        correctedLength = this.micronEngine.calculateTransomMillingLength(
          cut.plannedLength,
          systemPackId
        );
      }

      return {
        ...cut,
        correctedLength
      };
    });

    // Step 2: Sort by length (descending) - First-Fit Decreasing
    const sortedCuts = [...correctedCuts].sort((a, b) => b.correctedLength - a.correctedLength);

    // Step 3: Bin packing with kerf
    const bars: Bar[] = [];
    let currentBar: Bar = this.createNewBar();

    sortedCuts.forEach((cut, index) => {
      // Expand by quantity
      for (let q = 0; q < cut.quantity; q++) {
        // Calculate cut with kerf
        // CRITICAL: Kerf applies to N-1 cuts (not N)
        // Last cut doesn't need kerf (no material left after cut)
        const isLastCut = (index === sortedCuts.length - 1) && (q === cut.quantity - 1);
        const kerf = isLastCut ? 0 : this.micronEngine.getConfig().sawBladeKerf;
        
        // Correction 1: Floating Point Precision
        const toPrecision = (num: number) => Math.round(num * 100) / 100;
        const cutWithKerf = toPrecision(cut.correctedLength + kerf);

        if (currentBar.remainingLength >= cutWithKerf) {
          // Fits in current bar
          currentBar.cuts.push({
            id: `${cut.id}-${q}`,
            label: cut.label,
            length: cut.correctedLength,
            position: currentBar.usedLength,
            kerf
          });
          currentBar.usedLength = toPrecision(currentBar.usedLength + cutWithKerf);
          currentBar.remainingLength = toPrecision(currentBar.remainingLength - cutWithKerf);
        } else {
          // Start new bar
          bars.push(currentBar);
          currentBar = this.createNewBar();

          currentBar.cuts.push({
            id: `${cut.id}-${q}`,
            label: cut.label,
            length: cut.correctedLength,
            position: 0,
            kerf
          });
          currentBar.usedLength = toPrecision(cutWithKerf);
          currentBar.remainingLength = toPrecision(currentBar.usableLength - cutWithKerf);
        }
      }
    });

    // Add last bar
    if (currentBar.cuts.length > 0) {
      bars.push(currentBar);
    }

    // Calculate metrics
    const totalUsed = bars.reduce((sum, bar) => sum + bar.usedLength, 0);
    const totalMaterial = bars.reduce((sum, bar) => sum + bar.nominalLength, 0);
    const utilization = totalMaterial > 0 ? (totalUsed / totalMaterial) * 100 : 0;
    const waste = bars.reduce((sum, bar) => sum + bar.remainingLength, 0);

    const transomMillingCount = correctedCuts.filter(c => c.role === 'transom').length;

    return {
      bars,
      utilization: Math.round(utilization * 100) / 100, // Round to 2 decimals
      waste: Math.round(waste * 100) / 100,
      micronCorrections: {
        appliedKerf: this.micronEngine.getConfig().sawBladeKerf,
        appliedTrim: this.micronEngine.getConfig().barEndTrim,
        transomMillingApplied: transomMillingCount
      }
    };
  }

  /**
   * Create a new bar with usable length calculated
   */
  private createNewBar(): Bar {
    const usableLength = this.micronEngine.calculateUsableBarLength();
    const config = this.micronEngine.getConfig();

    return {
      id: `bar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nominalLength: config.barNominalLength,
      usableLength,
      usedLength: 0,
      remainingLength: usableLength,
      cuts: []
    };
  }
}

// Export singleton instance
export const simplifiedOptimizationEngine = new SimplifiedOptimizationEngine();


/**
 * Almona Fabricator Pro: Linear Optimizer (1D Bin Packing)
 * 
 * Implements the "Best Fit Decreasing" algorithm to optimize linear cuts
 * into standard stock lengths, minimizing waste.
 * 
 * Constitutional Tier: Tier 2 (Mathematical Truth)
 */

export interface StockBar {
  id: string; // Unique ID for this bar
  length: number; // usually 6000mm or 6500mm
  cuts: Array<{
    id: string;
    length: number; // Length of the cut
    label: string;  // e.g., "Frame Top", "Sash Left"
  }>;
  waste: number;    // Remaining length
  wastePercentage: number;
}

export interface OptimizationResult {
  stockUsed: StockBar[];
  totalStockLength: number;
  totalCutLength: number;
  totalWaste: number;
  efficiency: number; // 0.0 to 1.0
  barsCount: number;
}

export interface CutRequest {
  id: string;
  length: number;
  label: string;
  quantity: number;
}

/**
 * Optimizes a list of required cuts into stock bars using Best Fit Decreasing.
 * 
 * @param requests - List of required cuts and quantities
 * @param stockLength - Standard length of stock bar (default 6000mm)
 * @param kerfWidth - Sword cut width to deduct (default 5mm)
 */
export function optimizeLinearCuts(
  requests: CutRequest[],
  stockLength: number = 6000,
  kerfWidth: number = 5
): OptimizationResult {
  // 1. Flatten requests into individual cuts
  const allCuts: Array<{ id: string; length: number; label: string }> = [];
  requests.forEach(req => {
    for (let i = 0; i < req.quantity; i++) {
      allCuts.push({
        id: `${req.id}-${i}`,
        length: req.length,
        label: req.label,
      });
    }
  });

  // 2. Sort cuts descending (Best Fit Decreasing strategy)
  allCuts.sort((a, b) => b.length - a.length);

  const stockBars: StockBar[] = [];

  // 3. Allocate cuts
  allCuts.forEach(cut => {
    let bestBarIndex = -1;
    let minWaste = Number.MAX_VALUE;

    // Try to find the best existing bar that fits this cut
    for (let i = 0; i < stockBars.length; i++) {
      const bar = stockBars[i];
      // Check if cut + kerf fits
      // Note: We only add kerf if it's not the first cut, but for simplicity/safety
      // in estimation, we often assume kerf is needed for every cut or pre-deduct it.
      // Here we check: remaining space >= cut.length + (bar.cuts.length > 0 ? kerfWidth : 0)
      const kerfNeeded = bar.cuts.length > 0 ? kerfWidth : 0;
      
      if (bar.waste >= cut.length + kerfNeeded) {
        const potentialWaste = bar.waste - (cut.length + kerfNeeded);
        if (potentialWaste < minWaste) {
          minWaste = potentialWaste;
          bestBarIndex = i;
        }
      }
    }

    if (bestBarIndex !== -1) {
      // Add to existing bar
      const bar = stockBars[bestBarIndex];
      const kerfNeeded = bar.cuts.length > 0 ? kerfWidth : 0;
      bar.cuts.push(cut);
      bar.waste -= (cut.length + kerfNeeded);
      bar.wastePercentage = bar.waste / bar.length;
    } else {
      // Create new bar
      // Validate that cut fits in a full bar
      if (cut.length > stockLength) {
        console.warn(`Cut ${cut.label} (${cut.length}mm) exceeds stock length (${stockLength}mm). Skipping.`);
        return; // Skip impossible cuts or handle as special order
      }
      
      const newBar: StockBar = {
        id: `stock-${stockBars.length + 1}`,
        length: stockLength,
        cuts: [cut],
        waste: stockLength - cut.length, // First cut typically needs edge trim, but we simplify here
        wastePercentage: 0,
      };
      newBar.wastePercentage = newBar.waste / newBar.length;
      stockBars.push(newBar);
    }
  });

  // 4. Calculate totals
  const totalStockLength = stockBars.length * stockLength;
  const totalCutLength = allCuts.reduce((sum, cut) => sum + cut.length, 0);
  const totalWaste = stockBars.reduce((sum, bar) => sum + bar.waste, 0);
  const efficiency = totalStockLength > 0 ? totalCutLength / totalStockLength : 0;

  return {
    stockUsed: stockBars,
    totalStockLength,
    totalCutLength,
    totalWaste,
    efficiency,
    barsCount: stockBars.length,
  };
}

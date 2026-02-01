import { CutItem } from './CutListGenerator';

export interface StockBar {
  id: string;
  length: number; // Total length (e.g., 6000)
  cuts: CutItem[];
  remaining: number;
  waste: number;
}

export interface OptimizationResult {
  bars: StockBar[];
  totalStockLength: number;
  totalUsedLength: number;
  totalWaste: number;
  wastePercentage: number;
  barCount: number;
}

/**
 * Service for 1D Linear Stock Optimization (Nesting)
 * Uses "First Fit Decreasing" (FFD) algorithm.
 */
export class StockOptimizer {
  private static readonly SAW_BLADE_WIDTH = 4; // mm lost per cut
  private static readonly STANDARD_STOCK_LENGTH = 6000; // mm

  /**
   * Optimize cut list into stock bars
   */
  public static optimize(
    items: CutItem[], 
    stockLength: number = StockOptimizer.STANDARD_STOCK_LENGTH
  ): OptimizationResult {
    // 1. Flatten quantity into individual items
    const flatItems: CutItem[] = [];
    items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        flatItems.push({ ...item, quantity: 1 });
      }
    });

    // 2. Sort descending (Longest to Shortest) - Core logic of FFD
    flatItems.sort((a, b) => b.lengthMm - a.lengthMm);

    // 3. Initialize Bars
    const bars: StockBar[] = [];

    // 4. Place items
    for (const item of flatItems) {
      let placed = false;
      const requiredLength = item.lengthMm + this.SAW_BLADE_WIDTH;

      // Try to fit in existing bars
      for (const bar of bars) {
        if (bar.remaining >= requiredLength) {
          bar.cuts.push(item);
          bar.remaining -= requiredLength;
          placed = true;
          break;
        }
      }

      // If not placed, create new bar
      if (!placed) {
        // Validation: Item too long?
        if (requiredLength > stockLength) {
            console.warn(`Item ${item.profileCode} length ${item.lengthMm} exceeds stock ${stockLength}`);
            // In a real app we might handle "oversize" separately, 
            // here we just fit it in a "custom" bar or split it (not supported yet)
            // For now, we add a bar just for it (negative remaining technically, or fully used)
             const newBar: StockBar = {
                id: `bar-${bars.length + 1}`,
                length: Math.max(stockLength, requiredLength),
                cuts: [item],
                remaining: Math.max(stockLength, requiredLength) - requiredLength,
                waste: 0 // calc later
            };
            bars.push(newBar);
        } else {
            const newBar: StockBar = {
                id: `bar-${bars.length + 1}`,
                length: stockLength,
                cuts: [item],
                remaining: stockLength - requiredLength,
                waste: 0 // calc later
            };
            bars.push(newBar);
        }
      }
    }

    // 5. Calculate Metrics
    let totalStock = 0;
    let totalUsed = 0;
    
    bars.forEach(bar => {
        // Accurate waste calc: Remaining length (excluding saw kerfs which are 'used' in a sense, or 'lost')
        // Usually Waste = Total Stock - (Sum of net part lengths). 
        // Saw kerf is unavoidable waste. 
        // We will treat "Remaining" as reusable offcut potential? 
        // No, typically in simple nesting, remaining at end is waste unless > reusable threshold.
        // Let's call it all waste for now.
        
        const netUsed = bar.cuts.reduce((sum, c) => sum + c.lengthMm, 0);
        bar.waste = bar.length - netUsed; // Includes saw kerfs + end scrap
        
        totalStock += bar.length;
        totalUsed += netUsed;
    });

    return {
      bars,
      totalStockLength: totalStock,
      totalUsedLength: totalUsed,
      totalWaste: totalStock - totalUsed,
      wastePercentage: ((totalStock - totalUsed) / totalStock) * 100,
      barCount: bars.length
    };
  }
}

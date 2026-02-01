
import type { Rectangle } from '../types/drafting';
import { HardwareLogic } from './HardwareLogic';
import { ProfileRegistry } from './ProfileRegistry';

export interface CostBreakdown {
  aluminum: {
    weightKg: number;
    cost: number;
  };
  glass: {
    areaM2: number;
    cost: number;
  };
  hardware: {
    count: number;
    cost: number;
  };
  totalCost: number;
  currency: string;
}

export class PriceCalculator {
  
  /**
   * Calculates the total cost for a set of rectangles (sashes/frames)
   * given a specific system pack ID.
   */
  public static calculate(rectangles: Rectangle[], systemId: string, systemPriceOverride?: number): CostBreakdown {
    const specs = ProfileRegistry.getInstance().getSpecs(systemId);
    
    // Defaults if missing specs
    const weightPerMeter = specs?.weightKgPerMeter || 1.5;
    const pricePerKg = systemPriceOverride || specs?.pricePerKg || 180;
    const glassPrice = specs?.glassPricePerM2 || 800;

    let totalPerimeter = 0;
    let totalGlassArea = 0;
    let hardwareCount = 0;
    const hardwareUnitCost = 350; // Average cost per hardware kit (Handle+Hinges) - generic fallback

    rectangles.forEach(rect => {
      // 1. Aluminum Perimeter (simplified: 2*w + 2*h)
      // Note: This calculates raw perimeter. In reality, it involves frame vs sash profiles.
      // For Tier 3 estimation, this is sufficient.
      totalPerimeter += (rect.width + rect.height) * 2;

      // 2. Glass Area (simplified: w*h)
      // Real calculation removes frame width, done via MaterialAwareness in Tier 4.
      // We'll deduct roughly 120mm from width/height for frame/sash to get daylight.
      const frameDeduction = (specs?.profileDepth || 50) * 2; 
      const glassW = Math.max(0, rect.width - frameDeduction);
      const glassH = Math.max(0, rect.height - frameDeduction);
      totalGlassArea += (glassW * glassH);

      // 3. Hardware Count
      // Fixed windows have 0 hardware cost usually (except maybe glass supports)
      if (rect.type !== 'fixed') {
          // Check if hardware logic finds items
          const hw = HardwareLogic.calculateHardware(rect, rect.type || 'casement');
          if (hw.length > 0) {
              hardwareCount += 1; // Count as 1 "Kit" per sash
          }
      }
    });

    // Convert dimensions
    const perimeterM = totalPerimeter / 1000;
    const glassAreaM2 = totalGlassArea / 1_000_000;

    // Calculate Costs
    const aluminumWeight = perimeterM * weightPerMeter;
    const aluminumCost = aluminumWeight * pricePerKg;
    const glassCost = glassAreaM2 * glassPrice;
    const hardwareCost = hardwareCount * hardwareUnitCost;

    return {
      aluminum: {
        weightKg: Number(aluminumWeight.toFixed(2)),
        cost: Number(aluminumCost.toFixed(2))
      },
      glass: {
        areaM2: Number(glassAreaM2.toFixed(2)),
        cost: Number(glassCost.toFixed(2))
      },
      hardware: {
        count: hardwareCount,
        cost: Number(hardwareCost.toFixed(2))
      },
      totalCost: Number((aluminumCost + glassCost + hardwareCost).toFixed(2)),
      currency: 'EGP'
    };
  }
}

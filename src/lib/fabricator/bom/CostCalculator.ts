/**
 * CostCalculator - Accurate Cost Estimation
 * 
 * Calculates accurate costs with:
 * - Material costs (profiles, hardware, glazing)
 * - Labor costs (assembly time)
 * - Egyptian market pricing
 * - Local supplier integration
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 13)
 */

import type { WindowUnit, FabricationData } from '@/types/fabricator';
import { EgyptianPricingEngine } from './EgyptianPricingEngine';
import type { AccessoryItem } from './AccessoriesBOMCalculator';

/**
 * CostCalculator - Cost calculation engine
 */
export class CostCalculator {
  private pricingEngine: EgyptianPricingEngine;

  constructor() {
    this.pricingEngine = new EgyptianPricingEngine();
  }

  /**
   * Calculate accurate cost from BOM components
   */
  async calculateAccurateCost(
    profiles: FabricationData['profiles'],
    hardware: FabricationData['hardware'],
    glazing: FabricationData['glazing'],
    accessories: AccessoryItem[],
    windowUnit: WindowUnit
  ): Promise<{
    materialCost: number;
    laborCost: number;
    hardwareCost: number;
    glazingCost: number;
    accessoriesCost: number;
    totalCost: number;
  }> {
    // Material cost (profiles)
    const materialCost = profiles.reduce((sum, p) => sum + p.cost, 0);

    // Hardware cost
    const hardwareCost = await this.pricingEngine.calculateHardwareCost(
      hardware,
      windowUnit.positionMeta?.buildingBlock
    );

    // Glazing cost
    const glazingCost = await this.pricingEngine.calculateGlazingCost(
      glazing,
      windowUnit.positionMeta?.buildingBlock
    );

    // Accessories cost
    const accessoriesCost = accessories.reduce((sum, a) => sum + a.totalCost, 0);

    // Labor cost (based on assembly time)
    const totalAssemblyTime = this.estimateTotalAssemblyTime(profiles, hardware, glazing);
    const laborCost = await this.pricingEngine.calculateLaborCost(
      totalAssemblyTime,
      windowUnit.positionMeta?.buildingBlock
    );

    const totalCost = materialCost + hardwareCost + glazingCost + accessoriesCost + laborCost;

    return {
      materialCost,
      laborCost,
      hardwareCost,
      glazingCost,
      accessoriesCost,
      totalCost
    };
  }

  /**
   * Estimate total assembly time
   */
  private estimateTotalAssemblyTime(
    profiles: FabricationData['profiles'],
    hardware: FabricationData['hardware'],
    glazing: FabricationData['glazing']
  ): number {
    // Base time: 30 minutes
    let time = 30;

    // Add time for profiles (2 minutes per profile)
    time += profiles.reduce((sum, p) => sum + p.quantity, 0) * 2;

    // Add time for hardware (5 minutes per hardware item)
    time += hardware.reduce((sum, h) => sum + h.quantity, 0) * 5;

    // Add time for glazing (10 minutes per pane)
    time += glazing.length * 10;

    return time; // minutes
  }
}



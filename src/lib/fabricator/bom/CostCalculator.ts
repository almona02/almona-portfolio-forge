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

import type { FabricationData, WindowUnit } from '@/types/fabricator';
import type { AccessoryItem } from './AccessoriesBOMCalculator';
import { EgyptianPricingEngine } from './EgyptianPricingEngine';
import { ASSEMBLY_TIME_CONFIG } from './assemblyTimeConstants';

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
   * Uses configurable constants for maintainability
   */
  private estimateTotalAssemblyTime(
    profiles: FabricationData['profiles'],
    hardware: FabricationData['hardware'],
    glazing: FabricationData['glazing']
  ): number {
    // Base time
    let time = ASSEMBLY_TIME_CONFIG.BASE_TIME_MINUTES;

    // Add time for profiles
    time += profiles.reduce((sum, p) => sum + p.quantity, 0) * ASSEMBLY_TIME_CONFIG.TIME_PER_PROFILE_MINUTES;

    // Add time for hardware
    time += hardware.reduce((sum, h) => sum + h.quantity, 0) * ASSEMBLY_TIME_CONFIG.TIME_PER_HARDWARE_MINUTES;

    // Add time for glazing
    time += glazing.length * ASSEMBLY_TIME_CONFIG.TIME_PER_GLAZING_PANE_MINUTES;

    return time; // minutes
  }
}



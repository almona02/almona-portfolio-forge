/**
 * Egyptian Installation Calculator
 * 
 * Calculates installation costs including scaffolding, wall preparation,
 * fixing materials, and labor based on Egyptian market rates (Dec 2024).
 * 
 * @source Egyptian market surveys (2023-2024)
 * @source Workshop operational data
 */

export interface InstallationVariables {
  wallType: 'brick' | 'hollow-block' | 'concrete';
  scaffoldingRequired: boolean;
  scaffoldingCostPerM2: number; // 50-150 EGP/m²
  wallPreparationRequired: boolean;
  wallPreparationCost: number; // per opening
  floorLevel: number; // 1 = ground, 2+ = upper floors
  installationComplexity: 'simple' | 'standard' | 'complex';
  revealPreparation: 'none' | 'basic' | 'extensive';
}

export interface InstallationCostBreakdown {
  scaffoldingCost: number;
  wallPreparationCost: number;
  fixingMaterialsCost: number;
  laborCost: number;
  totalInstallationCost: number;
  installationTimeDays: number;
  /** Breakdown of fixing materials */
  fixingMaterials: {
    screws: number; // quantity
    anchors: number; // quantity
    siliconCartridges: number; // quantity
    foamCans: number; // quantity
    totalCost: number;
  };
}

/**
 * Egyptian Installation Calculator
 * 
 * Calculates complete installation costs for Egyptian workshop projects
 */
export class EgyptianInstallationCalculator {
  /**
   * Calculate complete installation cost breakdown
   */
  calculateInstallationCost(
    projectAreaM2: number,
    variables: InstallationVariables,
    openingCount: number = 1
  ): InstallationCostBreakdown {
    // Scaffolding cost (if required)
    const scaffoldingCost = variables.scaffoldingRequired
      ? projectAreaM2 * variables.scaffoldingCostPerM2
      : 0;

    // Wall preparation based on wall type and opening count
    const wallPreparationCost = this.getWallPreparationCost(variables, openingCount);

    // Fixing materials (screws, anchors, foam, silicon)
    const fixingMaterials = this.calculateFixingMaterials(projectAreaM2, variables, openingCount);

    // Labor cost (Egyptian market rates)
    const laborCost = this.calculateLaborCost(projectAreaM2, variables);

    const totalInstallationCost = scaffoldingCost + wallPreparationCost + 
                                  fixingMaterials.totalCost + laborCost;

    return {
      scaffoldingCost,
      wallPreparationCost,
      fixingMaterialsCost: fixingMaterials.totalCost,
      fixingMaterials,
      laborCost,
      totalInstallationCost,
      installationTimeDays: this.estimateInstallationTime(projectAreaM2, variables, openingCount)
    };
  }

  /**
   * Get wall preparation cost based on wall type
   */
  private getWallPreparationCost(
    variables: InstallationVariables,
    openingCount: number
  ): number {
    if (!variables.wallPreparationRequired) return 0;

    const rates = {
      'brick': 75,      // Traditional brick walls need more work
      'hollow-block': 50, // Standard new construction
      'concrete': 100    // Concrete needs drilling
    };

    const baseCost = rates[variables.wallType] || 50;
    return baseCost * openingCount;
  }

  /**
   * Calculate fixing materials needed
   */
  private calculateFixingMaterials(
    projectAreaM2: number,
    variables: InstallationVariables,
    openingCount: number
  ): InstallationCostBreakdown['fixingMaterials'] {
    // Calculate perimeter (approximate: 2 × (width + height) for each opening)
    // Average opening: 1.5m × 1.8m = 6.6m perimeter
    const averagePerimeterPerOpening = 6.6; // meters
    const totalPerimeter = averagePerimeterPerOpening * openingCount;

    // Screws/Anchors: 1 every 300mm (0.3m) along perimeter
    const screwsNeeded = Math.ceil(totalPerimeter / 0.3);
    const anchorsNeeded = screwsNeeded; // Same quantity
    const screwCost = screwsNeeded * 0.5; // 0.5 EGP per screw
    const anchorCost = anchorsNeeded * 2.0; // 2.0 EGP per anchor

    // Silicon: Based on gap volume
    // Typical gap: 10mm width × 15mm depth × perimeter
    const gapVolumeMl = (totalPerimeter * 1000) * 10 * 15 / 1000; // Convert to ml
    const siliconCartridges = Math.ceil(gapVolumeMl / 280); // 280ml per cartridge
    const siliconCost = siliconCartridges * 100; // 100 EGP per cartridge

    // Foam: Same gap volume
    const foamCans = Math.ceil(gapVolumeMl / 750); // 750ml per can
    const foamCost = foamCans * 50; // 50 EGP per can

    const totalCost = screwCost + anchorCost + siliconCost + foamCost;

    return {
      screws: screwsNeeded,
      anchors: anchorsNeeded,
      siliconCartridges,
      foamCans,
      totalCost
    };
  }

  /**
   * Calculate labor cost based on Egyptian market rates
   */
  private calculateLaborCost(
    areaM2: number,
    variables: InstallationVariables
  ): number {
    // Egyptian labor rates (updated Dec 2024)
    const baseRate = 250; // EGP/m² for standard installation

    const complexityMultiplier = {
      'simple': 0.8,
      'standard': 1.0,
      'complex': 1.5
    };
    
    // Adjust for floor level (upper floors require more time)
    const floorMultiplier = variables.floorLevel > 1 ? 1.2 : 1.0;
    
    // Adjust for reveal preparation
    const revealMultiplier = {
      'none': 0.9,
      'basic': 1.0,
      'extensive': 1.3
    };

    return areaM2 * baseRate * 
           complexityMultiplier[variables.installationComplexity] *
           floorMultiplier *
           revealMultiplier[variables.revealPreparation];
  }

  /**
   * Estimate installation time in days
   */
  private estimateInstallationTime(
    areaM2: number,
    variables: InstallationVariables,
    openingCount: number
  ): number {
    // Base installation rate: ~15 m² per day for standard installation
    const baseRateM2PerDay = 15;
    
    // Adjust for complexity
    const complexityMultiplier = {
      'simple': 0.8,
      'standard': 1.0,
      'complex': 1.8
    };

    // Adjust for floor level (scaffolding setup time)
    const floorMultiplier = variables.floorLevel > 1 ? 1.3 : 1.0;

    // Adjust for reveal preparation
    const revealMultiplier = {
      'none': 0.9,
      'basic': 1.0,
      'extensive': 1.4
    };

    const adjustedRate = baseRateM2PerDay / 
                        (complexityMultiplier[variables.installationComplexity] *
                         floorMultiplier *
                         revealMultiplier[variables.revealPreparation]);

    const days = areaM2 / adjustedRate;
    
    // Minimum 0.5 days, round up to nearest 0.5
    return Math.max(0.5, Math.ceil(days * 2) / 2);
  }

  /**
   * Get default installation variables based on project context
   */
  static getDefaultVariables(
    floorLevel: number = 1,
    projectAreaM2: number = 0
  ): InstallationVariables {
    return {
      wallType: 'hollow-block',
      scaffoldingRequired: floorLevel > 1 || projectAreaM2 > 10,
      scaffoldingCostPerM2: 100, // Default midpoint (50-150 range)
      wallPreparationRequired: true,
      wallPreparationCost: 50,
      floorLevel,
      installationComplexity: 'standard',
      revealPreparation: 'basic'
    };
  }
}


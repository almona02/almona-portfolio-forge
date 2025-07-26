import { MATERIAL_PRICES, BLADE_COSTS, LABOR_RATES } from './pricing';

export interface FabricationCosts {
  materialCost: number;
  accessoryCost: number;
  energyCost: number;
  bladeCost: number;
  laborCost: number;
  totalCost: number;
}

export function calculateFabricationCost(
  materialType: 'aluminum' | 'upvc',
  profileLength: number,
  profilePrice: number,
  accessories: {
    locks: number;
    handles: number;
    espanglites: number;
    rails: number;
  },
  machineHours: number
): FabricationCosts {
  // Calculate material cost based on custom input or default pricing
  const materialCost = profileLength * (profilePrice || 
    (materialType === 'aluminum' 
      ? MATERIAL_PRICES.aluminum.basePrice 
      : (MATERIAL_PRICES.upvc.basePrice.min + MATERIAL_PRICES.upvc.basePrice.max) / 2));

  // Calculate accessory costs
  const accessoryCost = 
    (accessories.locks || MATERIAL_PRICES[materialType].accessories.locks) +
    (accessories.handles || MATERIAL_PRICES[materialType].accessories.handles) +
    (accessories.espanglites || MATERIAL_PRICES[materialType].accessories.espanglites) +
    (accessories.rails || (materialType === 'aluminum' ? MATERIAL_PRICES.aluminum.accessories.rails : 0));

  // Calculate operational costs
  const energyCost = machineHours * MATERIAL_PRICES.energyCost;
  const bladeCost = (machineHours / 8) * BLADE_COSTS[materialType]; // Assuming blade lasts ~8 hours
  const laborCost = machineHours * LABOR_RATES.cutting;

  return {
    materialCost,
    accessoryCost,
    energyCost,
    bladeCost,
    laborCost,
    totalCost: materialCost + accessoryCost + energyCost + bladeCost + laborCost
  };
}

export function calculateCuttingTime(
  machineModel: string,
  material: 'aluminum' | 'upvc',
  profileLength: number
): number {
  // Machine performance data (cuts per hour)
  const machinePerformance: Record<string, number> = {
    'KM-212': material === 'aluminum' ? 120 : 150,  // YILMAZ machine
    'Chinese-1': material === 'aluminum' ? 80 : 100, // Generic Chinese machine
    'Chinese-2': material === 'aluminum' ? 70 : 90   // Lower-end Chinese machine
  };

  const cutsPerHour = machinePerformance[machineModel] || 100; // Default
  return profileLength / cutsPerHour;
}

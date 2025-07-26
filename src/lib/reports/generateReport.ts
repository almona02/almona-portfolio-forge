import { calculateFabricationCost, calculateCuttingTime } from './costCalculator';
import { generatePDFReport } from './pdfTemplate';
import { MACHINE_SPECS } from './pricing';

export interface ReportOptions {
  materialType: 'aluminum' | 'upvc';
  profileLength: number;
  profilePrice: number;
  accessories: {
    locks: number;
    handles: number;
    espanglites: number;
    rails: number;
  };
  machineModel: string;
  isArabic?: boolean;
}

export interface MachineComparison {
  model: string;
  power: number;
  maxCutLength: number;
  price: number;
  cuttingTime: number;
}

export async function generateFabricationReport(options: ReportOptions) {
  // Calculate costs
  const costs = calculateFabricationCost(
    options.materialType,
    options.profileLength,
    options.profilePrice,
    options.accessories,
    calculateCuttingTime(options.machineModel, options.materialType, options.profileLength)
  );

  // Generate comparison data
  const comparisons: MachineComparison[] = Object.entries(MACHINE_SPECS).map(([model, specs]) => ({
    model,
    power: specs.power,
    maxCutLength: specs.maxCutLength,
    price: specs.price,
    cuttingTime: calculateCuttingTime(model, options.materialType, options.profileLength)
  }));

  // Generate PDF
  const pdfBytes = await generatePDFReport(
    costs,
    options.machineModel,
    options.materialType,
    options.isArabic
  );

  return {
    pdfBytes,
    costs,
    comparisons,
    cuttingTime: calculateCuttingTime(options.machineModel, options.materialType, options.profileLength)
  };
}

// Helper function to compare YILMAZ vs Chinese machines
export function compareMachines(comparisons: MachineComparison[]) {
  const yilmaz = comparisons.find(c => c.model === 'KM-212');
  const chinese = comparisons.filter(c => c.model !== 'KM-212');
  
  return {
    yilmaz,
    chinese,
    powerDifference: yilmaz ? yilmaz.power - (chinese[0]?.power || 0) : 0,
    priceDifference: yilmaz ? yilmaz.price - (chinese[0]?.price || 0) : 0,
    timeDifference: yilmaz ? (chinese[0]?.cuttingTime || 0) - yilmaz.cuttingTime : 0
  };
}

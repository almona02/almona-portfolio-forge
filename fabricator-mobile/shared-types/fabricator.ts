/**
 * Shared types from web app for mobile compatibility
 * These are essential types needed by the mobile app
 */

export interface Profile {
  id: string;
  name: string;
  material: 'aluminum' | 'upvc' | 'wood';
  width: number;
  height?: number;
  thickness?: number;
  color: string;
  costPerMeter: number;
  cuttingAllowance: number;
  stockQuantity: number;
  minStockLevel: number;
  maxStockLevel?: number;
  supplier: string;
  type?: string;
  system?: string;
  systemBrand?: string;
  weightPerMeter?: number;
  grainDirection?: 'horizontal' | 'vertical' | null;
  specifications?: Record<string, any>;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Cut {
  length: number;
  angle: number;
  componentId: string;
  componentType?: string;
  waste: number;
}

export interface CuttingPlan {
  profile: Profile;
  stockLength: number;
  cuts: Cut[];
  totalWaste: number;
  utilization: number;
}


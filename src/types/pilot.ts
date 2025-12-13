import type { PilotSystemId } from '@/data/pilot-systems';

export interface MaalemDashboardState {
  system: PilotSystemId;
  pattern: string;
  width: number;
  height: number;
  count: number;
  measurementMode: 'hole' | 'manufacturing';
  wallDeduction: number;
  color: string;
  glazing: string;
}

export interface PilotValidationResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  messageArabic: string;
  maalemAdvice?: string;
}

export interface PilotCostBreakdown {
  profiles: number;
  glass: number;
  accessories: number;
  labor: number;
  total: number;
  material: number;
}

export interface PilotOptimizationResult {
  cutsByProfile: Array<{
    profileId: string;
    profileName: string;
    barsNeeded: number;
    cutCount: number;
    cuts: Array<{
      length: number;
      quantity: number;
      cutType?: string;
    }>;
  }>;
  wastePercentage: number;
  totalBars: number;
  totalWaste: number;
}


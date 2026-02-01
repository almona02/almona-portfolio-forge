/**
 * Almona Fabricator Pro: Fabrication Strategies
 * 
 * Implements the Strategy Pattern to decouple manufacturing logic from data structure.
 * Allows dynamic switching between different construction methods (Miter vs Butt Joint).
 * 
 * Constitutional Tier: Tier 2 (Pattern-Based Logic)
 */

import { Profile } from '@/types/fabricator';

export interface FabricationContext {
  width: number;  // microns
  height: number; // microns
  profile: Profile;
  miterAllowance: number; // microns
  weldingBurnOff: number; // microns
}

export interface CutResult {
  topLength: number;
  bottomLength: number;
  leftLength: number;
  rightLength: number;
  angle: 45 | 90;
  type: 'miter' | 'butt';
}

export interface FabricationStrategy {
  name: string;
  calculateFrameCuts(context: FabricationContext): CutResult;
  calculateSashCuts(context: FabricationContext): CutResult;
}

/**
 * Strategy for 45-degree Miter Cuts (Typical for UPVC/Aluminum)
 * All sides are cut at 45 degrees.
 * Length = Outer Dimension + Welding Burn Off (if any)
 */
export class Miter45Strategy implements FabricationStrategy {
  name = 'Miter 45°';

  calculateFrameCuts(ctx: FabricationContext): CutResult {
    // For 45 degree miters, cut length is outer dimension
    // + allowances for welding/mitering
    const allowance = ctx.miterAllowance + (ctx.weldingBurnOff * 2);

    return {
      topLength: ctx.width + allowance,
      bottomLength: ctx.width + allowance,
      leftLength: ctx.height + allowance,
      rightLength: ctx.height + allowance,
      angle: 45,
      type: 'miter',
    };
  }

  calculateSashCuts(ctx: FabricationContext): CutResult {
    // Same logic for sash, usually
    return this.calculateFrameCuts(ctx);
  }
}

/**
 * Strategy for 90-degree Butt Joints (Typical for Timber/Some Aluminum)
 * Top/Bottom run full width. Left/Right fit between them.
 */
export class ButtJointStrategy implements FabricationStrategy {
  name = 'Butt Joint 90°';

  calculateFrameCuts(ctx: FabricationContext): CutResult {
    // Top/Bottom run full width
    const horizontalLength = ctx.width;
    
    // Sides are reduced by profile thickness (width of the profile face)
    // IMPORTANT: Profile dimensions in context should be used
    // Assuming profile.width is the "face width" (height) of the bar in the frame context
    const profileThickness = (ctx.profile.width || 0) * 1000; // convert mm to microns if needed, assume profile in mm
    
    const verticalLength = ctx.height - (profileThickness * 2);

    return {
      topLength: horizontalLength,
      bottomLength: horizontalLength,
      leftLength: Math.max(0, verticalLength), // Safety
      rightLength: Math.max(0, verticalLength),
      angle: 90,
      type: 'butt',
    };
  }

  calculateSashCuts(ctx: FabricationContext): CutResult {
    return this.calculateFrameCuts(ctx);
  }
}

/**
 * Factory to get strategy by ID
 */
export const getFabricationStrategy = (id: string): FabricationStrategy => {
  switch (id) {
    case 'butt': return new ButtJointStrategy();
    case 'miter': // Fallthrough default
    default: return new Miter45Strategy();
  }
};

/**
 * SpringbackCalculator - Springback Compensation
 * 
 * Calculates springback compensation for bent profiles:
 * - Material-specific springback factors
 * - Over-bend angles to compensate
 * - Workshop-specific adjustments
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 23)
 */

export interface SpringbackResult {
  springbackAngle: number; // degrees
  overBendAngle: number; // degrees (bend more to compensate)
  compensationFactor: number; // 0-1
}

/**
 * SpringbackCalculator - Calculates springback compensation
 */
export class SpringbackCalculator {
  /**
   * Material springback factors (percentage of bend angle that springs back)
   */
  private readonly SPRINGBACK_FACTORS: Record<string, number> = {
    aluminum: 0.05, // 5% springback
    upvc: 0.10 // 10% springback (more elastic)
  };

  /**
   * Calculate springback compensation
   */
  calculateSpringback(
    radius: number,
    angle: number,
    material: 'aluminum' | 'upvc',
    profileWidth: number
  ): number {
    const springbackFactor = this.SPRINGBACK_FACTORS[material];
    
    // Adjust factor based on radius (tighter bends = more springback)
    const radiusFactor = 1 + (1000 / radius) * 0.1; // More springback for tighter bends
    
    // Adjust factor based on profile width (wider profiles = more springback)
    const widthFactor = 1 + (profileWidth / 70) * 0.05; // Base on 70mm profile

    const adjustedFactor = springbackFactor * radiusFactor * widthFactor;
    const springbackAngle = angle * adjustedFactor;

    return springbackAngle;
  }

  /**
   * Calculate over-bend angle needed
   */
  calculateOverBend(
    targetAngle: number,
    radius: number,
    material: 'aluminum' | 'upvc',
    profileWidth: number
  ): number {
    const springback = this.calculateSpringback(radius, targetAngle, material, profileWidth);
    const overBendAngle = targetAngle + springback;

    return overBendAngle;
  }

  /**
   * Get complete springback result
   */
  getSpringbackResult(
    radius: number,
    angle: number,
    material: 'aluminum' | 'upvc',
    profileWidth: number
  ): SpringbackResult {
    const springbackAngle = this.calculateSpringback(radius, angle, material, profileWidth);
    const overBendAngle = this.calculateOverBend(angle, radius, material, profileWidth);
    const compensationFactor = springbackAngle / angle;

    return {
      springbackAngle,
      overBendAngle,
      compensationFactor
    };
  }
}


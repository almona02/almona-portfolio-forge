/**
 * K-Factor Engine
 * Calculates K-factors (cutting deductions) based on profile geometry and joint types
 */

export interface KFactorCalculationParams {
  profileWidth: number; // mm
  profileHeight?: number; // mm
  materialThickness: number; // mm
  cutAngle: number; // degrees (45, 90, etc.)
  jointType?: 'miter_45' | 'butt_90' | 't_joint' | 'l_joint' | 'custom';
}

export interface KFactorResult {
  kFactor: number; // mm (negative for deduction, positive for addition)
  formula: string;
  explanation: string;
  cutLength?: number; // Calculated cut length for a given final dimension
}

export class KFactorEngine {
  /**
   * Calculate K-factor for a given profile and cut angle
   * 
   * Formula for miter cuts:
   * K = (Profile Width / tan(angle/2)) - (Material Thickness / sin(angle/2))
   * 
   * For 45° miter: K = (W / tan(22.5°)) - (T / sin(22.5°))
   * For 90° butt: K = 0 (no deduction needed)
   */
  calculateKFactor(params: KFactorCalculationParams): KFactorResult {
    const { profileWidth, materialThickness, cutAngle, jointType } = params;

    // Handle 90° butt joints (no deduction)
    if (cutAngle === 90 || jointType === 'butt_90') {
      return {
        kFactor: 0,
        formula: 'K = 0 (90° butt joint, no deduction)',
        explanation: 'For 90° butt joints, no K-factor deduction is needed as the profiles meet at right angles.',
      };
    }

    // Convert angle to radians
    const angleRad = (cutAngle * Math.PI) / 180;
    const halfAngleRad = angleRad / 2;

    // Calculate K-factor using the standard formula
    const tanHalfAngle = Math.tan(halfAngleRad);
    const sinHalfAngle = Math.sin(halfAngleRad);

    const kFactor = (profileWidth / tanHalfAngle) - (materialThickness / sinHalfAngle);

    // Round to 2 decimal places
    const roundedKFactor = Math.round(kFactor * 100) / 100;

    let formula = `K = (W / tan(${cutAngle}°/2)) - (T / sin(${cutAngle}°/2))`;
    formula += `\nK = (${profileWidth} / ${tanHalfAngle.toFixed(4)}) - (${materialThickness} / ${sinHalfAngle.toFixed(4)})`;
    formula += `\nK = ${roundedKFactor.toFixed(2)}mm`;

    let explanation = `For a ${cutAngle}° cut on a ${profileWidth}mm profile with ${materialThickness}mm material thickness, `;
    explanation += `the K-factor is ${roundedKFactor.toFixed(2)}mm. `;
    if (roundedKFactor > 0) {
      explanation += `This is a POSITIVE K-factor, meaning you need to cut ${roundedKFactor.toFixed(2)}mm MORE than the final dimension. `;
      explanation += `This is normal for sliding frames with corner joints - the miter cut geometry requires extra material. `;
      explanation += `Example: For a 1000mm final dimension, cut at ${(1000 + roundedKFactor).toFixed(2)}mm.`;
    } else {
      explanation += `This means you need to cut ${Math.abs(roundedKFactor).toFixed(2)}mm LESS `;
      explanation += `than the final dimension to achieve the correct joint.`;
    }

    return {
      kFactor: roundedKFactor,
      formula,
      explanation,
    };
  }

  /**
   * Calculate the cut length needed for a desired final dimension
   */
  calculateCutLength(finalDimension: number, kFactor: number): number {
    // Cut Length = Final Dimension + K-Factor
    // (K-factor is typically negative, so this subtracts from final dimension)
    return Math.round((finalDimension + kFactor) * 100) / 100;
  }

  /**
   * Get preset K-factor for common joint types
   */
  getPresetKFactor(
    profileWidth: number,
    materialThickness: number,
    jointType: 'miter_45' | 'butt_90' | 't_joint' | 'l_joint'
  ): number {
    switch (jointType) {
      case 'miter_45':
        return this.calculateKFactor({
          profileWidth,
          materialThickness,
          cutAngle: 45,
          jointType: 'miter_45',
        }).kFactor;
      case 'butt_90':
        return 0;
      case 't_joint':
        // T-joint typically uses half the miter deduction
        return this.calculateKFactor({
          profileWidth,
          materialThickness,
          cutAngle: 45,
          jointType: 't_joint',
        }).kFactor / 2;
      case 'l_joint':
        // L-joint similar to miter but may need adjustment
        return this.calculateKFactor({
          profileWidth,
          materialThickness,
          cutAngle: 45,
          jointType: 'l_joint',
        }).kFactor;
      default:
        return 0;
    }
  }

  /**
   * Validate K-factor is within reasonable range
   * 
   * Note: For sliding frames with corner joints, positive K-factors are normal
   * (you cut MORE than final dimension to account for miter joint geometry)
   */
  validateKFactor(kFactor: number, jointType?: string): { isValid: boolean; warning?: string } {
    // For sliding frames with corner joints, positive K-factors up to 300mm are acceptable
    const isSlidingFrame = jointType === 'miter_45' || jointType === 'l_joint';
    const maxPositiveKFactor = isSlidingFrame ? 300 : 50;
    
    // Handle extremely negative values
    if (kFactor < -100) {
      return {
        isValid: false,
        warning: 'K-factor is extremely negative. Verify profile dimensions and cut angle.',
      };
    }
    
    // Handle values exceeding maximum (only show error if truly excessive)
    if (kFactor > maxPositiveKFactor) {
      return {
        isValid: false,
        warning: `K-factor is unusually positive (${kFactor.toFixed(2)}mm). Verify profile dimensions and cut angle. For sliding frames, positive K-factors up to 300mm are normal.`,
      };
    }
    
    // IMPORTANT: For sliding frames with positive K-factors, NO WARNING - this is correct!
    // Positive K-factor means you cut MORE than final dimension, which is expected for corner joints
    if (kFactor > 0 && isSlidingFrame) {
      return {
        isValid: true,
        // Explicitly no warning - positive K-factor is expected and correct for sliding frames
      };
    }
    
    // Handle moderately negative values
    if (kFactor < -50) {
      return {
        isValid: true,
        warning: 'K-factor is quite negative. Double-check calculations for accuracy.',
      };
    }
    
    // Handle positive values for non-sliding frames (may need verification)
    if (kFactor > 50 && !isSlidingFrame) {
      return {
        isValid: true,
        warning: 'K-factor is positive. For sliding frames with corner joints, this is normal. For other joint types, verify calculations.',
      };
    }
    
    // All other cases are valid with no warning
    return { isValid: true };
  }

  /**
   * Suggest K-factor adjustment based on test results
   */
  suggestKFactorAdjustment(
    currentKFactor: number,
    expectedLength: number,
    actualLength: number
  ): number {
    // Calculate the difference
    const difference = actualLength - expectedLength;

    // Adjust K-factor by the difference
    // If actual is longer than expected, we need more deduction (more negative K)
    // If actual is shorter than expected, we need less deduction (less negative K)
    const adjustedKFactor = currentKFactor - difference;

    return Math.round(adjustedKFactor * 100) / 100;
  }
}

export const kFactorEngine = new KFactorEngine();


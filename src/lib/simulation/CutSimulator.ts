/**
 * Cut Simulator
 * Generates simulation data for visualizing cuts with K-factors applied
 */

import { kFactorEngine } from '@/lib/calibration/KFactorEngine';
import type { OptimizationResult, Profile, WindowComponent } from '@/types/fabricator';

export interface CutSimulation {
  componentId: string;
  componentName: string;
  profileId: string;
  profileName: string;
  originalDimension: number; // mm - desired final dimension
  kFactor: number; // mm - applied K-factor
  cutLength: number; // mm - actual cut length
  cutAngle: number; // degrees
  jointType: string;
  position: {
    x: number;
    y: number;
    rotation: number;
  };
}

export interface FrameSimulation {
  width: number;
  height: number;
  cuts: CutSimulation[];
  corners: {
    x: number;
    y: number;
    cuts: CutSimulation[];
  }[];
}

export class CutSimulator {
  /**
   * Generate simulation data for a window/door frame
   */
  generateFrameSimulation(
    components: WindowComponent[],
    _profiles: Profile[],
    _optimizationResult?: OptimizationResult
  ): FrameSimulation {
    const cuts: CutSimulation[] = [];
    const corners: { x: number; y: number; cuts: CutSimulation[] }[] = [];

    // Group components by profile and calculate cuts
    for (const component of components) {
      const profile = component.profile;
      if (!profile) continue;

      // Get K-factor from calibration or use default
      const kFactor45 = this.estimateKFactor(profile, 45);
      const kFactor90 = this.estimateKFactor(profile, 90);

      // Process each cut in the component using cuttingLengths and angles
      if (component.cuttingLengths && component.angles) {
        for (let i = 0; i < component.cuttingLengths.length; i++) {
          const originalDimension = component.cuttingLengths[i];
          const angle = component.angles[i] || 90;
          const kFactor = angle === 45 ? kFactor45 : angle === 90 ? kFactor90 : kFactor45;
          const cutLength = kFactorEngine.calculateCutLength(originalDimension, kFactor);

          const simulation: CutSimulation = {
            componentId: component.id,
            componentName: component.type,
            profileId: profile.id,
            profileName: profile.name,
            originalDimension,
            kFactor,
            cutLength,
            cutAngle: angle,
            jointType: angle === 45 ? 'miter_45' : 'butt_90',
            position: {
              x: 0, // Will be calculated based on frame layout
              y: 0,
              rotation: 0,
            },
          };

          cuts.push(simulation);
        }
      }
    }

    // Calculate frame dimensions
    const frameWidth = Math.max(...components.map((c) => c.width || 0), 1000);
    const frameHeight = Math.max(...components.map((c) => c.height || 0), 1000);

    // Identify corners (where cuts meet)
    // Top-left corner
    corners.push({
      x: 0,
      y: 0,
      cuts: cuts.filter((c) => c.cutAngle === 45 && c.jointType === 'miter_45').slice(0, 2),
    });

    // Top-right corner
    corners.push({
      x: frameWidth,
      y: 0,
      cuts: cuts.filter((c) => c.cutAngle === 45 && c.jointType === 'miter_45').slice(2, 4),
    });

    // Bottom-right corner
    corners.push({
      x: frameWidth,
      y: frameHeight,
      cuts: cuts.filter((c) => c.cutAngle === 45 && c.jointType === 'miter_45').slice(4, 6),
    });

    // Bottom-left corner
    corners.push({
      x: 0,
      y: frameHeight,
      cuts: cuts.filter((c) => c.cutAngle === 45 && c.jointType === 'miter_45').slice(6, 8),
    });

    return {
      width: frameWidth,
      height: frameHeight,
      cuts,
      corners: corners.filter((c) => c.cuts.length > 0),
    };
  }

  /**
   * Estimate K-factor for a profile if not calibrated
   */
  private estimateKFactor(profile: Profile, angle: number): number {
    if (angle === 90) return 0;

    const width = profile.width || 60;
    const thickness = profile.thickness || 1.5;

    const result = kFactorEngine.calculateKFactor({
      profileWidth: width,
      materialThickness: thickness,
      cutAngle: angle,
    });

    return result.kFactor;
  }

  /**
   * Validate all cuts in simulation
   */
  validateSimulation(simulation: FrameSimulation): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for uncalibrated profiles
    const uncalibratedProfiles = new Set<string>();
    for (const cut of simulation.cuts) {
      if (cut.kFactor === 0 && cut.cutAngle === 45) {
        uncalibratedProfiles.add(cut.profileName);
      }
    }
    if (uncalibratedProfiles.size > 0) {
      warnings.push(
        `Uncalibrated profiles detected: ${Array.from(uncalibratedProfiles).join(', ')}. Using estimated K-factors.`
      );
    }

    // Check for extreme K-factors
    for (const cut of simulation.cuts) {
      const validation = kFactorEngine.validateKFactor(cut.kFactor);
      if (!validation.isValid) {
        errors.push(
          `Invalid K-factor for ${cut.profileName}: ${cut.kFactor}mm. ${validation.warning}`
        );
      } else if (validation.warning) {
        warnings.push(`${cut.profileName}: ${validation.warning}`);
      }
    }

    // Check cut lengths are reasonable
    for (const cut of simulation.cuts) {
      if (cut.cutLength <= 0) {
        errors.push(`Invalid cut length for ${cut.componentName}: ${cut.cutLength}mm`);
      }
      if (cut.cutLength > 8000) {
        warnings.push(`Very long cut for ${cut.componentName}: ${cut.cutLength}mm (exceeds standard stock length)`);
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }
}

export const cutSimulator = new CutSimulator();


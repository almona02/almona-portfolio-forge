/**
 * BentProfileEngine - Curve Calculation Engine
 * 
 * Handles complex curved profiles:
 * - Egyptian dome windows (heritage architecture)
 * - Curved commercial facades (high-value projects)
 * - Complex arabesque patterns (market differentiator)
 * - Multi-angle assemblies (villa specials)
 * 
 * COMPETITIVE ADVANTAGE: What German software can't handle
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 23)
 */

import { Vector3 } from 'three';
import { BendRadiusValidator } from './BendRadiusValidator';
import { SpringbackCalculator } from './SpringbackCalculator';

export type CurveType = 'dome' | 'arch' | 'arabesque' | 'custom';

export interface CurveSpecification {
  type: CurveType;
  radius: number; // mm
  angle: number; // degrees
  chordLength: number; // mm
  arcLength: number; // mm
  material: 'aluminum' | 'upvc';
  profileWidth: number; // mm
  profileDepth: number; // mm
}

export interface BentProfileDesign {
  curve: CurveSpecification;
  manufacturing: {
    isBendable: boolean;
    bendingMethod: 'continuous' | 'segmented';
    bendAllowance: number; // mm
    springbackCompensation: number; // degrees
    segments?: number; // For segmented bends
  };
  profilePreparation: {
    notchingPattern: Vector3[];
    cuttingTemplate: Vector3[];
    assemblyJig: Vector3[];
  };
  glassIntegration: {
    panelSegmentation: Array<{
      segment: number;
      width: number;
      height: number;
      radius: number;
    }>;
    customGaskets: boolean;
  };
}

/**
 * BentProfileEngine - Generates bent profile designs
 */
export class BentProfileEngine {
  private bendValidator: BendRadiusValidator;
  private springbackCalculator: SpringbackCalculator;

  constructor() {
    this.bendValidator = new BendRadiusValidator();
    this.springbackCalculator = new SpringbackCalculator();
  }

  /**
   * Generate bent profile design
   */
  generateBentProfile(
    radius: number,
    angle: number,
    material: 'aluminum' | 'upvc',
    profileWidth: number,
    profileDepth: number
  ): BentProfileDesign {
    // Calculate curve geometry
    const chordLength = this.calculateChordLength(radius, angle);
    const arcLength = this.calculateArcLength(radius, angle);

    const curve: CurveSpecification = {
      type: 'custom',
      radius,
      angle,
      chordLength,
      arcLength,
      material,
      profileWidth,
      profileDepth
    };

    // Validate bend feasibility
    const validation = this.bendValidator.validateBend(radius, material, profileWidth, profileDepth);
    
    // Determine bending method
    const bendingMethod = validation.isBendable ? 'continuous' : 'segmented';
    const segments = bendingMethod === 'segmented' ? this.calculateSegments(radius, angle) : undefined;

    // Calculate springback compensation
    const springback = this.springbackCalculator.calculateSpringback(
      radius,
      angle,
      material,
      profileWidth
    );

    // Generate manufacturing data
    const manufacturing = {
      isBendable: validation.isBendable,
      bendingMethod,
      bendAllowance: validation.bendAllowance,
      springbackCompensation: springback,
      segments
    };

    // Generate profile preparation data
    const profilePreparation = this.generateProfilePreparation(
      radius,
      angle,
      profileWidth,
      profileDepth,
      bendingMethod
    );

    // Generate glass integration data
    const glassIntegration = this.generateGlassIntegration(
      radius,
      angle,
      chordLength
    );

    return {
      curve,
      manufacturing,
      profilePreparation,
      glassIntegration
    };
  }

  /**
   * Generate dome window design (Egyptian heritage architecture)
   */
  generateDomeWindow(
    diameter: number,
    material: 'aluminum' | 'upvc',
    profileWidth: number,
    profileDepth: number
  ): BentProfileDesign {
    const radius = diameter / 2;
    const angle = 180; // Semi-circle for dome

    return this.generateBentProfile(radius, angle, material, profileWidth, profileDepth);
  }

  /**
   * Generate arch window design
   */
  generateArchWindow(
    radius: number,
    angle: number,
    material: 'aluminum' | 'upvc',
    profileWidth: number,
    profileDepth: number
  ): BentProfileDesign {
    return this.generateBentProfile(radius, angle, material, profileWidth, profileDepth);
  }

  /**
   * Calculate chord length
   */
  private calculateChordLength(radius: number, angle: number): number {
    const angleRad = angle * (Math.PI / 180);
    return 2 * radius * Math.sin(angleRad / 2);
  }

  /**
   * Calculate arc length
   */
  private calculateArcLength(radius: number, angle: number): number {
    const angleRad = angle * (Math.PI / 180);
    return radius * angleRad;
  }

  /**
   * Calculate number of segments for segmented bend
   */
  private calculateSegments(radius: number, angle: number): number {
    // One segment per 15 degrees (typical for segmented bends)
    return Math.ceil(angle / 15);
  }

  /**
   * Generate profile preparation data
   */
  private generateProfilePreparation(
    radius: number,
    angle: number,
    profileWidth: number,
    profileDepth: number,
    method: 'continuous' | 'segmented'
  ): BentProfileDesign['profilePreparation'] {
    if (method === 'segmented') {
      const segments = this.calculateSegments(radius, angle);
      const notchingPattern: Vector3[] = [];
      const cuttingTemplate: Vector3[] = [];
      const assemblyJig: Vector3[] = [];

      // Generate notching pattern for segmented bend
      for (let i = 0; i < segments; i++) {
        const segmentAngle = angle / segments;
        const x = radius * Math.cos((i * segmentAngle - angle / 2) * Math.PI / 180);
        const y = radius * Math.sin((i * segmentAngle - angle / 2) * Math.PI / 180);
        notchingPattern.push(new Vector3(x, y, 0));
      }

      return {
        notchingPattern,
        cuttingTemplate,
        assemblyJig
      };
    }

    // Continuous bend - simpler preparation
    return {
      notchingPattern: [],
      cuttingTemplate: [],
      assemblyJig: []
    };
  }

  /**
   * Generate glass integration data
   */
  private generateGlassIntegration(
    radius: number,
    angle: number,
    chordLength: number
  ): BentProfileDesign['glassIntegration'] {
    // Segment glass for curves (one panel per 600mm)
    const maxPanelWidth = 600; // mm
    const segments = Math.ceil(chordLength / maxPanelWidth);

    const panelSegmentation = [];
    for (let i = 0; i < segments; i++) {
      const segmentWidth = chordLength / segments;
      const segmentRadius = radius;
      
      panelSegmentation.push({
        segment: i + 1,
        width: segmentWidth,
        height: segmentWidth, // Square panels for simplicity
        radius: segmentRadius
      });
    }

    return {
      panelSegmentation,
      customGaskets: true // Curved profiles need custom gaskets
    };
  }
}


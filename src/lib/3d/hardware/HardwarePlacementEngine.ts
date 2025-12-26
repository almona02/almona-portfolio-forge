/**
 * HardwarePlacementEngine - Accurate Hardware Positioning
 * 
 * Positions hardware according to:
 * - Egyptian Code 2020 standards
 * - Ergonomic requirements
 * - Structural requirements
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 21)
 */

import { Vector3 } from 'three';
import { HardwareModelLibrary, type HardwarePlacement } from './HardwareModelLibrary';
import type { WindowUnit } from '@/types/fabricator';

export interface PlacementValidation {
  egyptianCode2020: boolean;
  ergonomic: boolean;
  structural: boolean;
  warnings: string[];
}

/**
 * HardwarePlacementEngine - Accurate hardware positioning
 */
export class HardwarePlacementEngine {
  private hardwareLibrary: HardwareModelLibrary;

  constructor() {
    this.hardwareLibrary = new HardwareModelLibrary();
  }

  /**
   * Calculate and validate hardware placement
   */
  calculatePlacement(
    windowUnit: WindowUnit,
    openingType: string
  ): HardwarePlacement & { validation: PlacementValidation } {
    const placement = this.hardwareLibrary.generateHardwareModels(
      windowUnit,
      openingType
    );

    const warnings: string[] = [];

    // Validate Egyptian Code 2020
    if (!placement.validation.egyptianCode2020) {
      warnings.push('Hardware placement does not fully comply with Egyptian Code 2020');
    }

    // Validate ergonomic
    if (!placement.validation.ergonomic) {
      warnings.push('Handle height may not be ergonomic for all users');
    }

    // Validate structural
    if (!placement.validation.structural) {
      warnings.push('Hardware configuration may not meet structural requirements');
    }

    return {
      ...placement,
      validation: {
        ...placement.validation,
        warnings
      }
    };
  }

  /**
   * Get CNC drilling coordinates for hardware
   */
  getCNCDrillingCoordinates(
    placement: HardwarePlacement
  ): Array<{
    hardware: string;
    x: number; // mm
    y: number; // mm
    z: number; // mm
    diameter: number; // mm
    depth: number; // mm
  }> {
    const coordinates: Array<{
      hardware: string;
      x: number;
      y: number;
      z: number;
      diameter: number;
      depth: number;
    }> = [];

    for (const hw of placement.hardware) {
      // Convert from meters to mm
      const x = hw.position.x * 1000;
      const y = hw.position.y * 1000;
      const z = hw.position.z * 1000;

      // Determine drill specifications based on hardware type
      let diameter = 4; // Default 4mm
      let depth = 15; // Default 15mm

      if (hw.type === 'hinge') {
        diameter = 5; // 5mm for hinge screws
        depth = 20; // 20mm depth
      } else if (hw.type === 'handle') {
        diameter = 4; // 4mm for handle screws
        depth = 15; // 15mm depth
      } else if (hw.type === 'lock') {
        diameter = 6; // 6mm for lock mechanism
        depth = 25; // 25mm depth
      } else if (hw.type === 'roller') {
        diameter = 5; // 5mm for roller mounting
        depth = 15; // 15mm depth
      }

      coordinates.push({
        hardware: hw.type,
        x,
        y,
        z,
        diameter,
        depth
      });
    }

    return coordinates;
  }

  /**
   * Validate hardware placement against Egyptian Code 2020
   */
  validateEgyptianCode2020(
    placement: HardwarePlacement,
    windowWidth: number,
    windowHeight: number
  ): boolean {
    // Check all validation flags
    if (!placement.validation.egyptianCode2020) return false;
    if (!placement.validation.ergonomic) return false;
    if (!placement.validation.structural) return false;

    // Additional checks
    const hinges = placement.hardware.filter(h => h.type === 'hinge');
    const handles = placement.hardware.filter(h => h.type === 'handle');

    // Tall windows must have middle hinge
    if (windowHeight > 2.4 && hinges.length < 3) {
      return false;
    }

    // Handle must be at ergonomic height
    if (handles.length > 0) {
      const handleY = handles[0].position.y;
      const handleHeight = handleY + windowHeight / 2;
      if (Math.abs(handleHeight - 1.1) > 0.05) {
        return false;
      }
    }

    return true;
  }
}


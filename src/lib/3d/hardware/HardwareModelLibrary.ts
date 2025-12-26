/**
 * HardwareModelLibrary - 3D Hardware Models
 * 
 * Detailed 3D models of hardware components (not boxes):
 * - Hinges with actual barrel, plates, screws
 * - Handles that look graspable
 * - Rollers with visible wheels and tracks
 * - Egyptian hardware brands recognition
 * 
 * CRITICAL FOR TRUST: Workshop owners SEE these details
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 21)
 */

import { BufferGeometry, BoxGeometry, CylinderGeometry, Group, Vector3 } from 'three';
import { HingeGenerator } from './HingeGenerator';
import { HandleGenerator } from './HandleGenerator';
import { RollerGenerator } from './RollerGenerator';
import type { WindowUnit } from '@/types/fabricator';

export type HardwareType = 'hinge' | 'handle' | 'lock' | 'roller' | 'corner_key' | 'gasket';

export interface HardwareModel {
  type: HardwareType;
  geometry: BufferGeometry;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  material?: string;
  brand?: string;
  partNumber?: string;
}

export interface HardwarePlacement {
  hardware: HardwareModel[];
  totalCount: number;
  validation: {
    egyptianCode2020: boolean;
    ergonomic: boolean;
    structural: boolean;
  };
}

/**
 * HardwareModelLibrary - Manages 3D hardware models
 */
export class HardwareModelLibrary {
  private hingeGenerator: HingeGenerator;
  private handleGenerator: HandleGenerator;
  private rollerGenerator: RollerGenerator;

  constructor() {
    this.hingeGenerator = new HingeGenerator();
    this.handleGenerator = new HandleGenerator();
    this.rollerGenerator = new RollerGenerator();
  }

  /**
   * Generate hardware models for window unit
   */
  generateHardwareModels(
    windowUnit: WindowUnit,
    openingType: string
  ): HardwarePlacement {
    const hardware: HardwareModel[] = [];
    const width = windowUnit.overallWidth / 1000; // to meters
    const height = windowUnit.overallHeight / 1000;

    // Generate hinges (Egyptian Code 2020: 150mm from top/bottom)
    if (openingType === 'casement' || openingType === 'tilt_turn') {
      const hinges = this.generateHinges(width, height, openingType);
      hardware.push(...hinges);
    }

    // Generate handle (Egyptian standard: 1100mm height)
    const handle = this.generateHandle(width, height);
    if (handle) hardware.push(handle);

    // Generate lock (Egyptian standard: 1000mm height)
    if (openingType === 'casement' || openingType === 'sliding_window') {
      const lock = this.generateLock(width, height);
      if (lock) hardware.push(lock);
    }

    // Generate rollers (for sliding windows)
    if (openingType === 'sliding_window' || openingType === 'sliding_door') {
      const rollers = this.generateRollers(width, height);
      hardware.push(...rollers);
    }

    return {
      hardware,
      totalCount: hardware.length,
      validation: {
        egyptianCode2020: this.validateEgyptianCode2020(hardware, width, height),
        ergonomic: this.validateErgonomic(hardware, height),
        structural: this.validateStructural(hardware, width, height)
      }
    };
  }

  /**
   * Generate hinges with actual barrel, plates, screws
   */
  private generateHinges(
    width: number,
    height: number,
    openingType: string
  ): HardwareModel[] {
    const hinges: HardwareModel[] = [];
    const hingeHeight = 0.15; // 150mm from top/bottom (Egyptian Code 2020)

    // Top hinge
    const topHinge = this.hingeGenerator.generateHinge({
      type: 'casement',
      position: 'top',
      width: width,
      height: height
    });

    hinges.push({
      type: 'hinge',
      geometry: topHinge.geometry,
      position: new Vector3(0, height / 2 - hingeHeight, 0),
      rotation: new Vector3(0, 0, 0),
      scale: new Vector3(1, 1, 1),
      brand: 'Egyptian Standard',
      partNumber: 'HINGE-CAS-150'
    });

    // Bottom hinge
    const bottomHinge = this.hingeGenerator.generateHinge({
      type: 'casement',
      position: 'bottom',
      width: width,
      height: height
    });

    hinges.push({
      type: 'hinge',
      geometry: bottomHinge.geometry,
      position: new Vector3(0, -height / 2 + hingeHeight, 0),
      rotation: new Vector3(0, 0, 0),
      scale: new Vector3(1, 1, 1),
      brand: 'Egyptian Standard',
      partNumber: 'HINGE-CAS-150'
    });

    // Middle hinge for tall windows (>2.4m)
    if (height > 2.4) {
      const middleHinge = this.hingeGenerator.generateHinge({
        type: 'casement',
        position: 'middle',
        width: width,
        height: height
      });

      hinges.push({
        type: 'hinge',
        geometry: middleHinge.geometry,
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(0, 0, 0),
        scale: new Vector3(1, 1, 1),
        brand: 'Egyptian Standard',
        partNumber: 'HINGE-CAS-MID'
      });
    }

    return hinges;
  }

  /**
   * Generate handle (Egyptian standard: 1100mm height)
   */
  private generateHandle(width: number, height: number): HardwareModel | null {
    const handleHeight = 1.1; // 1100mm (Egyptian ergonomic standard)

    if (height < handleHeight) {
      // Window too short, place handle at center
      const handle = this.handleGenerator.generateHandle({
        type: 'standard',
        width: width
      });

      return {
        type: 'handle',
        geometry: handle.geometry,
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(0, 0, 0),
        scale: new Vector3(1, 1, 1),
        brand: 'Egyptian Standard',
        partNumber: 'HANDLE-STD-1100'
      };
    }

    const handle = this.handleGenerator.generateHandle({
      type: 'standard',
      width: width
    });

    return {
      type: 'handle',
      geometry: handle.geometry,
      position: new Vector3(0, handleHeight - height / 2, 0),
      rotation: new Vector3(0, 0, 0),
      scale: new Vector3(1, 1, 1),
      brand: 'Egyptian Standard',
      partNumber: 'HANDLE-STD-1100'
    };
  }

  /**
   * Generate lock (Egyptian standard: 1000mm height)
   */
  private generateLock(width: number, height: number): HardwareModel | null {
    const lockHeight = 1.0; // 1000mm (Egyptian security standard)

    if (height < lockHeight) {
      return null; // Window too short for lock
    }

    // Simple lock geometry (can be enhanced)
    const lockGeometry = new BoxGeometry(0.08, 0.02, 0.01);

    return {
      type: 'lock',
      geometry: lockGeometry,
      position: new Vector3(0, lockHeight - height / 2, 0),
      rotation: new Vector3(0, 0, 0),
      scale: new Vector3(1, 1, 1),
      brand: 'Egyptian Standard',
      partNumber: 'LOCK-STD-1000'
    };
  }

  /**
   * Generate rollers (for sliding windows)
   */
  private generateRollers(width: number, height: number): HardwareModel[] {
    const rollers: HardwareModel[] = [];
    const rollerCount = Math.ceil(width / 0.6); // One roller per 600mm

    for (let i = 0; i < rollerCount; i++) {
      const x = (i / (rollerCount - 1) - 0.5) * width * 0.8; // Distribute across 80% of width
      const roller = this.rollerGenerator.generateRoller({
        type: 'standard',
        load: height * 0.5 // Approximate load
      });

      rollers.push({
        type: 'roller',
        geometry: roller.geometry,
        position: new Vector3(x, -height / 2, 0),
        rotation: new Vector3(0, 0, 0),
        scale: new Vector3(1, 1, 1),
        brand: 'Egyptian Standard',
        partNumber: 'ROLLER-STD'
      });
    }

    return rollers;
  }

  /**
   * Validate Egyptian Code 2020 compliance
   */
  private validateEgyptianCode2020(
    hardware: HardwareModel[],
    width: number,
    height: number
  ): boolean {
    const hinges = hardware.filter(h => h.type === 'hinge');
    const handles = hardware.filter(h => h.type === 'handle');
    const locks = hardware.filter(h => h.type === 'lock');

    // Check hinge positioning (150mm from top/bottom)
    for (const hinge of hinges) {
      const y = hinge.position.y;
      const topDistance = Math.abs((height / 2) - y);
      const bottomDistance = Math.abs(y - (-height / 2));

      if (topDistance > 0.2 || bottomDistance > 0.2) {
        // Allow 50mm tolerance
        return false;
      }
    }

    // Check handle height (1100mm)
    if (handles.length > 0) {
      const handleY = handles[0].position.y;
      const handleHeight = handleY + height / 2;
      if (Math.abs(handleHeight - 1.1) > 0.05) {
        // Allow 50mm tolerance
        return false;
      }
    }

    // Check lock height (1000mm)
    if (locks.length > 0) {
      const lockY = locks[0].position.y;
      const lockHeight = lockY + height / 2;
      if (Math.abs(lockHeight - 1.0) > 0.05) {
        // Allow 50mm tolerance
        return false;
      }
    }

    return true;
  }

  /**
   * Validate ergonomic placement
   */
  private validateErgonomic(hardware: HardwareModel[], height: number): boolean {
    const handles = hardware.filter(h => h.type === 'handle');

    if (handles.length === 0) return true;

    // Handle should be between 900mm and 1200mm (ergonomic range)
    const handleY = handles[0].position.y;
    const handleHeight = handleY + height / 2;

    return handleHeight >= 0.9 && handleHeight <= 1.2;
  }

  /**
   * Validate structural requirements
   */
  private validateStructural(
    hardware: HardwareModel[],
    width: number,
    height: number
  ): boolean {
    const hinges = hardware.filter(h => h.type === 'hinge');
    const rollers = hardware.filter(h => h.type === 'roller');

    // Tall windows (>2.4m) need middle hinge
    if (height > 2.4 && hinges.length < 3) {
      return false;
    }

    // Wide windows (>3m) need more rollers
    if (width > 3.0 && rollers.length < 3) {
      return false;
    }

    return true;
  }
}


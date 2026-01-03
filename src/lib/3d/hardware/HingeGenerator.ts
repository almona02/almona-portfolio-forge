/**
 * HingeGenerator - Detailed Hinge Models
 * 
 * Generates realistic 3D hinge models with:
 * - Barrel (pivot point)
 * - Plates (mounting surfaces)
 * - Screws (attachment points)
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 21)
 */

import { BoxGeometry, BufferGeometry, CylinderGeometry } from 'three';

export interface HingeConfig {
  type: 'casement' | 'tilt_turn' | 'awning';
  position: 'top' | 'middle' | 'bottom';
  width: number; // Window width in meters
  height: number; // Window height in meters
}

export interface HingeModel {
  geometry: BufferGeometry;
  barrel: BufferGeometry;
  framePlate: BufferGeometry;
  sashPlate: BufferGeometry;
  screws: BufferGeometry[];
}

/**
 * HingeGenerator - Generates detailed hinge models
 */
export class HingeGenerator {
  /**
   * Generate complete hinge model
   */
  generateHinge(_config: HingeConfig): HingeModel {
    // Hinge dimensions (typical Egyptian standard)
    const barrelDiameter = 0.016; // 16mm barrel
    const barrelLength = 0.025; // 25mm barrel length
    const plateWidth = 0.04; // 40mm plate width
    const plateHeight = 0.06; // 60mm plate height
    const plateThickness = 0.003; // 3mm plate thickness
    const screwDiameter = 0.004; // 4mm screw diameter
    const screwLength = 0.015; // 15mm screw length

    // Generate barrel (pivot point)
    const barrel = new CylinderGeometry(
      barrelDiameter / 2,
      barrelDiameter / 2,
      barrelLength,
      16
    );

    // Generate frame plate (attaches to frame)
    const framePlate = new BoxGeometry(
      plateWidth,
      plateHeight,
      plateThickness
    );

    // Generate sash plate (attaches to sash)
    const sashPlate = new BoxGeometry(
      plateWidth,
      plateHeight,
      plateThickness
    );

    // Generate screws (4 screws per plate)
    const screws: BufferGeometry[] = [];
    const screwPositions = [
      [-plateWidth / 2 + 0.005, -plateHeight / 2 + 0.005],
      [plateWidth / 2 - 0.005, -plateHeight / 2 + 0.005],
      [-plateWidth / 2 + 0.005, plateHeight / 2 - 0.005],
      [plateWidth / 2 - 0.005, plateHeight / 2 - 0.005]
    ];

    for (const [_x, _y] of screwPositions) {
      const screw = new CylinderGeometry(
        screwDiameter / 2,
        screwDiameter / 2,
        screwLength,
        8
      );
      screws.push(screw);
    }

    // Combine into single geometry (simplified - in production would use Group)
    const combinedGeometry = new BoxGeometry(
      plateWidth,
      plateHeight + barrelLength,
      plateThickness + barrelDiameter
    );

    return {
      geometry: combinedGeometry,
      barrel,
      framePlate,
      sashPlate,
      screws
    };
  }

  /**
   * Get hinge specifications for Egyptian Code 2020
   */
  getEgyptianCode2020Specs(windowHeight: number): {
    count: number;
    positions: number[]; // Heights from bottom in meters
    loadCapacity: number; // kg
  } {
    if (windowHeight <= 1.5) {
      return {
        count: 2,
        positions: [0.15, windowHeight - 0.15], // 150mm from top/bottom
        loadCapacity: 50
      };
    } else if (windowHeight <= 2.4) {
      return {
        count: 2,
        positions: [0.15, windowHeight - 0.15],
        loadCapacity: 80
      };
    } else {
      // Tall windows need middle hinge
      return {
        count: 3,
        positions: [0.15, windowHeight / 2, windowHeight - 0.15],
        loadCapacity: 120
      };
    }
  }
}


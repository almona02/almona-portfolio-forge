/**
 * RollerGenerator - Detailed Roller Models
 * 
 * Generates realistic 3D roller models with visible wheels and tracks
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 21)
 */

import { BufferGeometry, BoxGeometry, CylinderGeometry } from 'three';

export interface RollerConfig {
  type: 'standard' | 'heavy_duty' | 'premium';
  load: number; // Load capacity in kg
}

export interface RollerModel {
  geometry: BufferGeometry;
  wheel: BufferGeometry;
  housing: BufferGeometry;
  track: BufferGeometry;
}

/**
 * RollerGenerator - Generates detailed roller models
 */
export class RollerGenerator {
  /**
   * Generate complete roller model
   */
  generateRoller(config: RollerConfig): RollerModel {
    // Roller dimensions based on load
    const wheelDiameter = config.load > 50 ? 0.04 : 0.03; // 30-40mm wheel
    const wheelWidth = 0.02; // 20mm wheel width
    const housingWidth = 0.05; // 50mm housing width
    const housingHeight = 0.03; // 30mm housing height
    const housingDepth = 0.025; // 25mm housing depth
    const trackWidth = 0.015; // 15mm track width
    const trackHeight = 0.01; // 10mm track height

    // Generate wheel (visible rotating part)
    const wheel = new CylinderGeometry(
      wheelDiameter / 2,
      wheelDiameter / 2,
      wheelWidth,
      16
    );

    // Generate housing (enclosure)
    const housing = new BoxGeometry(
      housingWidth,
      housingHeight,
      housingDepth
    );

    // Generate track (rail that wheel runs on)
    const track = new BoxGeometry(
      trackWidth,
      trackHeight,
      housingDepth
    );

    // Combine into single geometry (simplified)
    const combinedGeometry = new BoxGeometry(
      housingWidth,
      housingHeight + wheelDiameter / 2,
      housingDepth
    );

    return {
      geometry: combinedGeometry,
      wheel,
      housing,
      track
    };
  }

  /**
   * Get roller specifications for window size
   */
  getRollerSpecs(windowWidth: number, windowHeight: number): {
    count: number;
    spacing: number; // Spacing between rollers in meters
    loadPerRoller: number; // kg per roller
  } {
    const windowArea = windowWidth * windowHeight;
    const estimatedWeight = windowArea * 25; // ~25kg per m²

    // One roller per 600mm, minimum 2
    const spacing = 0.6;
    const count = Math.max(2, Math.ceil(windowWidth / spacing));
    const loadPerRoller = estimatedWeight / count;

    return {
      count,
      spacing,
      loadPerRoller
    };
  }
}


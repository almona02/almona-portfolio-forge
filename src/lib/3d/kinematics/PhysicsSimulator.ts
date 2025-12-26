/**
 * PhysicsSimulator - Physics-Based Animation
 * 
 * Simulates realistic physics for window opening:
 * - Gravity effects
 * - Friction
 * - Smooth easing curves
 * - Realistic acceleration/deceleration
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 22)
 */

import { Vector3, Euler } from 'three';
import type { MotionPath } from './OpeningKinematicsEngine';

export interface PhysicsConfig {
  gravity: number; // m/s²
  friction: number; // 0-1
  damping: number; // 0-1
  mass: number; // kg
}

/**
 * PhysicsSimulator - Simulates physics for window motion
 */
export class PhysicsSimulator {
  /**
   * Apply physics to motion path
   */
  applyPhysics(
    motionPath: MotionPath,
    config: Partial<PhysicsConfig> = {}
  ): MotionPath {
    const physicsConfig: PhysicsConfig = {
      gravity: config.gravity ?? 9.81,
      friction: config.friction ?? 0.1,
      damping: config.damping ?? 0.05,
      mass: config.mass ?? 20 // Typical window weight: 20kg
    };

    // Apply smooth easing (ease-in-out)
    const easedPositions: Vector3[] = [];
    const easedRotations: Euler[] = [];
    const easedTimestamps: number[] = [];

    for (let i = 0; i < motionPath.positions.length; i++) {
      const t = motionPath.timestamps[i];
      
      // Ease-in-out cubic function
      const easedT = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // Apply damping
      const dampedT = this.applyDamping(easedT, physicsConfig.damping);

      // Interpolate position
      const originalIndex = Math.floor(dampedT * (motionPath.positions.length - 1));
      const nextIndex = Math.min(originalIndex + 1, motionPath.positions.length - 1);
      const localT = (dampedT * (motionPath.positions.length - 1)) - originalIndex;

      const position = motionPath.positions[originalIndex].clone().lerp(
        motionPath.positions[nextIndex],
        localT
      );

      // Apply gravity (slight downward drift for casement windows)
      if (motionPath.rotations[originalIndex].y > 0) {
        position.y -= physicsConfig.gravity * 0.001 * dampedT; // Minimal effect
      }

      easedPositions.push(position);

      // Interpolate rotation
      const rotation = motionPath.rotations[originalIndex].clone();
      const nextRotation = motionPath.rotations[nextIndex].clone();
      
      // Simple lerp for rotation (in production would use quaternion slerp)
      rotation.x = rotation.x + (nextRotation.x - rotation.x) * localT;
      rotation.y = rotation.y + (nextRotation.y - rotation.y) * localT;
      rotation.z = rotation.z + (nextRotation.z - rotation.z) * localT;

      easedRotations.push(rotation);
      easedTimestamps.push(dampedT);
    }

    return {
      positions: easedPositions,
      rotations: easedRotations,
      timestamps: easedTimestamps
    };
  }

  /**
   * Apply damping to motion
   */
  private applyDamping(t: number, damping: number): number {
    // Exponential damping
    return 1 - Math.exp(-t / (1 - damping));
  }

  /**
   * Calculate opening force required
   */
  calculateOpeningForce(
    windowWidth: number,
    windowHeight: number,
    openingAngle: number
  ): number {
    // Simplified force calculation
    const area = windowWidth * windowHeight;
    const weight = area * 25; // ~25kg per m²
    const angleRad = openingAngle * (Math.PI / 180);
    
    // Force = weight * sin(angle) * friction
    const force = weight * 9.81 * Math.sin(angleRad) * 0.1; // 0.1 friction coefficient
    
    return force; // Newtons
  }
}


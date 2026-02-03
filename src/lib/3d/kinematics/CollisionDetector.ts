/**
 * CollisionDetector - Collision Detection
 * 
 * Detects collisions between moving sash and frame:
 * - Sash shouldn't go through frame
 * - Hardware shouldn't collide
 * - Opening limits should be respected
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 22)
 */

import { Box3, Vector3 } from 'three';
import type { KinematicsConfig, MotionPath } from './OpeningKinematicsEngine';

export interface CollisionResult {
  hasCollision: boolean;
  collisionPoints: Vector3[];
  collisionType: 'frame' | 'hardware' | 'limit' | null;
  severity: 'warning' | 'error';
}

/**
 * CollisionDetector - Detects collisions in motion paths
 */
export class CollisionDetector {
  /**
   * Check for collisions in motion path
   */
  checkCollisions(
    motionPath: MotionPath,
    config: KinematicsConfig
  ): boolean {
    // Define frame bounds
    const frameBounds = new Box3(
      new Vector3(-config.windowWidth / 2, -config.windowHeight / 2, -2.0), // Allow 2m depth for opening
      new Vector3(config.windowWidth / 2, config.windowHeight / 2, 2.0)
    );

    // Define sash bounds (slightly smaller than frame)
    const sashWidth = config.windowWidth * 0.95;
    const sashHeight = config.windowHeight * 0.95;
    const sashBounds = new Box3(
      new Vector3(-sashWidth / 2, -sashHeight / 2, -0.05),
      new Vector3(sashWidth / 2, sashHeight / 2, 0.05)
    );

    // Check each position in motion path
    for (let i = 0; i < motionPath.positions.length; i++) {
      const position = motionPath.positions[i];
      const rotation = motionPath.rotations[i];

      // Transform sash bounds to current position
      const transformedSashBounds = sashBounds.clone();
      transformedSashBounds.translate(position);

      // Check if sash goes outside frame bounds
      if (!frameBounds.containsBox(transformedSashBounds)) {
        return true; // Collision detected
      }

      // Check opening angle limits
      if (config.maxOpeningAngle) {
        const angle = Math.abs(rotation.y) * (180 / Math.PI);
        if (angle > config.maxOpeningAngle + 5) { // 5° tolerance
          return true; // Exceeds opening limit
        }
      }
    }

    return false; // No collisions
  }

  /**
   * Get detailed collision information
   */
  getCollisionDetails(
    motionPath: MotionPath,
    config: KinematicsConfig
  ): CollisionResult {
    const hasCollision = this.checkCollisions(motionPath, config);

    if (!hasCollision) {
      return {
        hasCollision: false,
        collisionPoints: [],
        collisionType: null,
        severity: 'warning'
      };
    }

    // Find collision points
    const collisionPoints: Vector3[] = [];
    const frameBounds = new Box3(
      new Vector3(-config.windowWidth / 2, -config.windowHeight / 2, -0.1),
      new Vector3(config.windowWidth / 2, config.windowHeight / 2, 0.1)
    );

    for (let i = 0; i < motionPath.positions.length; i++) {
      const position = motionPath.positions[i];
      const sashWidth = config.windowWidth * 0.95;
      const sashHeight = config.windowHeight * 0.95;
      const sashBounds = new Box3(
        new Vector3(-sashWidth / 2, -sashHeight / 2, -0.05),
        new Vector3(sashWidth / 2, sashHeight / 2, 0.05)
      );

      sashBounds.translate(position);

      if (!frameBounds.containsBox(sashBounds)) {
        collisionPoints.push(position.clone());
      }
    }

    return {
      hasCollision: true,
      collisionPoints,
      collisionType: 'frame',
      severity: 'error'
    };
  }
}


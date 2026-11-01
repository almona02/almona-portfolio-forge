/**
 * Exploded View Utilities
 * 
 * Provides smooth animation and component separation for exploded view visualization.
 * Matches gold-tier competitors with full component separation and animation.
 * 
 * Constitutional Tier: Tier 3 (Protected Determinism)
 */

import { Euler, Vector3 } from 'three';
import { SashData } from './windowGeometry';

export interface ExplodedViewConfig {
  enabled: boolean;
  intensity: number; // 0-1, controls separation distance
  animationDuration: number; // milliseconds
  componentGroups: {
    frame: boolean;
    sashes: boolean;
    glass: boolean;
    hardware: boolean;
    mullions: boolean;
  };
}

export interface ComponentTransform {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
}

/**
 * Calculate exploded view transforms for window components
 * Separates components along their natural separation vectors
 * 
 * ✅ HARDENED: Added validation, error handling, and performance optimizations
 */
/** Extra scene objects (hardware, accessories) that are not part of FrameGeometry. */
export interface ExplodedViewExtras {
  /** Hardware placeholders / models keyed by their scene `componentKey`. */
  hardware?: Array<{ key: string; position: Vector3 }>;
}

function geometryCenter(geometry: unknown, target: Vector3): boolean {
  const geom = geometry as { boundingBox?: { getCenter: (v: Vector3) => Vector3 } | null; computeBoundingBox?: () => void } | null;
  if (!geom || typeof geom.computeBoundingBox !== 'function') return false;
  if (!geom.boundingBox) geom.computeBoundingBox();
  if (!geom.boundingBox) return false;
  geom.boundingBox.getCenter(target);
  return true;
}

function planarDirection(from: Vector3, target: Vector3): Vector3 {
  target.set(from.x, from.y, 0);
  if (target.length() < 0.001) target.set(1, 0, 0);
  return target.normalize();
}

export function calculateExplodedTransforms(
  modelData: {
    frame: { parts: any[] };
    sashes: SashData[];
    fixedGlass: any[];
    fixedSpacers?: any[];
    muntins?: any;
  },
  config: ExplodedViewConfig,
  extras?: ExplodedViewExtras,
): Map<string, ComponentTransform> {
  // ✅ HARDENED: Input validation
  if (!modelData) {
    console.warn('[ExplodedView] Invalid modelData provided');
    return new Map();
  }
  
  if (!config || typeof config.enabled !== 'boolean') {
    console.warn('[ExplodedView] Invalid config provided');
    return new Map();
  }
  
  // ✅ PERFORMANCE: Clamp intensity to valid range
  const clampedIntensity = Math.max(0, Math.min(1, config.intensity || 0));
  
  const transforms = new Map<string, ComponentTransform>();
  
  if (!config.enabled || clampedIntensity === 0) {
    // Return identity transforms
    const identity = {
      position: new Vector3(0, 0, 0),
      rotation: new Euler(0, 0, 0),
      scale: new Vector3(1, 1, 1),
    };
    
    // Frame parts
    modelData.frame.parts.forEach((_, i) => {
      transforms.set(`frame-${i}`, identity);
    });
    
    // Sashes
    modelData.sashes.forEach((_, i) => {
      transforms.set(`sash-${i}`, identity);
    });
    
    return transforms;
  }
  
  const baseSeparation = 0.2; // 20cm base separation
  const separationDistance = baseSeparation * clampedIntensity;
  
  // ✅ PERFORMANCE: Reuse vector objects to reduce allocations
  const center = new Vector3(0, 0, 0);
  const tempVector = new Vector3();
  
  // Frame parts: separate outward from center
  if (config.componentGroups?.frame && modelData.frame?.parts) {
    try {
      modelData.frame.parts.forEach((part, i) => {
        // ✅ HARDENED: Validate part has matrix
        if (!part || !part.matrix) {
          console.warn(`[ExplodedView] Invalid frame part at index ${i}`);
          return;
        }
        
        // Calculate direction vector from center to part
        const partCenter = new Vector3();
        partCenter.setFromMatrixPosition(part.matrix);
        
        tempVector.copy(partCenter).sub(center);
        const length = tempVector.length();
        
        // ✅ HARDENED: Avoid division by zero
        if (length < 0.001) {
          // Part is at center, use default direction
          tempVector.set(1, 0, 0);
        } else {
          tempVector.normalize();
        }
        
        // Separate along direction vector
        const offset = tempVector.clone().multiplyScalar(separationDistance * 0.5);
        
        transforms.set(`frame-${i}`, {
          position: offset,
          rotation: new Euler(0, 0, 0),
          scale: new Vector3(1, 1, 1),
        });
      });
    } catch (error) {
      console.error('[ExplodedView] Error processing frame parts:', error);
    }
  }
  
  // Sashes: separate outward and forward
  if (config.componentGroups?.sashes && Array.isArray(modelData.sashes)) {
    try {
      modelData.sashes.forEach((sash, i) => {
        // ✅ HARDENED: Validate sash structure
        if (!sash || !sash.openingPath || !sash.openingPath.position) {
          console.warn(`[ExplodedView] Invalid sash at index ${i}`);
          return;
        }
        
        const sashCenter = sash.openingPath.position;
        tempVector.copy(sashCenter).sub(center);
        const length = tempVector.length();
        
        // ✅ HARDENED: Avoid division by zero
        if (length < 0.001) {
          tempVector.set(1, 0, 0);
        } else {
          tempVector.normalize();
        }
        
        // Separate outward and slightly forward (Z+)
        const offset = tempVector.clone().multiplyScalar(separationDistance * 0.8);
        offset.z += separationDistance * 0.3; // Forward separation
        
        transforms.set(`sash-${i}`, {
          position: offset,
          rotation: new Euler(0, 0, 0),
          scale: new Vector3(1, 1, 1),
        });
      });
    } catch (error) {
      console.error('[ExplodedView] Error processing sashes:', error);
    }
  }
  
  // Glass: separate forward (Z+)
  if (config.componentGroups?.glass) {
    try {
      // ✅ PERFORMANCE: Reuse vector objects
      const glassOffset = new Vector3(0, 0, separationDistance * 0.4);
      const fixedGlassOffset = new Vector3(0, 0, separationDistance * 0.2);
      
      if (Array.isArray(modelData.sashes)) {
        modelData.sashes.forEach((sash, i) => {
          sash.glass.forEach((_, paneIndex) => transforms.set(`glass-${i}-${paneIndex}`, {
            position: glassOffset.clone(),
            rotation: new Euler(0, 0, 0),
            scale: new Vector3(1, 1, 1),
          }));
        });
      }
      
      if (Array.isArray(modelData.fixedGlass)) {
        modelData.fixedGlass.forEach((_, i) => {
          transforms.set(`fixed-glass-${i}`, {
            position: fixedGlassOffset.clone(),
            rotation: new Euler(0, 0, 0),
            scale: new Vector3(1, 1, 1),
          });
        });
      }
    } catch (error) {
      console.error('[ExplodedView] Error processing glass:', error);
    }
  }
  
  // Glazing beads / spacers / gaskets inside sashes: lift slightly further forward than
  // the glass so bead frames read as separate pieces (keys match Window3DGenerator).
  if (config.componentGroups?.glass && Array.isArray(modelData.sashes)) {
    const beadOffset = new Vector3(0, 0, separationDistance * 0.6);
    modelData.sashes.forEach((sash, i) => {
      (sash.spacers ?? []).forEach((_, spacerIndex) => transforms.set(`spacer-${i}-${spacerIndex}`, {
        position: beadOffset.clone(),
        rotation: new Euler(0, 0, 0),
        scale: new Vector3(1, 1, 1),
      }));
    });
  }

  // Fixed spacers (tracks, guides, fixed beads, manual mullions): outward in-plane
  // from the window centre plus a small forward lift so they clear the frame.
  if (config.componentGroups?.mullions && Array.isArray(modelData.fixedSpacers)) {
    const centerTarget = new Vector3();
    modelData.fixedSpacers.forEach((geometry, i) => {
      if (!geometryCenter(geometry, centerTarget)) return;
      const direction = planarDirection(centerTarget, tempVector);
      const offset = direction.clone().multiplyScalar(separationDistance * 0.35);
      offset.z += separationDistance * 0.25;
      transforms.set(`fixed-spacer-${i}`, {
        position: offset,
        rotation: new Euler(0, 0, 0),
        scale: new Vector3(1, 1, 1),
      });
    });
  }

  // Muntins / mullions / transoms: outward in-plane only (they stay in the frame plane).
  if (config.componentGroups?.mullions && Array.isArray(modelData.muntins)) {
    const centerTarget = new Vector3();
    modelData.muntins.forEach((geometry, i) => {
      if (!geometryCenter(geometry, centerTarget)) return;
      const direction = planarDirection(centerTarget, tempVector);
      transforms.set(`muntin-${i}`, {
        position: direction.clone().multiplyScalar(separationDistance * 0.45),
        rotation: new Euler(0, 0, 0),
        scale: new Vector3(1, 1, 1),
      });
    });
  }

  // Hardware: separate outward from their attachment points and forward of the sash.
  if (config.componentGroups?.hardware && Array.isArray(extras?.hardware)) {
    extras.hardware.forEach(({ key, position }) => {
      if (!key || !(position instanceof Vector3)) return;
      const direction = planarDirection(position, tempVector);
      const offset = direction.clone().multiplyScalar(separationDistance * 0.3);
      offset.z += separationDistance * 0.9;
      transforms.set(key, {
        position: offset,
        rotation: new Euler(0, 0, 0),
        scale: new Vector3(1, 1, 1),
      });
    });
  }

  return transforms;
}

/**
 * Apply smooth interpolation for exploded view animation
 * 
 * ✅ HARDENED: Added validation and performance optimizations
 */
export function interpolateExplodedTransform(
  baseTransform: ComponentTransform,
  explodedTransform: ComponentTransform,
  progress: number // 0-1
): ComponentTransform {
  // ✅ HARDENED: Validate inputs
  if (!baseTransform || !explodedTransform) {
    console.warn('[ExplodedView] Invalid transform inputs');
    return baseTransform || explodedTransform || {
      position: new Vector3(0, 0, 0),
      rotation: new Euler(0, 0, 0),
      scale: new Vector3(1, 1, 1),
    };
  }
  
  // ✅ PERFORMANCE: Clamp progress to valid range
  const clampedProgress = Math.max(0, Math.min(1, progress || 0));
  
  // ✅ PERFORMANCE: Early return if progress is 0 or 1
  if (clampedProgress === 0) return baseTransform;
  if (clampedProgress === 1) return explodedTransform;
  
  // Use easeInOutCubic for smooth animation
  const eased = easeInOutCubic(clampedProgress);
  
  return {
    position: baseTransform.position.clone().lerp(explodedTransform.position, eased),
    rotation: new Euler(
      baseTransform.rotation.x + (explodedTransform.rotation.x - baseTransform.rotation.x) * eased,
      baseTransform.rotation.y + (explodedTransform.rotation.y - baseTransform.rotation.y) * eased,
      baseTransform.rotation.z + (explodedTransform.rotation.z - baseTransform.rotation.z) * eased
    ),
    scale: baseTransform.scale.clone().lerp(explodedTransform.scale, eased),
  };
}

/**
 * Easing function for smooth animation
 */
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Calculate hardware exploded positions
 * Hardware separates from their attachment points
 * 
 * ✅ HARDENED: Added validation and performance optimizations
 */
export function calculateHardwareExplodedPositions(
  hardwarePositions: Vector3[],
  config: ExplodedViewConfig
): Vector3[] {
  // ✅ HARDENED: Input validation
  if (!Array.isArray(hardwarePositions)) {
    console.warn('[ExplodedView] Invalid hardwarePositions array');
    return [];
  }
  
  if (!config || !config.enabled || !config.componentGroups?.hardware || config.intensity === 0) {
    return hardwarePositions;
  }
  
  // ✅ PERFORMANCE: Clamp intensity
  const clampedIntensity = Math.max(0, Math.min(1, config.intensity || 0));
  const separationDistance = 0.15 * clampedIntensity; // 15cm separation
  
  // ✅ PERFORMANCE: Pre-calculate offsets
  const forwardOffset = separationDistance * 0.5;
  const outwardOffset = separationDistance * 0.3;
  
  return hardwarePositions.map((pos, index) => {
    // ✅ HARDENED: Validate position
    if (!pos || !(pos instanceof Vector3)) {
      console.warn(`[ExplodedView] Invalid hardware position at index ${index}`);
      return new Vector3(0, 0, 0);
    }
    
    // Separate hardware outward and forward
    const offset = pos.clone();
    offset.z += forwardOffset; // Forward
    offset.x += (offset.x > 0 ? 1 : -1) * outwardOffset; // Outward
    return offset;
  });
}


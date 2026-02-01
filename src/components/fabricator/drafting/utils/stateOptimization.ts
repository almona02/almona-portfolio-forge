// src/components/fabricator/drafting/utils/stateOptimization.ts

/**
 * State Optimization Utilities
 * 
 * Gold-tier state management optimizations for performance and scalability.
 * Provides efficient state cloning, selective updates, and structural sharing.
 * 
 * Performance: Optimized for large drawings with thousands of elements
 */

import type { DraftingState, Geometry2D } from '../types/drafting';

/**
 * Efficient state clone using structured clone if available, fallback to JSON
 * Performance: structuredClone is ~2-3x faster than JSON.parse(JSON.stringify())
 */
export function cloneState(state: DraftingState): DraftingState {
  // Use structuredClone if available (modern browsers, Node 17+)
  if (typeof structuredClone !== 'undefined') {
    try {
      return structuredClone(state);
    } catch (error) {
      // Fallback to JSON if structuredClone fails (e.g., with functions, symbols)
      console.warn('structuredClone failed, falling back to JSON:', error);
      return JSON.parse(JSON.stringify(state));
    }
  }
  
  // Fallback to JSON for older environments
  return JSON.parse(JSON.stringify(state));
}

/**
 * Shallow clone geometry (only clone arrays, not elements)
 * Performance: Much faster than deep cloning when elements haven't changed
 */
export function shallowCloneGeometry(geometry: Geometry2D): Geometry2D {
  return {
    rectangles: [...geometry.rectangles],
    lines: [...geometry.lines],
    circles: [...geometry.circles],
    arcs: [...geometry.arcs],
    polygons: [...geometry.polygons],
    splines: [...geometry.splines],
    points: [...geometry.points]
  };
}

/**
 * Create optimized state update that only clones changed properties
 * Performance: Avoids unnecessary deep clones of unchanged properties
 */
export function createOptimizedStateUpdate<_T extends keyof DraftingState>(
  prevState: DraftingState,
  updates: Partial<DraftingState>
): DraftingState {
  const newState: DraftingState = { ...prevState };
  
  // Only clone changed properties
  for (const key in updates) {
    if (key in updates) {
      const typedKey = key as keyof DraftingState;
      const value = updates[typedKey];
      
      if (value !== undefined) {
        // For geometry, use shallow clone if it's the same reference
        if (typedKey === 'geometry' && value === prevState.geometry) {
          (newState as any)[typedKey] = shallowCloneGeometry(value as Geometry2D);
        } else if (Array.isArray(value)) {
          // Shallow clone arrays
          (newState as any)[typedKey] = [...value];
        } else if (value !== null && typeof value === 'object') {
          // Shallow clone objects
          (newState as any)[typedKey] = { ...value };
        } else {
          // Primitives can be assigned directly
          (newState as any)[typedKey] = value;
        }
      }
    }
  }
  
  return newState;
}

/**
 * Check if geometry has changed (reference equality check)
 * Performance: Fast reference check before expensive deep comparison
 */
export function geometryChanged(prev: Geometry2D, next: Geometry2D): boolean {
  return (
    prev.rectangles !== next.rectangles ||
    prev.lines !== next.lines ||
    prev.circles !== next.circles ||
    prev.arcs !== next.arcs ||
    prev.polygons !== next.polygons ||
    prev.splines !== next.splines ||
    prev.points !== next.points
  );
}

/**
 * Get estimated state size in bytes (for memory monitoring)
 */
export function estimateStateSize(state: DraftingState): number {
  try {
    const json = JSON.stringify(state);
    return new Blob([json]).size;
  } catch {
    // Fallback estimation
    return JSON.stringify(state).length * 2; // Rough UTF-16 estimate
  }
}

/**
 * Optimize state by removing unnecessary data (for memory cleanup)
 * Note: Only removes derived/computed data, not user data
 */
export function optimizeStateForStorage(state: DraftingState): DraftingState {
  // Return state as-is for now (no optimization needed)
  // In future, could remove previewPoint, clear selections, etc.
  return state;
}

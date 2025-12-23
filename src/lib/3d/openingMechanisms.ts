/**
 * Opening Mechanisms Visualization - Week 1 Implementation
 * 
 * Adds visual representation of opening mechanisms (sliding tracks, casement hinges, tilt-turn pivots)
 * to enhance 3D preview accuracy. This is an ADDITIVE enhancement - does not modify existing geometry.
 * 
 * @since Phase 0, Week 1: Gold Tier Migration
 * @see GOLD_TIER_EXECUTION_PLAN.md
 */

import { BufferGeometry, BoxGeometry, CylinderGeometry, Vector3 } from 'three';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowUnit } from '@/types/fabricator';

/**
 * Standard dimensions for opening mechanism components (in meters)
 * Based on industry standards (Yilmaz, Elumatec, etc.)
 */
const MECHANISM_DIMENSIONS = {
  slidingTrack: {
    width: 0.025,      // 25mm track width
    depth: 0.015,      // 15mm track depth
    height: 0.008,     // 8mm track height
  },
  casementHinge: {
    width: 0.04,        // 40mm hinge width
    height: 0.08,       // 80mm hinge height
    depth: 0.015,       // 15mm hinge depth
  },
  tiltTurnPivot: {
    radius: 0.012,      // 12mm pivot radius
    height: 0.02,       // 20mm pivot height
  },
};

/**
 * Opening mechanism geometry result
 */
export interface OpeningMechanismGeometry {
  tracks?: BufferGeometry[];      // Sliding tracks (bottom/top)
  hinges?: BufferGeometry[];      // Casement hinges
  pivots?: BufferGeometry[];      // Tilt-turn pivots
  indicators?: BufferGeometry[];  // Visual indicators (arrows, etc.)
}

/**
 * Add opening mechanism visualization to window geometry
 * 
 * This function is ADDITIVE - it adds mechanism geometry without modifying existing geometry.
 * 
 * @param windowUnit - Window unit to add mechanisms to
 * @param pattern - Egyptian pattern with opening mechanism specification
 * @returns Opening mechanism geometries to add to the scene
 */
export function addOpeningMechanisms(
  windowUnit: WindowUnit,
  pattern: EgyptianPattern
): OpeningMechanismGeometry {
  const result: OpeningMechanismGeometry = {};
  
  if (!pattern.openingMechanism) {
    return result; // No opening mechanism specified
  }

  const { type, trackType, direction } = pattern.openingMechanism;
  const width = windowUnit.overallWidth / 1000; // Convert mm to meters
  const height = windowUnit.overallHeight / 1000;

  switch (type) {
    case 'sliding':
      result.tracks = createSlidingTracks(width, height, trackType || 'bottom');
      break;
    
    case 'casement':
      result.hinges = createCasementHinges(width, height, direction || 'left');
      break;
    
    case 'tilt-turn':
      result.pivots = createTiltTurnPivots(width, height);
      result.indicators = createTiltTurnIndicators(width, height);
      break;
    
    case 'awning':
      result.hinges = createAwningHinges(width, height);
      break;
    
    case 'fixed':
      // No mechanism for fixed windows
      break;
    
    default:
      console.warn(`Unknown opening mechanism type: ${type}`);
  }

  return result;
}

/**
 * Create sliding track geometry
 * 
 * Standard sliding windows use bottom tracks. Some systems use top tracks or both.
 * Track dimensions based on Yilmaz/Elumatec standards.
 */
function createSlidingTracks(
  width: number,
  height: number,
  trackType: 'top' | 'bottom' | 'both'
): BufferGeometry[] {
  const tracks: BufferGeometry[] = [];
  const { slidingTrack } = MECHANISM_DIMENSIONS;
  
  // Calculate track width (full window width minus frame clearance)
  const trackWidth = width - 0.1; // 100mm clearance from frame edges
  const trackX = 0; // Centered horizontally
  const trackZ = 0.01; // Slightly above frame level

  if (trackType === 'bottom' || trackType === 'both') {
    // Bottom track
    const bottomTrack = new BoxGeometry(
      trackWidth,
      slidingTrack.height,
      slidingTrack.depth
    );
    const bottomY = -height / 2 + slidingTrack.height / 2 + 0.005; // 5mm above bottom frame
    bottomTrack.translate(trackX, bottomY, trackZ);
    tracks.push(bottomTrack);
  }

  if (trackType === 'top' || trackType === 'both') {
    // Top track
    const topTrack = new BoxGeometry(
      trackWidth,
      slidingTrack.height,
      slidingTrack.depth
    );
    const topY = height / 2 - slidingTrack.height / 2 - 0.005; // 5mm below top frame
    topTrack.translate(trackX, topY, trackZ);
    tracks.push(topTrack);
  }

  return tracks;
}

/**
 * Create casement hinge geometry
 * 
 * Standard Egyptian casement windows use 3 hinges:
 * - Top hinge: 150mm from top
 * - Middle hinge: Center of sash
 * - Bottom hinge: 150mm from bottom
 * 
 * Hinges are positioned on the side specified by direction.
 */
function createCasementHinges(
  width: number,
  height: number,
  direction: 'left' | 'right' | 'both' | 'outward' | 'inward'
): BufferGeometry[] {
  const hinges: BufferGeometry[] = [];
  const { casementHinge } = MECHANISM_DIMENSIONS;
  
  // Standard hinge positions (from top)
  const topHingeY = height / 2 - 0.15;      // 150mm from top
  const middleHingeY = 0;                   // Center
  const bottomHingeY = -height / 2 + 0.15; // 150mm from bottom

  const hingePositions = [topHingeY, middleHingeY, bottomHingeY];
  const hingeZ = 0.01; // Slightly above frame level

  // Determine X position based on direction
  let hingeX: number;
  if (direction === 'left' || direction === 'outward') {
    hingeX = -width / 2 + casementHinge.depth / 2 + 0.01; // Left side
  } else if (direction === 'right' || direction === 'inward') {
    hingeX = width / 2 - casementHinge.depth / 2 - 0.01; // Right side
  } else {
    // 'both' - create hinges on both sides (for double casement)
    // Left side hinges
    hingeX = -width / 2 + casementHinge.depth / 2 + 0.01;
    hingePositions.forEach((y, index) => {
      const hinge = new BoxGeometry(
        casementHinge.width,
        casementHinge.height,
        casementHinge.depth
      );
      hinge.translate(hingeX, y, hingeZ);
      hinges.push(hinge);
    });
    
    // Right side hinges
    hingeX = width / 2 - casementHinge.depth / 2 - 0.01;
    hingePositions.forEach((y, index) => {
      const hinge = new BoxGeometry(
        casementHinge.width,
        casementHinge.height,
        casementHinge.depth
      );
      hinge.translate(hingeX, y, hingeZ);
      hinges.push(hinge);
    });
    
    return hinges;
  }

  // Create 3 standard hinges
  hingePositions.forEach((y) => {
    const hinge = new BoxGeometry(
      casementHinge.width,
      casementHinge.height,
      casementHinge.depth
    );
    hinge.translate(hingeX, y, hingeZ);
    hinges.push(hinge);
  });

  return hinges;
}

/**
 * Create tilt-turn pivot mechanism geometry
 * 
 * Tilt-turn windows use a pivot mechanism at the bottom corners.
 * Visual indicator shows rotation capability.
 */
function createTiltTurnPivots(
  width: number,
  height: number
): BufferGeometry[] {
  const pivots: BufferGeometry[] = [];
  const { tiltTurnPivot } = MECHANISM_DIMENSIONS;
  
  // Pivots at bottom corners
  const pivotY = -height / 2 + tiltTurnPivot.height / 2 + 0.005;
  const pivotZ = 0.01;

  // Left pivot
  const leftPivot = new CylinderGeometry(
    tiltTurnPivot.radius,
    tiltTurnPivot.radius,
    tiltTurnPivot.height,
    16
  );
  leftPivot.rotateX(Math.PI / 2); // Rotate to horizontal
  leftPivot.translate(-width / 2 + 0.05, pivotY, pivotZ);
  pivots.push(leftPivot);

  // Right pivot
  const rightPivot = new CylinderGeometry(
    tiltTurnPivot.radius,
    tiltTurnPivot.radius,
    tiltTurnPivot.height,
    16
  );
  rightPivot.rotateX(Math.PI / 2);
  rightPivot.translate(width / 2 - 0.05, pivotY, pivotZ);
  pivots.push(rightPivot);

  return pivots;
}

/**
 * Create visual indicators for tilt-turn mechanism
 * 
 * Shows rotation capability with arrow indicators.
 */
function createTiltTurnIndicators(
  width: number,
  height: number
): BufferGeometry[] {
  // Simple arrow geometry to indicate rotation
  // This is a placeholder - can be enhanced with actual arrow shapes
  const indicators: BufferGeometry[] = [];
  
  // Bottom center indicator
  const indicator = new BoxGeometry(0.02, 0.02, 0.001);
  indicator.translate(0, -height / 2 + 0.02, 0.015);
  indicators.push(indicator);

  return indicators;
}

/**
 * Create awning hinge geometry
 * 
 * Awning windows use top-mounted hinges.
 */
function createAwningHinges(
  width: number,
  height: number
): BufferGeometry[] {
  const hinges: BufferGeometry[] = [];
  const { casementHinge } = MECHANISM_DIMENSIONS;
  
  // Awning hinges at top (typically 2-3 hinges)
  const topY = height / 2 - casementHinge.height / 2 - 0.005;
  const hingeZ = 0.01;
  
  // Calculate hinge spacing (evenly distributed)
  const hingeCount = width > 1.5 ? 3 : 2; // 3 hinges for wide windows
  const spacing = width / (hingeCount + 1);
  
  for (let i = 1; i <= hingeCount; i++) {
    const hingeX = -width / 2 + spacing * i;
    const hinge = new BoxGeometry(
      casementHinge.width,
      casementHinge.height,
      casementHinge.depth
    );
    hinge.translate(hingeX, topY, hingeZ);
    hinges.push(hinge);
  }

  return hinges;
}


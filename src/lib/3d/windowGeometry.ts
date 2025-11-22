/**
 * Window Geometry Library
 * 
 * Comprehensive mathematical calculations for window frame generation including:
 * - Profile cross-section geometry for different suppliers
 * - Glass pocket and glazing bead calculations
 * - Hardware mounting point calculations
 * - Opening mechanism path calculations
 * - Material thickness and reinforcement calculations
 * 
 * Supports:
 * - Frame profiles (aluminum/UPVC cross-sections)
 * - Sash profiles with opening mechanisms
 * - Glass layers with spacers
 * - Hardware components (hinges, locks, handles)
 * - Mullion and transom connections
 */

import { Profile, WindowComponent } from '@/types/fabricator';
import * as THREE from 'three';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type WindowType = 'sliding_window' | 'casement' | 'tilt_turn' | 'sliding_door' | 'fixed_window' | 'awning';
export type MaterialType = 'aluminum' | 'upvc' | 'wood' | 'composite';
export type OpeningMechanism = 'hinge' | 'sliding' | 'tilt_turn' | 'pivot' | 'fixed';

export interface ProfileCrossSection {
  /** Outer dimensions of the profile */
  outerWidth: number;
  outerHeight: number;
  /** Wall thickness */
  wallThickness: number;
  /** Glass pocket dimensions */
  glassPocket: {
    width: number;
    depth: number;
    bottomClearance: number;
  };
  /** Glazing bead dimensions */
  glazingBead: {
    width: number;
    height: number;
    clearance: number;
  };
  /** Weather seal groove dimensions */
  weatherSeal: {
    width: number;
    depth: number;
    position: number; // Distance from outer edge
  };
  /** Hardware mounting points */
  hardwareMounts: HardwareMountPoint[];
  /** Reinforcement channels (for aluminum) */
  reinforcementChannels?: ReinforcementChannel[];
  /** Thermal break dimensions (for aluminum) */
  thermalBreak?: {
    width: number;
    depth: number;
    material: string;
  };
}

export interface HardwareMountPoint {
  type: 'hinge' | 'lock' | 'handle' | 'stay' | 'lock_cylinder' | 'espagnolette';
  position: {
    x: number;
    y: number;
    z: number;
  };
  orientation: {
    rotationX: number;
    rotationY: number;
    rotationZ: number;
  };
  mountingHoles: {
    diameter: number;
    depth: number;
    positions: Array<{ x: number; y: number }>;
  };
  clearance: {
    width: number;
    height: number;
    depth: number;
  };
}

export interface ReinforcementChannel {
  width: number;
  height: number;
  position: number; // Distance from outer edge
  material: 'steel' | 'aluminum' | 'composite';
}

export interface GlassLayer {
  width: number;
  height: number;
  thickness: number;
  position: number; // Z-position in glass pocket
  type: 'single' | 'double' | 'triple';
  spacer?: {
    width: number;
    material: 'aluminum' | 'warm_edge' | 'foam';
    thickness: number;
  };
}

export interface OpeningPath {
  type: OpeningMechanism;
  pivotPoint: { x: number; y: number; z: number };
  path: Array<{ x: number; y: number; z: number; rotationX: number; rotationY: number; rotationZ: number }>;
  maxOpening: number; // Maximum opening angle or distance
  clearance: {
    min: number;
    max: number;
  };
}

export interface MullionConnection {
  type: 'T' | 'L' | 'X' | 'corner';
  position: { x: number; y: number; z: number };
  connectionDepth: number;
  fasteners: Array<{
    type: 'screw' | 'rivet' | 'welded';
    position: { x: number; y: number };
    diameter: number;
  }>;
}

export interface FrameGeometry {
  frame: {
    width: number;
    height: number;
    depth: number;
    profile: ProfileCrossSection;
  };
  sash?: {
    width: number;
    height: number;
    depth: number;
    profile: ProfileCrossSection;
    openingPath?: OpeningPath;
  };
  glass: GlassLayer[];
  mullions: MullionConnection[];
  transoms: MullionConnection[];
}

// ============================================================================
// PROFILE CROSS-SECTION GENERATORS
// ============================================================================

/**
 * Generate profile cross-section geometry based on supplier profile
 */
export function generateProfileCrossSection(
  profile: Profile,
  material: MaterialType = 'aluminum'
): ProfileCrossSection {
  const width = profile.width || 50;
  const height = profile.height || width;
  const thickness = profile.thickness || (material === 'aluminum' ? 1.5 : 3.0);

  // Base cross-section dimensions
  const baseSection: ProfileCrossSection = {
    outerWidth: width,
    outerHeight: height,
    wallThickness: thickness,
    glassPocket: {
      width: calculateGlassPocketWidth(width, material),
      depth: calculateGlassPocketDepth(height, material),
      bottomClearance: material === 'aluminum' ? 2 : 3,
    },
    glazingBead: {
      width: calculateGlazingBeadWidth(width, material),
      height: calculateGlazingBeadHeight(height, material),
      clearance: material === 'aluminum' ? 0.5 : 1.0,
    },
    weatherSeal: {
      width: material === 'aluminum' ? 8 : 10,
      depth: material === 'aluminum' ? 3 : 4,
      position: material === 'aluminum' ? 5 : 6,
    },
    hardwareMounts: [],
    reinforcementChannels: material === 'aluminum' ? generateReinforcementChannels(width, height) : undefined,
    thermalBreak: material === 'aluminum' ? {
      width: width * 0.6,
      depth: height * 0.4,
      material: 'polyamide',
    } : undefined,
  };

  return baseSection;
}

/**
 * Calculate glass pocket width based on profile width and material
 */
function calculateGlassPocketWidth(profileWidth: number, material: MaterialType): number {
  if (material === 'aluminum') {
    return profileWidth * 0.5; // 50% of profile width
  } else if (material === 'upvc') {
    return profileWidth * 0.55; // 55% of profile width
  }
  return profileWidth * 0.5;
}

/**
 * Calculate glass pocket depth based on profile height and material
 */
function calculateGlassPocketDepth(profileHeight: number, material: MaterialType): number {
  if (material === 'aluminum') {
    return profileHeight * 0.6; // 60% of profile height
  } else if (material === 'upvc') {
    return profileHeight * 0.65; // 65% of profile height
  }
  return profileHeight * 0.6;
}

/**
 * Calculate glazing bead width
 */
function calculateGlazingBeadWidth(profileWidth: number, material: MaterialType): number {
  if (material === 'aluminum') {
    return profileWidth * 0.15; // 15% of profile width
  } else if (material === 'upvc') {
    return profileWidth * 0.18; // 18% of profile width
  }
  return profileWidth * 0.15;
}

/**
 * Calculate glazing bead height
 */
function calculateGlazingBeadHeight(profileHeight: number, material: MaterialType): number {
  if (material === 'aluminum') {
    return profileHeight * 0.2; // 20% of profile height
  } else if (material === 'upvc') {
    return profileHeight * 0.22; // 22% of profile height
  }
  return profileHeight * 0.2;
}

/**
 * Generate reinforcement channels for aluminum profiles
 */
function generateReinforcementChannels(width: number, height: number): ReinforcementChannel[] {
  const channels: ReinforcementChannel[] = [];

  // Main reinforcement channel (center)
  if (width >= 60) {
    channels.push({
      width: 20,
      height: height * 0.7,
      position: width / 2,
      material: 'steel',
    });
  }

  // Side reinforcement channels for wide profiles
  if (width >= 80) {
    channels.push(
      {
        width: 15,
        height: height * 0.6,
        position: width * 0.25,
        material: 'steel',
      },
      {
        width: 15,
        height: height * 0.6,
        position: width * 0.75,
        material: 'steel',
      }
    );
  }

  return channels;
}

// ============================================================================
// GLASS POCKET AND GLAZING BEAD CALCULATIONS
// ============================================================================

/**
 * Calculate glass pocket dimensions for a given profile and glazing type
 */
export function calculateGlassPocket(
  profile: ProfileCrossSection,
  glazingType: 'single' | 'double' | 'triple',
  glassThickness: number = 4
): {
  pocketWidth: number;
  pocketDepth: number;
  glassLayers: GlassLayer[];
  spacerPositions: number[];
} {
  const pocketWidth = profile.glassPocket.width;
  const pocketDepth = profile.glassPocket.depth;
  const bottomClearance = profile.glassPocket.bottomClearance;

  const glassLayers: GlassLayer[] = [];
  const spacerPositions: number[] = [];

  let currentZ = bottomClearance;

  if (glazingType === 'single') {
    glassLayers.push({
      width: pocketWidth - 2, // 1mm clearance on each side
      height: pocketDepth - bottomClearance - 2, // 1mm clearance on top
      thickness: glassThickness,
      position: currentZ,
      type: 'single',
    });
  } else if (glazingType === 'double') {
    // First glass pane
    glassLayers.push({
      width: pocketWidth - 2,
      height: pocketDepth - bottomClearance - 2,
      thickness: glassThickness,
      position: currentZ,
      type: 'double',
    });

    currentZ += glassThickness + 12; // 12mm spacer

    // Spacer
    spacerPositions.push(currentZ - 6);

    // Second glass pane
    glassLayers.push({
      width: pocketWidth - 2,
      height: pocketDepth - bottomClearance - 2,
      thickness: glassThickness,
      position: currentZ,
      type: 'double',
      spacer: {
        width: pocketWidth - 2,
        material: 'warm_edge',
        thickness: 12,
      },
    });
  } else if (glazingType === 'triple') {
    // First glass pane
    glassLayers.push({
      width: pocketWidth - 2,
      height: pocketDepth - bottomClearance - 2,
      thickness: glassThickness,
      position: currentZ,
      type: 'triple',
    });

    currentZ += glassThickness + 12; // First spacer
    spacerPositions.push(currentZ - 6);

    // Second glass pane
    glassLayers.push({
      width: pocketWidth - 2,
      height: pocketDepth - bottomClearance - 2,
      thickness: glassThickness,
      position: currentZ,
      type: 'triple',
      spacer: {
        width: pocketWidth - 2,
        material: 'warm_edge',
        thickness: 12,
      },
    });

    currentZ += glassThickness + 12; // Second spacer
    spacerPositions.push(currentZ - 6);

    // Third glass pane
    glassLayers.push({
      width: pocketWidth - 2,
      height: pocketDepth - bottomClearance - 2,
      thickness: glassThickness,
      position: currentZ,
      type: 'triple',
      spacer: {
        width: pocketWidth - 2,
        material: 'warm_edge',
        thickness: 12,
      },
    });
  }

  return {
    pocketWidth,
    pocketDepth,
    glassLayers,
    spacerPositions,
  };
}

/**
 * Calculate glazing bead dimensions and positions
 */
export function calculateGlazingBead(
  profile: ProfileCrossSection,
  glassPocket: ReturnType<typeof calculateGlassPocket>
): {
  beadWidth: number;
  beadHeight: number;
  position: { x: number; y: number; z: number };
  clearance: number;
} {
  const beadWidth = profile.glazingBead.width;
  const beadHeight = profile.glazingBead.height;
  const clearance = profile.glazingBead.clearance;

  // Position at the front of the glass pocket
  const position = {
    x: profile.outerWidth / 2 - beadWidth / 2,
    y: profile.outerHeight / 2 - beadHeight / 2,
    z: profile.glassPocket.depth - beadHeight - clearance,
  };

  return {
    beadWidth,
    beadHeight,
    position,
    clearance,
  };
}

// ============================================================================
// HARDWARE MOUNTING POINT CALCULATIONS
// ============================================================================

/**
 * Calculate hardware mounting points for a window component
 */
export function calculateHardwareMounts(
  component: WindowComponent,
  profile: ProfileCrossSection,
  windowType: WindowType,
  width: number,
  height: number
): HardwareMountPoint[] {
  const mounts: HardwareMountPoint[] = [];

  // Hinges
  if (windowType === 'casement' || windowType === 'tilt_turn') {
    const hingeCount = height > 1500 ? 3 : 2;
    const hingeSpacing = height / (hingeCount + 1);

    for (let i = 1; i <= hingeCount; i++) {
      mounts.push({
        type: 'hinge',
        position: {
          x: -width / 2 + profile.outerWidth / 2,
          y: -height / 2 + hingeSpacing * i,
          z: profile.outerHeight / 2,
        },
        orientation: {
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
        },
        mountingHoles: {
          diameter: 4.2, // M4 screw
          depth: profile.wallThickness * 0.8,
          positions: [
            { x: -5, y: 0 },
            { x: 5, y: 0 },
            { x: -5, y: 10 },
            { x: 5, y: 10 },
          ],
        },
        clearance: {
          width: 30,
          height: 50,
          depth: 15,
        },
      });
    }
  }

  // Locks and handles
  if (windowType === 'casement' || windowType === 'tilt_turn' || windowType === 'sliding_window') {
    // Lock position (center of sash, opposite to hinges)
    mounts.push({
      type: 'lock',
      position: {
        x: width / 2 - profile.outerWidth / 2,
        y: height / 2 - 100, // 100mm from top
        z: profile.outerHeight / 2,
      },
      orientation: {
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
      },
      mountingHoles: {
        diameter: 3.5, // M3.5 screw
        depth: profile.wallThickness * 0.8,
        positions: [
          { x: -10, y: 0 },
          { x: 10, y: 0 },
        ],
      },
      clearance: {
        width: 40,
        height: 20,
        depth: 10,
      },
    });

    // Handle position
    mounts.push({
      type: 'handle',
      position: {
        x: width / 2 - profile.outerWidth / 2 - 30,
        y: height / 2 - 100,
        z: profile.outerHeight / 2,
      },
      orientation: {
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
      },
      mountingHoles: {
        diameter: 5.0, // M5 screw
        depth: profile.wallThickness * 0.8,
        positions: [
          { x: 0, y: 0 },
        ],
      },
      clearance: {
        width: 20,
        height: 20,
        depth: 15,
      },
    });
  }

  // Espagnolette (multi-point locking system)
  if (windowType === 'tilt_turn' || windowType === 'casement') {
    const espagnolettePoints = calculateEspagnolettePoints(height, profile);
    espagnolettePoints.forEach((point, index) => {
      mounts.push({
        type: 'espagnolette',
        position: {
          x: width / 2 - profile.outerWidth / 2,
          y: point,
          z: profile.outerHeight / 2,
        },
        orientation: {
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
        },
        mountingHoles: {
          diameter: 3.5,
          depth: profile.wallThickness * 0.8,
          positions: [
            { x: -5, y: 0 },
            { x: 5, y: 0 },
          ],
        },
        clearance: {
          width: 15,
          height: 10,
          depth: 8,
        },
      });
    });
  }

  // Stays (for casement windows)
  if (windowType === 'casement') {
    mounts.push({
      type: 'stay',
      position: {
        x: width / 2 - profile.outerWidth / 2 - 50,
        y: height / 2 - 200,
        z: profile.outerHeight / 2,
      },
      orientation: {
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
      },
      mountingHoles: {
        diameter: 4.2,
        depth: profile.wallThickness * 0.8,
        positions: [
          { x: 0, y: 0 },
          { x: 0, y: 50 },
        ],
      },
      clearance: {
        width: 20,
        height: 60,
        depth: 10,
      },
    });
  }

  return mounts;
}

/**
 * Calculate espagnolette (multi-point lock) positions
 */
function calculateEspagnolettePoints(height: number, profile: ProfileCrossSection): number[] {
  const points: number[] = [];
  const spacing = 200; // 200mm between points
  const startY = -height / 2 + 100;
  const endY = height / 2 - 100;

  for (let y = startY; y <= endY; y += spacing) {
    points.push(y);
  }

  return points;
}

// ============================================================================
// OPENING MECHANISM PATH CALCULATIONS
// ============================================================================

/**
 * Calculate opening mechanism path for different window types
 */
export function calculateOpeningPath(
  windowType: WindowType,
  width: number,
  height: number,
  profile: ProfileCrossSection,
  maxOpeningAngle: number = 90
): OpeningPath {
  const pivotPoint = { x: -width / 2 + profile.outerWidth / 2, y: 0, z: 0 };

  switch (windowType) {
    case 'casement': {
      const path: OpeningPath['path'] = [];
      const steps = 20;
      const maxAngle = (maxOpeningAngle * Math.PI) / 180;

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const angle = maxAngle * progress;
        const radius = width * 0.5;

        path.push({
          x: pivotPoint.x + radius * (1 - Math.cos(angle)),
          y: pivotPoint.y,
          z: radius * Math.sin(angle),
          rotationX: 0,
          rotationY: angle,
          rotationZ: 0,
        });
      }

      return {
        type: 'hinge',
        pivotPoint,
        path,
        maxOpening: maxOpeningAngle,
        clearance: {
          min: width * 0.1,
          max: width * 0.9,
        },
      };
    }

    case 'tilt_turn': {
      const path: OpeningPath['path'] = [];
      const steps = 40;
      const tiltAngle = (15 * Math.PI) / 180; // 15 degrees tilt
      const turnAngle = (90 * Math.PI) / 180; // 90 degrees turn

      // Tilt phase (first half)
      for (let i = 0; i <= steps / 2; i++) {
        const progress = i / (steps / 2);
        const angle = tiltAngle * progress;

        path.push({
          x: pivotPoint.x,
          y: pivotPoint.y,
          z: pivotPoint.z,
          rotationX: -angle,
          rotationY: 0,
          rotationZ: 0,
        });
      }

      // Turn phase (second half)
      for (let i = 1; i <= steps / 2; i++) {
        const progress = i / (steps / 2);
        const turn = turnAngle * progress;
        const radius = width * 0.5;

        path.push({
          x: pivotPoint.x + radius * (1 - Math.cos(turn)),
          y: pivotPoint.y,
          z: radius * Math.sin(turn),
          rotationX: -tiltAngle,
          rotationY: turn,
          rotationZ: 0,
        });
      }

      return {
        type: 'tilt_turn',
        pivotPoint,
        path,
        maxOpening: 90,
        clearance: {
          min: width * 0.1,
          max: width * 0.9,
        },
      };
    }

    case 'sliding_window':
    case 'sliding_door': {
      const path: OpeningPath['path'] = [];
      const steps = 20;
      const maxDistance = width * 0.5; // Slide half the width

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const distance = maxDistance * progress;

        path.push({
          x: pivotPoint.x + distance,
          y: pivotPoint.y,
          z: pivotPoint.z,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
        });
      }

      return {
        type: 'sliding',
        pivotPoint,
        path,
        maxOpening: maxDistance,
        clearance: {
          min: 0,
          max: maxDistance,
        },
      };
    }

    case 'awning': {
      const path: OpeningPath['path'] = [];
      const steps = 20;
      const maxAngle = (maxOpeningAngle * Math.PI) / 180;

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const angle = maxAngle * progress;

        path.push({
          x: pivotPoint.x,
          y: pivotPoint.y,
          z: pivotPoint.z,
          rotationX: -angle,
          rotationY: 0,
          rotationZ: 0,
        });
      }

      return {
        type: 'pivot',
        pivotPoint,
        path,
        maxOpening: maxOpeningAngle,
        clearance: {
          min: 0,
          max: height * 0.3,
        },
      };
    }

    case 'fixed_window':
    default: {
      return {
        type: 'fixed',
        pivotPoint,
        path: [{
          x: pivotPoint.x,
          y: pivotPoint.y,
          z: pivotPoint.z,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
        }],
        maxOpening: 0,
        clearance: {
          min: 0,
          max: 0,
        },
      };
    }
  }
}

// ============================================================================
// MATERIAL THICKNESS AND REINFORCEMENT CALCULATIONS
// ============================================================================

/**
 * Calculate required material thickness based on window dimensions and loads
 */
export function calculateMaterialThickness(
  width: number,
  height: number,
  material: MaterialType,
  windLoad: number = 1200, // Pa (Pascal)
  safetyFactor: number = 2.0
): {
  requiredThickness: number;
  recommendedThickness: number;
  reinforcementRequired: boolean;
  reinforcementSpecs?: ReinforcementChannel[];
} {
  // Calculate wind pressure on window
  const area = (width / 1000) * (height / 1000); // Convert to m²
  const totalLoad = windLoad * area; // N (Newton)

  let requiredThickness: number;
  let recommendedThickness: number;
  let reinforcementRequired = false;

  if (material === 'aluminum') {
    // Aluminum strength: ~275 MPa yield strength
    const maxStress = 275e6; // Pa
    const moment = (totalLoad * height) / 8; // N·m (simplified beam calculation)
    const sectionModulus = moment / (maxStress / safetyFactor);
    
    // Simplified thickness calculation
    requiredThickness = Math.sqrt(sectionModulus / (width / 1000)) * 1000; // Convert to mm
    recommendedThickness = Math.max(requiredThickness, 1.5); // Minimum 1.5mm

    // Reinforcement required for large windows
    if (width > 2000 || height > 2000 || totalLoad > 5000) {
      reinforcementRequired = true;
    }
  } else if (material === 'upvc') {
    // UPVC strength: ~50 MPa yield strength
    const maxStress = 50e6; // Pa
    const moment = (totalLoad * height) / 8;
    const sectionModulus = moment / (maxStress / safetyFactor);
    
    requiredThickness = Math.sqrt(sectionModulus / (width / 1000)) * 1000;
    recommendedThickness = Math.max(requiredThickness, 2.5); // Minimum 2.5mm

    // UPVC typically doesn't use steel reinforcement, but may need thicker walls
    if (width > 2500 || height > 2500 || totalLoad > 4000) {
      reinforcementRequired = true;
      recommendedThickness = Math.max(recommendedThickness, 3.5);
    }
  } else {
    // Default values
    requiredThickness = 2.0;
    recommendedThickness = 2.5;
  }

  let reinforcementSpecs: ReinforcementChannel[] | undefined;
  if (reinforcementRequired && material === 'aluminum') {
    reinforcementSpecs = generateReinforcementChannels(width, height);
  }

  return {
    requiredThickness,
    recommendedThickness,
    reinforcementRequired,
    reinforcementSpecs,
  };
}

/**
 * Calculate reinforcement requirements for large windows
 */
export function calculateReinforcement(
  width: number,
  height: number,
  material: MaterialType,
  profile: ProfileCrossSection
): {
  required: boolean;
  channels: ReinforcementChannel[];
  positions: number[];
} {
  const area = (width / 1000) * (height / 1000);
  const requiresReinforcement = area > 4 || width > 2500 || height > 2500;

  if (!requiresReinforcement || material !== 'aluminum') {
    return {
      required: false,
      channels: [],
      positions: [],
    };
  }

  const channels = generateReinforcementChannels(profile.outerWidth, profile.outerHeight);
  const positions = channels.map(ch => ch.position);

  return {
    required: true,
    channels,
    positions,
  };
}

// ============================================================================
// MULLION AND TRANSOM CONNECTION CALCULATIONS
// ============================================================================

/**
 * Calculate mullion connection geometry
 */
export function calculateMullionConnection(
  type: 'T' | 'L' | 'X' | 'corner',
  position: { x: number; y: number; z: number },
  profile: ProfileCrossSection,
  connectionDepth: number = 50
): MullionConnection {
  const fasteners: MullionConnection['fasteners'] = [];

  // Calculate fastener positions based on connection type
  if (type === 'T' || type === 'X') {
    // Fasteners on both sides
    fasteners.push(
      {
        type: 'screw',
        position: { x: -profile.outerWidth / 4, y: 0 },
        diameter: 5.0,
      },
      {
        type: 'screw',
        position: { x: profile.outerWidth / 4, y: 0 },
        diameter: 5.0,
      },
      {
        type: 'screw',
        position: { x: 0, y: -profile.outerHeight / 4 },
        diameter: 5.0,
      },
      {
        type: 'screw',
        position: { x: 0, y: profile.outerHeight / 4 },
        diameter: 5.0,
      }
    );
  } else if (type === 'L' || type === 'corner') {
    // Fasteners on two adjacent sides
    fasteners.push(
      {
        type: 'screw',
        position: { x: -profile.outerWidth / 4, y: 0 },
        diameter: 5.0,
      },
      {
        type: 'screw',
        position: { x: profile.outerWidth / 4, y: 0 },
        diameter: 5.0,
      },
      {
        type: 'screw',
        position: { x: 0, y: -profile.outerHeight / 4 },
        diameter: 5.0,
      }
    );
  }

  return {
    type,
    position,
    connectionDepth,
    fasteners,
  };
}

/**
 * Calculate transom connection (horizontal mullion)
 */
export function calculateTransomConnection(
  position: { x: number; y: number; z: number },
  profile: ProfileCrossSection,
  connectionDepth: number = 50
): MullionConnection {
  return calculateMullionConnection('T', position, profile, connectionDepth);
}

// ============================================================================
// COMPLETE FRAME GEOMETRY GENERATION
// ============================================================================

/**
 * Generate complete frame geometry for a window unit
 */
export function generateFrameGeometry(
  width: number,
  height: number,
  profile: Profile,
  windowType: WindowType,
  glazingType: 'single' | 'double' | 'triple' = 'double',
  component?: WindowComponent
): FrameGeometry {
  const material = (profile.material?.toLowerCase() || 'aluminum') as MaterialType;
  const profileCrossSection = generateProfileCrossSection(profile, material);

  // Calculate glass pocket and layers
  const glassPocket = calculateGlassPocket(profileCrossSection, glazingType);
  const glazingBead = calculateGlazingBead(profileCrossSection, glassPocket);

  // Calculate hardware mounts
  const hardwareMounts = component
    ? calculateHardwareMounts(component, profileCrossSection, windowType, width, height)
    : [];

  // Calculate opening path
  const openingPath = windowType !== 'fixed_window'
    ? calculateOpeningPath(windowType, width, height, profileCrossSection)
    : undefined;

  // Calculate material thickness requirements
  const thicknessCalc = calculateMaterialThickness(width, height, material);
  if (thicknessCalc.reinforcementSpecs) {
    profileCrossSection.reinforcementChannels = thicknessCalc.reinforcementSpecs;
  }

  // Generate frame geometry
  const frameGeometry: FrameGeometry = {
    frame: {
      width,
      height,
      depth: profileCrossSection.outerHeight,
      profile: profileCrossSection,
    },
    glass: glassPocket.glassLayers,
    mullions: [],
    transoms: [],
  };

  // Add sash if window is not fixed
  if (windowType !== 'fixed_window') {
    const sashProfile = generateProfileCrossSection(profile, material);
    frameGeometry.sash = {
      width: width - profileCrossSection.outerWidth * 2 - 10, // Account for frame overlap
      height: height - profileCrossSection.outerWidth * 2 - 10,
      depth: sashProfile.outerHeight,
      profile: sashProfile,
      openingPath,
    };
  }

  return frameGeometry;
}

/**
 * Convert frame geometry to Three.js BufferGeometry
 */
export function frameGeometryToThreeJS(
  geometry: FrameGeometry,
  extrudeDepth: number = 25
): {
  frame: THREE.BufferGeometry;
  sash?: THREE.BufferGeometry;
  glass: THREE.BufferGeometry[];
} {
  // Frame geometry
  const frameShape = new THREE.Shape();
  frameShape.moveTo(0, 0);
  frameShape.lineTo(geometry.frame.width, 0);
  frameShape.lineTo(geometry.frame.width, geometry.frame.height);
  frameShape.lineTo(0, geometry.frame.height);
  frameShape.lineTo(0, 0);

  // Inner cutout
  const innerWidth = geometry.frame.width - geometry.frame.profile.outerWidth * 2;
  const innerHeight = geometry.frame.height - geometry.frame.profile.outerWidth * 2;
  const innerX = geometry.frame.profile.outerWidth;
  const innerY = geometry.frame.profile.outerWidth;

  const innerPath = new THREE.Path();
  innerPath.moveTo(innerX, innerY);
  innerPath.lineTo(innerX + innerWidth, innerY);
  innerPath.lineTo(innerX + innerWidth, innerY + innerHeight);
  innerPath.lineTo(innerX, innerY + innerHeight);
  innerPath.lineTo(innerX, innerY);
  frameShape.holes.push(innerPath);

  const frameGeometry = new THREE.ExtrudeGeometry(frameShape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelThickness: 2,
    bevelSize: 1,
    bevelSegments: 3,
  });

  // Sash geometry
  let sashGeometry: THREE.BufferGeometry | undefined;
  if (geometry.sash) {
    const sashShape = new THREE.Shape();
    sashShape.moveTo(0, 0);
    sashShape.lineTo(geometry.sash.width, 0);
    sashShape.lineTo(geometry.sash.width, geometry.sash.height);
    sashShape.lineTo(0, geometry.sash.height);
    sashShape.lineTo(0, 0);

    // Glass cutout
    const glassWidth = geometry.sash.width - geometry.sash.profile.outerWidth * 2;
    const glassHeight = geometry.sash.height - geometry.sash.profile.outerWidth * 2;
    const glassX = geometry.sash.profile.outerWidth;
    const glassY = geometry.sash.profile.outerWidth;

    const glassPath = new THREE.Path();
    glassPath.moveTo(glassX, glassY);
    glassPath.lineTo(glassX + glassWidth, glassY);
    glassPath.lineTo(glassX + glassWidth, glassY + glassHeight);
    glassPath.lineTo(glassX, glassY + glassHeight);
    glassPath.lineTo(glassX, glassY);
    sashShape.holes.push(glassPath);

    sashGeometry = new THREE.ExtrudeGeometry(sashShape, {
      depth: extrudeDepth,
      bevelEnabled: true,
      bevelThickness: 1.5,
      bevelSize: 0.5,
      bevelSegments: 2,
    });
  }

  // Glass geometries
  const glassGeometries = geometry.glass.map((layer) => {
    return new THREE.BoxGeometry(layer.width, layer.height, layer.thickness);
  });

  return {
    frame: frameGeometry,
    sash: sashGeometry,
    glass: glassGeometries,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate total material volume for a frame
 */
export function calculateMaterialVolume(geometry: FrameGeometry): {
  frameVolume: number;
  sashVolume?: number;
  totalVolume: number;
} {
  const frameVolume =
    geometry.frame.width *
    geometry.frame.height *
    geometry.frame.depth -
    (geometry.frame.width - geometry.frame.profile.outerWidth * 2) *
      (geometry.frame.height - geometry.frame.profile.outerWidth * 2) *
      geometry.frame.depth;

  let sashVolume: number | undefined;
  if (geometry.sash) {
    sashVolume =
      geometry.sash.width *
      geometry.sash.height *
      geometry.sash.depth -
      (geometry.sash.width - geometry.sash.profile.outerWidth * 2) *
        (geometry.sash.height - geometry.sash.profile.outerWidth * 2) *
        geometry.sash.depth;
  }

  return {
    frameVolume,
    sashVolume,
    totalVolume: frameVolume + (sashVolume || 0),
  };
}

/**
 * Calculate weight based on material and volume
 */
export function calculateWeight(
  volume: number,
  material: MaterialType
): number {
  const densities: Record<MaterialType, number> = {
    aluminum: 2700, // kg/m³
    upvc: 1400, // kg/m³
    wood: 600, // kg/m³ (varies by species)
    composite: 1800, // kg/m³
  };

  const density = densities[material] || 2000;
  return (volume / 1e9) * density; // Convert mm³ to m³, then multiply by density
}


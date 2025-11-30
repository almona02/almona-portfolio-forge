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
    height: number;
    material: 'aluminum' | 'warm_edge' | 'foam';
    thickness: number;
    position: number;
  };
}

export interface MuntinConfig {
  type: 'grid' | 'cross' | 'diamond' | 'perimeter' | 'none';
  pattern?: { rows: number; cols: number }; // For grid
  width?: number; // Bar width (mm)
  thickness?: number; // Bar thickness (mm)
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
  spacers: GlassLayer['spacer'][];
  mullions: MullionConnection[];
  transoms: MullionConnection[];
  muntins?: {
    config: MuntinConfig;
    width: number;
    height: number;
    position: number;
  };
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
  spacers: GlassLayer['spacer'][];
} {
  const pocketWidth = profile.glassPocket.width;
  const pocketDepth = profile.glassPocket.depth;
  const bottomClearance = profile.glassPocket.bottomClearance;

  const glassLayers: GlassLayer[] = [];
  const spacers: GlassLayer['spacer'][] = [];

  // Center the glazing unit within the pocket depth
  let totalThickness = 0;
  const spacerThickness = 12; // Default spacer thickness
  
  if (glazingType === 'single') {
    totalThickness = glassThickness;
  } else if (glazingType === 'double') {
    totalThickness = glassThickness * 2 + spacerThickness;
  } else if (glazingType === 'triple') {
    totalThickness = glassThickness * 3 + spacerThickness * 2;
  }
  
  let currentZ = (pocketDepth - totalThickness) / 2;

  if (glazingType === 'single') {
    glassLayers.push({
      width: pocketWidth - 2,
      height: pocketDepth - bottomClearance - 2,
      thickness: glassThickness,
      position: currentZ + glassThickness / 2,
      type: 'single',
    });
  } else if (glazingType === 'double') {
    // First glass pane
    glassLayers.push({
      width: pocketWidth - 2,
      height: pocketDepth - bottomClearance - 2,
      thickness: glassThickness,
      position: currentZ + glassThickness / 2,
      type: 'double',
    });

    currentZ += glassThickness;

    // Spacer
    spacers.push({
      width: pocketWidth - 2 - 10, // Inset
      height: pocketDepth - bottomClearance - 2 - 10, // Inset
      material: 'warm_edge',
      thickness: spacerThickness,
      position: currentZ + spacerThickness / 2,
    });
    
    currentZ += spacerThickness;

    // Second glass pane
    glassLayers.push({
      width: pocketWidth - 2,
      height: pocketDepth - bottomClearance - 2,
      thickness: glassThickness,
      position: currentZ + glassThickness / 2,
      type: 'double',
    });
  } else if (glazingType === 'triple') {
    // First glass pane
    glassLayers.push({
      width: pocketWidth - 2,
      height: pocketDepth - bottomClearance - 2,
      thickness: glassThickness,
      position: currentZ + glassThickness / 2,
      type: 'triple',
    });

    currentZ += glassThickness;

    // First Spacer
    spacers.push({
      width: pocketWidth - 2 - 10,
      height: pocketDepth - bottomClearance - 2 - 10,
      material: 'warm_edge',
      thickness: spacerThickness,
      position: currentZ + spacerThickness / 2,
    });
    
    currentZ += spacerThickness;

    // Second glass pane
    glassLayers.push({
      width: pocketWidth - 2,
      height: pocketDepth - bottomClearance - 2,
      thickness: glassThickness,
      position: currentZ + glassThickness / 2,
      type: 'triple',
    });

    currentZ += glassThickness;

    // Second Spacer
    spacers.push({
      width: pocketWidth - 2 - 10,
      height: pocketDepth - bottomClearance - 2 - 10,
      material: 'warm_edge',
      thickness: spacerThickness,
      position: currentZ + spacerThickness / 2,
    });
    
    currentZ += spacerThickness;

    // Third glass pane
    glassLayers.push({
      width: pocketWidth - 2,
      height: pocketDepth - bottomClearance - 2,
      thickness: glassThickness,
      position: currentZ + glassThickness / 2,
      type: 'triple',
    });
  }

  return {
    pocketWidth,
    pocketDepth,
    glassLayers,
    spacers,
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
// MUNTIN BAR GENERATION
// ============================================================================

/**
 * Generate geometry for muntin bars (grids)
 */
export function generateMuntinBarGeometry(
  width: number,
  height: number,
  config: MuntinConfig
): THREE.BufferGeometry | null {
  if (!config || config.type === 'none') return null;

  const barWidth = (config.width || 18) / 1000; // Default 18mm, convert to meters
  const barThickness = (config.thickness || 5) / 1000; // Default 5mm
  const rows = config.pattern?.rows || 2;
  const cols = config.pattern?.cols || 2;

  const geometries: THREE.BufferGeometry[] = [];

  // Horizontal Bars
  if (rows > 0) {
    const rowSpacing = height / (rows + 1);
    for (let i = 1; i <= rows; i++) {
      const geometry = new THREE.BoxGeometry(width, barWidth, barThickness);
      geometry.translate(0, -height/2 + rowSpacing * i, 0);
      geometries.push(geometry);
    }
  }

  // Vertical Bars
  if (cols > 0) {
    const colSpacing = width / (cols + 1);
    for (let i = 1; i <= cols; i++) {
      const geometry = new THREE.BoxGeometry(barWidth, height, barThickness);
      geometry.translate(-width/2 + colSpacing * i, 0, 0);
      geometries.push(geometry);
    }
  }
  
  if (geometries.length === 0) return null;

  // Manual merge function to avoid dependency on BufferGeometryUtils
  return mergeBoxGeometries(geometries);
}

function mergeBoxGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) return new THREE.BufferGeometry();
  if (geometries.length === 1) return geometries[0];
  
  let totalVertices = 0;
  let totalIndices = 0;
  
  geometries.forEach(g => {
    totalVertices += g.attributes.position.count;
    if (g.index) totalIndices += g.index.count;
  });
  
  const positionArray = new Float32Array(totalVertices * 3);
  const normalArray = new Float32Array(totalVertices * 3);
  const uvArray = new Float32Array(totalVertices * 2);
  const indexArray = new Uint16Array(totalIndices);
  
  let offset = 0;
  let indexOffset = 0;
  
  geometries.forEach(g => {
    const positions = g.attributes.position.array;
    const normals = g.attributes.normal.array;
    const uvs = g.attributes.uv.array;
    const indices = g.index ? g.index.array : [];
    
    positionArray.set(positions, offset * 3);
    normalArray.set(normals, offset * 3);
    uvArray.set(uvs, offset * 2);
    
    for (let i = 0; i < indices.length; i++) {
      indexArray[indexOffset + i] = offset + indices[i];
    }
    
    offset += g.attributes.position.count;
    indexOffset += indices.length;
  });
  
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
  merged.setIndex(new THREE.BufferAttribute(indexArray, 1));
  
  return merged;
}

// ============================================================================
// COMPLETE FRAME GEOMETRY GENERATION
// ============================================================================

/**
 * Calculate recommended material thickness and reinforcement needs
 */
function calculateMaterialThickness(
  width: number,
  height: number,
  material: MaterialType
): {
  recommendedWallThickness: number;
  reinforcementSpecs?: ReinforcementChannel[];
} {
  // Default baseline
  let recommendedWallThickness = 1.5;
  let reinforcementSpecs: ReinforcementChannel[] | undefined = undefined;

  if (material === 'aluminum') {
    // Heuristic: Thicker walls for larger windows
    if (width > 1500 || height > 2000) {
      recommendedWallThickness = 2.0;
    }
    
    // Add reinforcement for large spans
    if (width > 1200 || height > 1500) {
       reinforcementSpecs = generateReinforcementChannels(width, height);
    }
  } else if (material === 'upvc') {
     recommendedWallThickness = 3.0;
     // UPVC almost always needs steel reinforcement for structural integrity
     reinforcementSpecs = generateReinforcementChannels(width, height);
  }

  return {
    recommendedWallThickness,
    reinforcementSpecs
  };
}

/**
 * Generate complete frame geometry for a window unit
 */
export function generateFrameGeometry(
  width: number,
  height: number,
  profile: Profile,
  windowType: WindowType,
  glazingType: 'single' | 'double' | 'triple' = 'double',
  component?: WindowComponent,
  muntinConfig?: MuntinConfig
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

  // Calculate dimensions
  const frameDepth = profileCrossSection.outerHeight;
  // Sash calculations
  let sash: FrameGeometry['sash'];
  let glassWidth = width - profileCrossSection.outerWidth * 2;
  let glassHeight = height - profileCrossSection.outerWidth * 2;

  if (windowType !== 'fixed_window') {
    const sashProfile = generateProfileCrossSection(profile, material);
    const sashWidth = width - profileCrossSection.outerWidth * 2 - 10;
    const sashHeight = height - profileCrossSection.outerWidth * 2 - 10;
    
    sash = {
      width: sashWidth,
      height: sashHeight,
      depth: sashProfile.outerHeight,
      profile: sashProfile,
      openingPath,
    };
    
    // Refine glass size for sash
    glassWidth = sashWidth - sashProfile.outerWidth * 2;
    glassHeight = sashHeight - sashProfile.outerWidth * 2;
  }

  // Determine muntin bars
  let muntins: FrameGeometry['muntins'] = undefined;
  if (muntinConfig && muntinConfig.type !== 'none') {
     let zPos = profileCrossSection.glassPocket.depth / 2;
     if (glassPocket.spacers.length > 0) {
        zPos = glassPocket.spacers[0].position;
     }
     
     muntins = {
       config: muntinConfig,
       width: glassWidth,
       height: glassHeight,
       position: zPos
     };
  }

  // Generate frame geometry
  const frameGeometry: FrameGeometry = {
    frame: {
      width,
      height,
      depth: frameDepth,
      profile: profileCrossSection,
    },
    sash,
    glass: glassPocket.glassLayers,
    spacers: glassPocket.spacers,
    mullions: [],
    transoms: [],
    muntins
  };

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
  spacers: THREE.BufferGeometry[];
  muntins?: THREE.BufferGeometry;
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

  // Glass geometries - UPDATED
  const glassGeometries = geometry.glass.map((layer) => {
    return new THREE.BoxGeometry(layer.width, layer.height, layer.thickness);
  });
  
  // Spacer geometries - UPDATED
  const spacerGeometries = geometry.spacers.map((spacer) => {
    // Spacer is a hollow frame, not a solid block
    const spacerShape = new THREE.Shape();
    spacerShape.moveTo(0, 0);
    spacerShape.lineTo(spacer.width, 0);
    spacerShape.lineTo(spacer.width, spacer.height);
    spacerShape.lineTo(0, spacer.height);
    spacerShape.lineTo(0, 0);
    
    const spacerThickness = 10; // 10mm wide spacer bar (visual width)
    const hole = new THREE.Path();
    hole.moveTo(spacerThickness, spacerThickness);
    hole.lineTo(spacer.width - spacerThickness, spacerThickness);
    hole.lineTo(spacer.width - spacerThickness, spacer.height - spacerThickness);
    hole.lineTo(spacerThickness, spacer.height - spacerThickness);
    hole.lineTo(spacerThickness, spacerThickness);
    spacerShape.holes.push(hole);
    
    const spacerGeom = new THREE.ExtrudeGeometry(spacerShape, {
        depth: spacer.thickness,
        bevelEnabled: false
    });
    spacerGeom.center();
    return spacerGeom;
  });
  
  // Muntin Geometry
  let muntinGeometry: THREE.BufferGeometry | undefined;
  if (geometry.muntins) {
     const geom = generateMuntinBarGeometry(
         geometry.muntins.width, 
         geometry.muntins.height, 
         geometry.muntins.config
     );
     if (geom) muntinGeometry = geom;
  }

  return {
    frame: frameGeometry,
    sash: sashGeometry,
    glass: glassGeometries,
    spacers: spacerGeometries,
    muntins: muntinGeometry
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

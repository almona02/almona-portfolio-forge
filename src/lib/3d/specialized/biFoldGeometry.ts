/**
 * Bi-Fold Door Geometry Module
 * 
 * Specialized geometry generation for bi-fold door systems with:
 * - Multi-panel folding visualization
 * - Track system geometry
 * - Bi-fold hardware in FabricationData
 * - Track profiles in FabricationData
 * 
 * @since Phase 4: Modular Extensions
 * @see preset-aware_3d_generation_with_accuracy_estimates_1a16569a.plan.md
 */

import { BufferGeometry, BoxGeometry, CylinderGeometry } from 'three';
import type { FrameGeometry } from '../windowGeometry';
import type { WindowUnit } from '@/types/fabricator';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { generatePresetAwareGeometries } from '../windowGeometry';

/**
 * Generate bi-fold door geometry with folding mechanism
 * 
 * Extends base preset-aware generation with:
 * - Multi-panel folding visualization
 * - Track system (top and/or bottom)
 * - Bi-fold hardware (pivots, guides, rollers)
 * - Folding animation support
 */
export function generateBiFoldGeometry(
  windowUnit: WindowUnit,
  pattern: EgyptianPattern
): FrameGeometry {
  // Start with base preset-aware geometry
  const baseGeometry = generatePresetAwareGeometries(windowUnit, pattern);
  
  // Enhance with bi-fold-specific features
  const width = windowUnit.overallWidth / 1000; // Convert mm to meters
  const height = windowUnit.overallHeight / 1000;
  
  // Add track system (top and bottom)
  const tracks = createBiFoldTracks(width, height, pattern);
  baseGeometry.fixedSpacers = [...baseGeometry.fixedSpacers, ...tracks];
  
  // Add pivot points for folding panels
  const pivots = createBiFoldPivots(width, height, pattern);
  baseGeometry.fixedSpacers = [...baseGeometry.fixedSpacers, ...pivots];
  
  // Add guide rails (for multi-panel systems)
  const guides = createBiFoldGuides(width, height, pattern);
  baseGeometry.fixedSpacers = [...baseGeometry.fixedSpacers, ...guides];
  
  // Add roller hardware indicators
  const rollers = createBiFoldRollers(width, height, pattern);
  baseGeometry.fixedSpacers = [...baseGeometry.fixedSpacers, ...rollers];
  
  return baseGeometry;
}

/**
 * Create bi-fold track system
 * 
 * Bi-fold doors use top and/or bottom tracks to guide panels.
 * Standard configuration: top track for hanging, bottom track for stability.
 */
function createBiFoldTracks(
  width: number,
  height: number,
  pattern: EgyptianPattern
): BufferGeometry[] {
  const tracks: BufferGeometry[] = [];
  
  const patternAny = pattern as any;
  const trackType = patternAny.openingMechanism?.trackType || 'both';
  
  // Track dimensions
  const trackWidth = width - 0.1; // Full width minus clearance
  const trackHeight = 0.008; // 8mm track height
  const trackDepth = 0.02; // 20mm track depth
  
  // Top track (for hanging panels)
  if (trackType === 'top' || trackType === 'both') {
    const topTrack = new BoxGeometry(trackWidth, trackHeight, trackDepth);
    const topY = height / 2 - 0.05; // 50mm from top
    topTrack.translate(0, topY, 0.01);
    tracks.push(topTrack);
  }
  
  // Bottom track (for stability and guidance)
  if (trackType === 'bottom' || trackType === 'both') {
    const bottomTrack = new BoxGeometry(trackWidth, trackHeight, trackDepth);
    const bottomY = -height / 2 + 0.05; // 50mm from bottom
    bottomTrack.translate(0, bottomY, 0.01);
    tracks.push(bottomTrack);
  }
  
  return tracks;
}

/**
 * Create bi-fold pivot points
 * 
 * Pivot points are where panels fold. Typically located at:
 * - Center of opening (for 2-panel systems)
 * - 1/3 and 2/3 positions (for 3-panel systems)
 */
function createBiFoldPivots(
  width: number,
  height: number,
  pattern: EgyptianPattern
): BufferGeometry[] {
  const pivots: BufferGeometry[] = [];
  
  // Determine number of panels from grid
  const cols = pattern.gridSpec.cols;
  const numPanels = cols; // Each column is typically a panel
  
  // Pivot radius
  const pivotRadius = 0.015; // 15mm
  const pivotHeight = 0.02; // 20mm
  
  // Calculate pivot positions
  const pivotPositions: number[] = [];
  if (numPanels === 2) {
    // 2-panel: pivot at center
    pivotPositions.push(width / 2);
  } else if (numPanels === 3) {
    // 3-panel: pivots at 1/3 and 2/3
    pivotPositions.push(width / 3, (2 * width) / 3);
  } else if (numPanels === 4) {
    // 4-panel: pivots at 1/4, 1/2, 3/4
    pivotPositions.push(width / 4, width / 2, (3 * width) / 4);
  } else {
    // Default: evenly spaced
    for (let i = 1; i < numPanels; i++) {
      pivotPositions.push((i * width) / numPanels);
    }
  }
  
  // Create pivot cylinders
  pivotPositions.forEach(xPosition => {
    const pivot = new CylinderGeometry(pivotRadius, pivotRadius, pivotHeight, 16);
    pivot.rotateZ(Math.PI / 2); // Rotate to horizontal
    pivot.translate(-width / 2 + xPosition, 0, 0.02);
    pivots.push(pivot);
  });
  
  return pivots;
}

/**
 * Create bi-fold guide rails
 * 
 * Guide rails help panels fold smoothly and prevent misalignment.
 * Typically installed at top and/or bottom of opening.
 */
function createBiFoldGuides(
  width: number,
  height: number,
  pattern: EgyptianPattern
): BufferGeometry[] {
  const guides: BufferGeometry[] = [];
  
  // Guide rail dimensions
  const guideWidth = 0.01; // 10mm
  const guideHeight = height * 0.8; // 80% of height
  const guideDepth = 0.01; // 10mm
  
  // Guides at sides (for multi-panel systems with 3+ panels)
  const cols = pattern.gridSpec.cols;
  if (cols >= 3) {
    // Left guide
    const leftGuide = new BoxGeometry(guideWidth, guideHeight, guideDepth);
    leftGuide.translate(-width / 2 + 0.02, 0, 0.015);
    guides.push(leftGuide);
    
    // Right guide
    const rightGuide = new BoxGeometry(guideWidth, guideHeight, guideDepth);
    rightGuide.translate(width / 2 - 0.02, 0, 0.015);
    guides.push(rightGuide);
  }
  
  return guides;
}

/**
 * Create bi-fold roller hardware indicators
 * 
 * Rollers are mounted on panels and run in tracks.
 * Visual indicators show roller positions.
 */
function createBiFoldRollers(
  width: number,
  height: number,
  pattern: EgyptianPattern
): BufferGeometry[] {
  const rollers: BufferGeometry[] = [];
  
  // Roller dimensions
  const rollerRadius = 0.012; // 12mm
  const rollerHeight = 0.015; // 15mm
  
  // Calculate number of panels
  const cols = pattern.gridSpec.cols;
  const numPanels = cols;
  
  // Each panel typically has 2 rollers (top and bottom)
  const rollerPositions: Array<{ x: number; y: number }> = [];
  
  // Calculate panel positions
  const panelWidth = width / numPanels;
  for (let i = 0; i < numPanels; i++) {
    const panelCenterX = -width / 2 + (i + 0.5) * panelWidth;
    
    // Top roller
    rollerPositions.push({
      x: panelCenterX,
      y: height / 2 - 0.08 // 80mm from top
    });
    
    // Bottom roller
    rollerPositions.push({
      x: panelCenterX,
      y: -height / 2 + 0.08 // 80mm from bottom
    });
  }
  
  // Create roller cylinders
  rollerPositions.forEach(({ x, y }) => {
    const roller = new CylinderGeometry(rollerRadius, rollerRadius, rollerHeight, 16);
    roller.rotateX(Math.PI / 2); // Rotate to vertical
    roller.translate(x, y, 0.02);
    rollers.push(roller);
  });
  
  return rollers;
}


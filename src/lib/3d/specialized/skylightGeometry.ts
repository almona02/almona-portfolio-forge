/**
 * Skylight Geometry Module
 * 
 * Specialized geometry generation for skylight systems with:
 * - Slope angle application (minimum 5°)
 * - Overhead glass safety indicators
 * - Slope-specific profiles in FabricationData
 * - Laminated glass requirements
 * 
 * @since Phase 4: Modular Extensions
 * @see preset-aware_3d_generation_with_accuracy_estimates_1a16569a.plan.md
 */

import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowUnit } from '@/types/fabricator';
import { BoxGeometry, BufferGeometry, Matrix4 } from 'three';
import type { FrameGeometry } from '../windowGeometry';
import { generatePresetAwareGeometries } from '../windowGeometry';

/**
 * Generate skylight geometry with slope and safety features
 * 
 * Extends base preset-aware generation with:
 * - Slope angle application (minimum 5° for drainage)
 * - Overhead glass safety indicators
 * - Slope-specific profile calculations
 * - Laminated glass requirements
 */
export function generateSkylightGeometry(
  windowUnit: WindowUnit,
  pattern: EgyptianPattern
): FrameGeometry {
  // Start with base preset-aware geometry
  const baseGeometry = generatePresetAwareGeometries(windowUnit, pattern);
  
  // Apply slope transformation
  const slopeAngle = getSlopeAngle(pattern);
  if (slopeAngle > 0) {
    applySlopeToGeometry(baseGeometry, slopeAngle);
  }
  
  // Add overhead glass safety indicators
  const safetyIndicators = createSafetyIndicators(windowUnit, pattern);
  baseGeometry.fixedSpacers = [...baseGeometry.fixedSpacers, ...safetyIndicators];
  
  // Add slope-specific structural elements
  const slopeElements = createSlopeElements(windowUnit, pattern, slopeAngle);
  baseGeometry.fixedSpacers = [...baseGeometry.fixedSpacers, ...slopeElements];
  
  return baseGeometry;
}

/**
 * Get slope angle from pattern or use default minimum
 * 
 * Skylights require minimum 5° slope for proper drainage.
 */
function getSlopeAngle(pattern: EgyptianPattern): number {
  const patternAny = pattern as any;
  const slopeAngle = patternAny.skylight?.slopeAngle || patternAny.slopeAngle;
  
  // Minimum 5° for drainage (building code requirement)
  return Math.max(5, slopeAngle || 5);
}

/**
 * Apply slope transformation to geometry
 * 
 * Rotates the entire geometry around the X-axis to create the slope.
 */
function applySlopeToGeometry(
  geometry: FrameGeometry,
  slopeAngleDegrees: number
): void {
  const slopeRadians = (slopeAngleDegrees * Math.PI) / 180;
  
  // Create rotation matrix for slope
  const rotationMatrix = new Matrix4().makeRotationX(slopeRadians);
  
  // Apply rotation to frame parts
  geometry.frame.parts.forEach(part => {
    part.matrix.multiplyMatrices(rotationMatrix, part.matrix);
  });
  
  // Apply rotation to sashes
  geometry.sashes.forEach(sash => {
    sash.parts.forEach(part => {
      part.matrix.multiplyMatrices(rotationMatrix, part.matrix);
    });
  });
  
  // Apply rotation to fixed glass
  geometry.fixedGlass.forEach(glass => {
    glass.applyMatrix4(rotationMatrix);
  });
  
  // Apply rotation to spacers
  geometry.fixedSpacers.forEach(spacer => {
    spacer.applyMatrix4(rotationMatrix);
  });
}

/**
 * Create safety indicators for overhead glass
 * 
 * Visual indicators showing that laminated/tempered glass is required
 * for overhead applications (safety code requirement).
 */
function createSafetyIndicators(
  windowUnit: WindowUnit,
  _pattern: EgyptianPattern
): BufferGeometry[] {
  const indicators: BufferGeometry[] = [];
  
  const width = windowUnit.overallWidth / 1000;
  const height = windowUnit.overallHeight / 1000;
  
  // Safety indicator dimensions
  const indicatorSize = 0.02; // 20mm
  const indicatorHeight = 0.003; // 3mm
  
  // Place indicators at corners and center
  const positions = [
    [-width / 2 + 0.1, height / 2 - 0.1, 0.05], // Top-left
    [width / 2 - 0.1, height / 2 - 0.1, 0.05],  // Top-right
    [0, 0, 0.05] // Center
  ];
  
  positions.forEach(([x, y, z]) => {
    const indicator = new BoxGeometry(indicatorSize, indicatorSize, indicatorHeight);
    indicator.translate(x, y, z);
    indicators.push(indicator);
  });
  
  return indicators;
}

/**
 * Create slope-specific structural elements
 * 
 * Additional structural elements needed for sloped installations:
 * - Support brackets
 * - Waterproofing elements
 * - Drainage channels
 */
function createSlopeElements(
  windowUnit: WindowUnit,
  _pattern: EgyptianPattern,
  _slopeAngle: number
): BufferGeometry[] {
  const elements: BufferGeometry[] = [];
  
  const width = windowUnit.overallWidth / 1000;
  const height = windowUnit.overallHeight / 1000;
  
  // Support brackets at low side (for weight support)
  const bracketWidth = 0.05; // 50mm
  const bracketHeight = 0.03; // 30mm
  const bracketDepth = 0.02; // 20mm
  
  // Low side is at -height/2 (bottom when sloped)
  const lowSideY = -height / 2;
  
  // Create support brackets at corners
  const bracketPositions = [
    [-width / 2 + 0.05, lowSideY, 0],
    [width / 2 - 0.05, lowSideY, 0]
  ];
  
  bracketPositions.forEach(([x, y, z]) => {
    const bracket = new BoxGeometry(bracketWidth, bracketHeight, bracketDepth);
    bracket.translate(x, y, z);
    elements.push(bracket);
  });
  
  // Drainage channel at low side
  const channelWidth = width - 0.1; // Full width minus clearance
  const channelHeight = 0.01; // 10mm
  const channelDepth = 0.015; // 15mm
  
  const channel = new BoxGeometry(channelWidth, channelHeight, channelDepth);
  channel.translate(0, lowSideY + 0.02, 0.01);
  elements.push(channel);
  
  return elements;
}


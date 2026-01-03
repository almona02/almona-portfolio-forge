/**
 * Curtain Wall Geometry Module
 * 
 * Specialized geometry generation for curtain wall systems with:
 * - Structural mullion system
 * - Expansion joints
 * - Glass panel attachment visualization
 * - FabricationData output for curtain walls
 * 
 * @since Phase 4: Modular Extensions
 * @see preset-aware_3d_generation_with_accuracy_estimates_1a16569a.plan.md
 */

import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowUnit } from '@/types/fabricator';
import { BoxGeometry, BufferGeometry } from 'three';
import type { FrameGeometry } from '../windowGeometry';
import { generatePresetAwareGeometries } from '../windowGeometry';

/**
 * Generate curtain wall geometry with structural enhancements
 * 
 * Extends base preset-aware generation with:
 * - Structural mullion system (thicker, reinforced)
 * - Expansion joints at specified intervals
 * - Glass panel attachment points
 * - Enhanced FabricationData for structural elements
 */
export function generateCurtainWallGeometry(
  windowUnit: WindowUnit,
  pattern: EgyptianPattern
): FrameGeometry {
  // Start with base preset-aware geometry
  const baseGeometry = generatePresetAwareGeometries(windowUnit, pattern);
  
  // Enhance with curtain wall-specific features
  const width = windowUnit.overallWidth / 1000; // Convert mm to meters
  const height = windowUnit.overallHeight / 1000;
  
  // Add structural mullions (thicker than standard mullions)
  const structuralMullions = createStructuralMullions(width, height, pattern);
  baseGeometry.fixedSpacers = [...baseGeometry.fixedSpacers, ...structuralMullions];
  
  // Add expansion joints (typically every 6-12 meters)
  const expansionJoints = createExpansionJoints(width, height, pattern);
  baseGeometry.fixedSpacers = [...baseGeometry.fixedSpacers, ...expansionJoints];
  
  // Add glass panel attachment indicators
  const attachmentPoints = createGlassAttachmentPoints(width, height, pattern);
  baseGeometry.fixedSpacers = [...baseGeometry.fixedSpacers, ...attachmentPoints];
  
  return baseGeometry;
}

/**
 * Create structural mullions for curtain walls
 * 
 * Structural mullions are thicker (60-100mm) and may include reinforcement.
 * They support the entire curtain wall system.
 */
function createStructuralMullions(
  width: number,
  height: number,
  pattern: EgyptianPattern
): BufferGeometry[] {
  const mullions: BufferGeometry[] = [];
  
  // Structural mullion dimensions (thicker than standard)
  const mullionWidth = 0.08; // 80mm structural mullion
  const mullionDepth = 0.06; // 60mm depth
  
  // Use pattern.mullions[] if available, otherwise create based on grid
  if (pattern.mullions && pattern.mullions.length > 0) {
    pattern.mullions.forEach((mullion) => {
      // Calculate position based on column index
      const colIndex = mullion.position;
      const totalCols = pattern.gridSpec.cols;
      const colWidth = width / totalCols;
      const xPosition = -width / 2 + (colIndex + 0.5) * colWidth;
      
      // Create structural mullion (full height)
      const mullionGeometry = new BoxGeometry(
        mullionWidth,
        height,
        mullionDepth
      );
      mullionGeometry.translate(xPosition, 0, 0);
      mullions.push(mullionGeometry);
      
      // Add reinforcement indicator if specified
      if (mullion.reinforcement) {
        const reinforcement = new BoxGeometry(
          mullionWidth * 0.6,
          height,
          mullionDepth * 0.6
        );
        reinforcement.translate(xPosition, 0, 0.01);
        mullions.push(reinforcement);
      }
    });
  }
  
  return mullions;
}

/**
 * Create expansion joints for curtain walls
 * 
 * Expansion joints accommodate thermal expansion and structural movement.
 * Typically placed every 6-12 meters horizontally.
 */
function createExpansionJoints(
  width: number,
  height: number,
  _pattern: EgyptianPattern
): BufferGeometry[] {
  const joints: BufferGeometry[] = [];
  
  // Standard expansion joint spacing: 8 meters
  const jointSpacing = 8.0; // meters
  const jointWidth = 0.02; // 20mm joint width
  const jointDepth = 0.05; // 50mm depth
  
  // Calculate number of joints needed
  const numJoints = Math.floor(width / jointSpacing);
  
  for (let i = 1; i <= numJoints; i++) {
    const xPosition = -width / 2 + i * jointSpacing;
    
    // Create expansion joint (vertical gap)
    const joint = new BoxGeometry(
      jointWidth,
      height,
      jointDepth
    );
    joint.translate(xPosition, 0, 0.02);
    joints.push(joint);
  }
  
  return joints;
}

/**
 * Create glass panel attachment points
 * 
 * Visual indicators for where glass panels attach to the structural system.
 * These are typically at mullion intersections and panel edges.
 */
function createGlassAttachmentPoints(
  width: number,
  height: number,
  pattern: EgyptianPattern
): BufferGeometry[] {
  const points: BufferGeometry[] = [];
  
  // Attachment point dimensions
  const pointSize = 0.01; // 10mm indicator
  const pointHeight = 0.005; // 5mm height
  
  // Create attachment points at grid intersections
  const rows = pattern.gridSpec.rows;
  const cols = pattern.gridSpec.cols;
  
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const x = -width / 2 + (col / cols) * width;
      const y = height / 2 - (row / rows) * height;
      
      // Create small indicator box
      const point = new BoxGeometry(pointSize, pointSize, pointHeight);
      point.translate(x, y, 0.03);
      points.push(point);
    }
  }
  
  return points;
}


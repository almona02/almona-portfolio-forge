/**
 * Manual Mullion Renderer
 * 
 * Renders user-drawn mullions at frame-level (structural, connected to frame)
 * or sash-level (inside individual sashes for design purposes).
 * 
 * This supports the workflow where:
 * 1. User adds frame-level mullions BEFORE creating sashes (structural division)
 * 2. User adds sash-level mullions INSIDE sashes (e.g., glass top, panel bottom)
 */

import { BufferGeometry, BoxGeometry, Vector3 } from 'three';
import { WindowUnit, ManualMullion } from '@/types/fabricator';
import { ProfileCrossSection, generateProfileCrossSection } from './windowGeometry';
import { Profile } from '@/types/fabricator';

/**
 * Render frame-level mullions (structural, part of main frame)
 * These are connected to the frame profile and divide the window before sashes are created
 */
export function renderFrameLevelMullions(
  windowUnit: WindowUnit,
  frameProfile: ProfileCrossSection
): BufferGeometry[] {
  if (!windowUnit.grid?.manualMullions) return [];

  const width = windowUnit.overallWidth / 1000; // Convert to meters
  const height = windowUnit.overallHeight / 1000;
  const geometries: BufferGeometry[] = [];

  // Get frame-level mullions only
  const frameMullions = windowUnit.grid.manualMullions.filter(
    m => m.level === 'frame'
  );

  const defaultProfile: Profile = {
    id: 'default',
    name: 'Default',
    width: 50,
    height: 50,
    material: 'aluminum',
    color: '#cccccc',
    costPerMeter: 0,
    cuttingAllowance: 0,
    stockQuantity: 0,
    minStockLevel: 0,
    supplier: ''
  };
  const baseProfile = windowUnit.components?.[0]?.profile || defaultProfile;
  const mullionProfile = generateProfileCrossSection(baseProfile);
  const mullionWidth = mullionProfile.width;
  const mullionDepth = mullionProfile.depth || 0.03;

  // Calculate grid proportions for accurate positioning
  const { rows, cols, colWidths, rowHeights } = windowUnit.grid;
  const colVals = colWidths && colWidths.length === cols ? colWidths : Array(cols).fill(1);
  const rowVals = rowHeights && rowHeights.length === rows ? rowHeights : Array(rows).fill(1);
  const colTotal = colVals.reduce((a, b) => a + b, 0) || cols;
  const rowTotal = rowVals.reduce((a, b) => a + b, 0) || rows;
  const colSizes = colVals.map((v) => (v / colTotal) * width);
  const rowSizes = rowVals.map((v) => (v / rowTotal) * height);

  // Calculate column/row boundaries
  const colStarts: number[] = [];
  const rowStarts: number[] = [];
  colSizes.reduce((acc, w) => {
    colStarts.push(acc);
    return acc + w;
  }, -width / 2);
  rowSizes.reduce((acc, h) => {
    rowStarts.push(acc);
    return acc - h;
  }, height / 2);

  frameMullions.forEach(mullion => {
    if (mullion.type === 'vertical') {
      // Vertical mullion: position from left edge
      const positionMm = mullion.position;
      const positionM = positionMm / 1000;
      
      // Convert absolute position to relative position
      // Position is in mm from left, convert to meters and center
      const x = positionM - width / 2;
      
      // Mullion spans full height minus frame bars
      const mullionHeight = height - frameProfile.width * 2;
      const mullionW = (mullion.width || mullionProfile.width) / 1000;
      
      const bar = new BoxGeometry(mullionW, mullionHeight, mullionDepth);
      bar.translate(x, 0, 0);
      geometries.push(bar);
      
    } else if (mullion.type === 'horizontal') {
      // Horizontal mullion (transom): position from top edge
      const positionMm = mullion.position;
      const positionM = positionMm / 1000;
      
      // Convert absolute position to relative position
      // Position is in mm from top, convert to meters
      const y = height / 2 - positionM;
      
      // Mullion spans full width minus frame bars
      const mullionWidth = width - frameProfile.width * 2;
      const mullionH = (mullion.width || mullionProfile.width) / 1000;
      
      const bar = new BoxGeometry(mullionWidth, mullionH, mullionDepth);
      bar.translate(0, y, 0);
      geometries.push(bar);
    }
  });

  return geometries;
}

/**
 * Render sash-level mullions (inside individual sashes)
 * These are for design purposes (e.g., dividing glass within a sash)
 */
export function renderSashLevelMullions(
  windowUnit: WindowUnit,
  sashProfile: ProfileCrossSection,
  cellId: string,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number
): BufferGeometry[] {
  if (!windowUnit.grid?.manualMullions) return [];

  const geometries: BufferGeometry[] = [];

  // Get sash-level mullions for this specific sash
  const sashMullions = windowUnit.grid.manualMullions.filter(
    m => m.level === 'sash' && m.sashId === cellId
  );

  const defaultProfile: Profile = {
    id: 'default',
    name: 'Default',
    width: 50,
    height: 50,
    material: 'aluminum',
    color: '#cccccc',
    costPerMeter: 0,
    cuttingAllowance: 0,
    stockQuantity: 0,
    minStockLevel: 0,
    supplier: ''
  };
  const baseProfile = windowUnit.components?.[0]?.profile || defaultProfile;
  const mullionProfile = generateProfileCrossSection(baseProfile);
  const mullionDepth = mullionProfile.depth || 0.02;

  sashMullions.forEach(mullion => {
    if (mullion.type === 'vertical') {
      // Vertical mullion inside sash: position relative to sash left edge
      const positionMm = mullion.position;
      const positionM = positionMm / 1000;
      
      // Position relative to cell center
      const x = cellX - cellW / 2 + positionM;
      
      // Mullion spans sash height minus sash profile
      const sashProfileW = sashProfile.width;
      const mullionHeight = cellH - sashProfileW * 2;
      const mullionW = (mullion.width || mullionProfile.width) / 1000;
      
      const bar = new BoxGeometry(mullionW, mullionHeight, mullionDepth);
      bar.translate(x, cellY, 0);
      geometries.push(bar);
      
    } else if (mullion.type === 'horizontal') {
      // Horizontal mullion inside sash: position relative to sash top edge
      const positionMm = mullion.position;
      const positionM = positionMm / 1000;
      
      // Position relative to cell center
      const y = cellY + cellH / 2 - positionM;
      
      // Mullion spans sash width minus sash profile
      const sashProfileW = sashProfile.width;
      const mullionWidth = cellW - sashProfileW * 2;
      const mullionH = (mullion.width || mullionProfile.width) / 1000;
      
      const bar = new BoxGeometry(mullionWidth, mullionH, mullionDepth);
      bar.translate(cellX, y, 0);
      geometries.push(bar);
    }
  });

  return geometries;
}


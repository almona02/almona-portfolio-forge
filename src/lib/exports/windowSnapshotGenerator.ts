/**
 * Window Snapshot Generator
 * 
 * Generates high-quality snapshots of 3D window models for PDF export.
 * Matches project prestige design with gold/amber theme.
 * 
 * Constitutional Tier: Tier 3 (Protected Determinism)
 */

import { getPatternById } from '@/lib/fabricator/presetUtils';
import { WindowUnit } from '@/types/fabricator';

export interface WindowSnapshotOptions {
  width?: number;
  height?: number;
  quality?: number; // 0-1, default 0.95
  backgroundColor?: string; // Default: transparent or prestige gold
  includeDimensions?: boolean;
  cameraAngle?: 'front' | 'isometric' | 'top' | 'side';
}

/**
 * Generate a data URL snapshot of a 3D window model
 * This will be called from the browser to capture the actual 3D canvas
 */
export async function generateWindowSnapshot(
  _windowUnit: WindowUnit,
  options: WindowSnapshotOptions = {}
): Promise<string | null> {
  const {
    width: _width = 800,
    height: _height = 600,
    quality: _quality = 0.95,
    backgroundColor: _backgroundColor = 'transparent',
    includeDimensions: _includeDimensions = true,
    cameraAngle: _cameraAngle = 'isometric',
  } = options;

  try {
    // This function will be called from the browser context
    // where we have access to the actual 3D canvas
    // For now, we return a placeholder that will be replaced
    // by the actual canvas capture in the component
    
    // The actual implementation will be done in the component
    // that has access to the Three.js renderer
    return null;
  } catch (error) {
    console.error('Failed to generate window snapshot:', error);
    return null;
  }
}

/**
 * Generate pattern visualization as SVG
 * Creates a prestige-styled pattern grid visualization
 */
export function generatePatternVisualization(
  windowUnit: WindowUnit,
  options: {
    width?: number;
    height?: number;
    cellSize?: number;
    showLabels?: boolean;
  } = {}
): string {
  const {
    width = 400,
    height = 300,
    cellSize: _cellSize = 40,
    showLabels = true,
  } = options;

  const grid = windowUnit.grid;
  if (!grid || !grid.cells || grid.cells.length === 0) {
    // Fallback: create a simple box representation
    return generateFallbackPatternSVG(width, height);
  }

  const { rows, cols, cells } = grid;
  const actualCellWidth = (width - 40) / cols; // 40px padding
  const actualCellHeight = (height - 40) / rows;

  // Prestige color palette (gold/amber theme)
  const colors = {
    fixed: '#F59E0B', // Amber-500
    sliding: '#D97706', // Amber-600
    sash: '#FCD34D', // Amber-300
    panel: '#FBBF24', // Amber-400
    door: '#DC2626', // Red-600
    empty: 'transparent',
    default: '#6B7280', // Gray-500
  };

  const borders = {
    fixed: '#92400E', // Amber-800
    sliding: '#78350F', // Amber-900
    sash: '#B45309', // Amber-700
    panel: '#D97706', // Amber-600
    door: '#991B1B', // Red-800
    empty: 'transparent',
    default: '#374151', // Gray-700
  };

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Prestige background gradient
  svg += `<defs>
    <linearGradient id="prestige-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0F172A;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#1E293B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0F172A;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="url(#prestige-bg)" rx="8"/>`;
  
  // Grid cells
  const startX = 20;
  const startY = 20;
  
  cells.forEach((cell) => {
    const x = startX + cell.col * actualCellWidth;
    const y = startY + cell.row * actualCellHeight;
    const cellColor = colors[cell.type] || colors.default;
    const borderColor = borders[cell.type] || borders.default;
    
    // Cell rectangle with prestige styling
    svg += `<rect 
      x="${x}" 
      y="${y}" 
      width="${actualCellWidth - 2}" 
      height="${actualCellHeight - 2}" 
      fill="${cellColor}" 
      fill-opacity="0.7"
      stroke="${borderColor}" 
      stroke-width="2"
      rx="4"
      filter="url(#glow)"
    />`;
    
    // Cell type label
    if (showLabels && actualCellWidth > 30 && actualCellHeight > 30) {
      const labelX = x + actualCellWidth / 2;
      const labelY = y + actualCellHeight / 2;
      svg += `<text 
        x="${labelX}" 
        y="${labelY}" 
        text-anchor="middle" 
        dominant-baseline="middle" 
        font-family="Arial, sans-serif" 
        font-size="${Math.min(actualCellWidth, actualCellHeight) * 0.2}" 
        font-weight="bold"
        fill="#FFFFFF"
        stroke="#000000"
        stroke-width="0.5"
      >${cell.type.charAt(0).toUpperCase()}</text>`;
    }
  });
  
  // Pattern name (if available)
  if (windowUnit.presetId) {
    const pattern = getPatternById(windowUnit.presetId);
    if (pattern) {
      svg += `<text 
        x="${width / 2}" 
        y="${height - 10}" 
        text-anchor="middle" 
        font-family="Arial, sans-serif" 
        font-size="12" 
        font-weight="bold"
        fill="#FCD34D"
      >${pattern.name}</text>`;
    }
  }
  
  svg += `</svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate fallback pattern SVG when grid is not available
 */
function generateFallbackPatternSVG(width: number, height: number): string {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fallback-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0F172A;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1E293B;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#fallback-bg)" rx="8"/>
    <rect 
      x="${width * 0.1}" 
      y="${height * 0.1}" 
      width="${width * 0.8}" 
      height="${height * 0.8}" 
      fill="#F59E0B" 
      fill-opacity="0.3"
      stroke="#D97706" 
      stroke-width="3"
      rx="4"
    />
    <text 
      x="${width / 2}" 
      y="${height / 2}" 
      text-anchor="middle" 
      dominant-baseline="middle"
      font-family="Arial, sans-serif" 
      font-size="16" 
      font-weight="bold"
      fill="#FCD34D"
    >Window Unit</text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate multiple window unit snapshots in a row layout
 * For PDF export with multiple units
 */
export async function generateWindowUnitsRow(
  windowUnits: WindowUnit[],
  options: WindowSnapshotOptions = {}
): Promise<string | null> {
  const {
    width = 1200,
    height = 400,
    quality: _quality = 0.95,
  } = options;

  try {
    // Generate pattern visualizations for each unit
    const unitWidth = width / windowUnits.length;
    const patternVisualizations = windowUnits.map((unit) =>
      generatePatternVisualization(unit, {
        width: unitWidth - 20,
        height: height - 40,
        showLabels: true,
      })
    );

    // Combine into a single SVG row
    let combinedSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Prestige background
    combinedSvg += `<defs>
      <linearGradient id="row-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0F172A;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#1E293B;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0F172A;stop-opacity:1" />
      </linearGradient>
    </defs>`;
    combinedSvg += `<rect width="${width}" height="${height}" fill="url(#row-bg)" rx="8"/>`;
    
    // Add each unit visualization
    patternVisualizations.forEach((patternSvg, index) => {
      const x = (index * unitWidth) + 10;
      const y = 20;
      
      // Extract SVG content from data URL and embed directly
      const svgMatch = patternSvg.match(/data:image\/svg\+xml;base64,(.+)/);
      if (svgMatch) {
        // Validated match
        // Embed SVG directly using image element with data URL
        combinedSvg += `<image x="${x}" y="${y}" width="${unitWidth - 20}" height="${height - 40}" href="${patternSvg}"/>`;
      }
    });
    
    combinedSvg += `</svg>`;
    
    return `data:image/svg+xml;base64,${btoa(combinedSvg)}`;
  } catch (error) {
    console.error('Failed to generate window units row:', error);
    return null;
  }
}


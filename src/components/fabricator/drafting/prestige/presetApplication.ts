// src/components/fabricator/drafting/prestige/presetApplication.ts
/**
 * Preset Application Logic
 * 
 * Constitutional: Rule-based, deterministic
 * Purpose: Convert preset selection to WindowGrid and system/material recommendations
 */

import type { WindowGrid, GridCell } from '@/types/fabricator';
import { getPatternById, patternToWindowGrid, type EgyptianPattern } from '@/lib/fabricator/presetUtils';
import type { ArchitecturalPreset } from './ArchitecturalPresetSelector';
import { logDraftingAction } from '../utils/constitutionalAudit';

export interface PresetApplicationResult {
  windowGrid: WindowGrid;
  recommendedSystem: string;
  recommendedMaterial: string;
  appliedIntelligence: {
    gridPattern: string;
    optimization: string;
    complexity: string;
  };
}

const PRESET_PATTERN_CANDIDATES: Record<string, string[]> = {
  standard_residential_2x2: ['casement-double', 'sliding-2s', 'fixed-with-side-casements'],
  luxury_villa_facade: ['fixed-with-side-casements', 'picture-window', 'corner-window'],
  penthouse_panorama: ['sliding-3s-center-fixed', 'picture-window', 'sliding-4s'],
  apartment_renovation: ['sliding-2s', 'casement-single', 'fixed'],
  storefront_basic: ['sliding-door-2p', 'picture-window', 'fixed'],
  standard_commercial: ['picture-window', 'fixed-with-side-casements', 'sliding-door-2p'],
  heritage_geometric: ['with-shish-latish', 'with-shish', 'arched-panda'],
};

function inferPatternTypeFromPreset(preset: ArchitecturalPreset): EgyptianPattern['type'] | null {
  const text = `${preset.intelligence.gridPattern} ${preset.title}`.toLowerCase();
  if (text.includes('sliding')) return 'sliding';
  if (text.includes('casement')) return 'casement';
  if (text.includes('door')) return 'door';
  if (text.includes('tilt')) return 'tilt_turn';
  if (text.includes('fixed')) return 'fixed';
  return null;
}

function scoreDimensionFit(
  value: number | undefined,
  min: number,
  max: number,
  inRangeScore: number,
  nearRangeScore: number,
): number {
  if (!value || !Number.isFinite(value)) return 0;
  if (value >= min && value <= max) return inRangeScore;

  const nearest = value < min ? min : max;
  const deviation = Math.abs(value - nearest) / Math.max(nearest, 1);
  if (deviation <= 0.15) return nearRangeScore;
  if (deviation <= 0.30) return Math.floor(nearRangeScore / 2);
  return 0;
}

function selectPatternForPreset(
  preset: ArchitecturalPreset,
  overallWidth?: number,
  overallHeight?: number,
): EgyptianPattern | null {
  const candidateIds = PRESET_PATTERN_CANDIDATES[preset.id];
  if (!candidateIds || candidateIds.length === 0) return null;

  const candidates = candidateIds
    .map((id) => getPatternById(id))
    .filter((pattern): pattern is EgyptianPattern => Boolean(pattern));
  if (candidates.length === 0) return null;

  const preferredType = inferPatternTypeFromPreset(preset);
  const recommendedSystem = preset.intelligence.systemRecommendation.toLowerCase();

  let bestPattern: EgyptianPattern | null = null;
  let bestScore = -1;

  for (const pattern of candidates) {
    let score = 0;
    score += scoreDimensionFit(overallWidth, pattern.typicalWidthMm[0], pattern.typicalWidthMm[1], 32, 16);
    score += scoreDimensionFit(overallHeight, pattern.typicalHeightMm[0], pattern.typicalHeightMm[1], 32, 16);

    if (preferredType && (pattern.type === preferredType || pattern.type === 'mixed')) {
      score += pattern.type === preferredType ? 20 : 10;
    }

    if (pattern.compatibleSystems.some((systemId) => recommendedSystem.includes(systemId.toLowerCase()))) {
      score += 12;
    }

    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  return bestPattern;
}

/**
 * Apply preset intelligence to create WindowGrid
 * Constitutional: Deterministic conversion, no ML
 */
export function applyPresetIntelligence(
  preset: ArchitecturalPreset,
  overallWidth?: number,
  overallHeight?: number
): PresetApplicationResult {
  const checkpoint = `CHECKPOINT-PRESET-APPLY-${Date.now()}`;
  
  const selectedPattern = selectPatternForPreset(preset, overallWidth, overallHeight);
  const gridPattern = selectedPattern
    ? `${preset.intelligence.gridPattern} -> ${selectedPattern.id}`
    : preset.intelligence.gridPattern;

  // Create WindowGrid from mapped Egyptian pattern when available.
  // Fallback to legacy deterministic parser for unknown presets.
  const windowGrid = selectedPattern
    ? patternToWindowGrid(selectedPattern)
    : createWindowGridFromPattern(
      parseGridPattern(preset.intelligence.gridPattern),
      overallWidth,
      overallHeight
    );
  const recommendedSystem = selectedPattern?.compatibleSystems[0] || preset.intelligence.systemRecommendation;
  
  // Constitutional audit logging
  logDraftingAction(
    'preset_intelligence_applied',
    {
      presetId: preset.id,
      presetTitle: preset.title,
      gridPattern: preset.intelligence.gridPattern,
      recommendedSystem: preset.intelligence.systemRecommendation,
      recommendedMaterial: preset.intelligence.materialRecommendation,
      overallWidth,
      overallHeight
    },
    {
      windowGrid: {
        rows: windowGrid.rows,
        cols: windowGrid.cols,
        cellCount: windowGrid.cells.length
      },
      recommendedSystem,
      recommendedMaterial: preset.intelligence.materialRecommendation
    },
    checkpoint
  );
  
  return {
    windowGrid,
    recommendedSystem,
    recommendedMaterial: preset.intelligence.materialRecommendation,
    appliedIntelligence: {
      gridPattern,
      optimization: preset.intelligence.optimization || '',
      complexity: preset.complexity
    }
  };
}

/**
 * Parse grid pattern string to dimensions
 * Examples: "2x2", "3x1", "2x2 asymmetrical"
 */
function parseGridPattern(pattern: string): { rows: number; cols: number; isAsymmetrical?: boolean } {
  // Extract numbers (deterministic parsing)
  const match = pattern.match(/(\d+)x(\d+)/i);
  if (!match) {
    // Default to 1x1 if pattern can't be parsed
    return { rows: 1, cols: 1 };
  }
  
  const rows = parseInt(match[1], 10);
  const cols = parseInt(match[2], 10);
  const isAsymmetrical = pattern.toLowerCase().includes('asymmetrical') || 
                         pattern.toLowerCase().includes('asymmetric');
  
  return { rows, cols, isAsymmetrical };
}

/**
 * Create WindowGrid from pattern
 */
function createWindowGridFromPattern(
  pattern: { rows: number; cols: number; isAsymmetrical?: boolean },
  _overallWidth?: number,
  _overallHeight?: number
): WindowGrid {
  const cells: GridCell[] = [];
  
  // Create cells based on pattern
  for (let row = 0; row < pattern.rows; row++) {
    for (let col = 0; col < pattern.cols; col++) {
      // Determine cell type based on pattern
      let cellType: 'fixed' | 'sash' | 'panel' | 'empty' | 'sliding' = 'fixed';
      
      // For asymmetrical patterns, alternate types
      if (pattern.isAsymmetrical) {
        if (row === 0 && col === 0) {
          cellType = 'sash'; // Top-left is operable
        } else if (row === pattern.rows - 1 && col === pattern.cols - 1) {
          cellType = 'sash'; // Bottom-right is operable
        }
      } else {
        // For symmetrical, make some cells operable
        if (row < pattern.rows / 2) {
          cellType = 'sash';
        }
      }
      
      cells.push({
        id: `${row}-${col}`,
        row,
        col,
        type: cellType
      });
    }
  }
  
  // WindowGrid expects relative track weights, not absolute mm dimensions.
  // Keep deterministic ratios so 2D + 3D remain consistent.
  let colWidths: number[] | undefined = Array(pattern.cols).fill(1);
  const rowHeights: number[] | undefined = Array(pattern.rows).fill(1);
  if (pattern.isAsymmetrical && pattern.cols >= 2) {
    colWidths = Array(pattern.cols).fill(1);
    colWidths[Math.floor(pattern.cols / 2)] = 1.2;
  }
  
  return {
    rows: pattern.rows,
    cols: pattern.cols,
    cells,
    colWidths,
    rowHeights
  };
}

/**
 * Get preset by ID
 */
export function getPresetById(
  presetId: string,
  presets: ArchitecturalPreset[]
): ArchitecturalPreset | undefined {
  return presets.find(p => p.id === presetId);
}


